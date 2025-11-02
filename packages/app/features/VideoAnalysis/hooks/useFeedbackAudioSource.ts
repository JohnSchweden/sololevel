import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { getFirstAudioUrlForFeedback } from '@my/api'
import { log } from '@my/logging'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { checkCachedAudio, getCachedAudioPath, persistAudioFile } from '../utils/audioCache'

type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface FeedbackAudioItem {
  id: string
  timestamp: number
  audioStatus?: FeedbackProcessingStatus
}

export interface FeedbackAudioSourceState {
  audioUrls: Record<string, string>
  activeAudio: { id: string; url: string } | null
  errors: Record<string, string>
  selectAudio: (feedbackId: string) => void
  clearActiveAudio: () => void
  clearError: (feedbackId: string) => void
}

const CONTEXT = 'useFeedbackAudioSource'

export function useFeedbackAudioSource(
  feedbackItems: FeedbackAudioItem[]
): FeedbackAudioSourceState {
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [activeAudio, setActiveAudio] = useState<{ id: string; url: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
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

    feedbackItems.forEach((item) => {
      if (!item || item.audioStatus !== 'completed') {
        // log.debug(CONTEXT, 'useFeedbackAudioSource: Skipping item (not completed)', {
        //   feedbackId: item.id,
        //   audioStatus: item.audioStatus,
        // })
        return
      }

      const feedbackId = item.id
      if (!feedbackId) {
        return
      }

      if (audioUrls[feedbackId] || inFlightRef.current.has(feedbackId)) {
        return
      }

      // Handle both numeric and string feedback IDs
      const numericId = Number.parseInt(feedbackId, 10)
      if (Number.isNaN(numericId)) {
        // For non-numeric IDs (like mock data), skip audio fetch silently
        // This is expected behavior for mock/seed data
        // log.debug(CONTEXT, 'Skipping audio fetch for non-numeric feedback id (likely mock data)', {
        //   feedbackId,
        // })
        return
      }

      inFlightRef.current.add(feedbackId)

      // 4-tier cache resolution order (Task 52 Module 3.2):
      // 1. feedbackAudio store (indexed cache)
      // 2. Direct file check (rebuilds index on cache miss) - Task 51 pattern
      // 3. Generate signed URL from storage_path
      // 4. Download and persist to disk (background)

      async function resolveAudioUri() {
        // Check feedbackAudio store first (Tier 1: indexed cache)
        const storedPath = useFeedbackAudioStore.getState().getAudioPath(feedbackId)
        if (storedPath && Platform.OS !== 'web') {
          const hasCached = await checkCachedAudio(feedbackId)
          if (hasCached) {
            log.info(CONTEXT, 'Using cached audio from store', { feedbackId, path: storedPath })
            return storedPath
          }
          // Cache miss - clear stale entry
          useFeedbackAudioStore.getState().setAudioPath(feedbackId, null)
        }

        // Tier 2: Direct file check (rebuilds index on cache miss - Task 51 pattern)
        if (Platform.OS !== 'web') {
          const hasCached = await checkCachedAudio(feedbackId)
          if (hasCached) {
            const cachedPath = getCachedAudioPath(feedbackId)
            log.info(CONTEXT, 'Rebuilt cache from direct file check', {
              feedbackId,
              cachedPath,
            })
            // Rebuild index
            useFeedbackAudioStore.getState().setAudioPath(feedbackId, cachedPath)
            return cachedPath
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
              // Update store with persistent path
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

      void resolveAudioUri()
        .then((url) => {
          setAudioUrls((prev) => {
            if (prev[feedbackId]) {
              return prev
            }

            const next = { ...prev, [feedbackId]: url }
            return next
          })

          setErrors((prev) => {
            if (!prev[feedbackId]) {
              return prev
            }
            const next = { ...prev }
            delete next[feedbackId]
            return next
          })

          setActiveAudio((prev) => prev ?? { id: feedbackId, url })

          // log.info(CONTEXT, 'Audio url resolved for feedback', {
          //   feedbackId,
          // })
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Unknown error'
          setErrors((prev) => ({ ...prev, [feedbackId]: message }))
          log.error(CONTEXT, 'Audio url fetch threw unexpected error', {
            feedbackId,
            error: message,
          })
        })
        .finally(() => {
          inFlightRef.current.delete(feedbackId)
        })
    })
  }, [audioUrls, errors, feedbackItems])

  // Use ref to access activeAudio without including it in callback deps
  // This prevents selectAudio/clearActiveAudio from changing when activeAudio changes
  const activeAudioRef = useRef(activeAudio)
  activeAudioRef.current = activeAudio

  // Store audioUrls in ref to prevent selectAudio from recreating when object reference changes
  // Only the actual URL values matter, not the object identity
  const audioUrlsRef = useRef(audioUrls)
  audioUrlsRef.current = audioUrls

  const selectAudio = useCallback(
    (feedbackId: string) => {
      const url = audioUrlsRef.current[feedbackId]
      if (!url) {
        log.warn(CONTEXT, 'Attempted to select feedback audio without cached url', {
          feedbackId,
          availableUrls: Object.keys(audioUrlsRef.current),
        })
        return
      }

      // If selecting the same audio id again, append a cache-busting fragment to force controller reset
      const urlToUse =
        activeAudioRef.current?.id === feedbackId ? `${url}#replay=${Date.now()}` : url

      // log.info(CONTEXT, 'Selecting audio for feedback', {
      //   feedbackId,
      //   url: urlToUse.substring(0, 50) + '...',
      //   previousActiveId: activeAudioRef.current?.id,
      // })
      setActiveAudio({ id: feedbackId, url: urlToUse })
    },
    [] // Empty deps - uses refs for all dynamic values
  )

  const clearActiveAudio = useCallback(() => {
    // log.info(CONTEXT, 'Clearing active audio', {
    //   previousActiveId: activeAudioRef.current?.id,
    // })
    setActiveAudio(null)
  }, [])

  const clearError = useCallback((feedbackId: string) => {
    // log.info(CONTEXT, 'Clearing error for feedback', { feedbackId })
    setErrors((prev) => {
      if (!prev[feedbackId]) {
        return prev
      }

      const next = { ...prev }
      delete next[feedbackId]
      return next
    })
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  return useMemo(
    () => ({
      audioUrls,
      activeAudio,
      errors,
      selectAudio,
      clearActiveAudio,
      clearError,
    }),
    [audioUrls, activeAudio, errors, selectAudio, clearActiveAudio, clearError]
  )
}
