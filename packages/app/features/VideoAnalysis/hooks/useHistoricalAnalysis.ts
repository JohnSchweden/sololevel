import { useQuery } from '@tanstack/react-query'

import type { CachedAnalysis } from '@app/features/HistoryProgress/stores/videoHistory'
import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { getAnalysisJob } from '@my/api'

/**
 * Hook for loading historical analysis data with cache-first strategy
 *
 * @param analysisId - The analysis job ID to load
 * @returns TanStack Query result with cached or fetched analysis data
 *
 * @example
 * ```ts
 * const { data, isLoading, error } = useHistoricalAnalysis(123)
 * ```
 */
export function useHistoricalAnalysis(analysisId: number | null) {
  const getCached = useVideoHistoryStore((state) => state.getCached)
  const addToCache = useVideoHistoryStore((state) => state.addToCache)

  return useQuery({
    queryKey: ['analysis', 'historical', analysisId],
    queryFn: async (): Promise<CachedAnalysis | null> => {
      if (!analysisId) {
        return null
      }

      // Check cache first
      const cached = getCached(analysisId)
      if (cached) {
        return cached
      }

      // Fallback to database
      const job = await getAnalysisJob(analysisId)

      if (!job) {
        return null
      }

      // Transform database job to cached analysis format
      // Cast Json types to proper structures (validated by database constraints)
      const cachedAnalysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> = {
        id: job.id,
        videoId: job.video_recording_id,
        userId: job.user_id,
        title: `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
        createdAt: job.created_at,
        results: job.results as CachedAnalysis['results'],
        poseData: job.pose_data ? (job.pose_data as CachedAnalysis['poseData']) : undefined,
      }

      // Update cache with fetched data
      addToCache(cachedAnalysis)

      // Return fresh cached entry (with cachedAt/lastAccessed added)
      return getCached(analysisId)
    },
    enabled: !!analysisId,
    staleTime: Number.POSITIVE_INFINITY, // Historical data doesn't change
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  })
}
