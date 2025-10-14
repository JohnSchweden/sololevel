import { useQuery } from '@tanstack/react-query'

import type { CachedAnalysis } from '@app/features/HistoryProgress/stores/videoHistory'
import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { getAnalysisJob, supabase } from '@my/api'
import { log } from '@my/logging'

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
        log.info('useHistoricalAnalysis', 'Returning cached analysis', {
          analysisId,
          hasVideoUri: !!cached.videoUri,
          videoUri: cached.videoUri,
          cachedAt: new Date(cached.cachedAt).toISOString(),
        })
        return cached
      }

      // Fallback to database - fetch job with video recording details
      const job = await getAnalysisJob(analysisId)

      if (!job) {
        return null
      }

      // Also fetch the video recording to get the video URI
      const { data: videoRecording, error: videoError } = await supabase
        .from('video_recordings')
        .select('id, filename, storage_path, duration_seconds, metadata')
        .eq('id', job.video_recording_id)
        .single()

      if (videoError) {
        log.error('useHistoricalAnalysis', 'Failed to fetch video recording', {
          videoRecordingId: job.video_recording_id,
          error: videoError.message,
        })
      }

      log.info('useHistoricalAnalysis', 'Fetched historical analysis data', {
        analysisId: job.id,
        videoRecordingId: job.video_recording_id,
        hasVideoRecording: !!videoRecording,
        videoFilename: videoRecording?.filename,
        videoStoragePath: videoRecording?.storage_path,
      })

      // Transform database job to cached analysis format
      // Cast Json types to proper structures (validated by database constraints)
      // Store storage_path directly - VideoAnalysisScreen will convert to public URL
      const cachedAnalysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> = {
        id: job.id,
        videoId: job.video_recording_id,
        userId: job.user_id,
        title: `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
        createdAt: job.created_at,
        results: job.results as CachedAnalysis['results'],
        poseData: job.pose_data ? (job.pose_data as CachedAnalysis['poseData']) : undefined,
        videoUri: videoRecording?.storage_path,
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
