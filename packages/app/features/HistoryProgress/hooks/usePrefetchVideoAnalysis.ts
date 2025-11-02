import { getAnalysisIdForJobId, supabase } from '@my/api'
import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchHistoricalAnalysisData } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import { useFeedbackStatusStore } from '../../VideoAnalysis/stores/feedbackStatus'
import { useVideoHistoryStore } from '../stores/videoHistory'

/**
 * Prefetch video analysis data for videos when history screen loads
 *
 * Strategy:
 * - Immediately prefetch top 3 videos (visible without scrolling)
 * - Deferred prefetch of remaining videos (after 2s delay)
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
 *
 * Prefetch includes:
 * 1. Full analysis data fetch (database if cache miss)
 * 2. Video URI resolution (local file checks, signed URLs)
 * 3. Feedback metadata (lightweight database query)
 * 4. Skips audio URLs (resolved on-demand when user taps feedback)
 *
 * @param analysisIds - Array of analysis IDs to prefetch (typically up to 10)
 */
export function usePrefetchVideoAnalysis(analysisIds: number[]): void {
  const queryClient = useQueryClient()
  const getCached = useVideoHistoryStore((state) => state.getCached)
  const addFeedback = useFeedbackStatusStore((state) => state.addFeedback)
  const getFeedbacksByAnalysisId = useFeedbackStatusStore((state) => state.getFeedbacksByAnalysisId)

  /**
   * Prefetch feedback metadata for a single analysis
   * Lightweight: Only fetches feedback data, not audio URLs
   * @returns The resolved analysis UUID, or null if not found
   */
  const prefetchFeedbackMetadata = async (analysisJobId: number): Promise<string | null> => {
    try {
      // Resolve analysis UUID from job ID
      const analysisUuid = await getAnalysisIdForJobId(analysisJobId, {
        maxRetries: 2, // Fewer retries for prefetch (non-critical)
        baseDelay: 200,
      })

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

      // Check if feedbacks already exist in store
      const cachedFeedbacks = getFeedbacksByAnalysisId(analysisUuid)
      if (cachedFeedbacks.length > 0) {
        log.debug('usePrefetchVideoAnalysis', 'Feedbacks already cached, skipping prefetch', {
          analysisJobId,
          analysisUuid,
          count: cachedFeedbacks.length,
        })
        return analysisUuid
      }

      // Fetch existing feedbacks from database (same query as subscribeToAnalysisFeedbacks)
      const { data: feedbacksData, error: fetchError } = await (supabase as any)
        .from('analysis_feedback')
        .select(
          'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
        )
        .eq('analysis_id', analysisUuid)
        .order('created_at', { ascending: true })

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
        feedbacksData.forEach((feedback: any) => {
          addFeedback(feedback)
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

    // Immediately prefetch top 3 videos (visible without scrolling)
    const immediatePrefetch = analysisIds.slice(0, 3)
    // Deferred prefetch for remaining videos (after 2s delay or on scroll)
    const deferredPrefetch = analysisIds.slice(3)

    log.debug('usePrefetchVideoAnalysis', 'Prefetching video analysis data', {
      immediate: immediatePrefetch.length,
      deferred: deferredPrefetch.length,
      total: analysisIds.length,
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
      void prefetchFeedbackMetadata(analysisId).then((uuid) => {
        // Cache UUID mapping for synchronous lookup
        if (uuid) {
          queryClient.setQueryData(['analysis', 'uuid', analysisId], uuid)
        }
      })
    }

    // Prefetch top 3 immediately (visible videos)
    immediatePrefetch.forEach(prefetchVideo)

    // Prefetch remaining videos after 2s delay (non-blocking)
    if (deferredPrefetch.length > 0) {
      const timeoutId = setTimeout(() => {
        log.debug('usePrefetchVideoAnalysis', 'Starting deferred prefetch', {
          count: deferredPrefetch.length,
        })
        deferredPrefetch.forEach(prefetchVideo)
      }, 2000)

      return () => clearTimeout(timeoutId)
    }

    return undefined
  }, [analysisIds, queryClient, getCached, addFeedback, getFeedbacksByAnalysisId])
}
