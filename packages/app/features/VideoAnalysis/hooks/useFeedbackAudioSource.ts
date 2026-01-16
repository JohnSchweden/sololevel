import { getInfoAsync } from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'

import { getFirstAudioUrlForFeedback } from '@my/api'
import { log } from '@my/logging'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { checkCachedAudio, getCachedAudioPath, persistAudioFile } from '../utils/audioCache'

type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface FeedbackAudioItem {
  id: string
  timestamp: number
  audioStatus?: FeedbackProcessingStatus
}

export interface FeedbackAudioSourceState {
  selectAudio: (feedbackId: string) => void
  clearActiveAudio: () => void
  clearError: (feedbackId: string) => void
}

const CONTEXT = 'useFeedbackAudioSource'

export function useFeedbackAudioSource(
  feedbackItems: FeedbackAudioItem[]
): FeedbackAudioSourceState {
  const inFlightRef = useRef<Set<string>>(new Set())
  // PERF FIX #4: Use ref comparison to prevent unnecessary re-runs when array reference changes but content is same
  const previousItemsRef = useRef<string>('')
  // BUG FIX: Track IDs separately to detect analysis changes vs status updates
  const previousIdsRef = useRef<string>('')

  useEffect(() => {
    // BUG FIX: Clear audioUrls when navigating away or to empty analysis
    // This prevents stale audio from previous analysis from being used
    if (!feedbackItems.length) {
      useFeedbackAudioStore.getState().setAudioUrls({})
      return undefined
    }

    // BUG FIX: Separate ID tracking from status tracking
    // IDs change = different analysis (clear audioUrls)
    // Status change = same analysis processing (keep audioUrls)
    const idsKey = feedbackItems
      .map((item) => item.id)
      .sort()
      .join(',')
    const itemsKey = feedbackItems
      .map((item) => `${item.id}:${item.audioStatus ?? 'undefined'}`)
      .sort()
      .join(',')

    if (previousItemsRef.current === itemsKey) {
      // Content unchanged, skip re-processing
      return undefined
    }

    // BUG FIX: Only clear audioUrls when feedback IDs change (new analysis)
    // Don't clear on audioStatus updates for same items (processing → completed)
    if (previousIdsRef.current && previousIdsRef.current !== idsKey) {
      useFeedbackAudioStore.getState().setAudioUrls({})
    }

    previousIdsRef.current = idsKey
    previousItemsRef.current = itemsKey

    // FIX: Use AbortController to handle race conditions
    const abortController = new AbortController()
    const signal = abortController.signal

    // Defer audio initialization to prevent blocking initial render
    // Move audio cache resolution off critical path (similar to prefetch deferral)
    const timeoutId = setTimeout(() => {
      // log.debug(CONTEXT, 'useFeedbackAudioSource: Processing feedback items', {
      //   totalItems: feedbackItems.length,
      //   itemsByStatus: feedbackItems.reduce(
      //     (acc, item) => {
      //       const status = item.audioStatus || 'undefined'
      //       acc[status] = (acc[status] || 0) + 1
      //       return acc
      //     },
      //     {} as Record<string, number>
      //   ),
      //   itemDetails: feedbackItems.map((item) => ({
      //     id: item.id,
      //     audioStatus: item.audioStatus,
      //     timestamp: item.timestamp,
      //   })),
      // })

      if (signal.aborted) return

      // PERF FIX #1: Filter items to resolve first, then resolve in parallel
      const itemsToResolve = feedbackItems.filter((item) => {
        if (!item || item.audioStatus !== 'completed') {
          return false
        }

        const feedbackId = item.id
        if (!feedbackId) {
          return false
        }

        const audioUrls = useFeedbackAudioStore.getState().audioUrls
        if (audioUrls[feedbackId] || inFlightRef.current.has(feedbackId)) {
          return false
        }

        // Handle both numeric and string feedback IDs
        const numericId = Number.parseInt(feedbackId, 10)
        if (Number.isNaN(numericId)) {
          // For non-numeric IDs (like mock data), skip audio fetch silently
          return false
        }

        return true
      })

      if (itemsToResolve.length === 0) {
        return
      }

      // PERF FIX #1: Parallelize audio resolution with Promise.all
      // This resolves all feedback items simultaneously instead of sequentially
      const resolvePromises = itemsToResolve.map((item) => {
        const feedbackId = item.id!
        const numericId = Number.parseInt(feedbackId, 10)

        inFlightRef.current.add(feedbackId)

        // 4-tier cache resolution order (Task 52 Module 3.2):
        // 1. feedbackAudio store (indexed cache)
        // 2. Direct file check (rebuilds index on cache miss) - Task 51 pattern
        // 3. Generate signed URL from storage_path
        // 4. Download and persist to disk (background)

        async function resolveAudioUri(): Promise<string> {
          if (signal.aborted) return ''

          // Tier 1: Check feedbackAudio store first (indexed cache)
          const storedPath = useFeedbackAudioStore.getState().getAudioPath(feedbackId)
          if (storedPath && Platform.OS !== 'web') {
            // PERF FIX #2: Extension already stored in path, use it directly
            const storedExt = storedPath.match(/\.([^.]+)$/)?.[1]
            const hasCached = await checkCachedAudio(feedbackId, storedExt)
            if (hasCached) {
              return storedPath
            }
            // Cache miss - clear stale entry
            useFeedbackAudioStore.getState().setAudioPath(feedbackId, null)
          }

          // Tier 2: Direct file check (rebuilds index on cache miss - Task 51 pattern)
          // Only check if we haven't already checked (avoid duplicate calls)
          if (Platform.OS !== 'web' && !storedPath) {
            const hasCached = await checkCachedAudio(feedbackId)
            if (hasCached) {
              // PERF FIX #2: Check extensions in parallel instead of sequentially
              // Priority order: wav, mp3, aac, m4a
              const extensions = ['wav', 'mp3', 'aac', 'm4a']
              const extensionChecks = await Promise.all(
                extensions.map(async (ext) => {
                  const cachedPath = getCachedAudioPath(feedbackId, ext)
                  try {
                    const info = await getInfoAsync(cachedPath)
                    if (info.exists) {
                      return { ext, path: cachedPath }
                    }
                  } catch {
                    // Try next extension
                  }
                  return null
                })
              )

              // Find first existing file
              const found = extensionChecks.find((result) => result !== null)
              if (found) {
                log.info(CONTEXT, 'Rebuilt cache from direct file check', {
                  feedbackId,
                  cachedPath: found.path,
                  extension: found.ext,
                })
                // PERF FIX #2: Store path with extension in cache for future lookups
                useFeedbackAudioStore.getState().setAudioPath(feedbackId, found.path)
                return found.path
              }
            }
          }

          // Tier 3: Generate signed URL from cloud
          const result = await getFirstAudioUrlForFeedback(numericId)
          if (!result.ok) {
            throw new Error(result.error)
          }

          // Tier 4: Persist to disk in background (non-blocking)
          if (Platform.OS !== 'web' && result.url.startsWith('http')) {
            persistAudioFile(feedbackId, result.url)
              .then((persistentPath) => {
                log.info(CONTEXT, 'Audio persisted in background', {
                  feedbackId,
                  path: persistentPath,
                })
                // PERF FIX #2: Update store with persistent path (includes extension)
                useFeedbackAudioStore.getState().setAudioPath(feedbackId, persistentPath)
              })
              .catch((error) => {
                log.warn(CONTEXT, 'Background audio persistence failed', {
                  feedbackId,
                  error: error instanceof Error ? error.message : String(error),
                })
              })
          }

          return result.url
        }

        return resolveAudioUri()
          .then((url) => {
            return { feedbackId, url }
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error'
            log.error(CONTEXT, 'Audio url fetch threw unexpected error', {
              feedbackId,
              error: message,
            })
            return { feedbackId, error: message }
          })
          .finally(() => {
            // Only delete if not aborted - otherwise we might clear for next effect run
            if (!signal.aborted) {
              inFlightRef.current.delete(feedbackId)
            }
          })
      })

      // PERF FIX #1: Wait for all resolutions in parallel
      // This reduces total time from sum(serial) to max(parallel)
      void Promise.all(resolvePromises).then((results) => {
        if (signal.aborted) return

        // Batch update audio URLs once all resolutions complete
        const updates: Record<string, string> = {}
        const errors: Record<string, string> = {}

        for (const result of results) {
          if ('url' in result) {
            updates[result.feedbackId] = result.url
          } else if ('error' in result) {
            errors[result.feedbackId] = result.error
          }
        }

        // Apply batch updates
        if (Object.keys(updates).length > 0) {
          const currentUrls = useFeedbackAudioStore.getState().audioUrls
          useFeedbackAudioStore.getState().setAudioUrls({
            ...currentUrls,
            ...updates,
          })

          // Clear errors for successfully resolved items
          for (const feedbackId of Object.keys(updates)) {
            const currentErrors = useFeedbackAudioStore.getState().errors
            if (currentErrors[feedbackId]) {
              useFeedbackAudioStore.getState().clearError(feedbackId)
            }
          }
        }

        if (Object.keys(errors).length > 0) {
          const currentErrors = useFeedbackAudioStore.getState().errors
          useFeedbackAudioStore.getState().setErrors({
            ...currentErrors,
            ...errors,
          })
        }
      })
    }, 100) // 100ms delay - same as prefetch deferral

    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
      inFlightRef.current.clear()
    }
  }, [feedbackItems])

  const selectAudio = useCallback(
    (feedbackId: string) => {
      const audioUrls = useFeedbackAudioStore.getState().audioUrls
      const activeAudio = useFeedbackAudioStore.getState().activeAudio

      const url = audioUrls[feedbackId]
      if (!url) {
        log.warn(CONTEXT, 'Attempted to select feedback audio without cached url', {
          feedbackId,
          availableUrls: Object.keys(audioUrls),
        })
        return
      }

      // If selecting the same audio id again, append a cache-busting fragment to force controller reset
      const urlToUse = activeAudio?.id === feedbackId ? `${url}#replay=${Date.now()}` : url

      log.debug(CONTEXT, '🎵 Selecting audio for feedback', {
        feedbackId,
        url: urlToUse.substring(0, 50) + '...',
        previousActiveId: activeAudio?.id,
        urlLength: urlToUse.length,
      })

      useFeedbackAudioStore.getState().setActiveAudio({ id: feedbackId, url: urlToUse })
    },
    [] // Empty deps - reads from store directly
  )

  const clearActiveAudio = useCallback(() => {
    // log.info(CONTEXT, 'Clearing active audio', {
    //   previousActiveId: useFeedbackAudioStore.getState().activeAudio?.id,
    // })
    useFeedbackAudioStore.getState().setActiveAudio(null)
  }, [])

  const clearError = useCallback((feedbackId: string) => {
    // log.info(CONTEXT, 'Clearing error for feedback', { feedbackId })
    useFeedbackAudioStore.getState().clearError(feedbackId)
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  return useMemo(
    () => ({
      selectAudio,
      clearActiveAudio,
      clearError,
    }),
    [selectAudio, clearActiveAudio, clearError]
  )
}
