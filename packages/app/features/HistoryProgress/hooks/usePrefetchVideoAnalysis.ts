import { getAnalysisIdForJobId, supabase } from '@my/api'
import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { resolveHistoricalVideoUri } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import { useFeedbackStatusStore } from '../../VideoAnalysis/stores/feedbackStatus'
import { useVideoHistoryStore } from '../stores/videoHistory'

/**
 * Prefetch video analysis data for videos when history screen loads
 *
 * Strategy:
 * - Immediately prefetch top 3 videos (visible without scrolling)
 * - Deferred prefetch of remaining videos (after 2s delay)
 * - Pre-resolve video URIs (signed URLs) to eliminate loading delay on tap
 * - Prefetch feedback metadata (lightweight, no audio URLs)
 * - Uses same queryFn logic as useHistoricalAnalysis, so Zustand cache is leveraged
 *
 * Benefits:
 * - Instant navigation when user taps thumbnail (no loading state)
 * - Instant feedback display (no loading spinner)
 * - Signed URLs cached for 1 hour (low risk of waste)
 * - Analysis data already in Zustand cache (cheap operation)
 *
 * Prefetch includes:
 * 1. Video URIs (signed URLs) - expensive operation
 * 2. Feedback metadata - lightweight database query
 * 3. Skips audio URLs - resolved on-demand when user taps feedback
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

      // Prefetch using the same queryKey and queryFn logic as useHistoricalAnalysis
      // This will resolve video URIs (signed URLs) which is the expensive operation
      queryClient
        .prefetchQuery({
          queryKey: ['analysis', 'historical', analysisId],
          queryFn: async () => {
            // Reuse the same queryFn logic from useHistoricalAnalysis
            // Access Zustand store directly (works outside React components)
            const cached = useVideoHistoryStore.getState().getCached(analysisId)

            if (!cached) {
              return { analysis: null }
            }

            // If video URI is already a local file, return immediately
            if (cached.videoUri?.startsWith('file://')) {
              return { analysis: cached }
            }

            // Resolve video URI (this is the expensive operation we're prefetching)
            // This will generate signed URLs and cache them
            const resolvedVideoUri = await resolveHistoricalVideoUri(
              cached.storagePath ?? cached.videoUri ?? null,
              {
                analysisId,
              }
            )

            const updatedCached = { ...cached, videoUri: resolvedVideoUri }

            log.debug('usePrefetchVideoAnalysis', 'Prefetched video URI resolution', {
              analysisId,
              hasVideoUri: !!updatedCached.videoUri,
              urlReused: resolvedVideoUri !== cached.videoUri,
            })

            // Return data matching useHistoricalAnalysis format
            return {
              analysis: updatedCached,
              pendingCacheUpdates:
                resolvedVideoUri !== cached.videoUri ? { videoUri: resolvedVideoUri } : undefined,
            }
          },
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
