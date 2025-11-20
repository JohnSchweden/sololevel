import { log } from '@my/logging'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Safely update TanStack Query cache with error handling
 * Logs errors but doesn't throw to prevent breaking the calling code
 */
export function safeSetQueryData<TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: TData | ((old: TData | undefined) => TData),
  context?: string
): void {
  try {
    queryClient.setQueryData(queryKey, data)
  } catch (error) {
    log.error('safeCacheUpdate', 'Failed to update cache', {
      error: error instanceof Error ? error.message : String(error),
      queryKey: JSON.stringify(queryKey),
      context: context ?? 'unknown',
    })
    // Don't throw - cache updates are best-effort
  }
}

/**
 * Safely update multiple cache entries for a job
 * Updates both job-by-id and job-by-video-id entries
 */
export function safeUpdateJobCache<TJob extends { id: number; video_recording_id: number }>(
  queryClient: QueryClient,
  job: TJob,
  analysisKeys: {
    job: (id: number) => readonly unknown[]
    jobByVideo: (videoId: number) => readonly unknown[]
  },
  context?: string
): void {
  try {
    queryClient.setQueryData(analysisKeys.job(job.id), job)
    queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
  } catch (error) {
    log.error('safeCacheUpdate', 'Failed to update job cache', {
      error: error instanceof Error ? error.message : String(error),
      jobId: job.id,
      videoRecordingId: job.video_recording_id,
      context: context ?? 'unknown',
    })
    // Don't throw - cache updates are best-effort
  }
}
