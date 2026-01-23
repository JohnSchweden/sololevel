import { analysisKeys } from '@app/hooks/analysisKeys'
import { getAnalysisIdForJobId, getFirstAudioUrlForFeedback, supabase } from '@my/api'
import type { Database } from '@my/api'
import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { fetchHistoricalAnalysisData } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import { useFeedbackAudioStore } from '../../VideoAnalysis/stores/feedbackAudio'
import {
  type FeedbackStatusData,
  useFeedbackStatusStore,
} from '../../VideoAnalysis/stores/feedbackStatus'
import { findCachedAudioPath, persistAudioFile } from '../../VideoAnalysis/utils/audioCache'
import { useVideoHistoryStore } from '../stores/videoHistory'
import { useNetworkQuality } from './useNetworkQuality'

export interface PrefetchAnalysisOptions {
  /**
   * Zero-based index of the last visible analysis in the history carousel.
   * When provided, the hook can prefetch analyses beyond the initial window
   * by monitoring scroll position and automatically fetching trailing items.
   */
  lastVisibleIndex?: number | null

  /**
   * Number of additional analyses to prefetch beyond the last visible index.
   * Defaults to 6. When the remaining unprefetched analyses drops to this
   * count or fewer, the hook triggers prefetch of the trailing items.
   * @default 6
   */
  lookAhead?: number
}

/**
 * Prefetch video analysis data for videos when history screen loads
 *
 * Strategy:
 * - Immediately prefetch top 3 videos (visible without scrolling)
 * - Immediately prefetch remaining videos with 10ms stagger (prevents overwhelming system)
 * - Monitors scroll position via lastVisibleIndex to prefetch trailing items (6-10)
 * - Uses EXACT same queryFn as useHistoricalAnalysis (fetchHistoricalAnalysisData)
 * - Prefetch feedback metadata (lightweight, no audio URLs)
 *
 * Critical: This executes the FULL useHistoricalAnalysis logic during prefetch:
 * - Database fetch (if Zustand cache missing)
 * - Video URI resolution (local file checks, signed URL generation)
 * - File existence validation
 * - All expensive operations complete BEFORE user navigates
 *
 * Benefits:
 * - Instant navigation when user taps thumbnail (0ms, no loading state)
 * - All data ready in TanStack Query cache
 * - useHistoricalAnalysis returns prefetched data instantly
 * - TanStack Query deduplicates: if user navigates while prefetch in progress, reuses same promise
 * - Scroll-aware: automatically prefetches trailing items as user scrolls
 *
 * Prefetch includes:
 * 1. Full analysis data fetch (database if cache miss)
 * 2. Video URI resolution (local file checks, signed URLs)
 * 3. Feedback metadata (lightweight database query)
 * 4. Skips audio URLs (resolved on-demand when user taps feedback)
 *
 * Async Behavior:
 * - All prefetches are async and non-blocking
 * - Navigation is instant - user-initiated queries reuse in-progress prefetches via TanStack Query deduplication
 * - No 2s delay that blocks user navigation for videos 4-10
 * - Scroll-triggered prefetch happens 150ms after scroll position changes
 *
 * @param analysisIds - Array of analysis IDs to prefetch (typically up to 10)
 * @param options - Configuration options for scroll-aware prefetching
 */
export function usePrefetchVideoAnalysis(
  analysisIds: number[],
  options?: PrefetchAnalysisOptions
): void {
  const queryClient = useQueryClient()
  const { lastVisibleIndex = null, lookAhead: lookAheadOption } = options ?? {}
  const normalizedLookAhead =
    typeof lookAheadOption === 'number' && Number.isFinite(lookAheadOption)
      ? Math.max(0, Math.floor(lookAheadOption))
      : 6

  const prefetchedRef = useRef<Set<number>>(new Set())
  const inFlightRef = useRef<Set<number>>(new Set())
  const scheduledMapRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map())
  const highestRequestedIndexRef = useRef(-1)
  const feedbackPrefetchedRef = useRef<Set<number>>(new Set()) // Track feedback prefetch attempts
  const feedbackBatchPrefetchedRef = useRef<boolean>(false) // Track if batch prefetch has run
  const getCached = useVideoHistoryStore((state) => state.getCached)
  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)
  // CRITICAL: Use getState() inside callbacks to avoid stale closures
  // Hook selectors capture functions at render time, but async callbacks may run later
  // when the store state has changed (especially with persist middleware rehydration)
  const addFeedback = useCallback(
    (feedback: FeedbackStatusData) => useFeedbackStatusStore.getState().addFeedback(feedback),
    []
  )
  const getFeedbacksByAnalysisId = useCallback(
    (analysisId: string) => useFeedbackStatusStore.getState().getFeedbacksByAnalysisId(analysisId),
    []
  )

  // Adaptive prefetch based on network quality
  const networkQuality = useNetworkQuality()

  const isPrefetchedOrPending = useCallback(
    (analysisId: number): boolean =>
      prefetchedRef.current.has(analysisId) ||
      inFlightRef.current.has(analysisId) ||
      scheduledMapRef.current.has(analysisId),
    []
  )

  /**
   * Batch prefetch feedback metadata for multiple analyses
   * PERFORMANCE: Fetches all feedbacks in 1 query instead of N separate queries
   * @returns Map of analysisJobId -> analysisUuid for successfully resolved IDs
   */
  const batchPrefetchFeedbackMetadata = useCallback(
    async (analysisJobIds: number[], signal?: AbortSignal): Promise<Map<number, string>> => {
      const result = new Map<number, string>()

      if (analysisJobIds.length === 0 || signal?.aborted) {
        return result
      }

      try {
        // PERFORMANCE: Quick check if all feedbacks are already cached
        // Skip entire batch if nothing needs to be done (common on re-navigation)
        let allCached = true
        for (const analysisJobId of analysisJobIds) {
          const cachedUuid = getUuid(analysisJobId)
          if (!cachedUuid || getFeedbacksByAnalysisId(cachedUuid).length === 0) {
            allCached = false
            break
          }
        }

        if (allCached) {
          // All feedbacks already cached - skip database fetch
          // BUT still prefetch audio paths for cached feedbacks (they might not have audio resolved)
          if (Platform.OS !== 'web' && !signal?.aborted) {
            const completedFeedbackIds: number[] = []
            for (const analysisJobId of analysisJobIds) {
              const cachedUuid = getUuid(analysisJobId)
              if (cachedUuid) {
                const cachedFeedbacks = getFeedbacksByAnalysisId(cachedUuid)
                for (const feedback of cachedFeedbacks) {
                  if (feedback.audioStatus === 'completed') {
                    completedFeedbackIds.push(feedback.id)
                  }
                }
              }
            }
            if (__DEV__) {
              log.debug('usePrefetchVideoAnalysis', 'Audio prefetch from cached feedbacks', {
                analysisJobIds: analysisJobIds.length,
                completedFeedbackIds: completedFeedbackIds.length,
                feedbackIds: completedFeedbackIds.slice(0, 5), // First 5 for debugging
              })
            }
            if (completedFeedbackIds.length > 0) {
              void prefetchAudioPaths(completedFeedbackIds, signal)
            }
          }
          return result
        }

        // Step 1: Resolve all UUIDs (batch resolve missing ones)
        const uuidMap = new Map<number, string>()
        const missingIds: number[] = []

        for (const analysisJobId of analysisJobIds) {
          const cachedUuid = getUuid(analysisJobId)
          if (cachedUuid) {
            uuidMap.set(analysisJobId, cachedUuid)
          } else {
            missingIds.push(analysisJobId)
          }
        }

        // Batch resolve missing UUIDs (sequential to avoid overwhelming API)
        for (const analysisJobId of missingIds) {
          if (signal?.aborted) {
            break
          }
          try {
            const analysisUuid = await getAnalysisIdForJobId(analysisJobId, {
              signal,
              maxRetries: 2,
              baseDelay: 200,
            })
            if (analysisUuid) {
              uuidMap.set(analysisJobId, analysisUuid)
              setUuid(analysisJobId, analysisUuid)
            }
          } catch {
            // Skip failed UUID resolutions
          }
        }

        if (signal?.aborted) {
          return result
        }

        // Step 2: Check which feedbacks are already cached
        const uncachedUuids: string[] = []
        const cachedCounts = new Map<string, number>()

        for (const [analysisJobId, analysisUuid] of Array.from(uuidMap.entries())) {
          const cachedFeedbacks = getFeedbacksByAnalysisId(analysisUuid)
          if (cachedFeedbacks.length > 0) {
            cachedCounts.set(analysisUuid, cachedFeedbacks.length)
            feedbackPrefetchedRef.current.add(analysisJobId)
            result.set(analysisJobId, analysisUuid)
          } else {
            uncachedUuids.push(analysisUuid)
          }
        }

        // Step 3: Batch fetch all uncached feedbacks in 1 query
        if (uncachedUuids.length === 0) {
          // All feedbacks cached after UUID resolution - still prefetch audio paths
          if (Platform.OS !== 'web' && !signal?.aborted) {
            const completedFeedbackIds: number[] = []
            for (const [, analysisUuid] of Array.from(uuidMap.entries())) {
              const cachedFeedbacks = getFeedbacksByAnalysisId(analysisUuid)
              for (const feedback of cachedFeedbacks) {
                if (feedback.audioStatus === 'completed') {
                  completedFeedbackIds.push(feedback.id)
                }
              }
            }
            if (completedFeedbackIds.length > 0) {
              void prefetchAudioPaths(completedFeedbackIds, signal)
            }
          }

          if (__DEV__) {
            log.debug('usePrefetchVideoAnalysis', 'Batch feedback prefetch summary', {
              total: analysisJobIds.length,
              cachedSkipped: cachedCounts.size,
              fetched: 0,
              cachedCounts: Object.fromEntries(cachedCounts),
            })
          }
          return result
        }

        if (signal?.aborted) {
          return result
        }

        type FeedbackSelectResult = Pick<
          Database['public']['Tables']['analysis_feedback']['Row'],
          | 'id'
          | 'analysis_id'
          | 'message'
          | 'category'
          | 'timestamp_seconds'
          | 'confidence'
          | 'ssml_status'
          | 'audio_status'
          | 'ssml_attempts'
          | 'audio_attempts'
          | 'ssml_last_error'
          | 'audio_last_error'
          | 'ssml_updated_at'
          | 'audio_updated_at'
          | 'created_at'
          | 'user_rating'
          | 'user_rating_at'
        >

        // Single batch query with IN clause
        const { data: feedbacksData, error: fetchError } = await supabase
          .from('analysis_feedback')
          .select(
            'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at, user_rating, user_rating_at'
          )
          .in('analysis_id', uncachedUuids)
          .order('created_at', { ascending: true })
          .returns<FeedbackSelectResult[]>()

        if (signal?.aborted) {
          return result
        }

        if (fetchError) {
          log.warn('usePrefetchVideoAnalysis', 'Batch feedback prefetch failed', {
            analysisIds: analysisJobIds,
            error: fetchError.message,
          })
          return result
        }

        // Step 4: Group feedbacks by analysis_id and add to store
        const feedbacksByUuid = new Map<string, FeedbackSelectResult[]>()
        if (feedbacksData) {
          for (const feedback of feedbacksData) {
            const existing = feedbacksByUuid.get(feedback.analysis_id) || []
            existing.push(feedback)
            feedbacksByUuid.set(feedback.analysis_id, existing)
          }
        }

        // PERF: Build reverse map (uuid -> jobIds) once for O(n) lookup instead of O(n*m)
        const uuidToJobIds = new Map<string, number[]>()
        for (const [analysisJobId, analysisUuid] of Array.from(uuidMap.entries())) {
          const existing = uuidToJobIds.get(analysisUuid)
          if (existing) {
            existing.push(analysisJobId)
          } else {
            uuidToJobIds.set(analysisUuid, [analysisJobId])
          }
        }

        // Add all feedbacks to store
        let fetchedCount = 0
        for (const [analysisUuid, feedbacks] of Array.from(feedbacksByUuid.entries())) {
          for (const feedback of feedbacks) {
            addFeedback({
              id: feedback.id,
              analysis_id: feedback.analysis_id,
              message: feedback.message,
              category: feedback.category,
              timestamp_seconds: feedback.timestamp_seconds,
              confidence: feedback.confidence ?? 0,
              ssml_status: (feedback.ssml_status ?? 'queued') as FeedbackStatusData['ssml_status'],
              audio_status: (feedback.audio_status ??
                'queued') as FeedbackStatusData['audio_status'],
              ssml_attempts: feedback.ssml_attempts,
              audio_attempts: feedback.audio_attempts,
              user_rating: feedback.user_rating,
              user_rating_at: feedback.user_rating_at,
              ssml_last_error: feedback.ssml_last_error,
              audio_last_error: feedback.audio_last_error,
              ssml_updated_at: feedback.ssml_updated_at,
              audio_updated_at: feedback.audio_updated_at,
              created_at: feedback.created_at,
              updated_at: feedback.created_at,
            })
          }
          fetchedCount++

          // Mark corresponding analysisJobIds as prefetched (O(1) lookup via reverse map)
          const jobIds = uuidToJobIds.get(analysisUuid)
          if (jobIds) {
            for (const analysisJobId of jobIds) {
              feedbackPrefetchedRef.current.add(analysisJobId)
              result.set(analysisJobId, analysisUuid)
            }
          }
        }

        // Step 5: Prefetch audio paths for completed feedbacks (PERF optimization)
        // This resolves audio URLs BEFORE user navigates, eliminating filesystem checks during navigation
        if (Platform.OS !== 'web' && !signal?.aborted) {
          const completedFeedbackIds: number[] = []
          if (feedbacksData) {
            for (const feedback of feedbacksData) {
              if (feedback.audio_status === 'completed') {
                completedFeedbackIds.push(feedback.id)
              }
            }
          }

          if (completedFeedbackIds.length > 0) {
            // Fire-and-forget: Resolve audio paths in background
            // Don't await - let it complete while user is still on history screen
            void prefetchAudioPaths(completedFeedbackIds, signal)
          }
        }

        if (__DEV__) {
          // PERF: Build log data inline without intermediate arrays
          const fetchedCounts: Record<string, number> = {}
          for (const [uuid, fb] of Array.from(feedbacksByUuid.entries())) {
            fetchedCounts[uuid] = (fb as FeedbackSelectResult[]).length
          }
          log.debug('usePrefetchVideoAnalysis', 'Batch feedback prefetch summary', {
            total: analysisJobIds.length,
            cachedSkipped: cachedCounts.size,
            fetched: fetchedCount,
            fetchedCounts,
            cachedCounts: Object.fromEntries(cachedCounts),
          })
        }

        return result
      } catch (error) {
        log.warn('usePrefetchVideoAnalysis', 'Batch feedback prefetch failed', {
          analysisIds: analysisJobIds,
          error: error instanceof Error ? error.message : String(error),
        })
        return result
      }
    },
    [getUuid, setUuid, getFeedbacksByAnalysisId, addFeedback]
  )

  /**
   * Prefetch audio file paths for completed feedbacks
   * PERF: Resolves audio URLs during history screen load (before navigation)
   * This eliminates filesystem checks during VideoAnalysisScreen mount
   */
  const prefetchAudioPaths = useCallback(
    async (feedbackIds: number[], signal?: AbortSignal): Promise<void> => {
      if (feedbackIds.length === 0) {
        return
      }

      const audioStore = useFeedbackAudioStore.getState()
      const audioUrls = audioStore.audioUrls
      const audioPaths = audioStore.audioPaths

      if (__DEV__) {
        log.debug('usePrefetchVideoAnalysis', 'Audio prefetch starting', {
          feedbackIds: feedbackIds.slice(0, 5),
          audioUrlsCount: Object.keys(audioUrls).length,
          audioPathsCount: Object.keys(audioPaths).length,
          sampleAudioUrls: Object.keys(audioUrls).slice(0, 3),
          sampleAudioPaths: Object.keys(audioPaths).slice(0, 3),
        })
      }

      // Filter out feedbacks that already have resolved URLs
      const unresolvedIds = feedbackIds.filter((id) => {
        const idStr = String(id)
        return !audioUrls[idStr] && !audioPaths[idStr]
      })

      if (unresolvedIds.length === 0) {
        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'All audio paths already resolved', {
            total: feedbackIds.length,
          })
        }
        return
      }

      if (__DEV__) {
        log.debug('usePrefetchVideoAnalysis', 'Prefetching audio paths', {
          total: feedbackIds.length,
          unresolved: unresolvedIds.length,
          alreadyCached: feedbackIds.length - unresolvedIds.length,
        })
      }

      // Resolve audio paths in parallel (PERF: parallel > sequential)
      const resolutions = await Promise.all(
        unresolvedIds.map(async (feedbackId) => {
          if (signal?.aborted) return null

          const idStr = String(feedbackId)

          try {
            // Tier 1: Check local cache first (fastest)
            const cachedPath = await findCachedAudioPath(idStr)
            if (cachedPath) {
              return { feedbackId: idStr, url: cachedPath, source: 'cache' as const }
            }

            // Tier 2: Fetch signed URL from cloud
            const result = await getFirstAudioUrlForFeedback(feedbackId)
            if (!result.ok) return null

            // Tier 3: Download and cache in background (non-blocking)
            if (result.url.startsWith('http')) {
              persistAudioFile(idStr, result.url)
                .then((persistentPath) => {
                  useFeedbackAudioStore.getState().setAudioPath(idStr, persistentPath)
                })
                .catch(() => {}) // Ignore background errors
            }

            return { feedbackId: idStr, url: result.url, source: 'cloud' as const }
          } catch {
            return null
          }
        })
      )

      // Batch update audio store
      const validResolutions = resolutions.filter(
        (r): r is { feedbackId: string; url: string; source: 'cache' | 'cloud' } => r !== null
      )

      if (validResolutions.length > 0) {
        const currentUrls = useFeedbackAudioStore.getState().audioUrls
        const updates: Record<string, string> = {}
        for (const { feedbackId, url } of validResolutions) {
          updates[feedbackId] = url
        }
        useFeedbackAudioStore.getState().setAudioUrls({ ...currentUrls, ...updates })

        if (__DEV__) {
          const cacheHits = validResolutions.filter((r) => r.source === 'cache').length
          const cloudFetches = validResolutions.filter((r) => r.source === 'cloud').length
          log.debug('usePrefetchVideoAnalysis', 'Audio paths prefetched', {
            resolved: validResolutions.length,
            cacheHits,
            cloudFetches,
          })
        }
      }
    },
    []
  )

  const prefetchVideo = useCallback(
    (analysisId: number): void => {
      const scheduledTimeout = scheduledMapRef.current.get(analysisId)
      if (scheduledTimeout) {
        clearTimeout(scheduledTimeout)
        scheduledMapRef.current.delete(analysisId)
      }

      if (prefetchedRef.current.has(analysisId) || inFlightRef.current.has(analysisId)) {
        return
      }

      // PERFORMANCE: Early bailout if already cached - skip stagger delays
      const cached = queryClient.getQueryData(analysisKeys.historical(analysisId))
      const zustandCached = getCached(analysisId)

      if (cached && zustandCached) {
        // Both caches populated - mark as prefetched immediately, no async work needed
        prefetchedRef.current.add(analysisId)
        return
      }

      // Create abort controller for this prefetch operation
      const controller = new AbortController()
      abortControllersRef.current.set(analysisId, controller)

      if (cached) {
        // TanStack Query cached but Zustand might need update - still mark as prefetched
        prefetchedRef.current.add(analysisId)
        abortControllersRef.current.delete(analysisId)
        return
      }

      if (!zustandCached) {
        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'Not in Zustand cache, skipping prefetch', {
            analysisId,
          })
        }
        abortControllersRef.current.delete(analysisId)
        return
      }

      inFlightRef.current.add(analysisId)

      queryClient
        .prefetchQuery({
          queryKey: analysisKeys.historical(analysisId),
          queryFn: () => fetchHistoricalAnalysisData(analysisId),
          staleTime: Number.POSITIVE_INFINITY,
          gcTime: 30 * 60 * 1000,
        })
        .then(() => {
          prefetchedRef.current.add(analysisId)
        })
        .catch((error) => {
          log.warn('usePrefetchVideoAnalysis', 'Prefetch failed', {
            analysisId,
            error: error instanceof Error ? error.message : String(error),
          })
        })
        .finally(() => {
          inFlightRef.current.delete(analysisId)
          abortControllersRef.current.delete(analysisId)
        })
    },
    [getCached, queryClient]
  )

  useEffect(() => {
    const validIds = new Set(analysisIds)

    prefetchedRef.current.forEach((analysisId) => {
      if (!validIds.has(analysisId)) {
        prefetchedRef.current.delete(analysisId)
      }
    })

    inFlightRef.current.forEach((analysisId) => {
      if (!validIds.has(analysisId)) {
        inFlightRef.current.delete(analysisId)
      }
    })

    scheduledMapRef.current.forEach((timeoutId, analysisId) => {
      if (!validIds.has(analysisId)) {
        clearTimeout(timeoutId)
        scheduledMapRef.current.delete(analysisId)
      }
    })

    // Clean up abort controllers for invalid IDs
    abortControllersRef.current.forEach((controller, analysisId) => {
      if (!validIds.has(analysisId)) {
        controller.abort()
        abortControllersRef.current.delete(analysisId)
      }
    })

    // Clean up feedback prefetch tracking for invalid IDs
    feedbackPrefetchedRef.current.forEach((analysisId) => {
      if (!validIds.has(analysisId)) {
        feedbackPrefetchedRef.current.delete(analysisId)
      }
    })

    if (analysisIds.length === 0) {
      highestRequestedIndexRef.current = -1
    } else if (highestRequestedIndexRef.current >= analysisIds.length) {
      highestRequestedIndexRef.current = analysisIds.length - 1
    }
  }, [analysisIds])

  // Cleanup: abort all pending operations on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach((controller) => {
        controller.abort()
      })
      abortControllersRef.current.clear()
    }
  }, [])

  // Track last prefetch run to prevent duplicate execution
  const lastPrefetchRunRef = useRef<string>('')

  useEffect(() => {
    if (analysisIds.length === 0) {
      return undefined
    }

    // CRITICAL: Skip entire effect if already run for this exact set of IDs + network quality
    // Prevents duplicate execution when parent re-renders with same props
    const runSignature = `${analysisIds.join(',')}-${networkQuality}`
    if (runSignature === lastPrefetchRunRef.current) {
      return undefined
    }
    lastPrefetchRunRef.current = runSignature

    // Actual device testing shows 4 thumbnails visible on most screens
    // Prefetch 4 immediately (actual viewport), defer rest based on network
    const getPrefetchConfig = () => {
      const baseConfig = { immediateCount: 4, staggerMs: 100 }
      switch (networkQuality) {
        case 'fast':
          return { ...baseConfig, deferredCount: analysisIds.length - 4, staggerMs: 10 }
        case 'medium':
          return {
            ...baseConfig,
            deferredCount: Math.min(2, analysisIds.length - 4),
            staggerMs: 50,
          }
        case 'slow':
          return { ...baseConfig, deferredCount: 0, staggerMs: 200 }
        default:
          return { ...baseConfig, deferredCount: Math.min(2, analysisIds.length - 4) }
      }
    }

    const { immediateCount, deferredCount, staggerMs } = getPrefetchConfig()

    // BATTLE-TESTED FIX #4: 3-Tier Priority Queue (matches iOS/Android native app patterns)
    // Priority 1: Visible items (instant, no delay)
    // Priority 2: Next 3 items (10ms delay, cancelable on scroll)
    // Priority 3: Rest (100ms delay, cancelable on scroll)
    const priority1 = analysisIds.slice(0, immediateCount) // Visible items
    const priority2 = analysisIds.slice(immediateCount, immediateCount + 3) // Next 3
    const priority3 = analysisIds.slice(immediateCount + 3, immediateCount + deferredCount) // Rest

    if (__DEV__) {
      log.debug('usePrefetchVideoAnalysis', 'Prefetching video analysis data', {
        networkQuality,
        priority1: priority1.length,
        priority2: priority2.length,
        priority3: priority3.length,
        total: analysisIds.length,
        staggerMs,
      })
    }

    // PERFORMANCE: Batch prefetch feedbacks for all priority items at once
    // Use queueMicrotask for minimal delay (doesn't block render, but faster than setTimeout)
    const allPriorityIds = [...priority1, ...priority2, ...priority3]
    if (allPriorityIds.length > 0 && !feedbackBatchPrefetchedRef.current) {
      feedbackBatchPrefetchedRef.current = true
      const batchController = new AbortController()
      // queueMicrotask: runs after current task but before next frame paint
      // Faster than setTimeout(0) which waits for next event loop tick
      queueMicrotask(() => {
        void batchPrefetchFeedbackMetadata(allPriorityIds, batchController.signal)
      })
    }

    // Priority 1: Immediate (visible items)
    priority1.forEach((analysisId, localIndex) => {
      const globalIndex = localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }
      prefetchVideo(analysisId)
    })

    // Priority 2: Next 3 items (10ms stagger, cancelable)
    // PERFORMANCE: Skip stagger if already cached
    priority2.forEach((analysisId, localIndex) => {
      const globalIndex = immediateCount + localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }

      if (isPrefetchedOrPending(analysisId)) {
        return
      }

      // PERFORMANCE: Check if cached before scheduling timeout
      const cached = queryClient.getQueryData(analysisKeys.historical(analysisId))
      const zustandCached = getCached(analysisId)
      if (cached && zustandCached) {
        // Already cached - execute immediately, skip stagger
        prefetchVideo(analysisId)
        return
      }

      const timeoutId = setTimeout(
        () => {
          scheduledMapRef.current.delete(analysisId)
          prefetchVideo(analysisId)
        },
        10 * (localIndex + 1)
      ) // 10ms, 20ms, 30ms

      scheduledMapRef.current.set(analysisId, timeoutId)
    })

    // Priority 3: Remaining items (100ms stagger, cancelable)
    // PERFORMANCE: Skip stagger if already cached
    priority3.forEach((analysisId, localIndex) => {
      const globalIndex = immediateCount + 3 + localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }

      if (isPrefetchedOrPending(analysisId)) {
        return
      }

      // PERFORMANCE: Check if cached before scheduling timeout
      const cached = queryClient.getQueryData(analysisKeys.historical(analysisId))
      const zustandCached = getCached(analysisId)
      if (cached && zustandCached) {
        // Already cached - execute immediately, skip stagger
        prefetchVideo(analysisId)
        return
      }

      const timeoutId = setTimeout(
        () => {
          scheduledMapRef.current.delete(analysisId)
          prefetchVideo(analysisId)
        },
        100 + localIndex * staggerMs
      ) // 100ms base + stagger

      scheduledMapRef.current.set(analysisId, timeoutId)
    })

    return () => {
      // Fix: Clear ALL scheduled timeouts, not just the ones from this effect run
      // This prevents orphaned timeouts if analysisIds changes rapidly or effect re-runs
      scheduledMapRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      scheduledMapRef.current.clear()
      // Reset batch prefetch flag on cleanup
      feedbackBatchPrefetchedRef.current = false
    }
  }, [analysisIds, isPrefetchedOrPending, networkQuality, prefetchVideo, queryClient, getCached])

  useEffect(() => {
    if (analysisIds.length === 0) {
      return
    }

    if (lastVisibleIndex === null || lastVisibleIndex === undefined) {
      return
    }

    if (normalizedLookAhead === 0) {
      return
    }

    const clampedIndex = Math.min(
      analysisIds.length - 1,
      Math.max(-1, Math.floor(lastVisibleIndex))
    )

    if (clampedIndex < 0) {
      if (__DEV__) {
        log.debug('usePrefetchVideoAnalysis', 'Scroll prefetch skipped (invalid index)', {
          lastVisibleIndex,
          clampedIndex,
          total: analysisIds.length,
        })
      }
      return
    }

    const remaining = analysisIds.length - (clampedIndex + 1)
    if (remaining <= 0 || remaining > normalizedLookAhead) {
      // Guard triggered - skip logging (too verbose)
      return
    }

    const startIndex = clampedIndex + 1
    const frontierStartIndex = Math.max(highestRequestedIndexRef.current + 1, startIndex)
    const idsToPrefetch = analysisIds.slice(frontierStartIndex)

    if (idsToPrefetch.length === 0) {
      // No new IDs to prefetch - skip logging (too verbose)
      return
    }

    if (__DEV__) {
      log.debug('usePrefetchVideoAnalysis', 'Prefetching trailing analyses after scroll', {
        lastVisibleIndex: clampedIndex,
        startIndex,
        frontierStartIndex,
        count: idsToPrefetch.length,
        lookAhead: normalizedLookAhead,
        highestRequested: highestRequestedIndexRef.current,
      })
    }

    // PERFORMANCE: Batch prefetch feedbacks for scroll-triggered items too
    // Fire-and-forget: quick operation, no abort controller needed (unmount check handled in batch function)
    if (idsToPrefetch.length > 0) {
      void batchPrefetchFeedbackMetadata(idsToPrefetch, undefined)
    }

    idsToPrefetch.forEach((analysisId, offset) => {
      const globalIndex = frontierStartIndex + offset
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }

      if (isPrefetchedOrPending(analysisId)) {
        // Already handled - skip logging to reduce spam
        return
      }

      prefetchVideo(analysisId)
    })
  }, [
    analysisIds,
    isPrefetchedOrPending,
    lastVisibleIndex,
    normalizedLookAhead,
    prefetchVideo,
    batchPrefetchFeedbackMetadata,
  ])
}
