import { getAnalysisIdForJobId, supabase } from '@my/api'
import type { Database } from '@my/api'
import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchHistoricalAnalysisData } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import {
  type FeedbackStatusData,
  useFeedbackStatusStore,
} from '../../VideoAnalysis/stores/feedbackStatus'
import { useVideoHistoryStore } from '../stores/videoHistory'
import { useNetworkQuality } from './useNetworkQuality'

/**
 * Prefetch video analysis data for videos when history screen loads
 *
 * Strategy:
 * - Immediately prefetch top 3 videos (visible without scrolling)
 * - Immediately prefetch remaining videos with 10ms stagger (prevents overwhelming system)
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
 *
 * @param analysisIds - Array of analysis IDs to prefetch (typically up to 10)
 */
export function usePrefetchVideoAnalysis(analysisIds: number[]): void {
  const queryClient = useQueryClient()
  const getCached = useVideoHistoryStore((state) => state.getCached)
  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)
  const addFeedback = useFeedbackStatusStore((state) => state.addFeedback)
  const getFeedbacksByAnalysisId = useFeedbackStatusStore((state) => state.getFeedbacksByAnalysisId)

  // Adaptive prefetch based on network quality
  const networkQuality = useNetworkQuality()

  /**
   * Prefetch feedback metadata for a single analysis
   * Lightweight: Only fetches feedback data, not audio URLs
   * @returns The resolved analysis UUID, or null if not found
   */
  const prefetchFeedbackMetadata = async (analysisJobId: number): Promise<string | null> => {
    try {
      // Check multiple cache layers (fastest first):
      // 1. TanStack Query cache (in-memory, from current session)
      // 2. Persisted videoHistory store (survives app restarts)
      let cachedUuid = queryClient.getQueryData<string>(['analysis', 'uuid', analysisJobId])
      if (!cachedUuid) {
        cachedUuid = getUuid(analysisJobId) ?? undefined
        if (cachedUuid) {
          // Restore to TanStack Query cache for faster subsequent lookups
          queryClient.setQueryData(['analysis', 'uuid', analysisJobId], cachedUuid)
          log.debug('usePrefetchVideoAnalysis', 'Using persisted UUID for feedback prefetch', {
            analysisJobId,
            analysisUuid: cachedUuid,
          })
        }
      }

      // Resolve analysis UUID from job ID (only if not cached)
      const analysisUuid =
        cachedUuid ??
        (await getAnalysisIdForJobId(analysisJobId, {
          maxRetries: 2, // Fewer retries for prefetch (non-critical)
          baseDelay: 200,
        }))

      // Cache UUID in both TanStack Query (fast) and persisted store (survives restarts)
      if (analysisUuid && !cachedUuid) {
        queryClient.setQueryData(['analysis', 'uuid', analysisJobId], analysisUuid)
        setUuid(analysisJobId, analysisUuid)
        log.debug('usePrefetchVideoAnalysis', 'Cached UUID for future lookups', {
          analysisJobId,
          analysisUuid,
        })
      }

      if (!analysisUuid) {
        log.debug(
          'usePrefetchVideoAnalysis',
          'Analysis UUID not found, skipping feedback prefetch',
          {
            analysisJobId,
          }
        )
        return null
      }

      // Check if feedbacks already exist in store (may be from persisted cache)
      const cachedFeedbacks = getFeedbacksByAnalysisId(analysisUuid)
      if (cachedFeedbacks.length > 0) {
        log.debug('usePrefetchVideoAnalysis', 'Feedbacks already cached, skipping prefetch', {
          analysisJobId,
          analysisUuid,
          count: cachedFeedbacks.length,
          source: 'persisted-or-memory',
        })
        return analysisUuid
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

        log.debug('usePrefetchVideoAnalysis', 'Prefetched feedback metadata', {
          analysisJobId,
          analysisUuid,
          count: feedbacksData.length,
        })
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

  useEffect(() => {
    if (analysisIds.length === 0) {
      return undefined
    }

    // Adaptive prefetch based on network quality:
    // - Fast network: Prefetch all videos with minimal stagger (10ms)
    // - Medium network: Prefetch top 5 videos with moderate stagger (50ms)
    // - Slow network: Only prefetch top 3 videos with longer stagger (200ms)
    // - Unknown: Conservative approach (top 3, 100ms stagger)
    const getPrefetchConfig = () => {
      switch (networkQuality) {
        case 'fast':
          return {
            immediateCount: 3,
            deferredCount: analysisIds.length - 3,
            staggerMs: 10,
          }
        case 'medium':
          return {
            immediateCount: 3,
            deferredCount: Math.min(2, analysisIds.length - 3), // Top 5 total
            staggerMs: 50,
          }
        case 'slow':
          return {
            immediateCount: 3,
            deferredCount: 0, // Only top 3
            staggerMs: 200,
          }
        default: // 'unknown'
          return {
            immediateCount: 3,
            deferredCount: Math.min(2, analysisIds.length - 3), // Conservative: top 5
            staggerMs: 100,
          }
      }
    }

    const { immediateCount, deferredCount, staggerMs } = getPrefetchConfig()
    const immediatePrefetch = analysisIds.slice(0, immediateCount)
    const deferredPrefetch = analysisIds.slice(immediateCount, immediateCount + deferredCount)

    log.debug('usePrefetchVideoAnalysis', 'Prefetching video analysis data', {
      networkQuality,
      immediate: immediatePrefetch.length,
      deferred: deferredPrefetch.length,
      total: analysisIds.length,
      staggerMs,
    })

    // Helper function to prefetch a single video
    const prefetchVideo = (analysisId: number): void => {
      // Check if already cached in TanStack Query
      const cached = queryClient.getQueryData(['analysis', 'historical', analysisId])
      if (cached) {
        log.debug('usePrefetchVideoAnalysis', 'Query already cached, skipping', {
          analysisId,
        })
        return
      }

      // Check if analysis data exists in Zustand cache
      const zustandCached = getCached(analysisId)
      if (!zustandCached) {
        log.debug('usePrefetchVideoAnalysis', 'Not in Zustand cache, skipping prefetch', {
          analysisId,
        })
        return
      }

      // Prefetch using the same queryKey and queryFn as useHistoricalAnalysis
      // This executes ALL expensive operations (database fetch, URI resolution, file checks)
      // during prefetch, so when user navigates, data is already cached and ready
      // TanStack Query automatically deduplicates - if user navigates while prefetch is in progress,
      // it reuses the same promise instead of starting a duplicate fetch
      queryClient
        .prefetchQuery({
          queryKey: ['analysis', 'historical', analysisId],
          queryFn: () => fetchHistoricalAnalysisData(analysisId), // ✅ Same function as useHistoricalAnalysis
          staleTime: Number.POSITIVE_INFINITY,
          gcTime: 30 * 60 * 1000,
        })
        .catch((error) => {
          log.warn('usePrefetchVideoAnalysis', 'Prefetch failed', {
            analysisId,
            error: error instanceof Error ? error.message : String(error),
          })
        })

      // Also prefetch feedback metadata (non-blocking, lightweight)
      void prefetchFeedbackMetadata(analysisId)
    }

    // Prefetch top 3 immediately (visible videos)
    immediatePrefetch.forEach(prefetchVideo)

    // Prefetch remaining videos with adaptive stagger based on network quality
    // This prevents overwhelming the system on slow connections while maximizing throughput on fast connections
    // If user navigates before stagger completes, TanStack Query deduplication handles it
    deferredPrefetch.forEach((analysisId, index) => {
      setTimeout(() => {
        prefetchVideo(analysisId)
      }, index * staggerMs)
    })

    return undefined
  }, [analysisIds, queryClient, getCached, addFeedback, getFeedbacksByAnalysisId, networkQuality])
}
