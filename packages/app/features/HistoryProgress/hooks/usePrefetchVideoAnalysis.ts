import { analysisKeys } from '@app/hooks/analysisKeys'
import { safeSetQueryData } from '@app/utils/safeCacheUpdate'
import { getAnalysisIdForJobId, supabase } from '@my/api'
import type { Database } from '@my/api'
import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { fetchHistoricalAnalysisData } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import {
  type FeedbackStatusData,
  useFeedbackStatusStore,
} from '../../VideoAnalysis/stores/feedbackStatus'
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
  // CRITICAL FIX: Use ref for prefetchFeedbackMetadata to avoid dependency chain issue.
  // Without this, prefetchFeedbackMetadata (defined without useCallback) gets new reference
  // on every render, causing prefetchVideo to change, triggering the effect to re-run,
  // which cancels all scheduled Priority 2 timeouts (videos 5-7).
  const prefetchFeedbackMetadataRef = useRef<
    ((analysisJobId: number, signal?: AbortSignal) => Promise<string | null>) | null
  >(null)
  const getCached = useVideoHistoryStore((state) => state.getCached)
  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)
  const addFeedback = useFeedbackStatusStore((state) => state.addFeedback)
  const getFeedbacksByAnalysisId = useFeedbackStatusStore((state) => state.getFeedbacksByAnalysisId)

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
   * Prefetch feedback metadata for a single analysis
   * Lightweight: Only fetches feedback data, not audio URLs
   * @returns The resolved analysis UUID, or null if not found
   */
  const prefetchFeedbackMetadata = async (
    analysisJobId: number,
    signal?: AbortSignal
  ): Promise<string | null> => {
    try {
      // CRITICAL: Skip if already attempted to prevent duplicate prefetch on re-render
      if (feedbackPrefetchedRef.current.has(analysisJobId)) {
        return null
      }

      if (signal?.aborted) {
        return null
      }

      // Check multiple cache layers (fastest first):
      // 1. TanStack Query cache (in-memory, from current session)
      // 2. Persisted videoHistory store (survives app restarts)
      let cachedUuid = queryClient.getQueryData<string>(analysisKeys.uuid(analysisJobId))
      if (!cachedUuid) {
        cachedUuid = getUuid(analysisJobId) ?? undefined
        if (cachedUuid) {
          // Restore to TanStack Query cache for faster subsequent lookups
          safeSetQueryData(
            queryClient,
            analysisKeys.uuid(analysisJobId),
            cachedUuid,
            'usePrefetchVideoAnalysis.restore'
          )
          if (__DEV__) {
            log.debug('usePrefetchVideoAnalysis', 'Using persisted UUID for feedback prefetch', {
              analysisJobId,
              analysisUuid: cachedUuid,
            })
          }
        }
      }

      if (signal?.aborted) {
        return null
      }

      // Resolve analysis UUID from job ID (only if not cached)
      const analysisUuid =
        cachedUuid ??
        (await getAnalysisIdForJobId(analysisJobId, {
          signal,
          maxRetries: 2, // Fewer retries for prefetch (non-critical)
          baseDelay: 200,
        }))

      // Cache UUID in both TanStack Query (fast) and persisted store (survives restarts)
      if (analysisUuid && !cachedUuid) {
        safeSetQueryData(
          queryClient,
          analysisKeys.uuid(analysisJobId),
          analysisUuid,
          'usePrefetchVideoAnalysis.cache'
        )
        setUuid(analysisJobId, analysisUuid)
        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'Cached UUID for future lookups', {
            analysisJobId,
            analysisUuid,
          })
        }
      }

      if (!analysisUuid) {
        if (__DEV__) {
          log.debug(
            'usePrefetchVideoAnalysis',
            'Analysis UUID not found, skipping feedback prefetch',
            {
              analysisJobId,
            }
          )
        }
        feedbackPrefetchedRef.current.add(analysisJobId) // Mark as attempted
        return null
      }

      // Check if feedbacks already exist in store (may be from persisted cache)
      const cachedFeedbacks = getFeedbacksByAnalysisId(analysisUuid)
      if (cachedFeedbacks.length > 0) {
        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'Feedbacks already cached, skipping prefetch', {
            analysisJobId,
            analysisUuid,
            count: cachedFeedbacks.length,
            source: 'persisted-or-memory',
          })
        }
        feedbackPrefetchedRef.current.add(analysisJobId) // Mark as attempted
        return analysisUuid
      }

      // Mark as attempted before network request
      feedbackPrefetchedRef.current.add(analysisJobId)

      // Check if aborted before making network request
      if (signal?.aborted) {
        return null
      }

      // Fetch existing feedbacks from database (same query as subscribeToAnalysisFeedbacks)
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
      >

      const { data: feedbacksData, error: fetchError } = await supabase
        .from('analysis_feedback')
        .select(
          'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
        )
        .eq('analysis_id', analysisUuid)
        .order('created_at', { ascending: true })
        .returns<FeedbackSelectResult[]>()

      // Check if aborted after query completes (before processing results)
      if (signal?.aborted) {
        return null
      }

      if (fetchError) {
        log.warn('usePrefetchVideoAnalysis', 'Failed to prefetch feedback metadata', {
          analysisJobId,
          analysisUuid,
          error: fetchError.message,
        })
        return null
      }

      // Add feedbacks to store (without subscription - that happens when screen mounts)
      if (feedbacksData && feedbacksData.length > 0) {
        feedbacksData.forEach((feedback) => {
          // Map database row to FeedbackStatusData format
          addFeedback({
            id: feedback.id,
            analysis_id: feedback.analysis_id,
            message: feedback.message,
            category: feedback.category,
            timestamp_seconds: feedback.timestamp_seconds,
            confidence: feedback.confidence ?? 0,
            ssml_status: (feedback.ssml_status ?? 'queued') as FeedbackStatusData['ssml_status'],
            audio_status: (feedback.audio_status ?? 'queued') as FeedbackStatusData['audio_status'],
            ssml_attempts: feedback.ssml_attempts,
            audio_attempts: feedback.audio_attempts,
            ssml_last_error: feedback.ssml_last_error,
            audio_last_error: feedback.audio_last_error,
            ssml_updated_at: feedback.ssml_updated_at,
            audio_updated_at: feedback.audio_updated_at,
            created_at: feedback.created_at,
            updated_at: feedback.created_at, // analysis_feedback table doesn't have updated_at column, use created_at
          })
        })

        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'Prefetched feedback metadata', {
            analysisJobId,
            analysisUuid,
            count: feedbacksData.length,
          })
        }
      }

      return analysisUuid
    } catch (error) {
      log.warn('usePrefetchVideoAnalysis', 'Feedback prefetch failed', {
        analysisJobId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  // Store latest version in ref (updates on each render, but ref is stable)
  prefetchFeedbackMetadataRef.current = prefetchFeedbackMetadata

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

      // Create abort controller for this prefetch operation
      const controller = new AbortController()
      abortControllersRef.current.set(analysisId, controller)

      const cached = queryClient.getQueryData(analysisKeys.historical(analysisId))
      if (cached) {
        prefetchedRef.current.add(analysisId)
        if (__DEV__) {
          log.debug('usePrefetchVideoAnalysis', 'Query already cached, skipping', {
            analysisId,
          })
        }
        // Pass abort signal to allow cancellation on unmount
        // Use ref to avoid dependency issues that cancel Priority 2 prefetches
        void prefetchFeedbackMetadataRef.current?.(analysisId, controller.signal)
        return
      }

      const zustandCached = getCached(analysisId)
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

      // Pass abort signal to allow cancellation on unmount
      // Use ref to avoid dependency issues that cancel Priority 2 prefetches
      void prefetchFeedbackMetadataRef.current?.(analysisId, controller.signal)
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
      switch (networkQuality) {
        case 'fast':
          return {
            immediateCount: 4,
            deferredCount: analysisIds.length - 4,
            staggerMs: 10,
          }
        case 'medium':
          return {
            immediateCount: 4,
            deferredCount: Math.min(2, analysisIds.length - 4), // Top 6 total
            staggerMs: 50,
          }
        case 'slow':
          return {
            immediateCount: 4,
            deferredCount: 0, // Only top 4
            staggerMs: 200,
          }
        default:
          return {
            immediateCount: 4,
            deferredCount: Math.min(2, analysisIds.length - 4),
            staggerMs: 100,
          }
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

    // Priority 1: Immediate (visible items)
    priority1.forEach((analysisId, localIndex) => {
      const globalIndex = localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }
      prefetchVideo(analysisId)
    })

    // Priority 2: Next 3 items (10ms stagger, cancelable)
    priority2.forEach((analysisId, localIndex) => {
      const globalIndex = immediateCount + localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }

      if (isPrefetchedOrPending(analysisId)) {
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
    priority3.forEach((analysisId, localIndex) => {
      const globalIndex = immediateCount + 3 + localIndex
      if (globalIndex > highestRequestedIndexRef.current) {
        highestRequestedIndexRef.current = globalIndex
      }

      if (isPrefetchedOrPending(analysisId)) {
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
    }
  }, [analysisIds, isPrefetchedOrPending, networkQuality, prefetchVideo])

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
  }, [analysisIds, isPrefetchedOrPending, lastVisibleIndex, normalizedLookAhead, prefetchVideo])
}
