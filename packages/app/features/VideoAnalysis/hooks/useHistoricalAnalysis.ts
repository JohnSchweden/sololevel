import { useQuery } from '@tanstack/react-query'

import type { CachedAnalysis } from '@app/features/HistoryProgress/stores/videoHistory'
import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { createSignedDownloadUrl, getAnalysisJob, supabase } from '@my/api'
import { log } from '@my/logging'
import { Platform } from 'react-native'

const getFileSystem = async () => {
  if (Platform.OS === 'web') {
    return null
  }

  const fs = await import('expo-file-system')
  return fs
}

const isAbsoluteUri = (uri: string) =>
  uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://')

async function tryResolveLocalUri(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) {
    return null
  }

  const localUri = useVideoHistoryStore.getState().getLocalUri(storagePath)
  if (!localUri) {
    return null
  }

  const fs = await getFileSystem()
  if (!fs) {
    return null
  }

  try {
    const fileInfo = await fs.getInfoAsync(localUri)
    if (fileInfo.exists) {
      return localUri
    }

    // Local file missing, clear stale mapping
    useVideoHistoryStore.getState().clearLocalUri(storagePath)
  } catch (error) {
    log.warn('useHistoricalAnalysis', 'Failed to stat cached local video', {
      storagePath,
      localUri,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return null
}

async function resolveHistoricalVideoUri(
  storagePath: string | null | undefined,
  context: { analysisId: number }
): Promise<string> {
  if (!storagePath) {
    return FALLBACK_VIDEO_URI
  }

  // Prefer locally cached file if available
  const localUri = await tryResolveLocalUri(storagePath)
  if (localUri) {
    log.info('useHistoricalAnalysis', 'Resolved video to local cache', {
      analysisId: context.analysisId,
      storagePath,
      localUri,
    })
    return localUri
  }

  if (storagePath === FALLBACK_VIDEO_URI || isAbsoluteUri(storagePath)) {
    return storagePath
  }

  const { data: signedResult, error: signedError } = await createSignedDownloadUrl(
    'raw',
    storagePath
  )

  if (signedError || !signedResult?.signedUrl) {
    log.error('useHistoricalAnalysis', 'Failed to create signed URL for historical video', {
      analysisId: context.analysisId,
      storagePath,
      error: typeof signedError === 'string' ? signedError : (signedError ?? 'unknown error'),
    })
    return FALLBACK_VIDEO_URI
  }

  return signedResult.signedUrl
}

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
  const updateCache = useVideoHistoryStore((state) => state.updateCache)

  return useQuery({
    queryKey: ['analysis', 'historical', analysisId],
    queryFn: async (): Promise<CachedAnalysis | null> => {
      if (!analysisId) {
        return null
      }

      // Check cache first
      const cached = getCached(analysisId)
      if (cached) {
        if (cached.videoUri?.startsWith('file://')) {
          return cached
        }

        const resolvedVideoUri = await resolveHistoricalVideoUri(
          cached.storagePath ?? cached.videoUri ?? null,
          {
            analysisId,
          }
        )

        if (resolvedVideoUri !== cached.videoUri) {
          updateCache(cached.id, { videoUri: resolvedVideoUri })
        }

        const updatedCached = { ...cached, videoUri: resolvedVideoUri }

        log.info('useHistoricalAnalysis', 'Returning cached analysis', {
          analysisId,
          hasVideoUri: !!updatedCached.videoUri,
          videoUri: updatedCached.videoUri,
          cachedAt: new Date(updatedCached.cachedAt).toISOString(),
        })

        return updatedCached
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
      const resolvedVideoUri = await resolveHistoricalVideoUri(
        videoRecording?.storage_path ?? null,
        {
          analysisId,
        }
      )

      const localMetadata = (videoRecording?.metadata as Record<string, unknown> | undefined) ?? {}
      if (videoRecording?.storage_path && typeof localMetadata.localUri === 'string') {
        useVideoHistoryStore
          .getState()
          .setLocalUri(videoRecording.storage_path, localMetadata.localUri)
      }

      const cachedAnalysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> = {
        id: job.id,
        videoId: job.video_recording_id,
        userId: job.user_id,
        title: `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
        createdAt: job.created_at,
        results: job.results as CachedAnalysis['results'],
        poseData: job.pose_data
          ? (job.pose_data as unknown as CachedAnalysis['poseData'])
          : undefined,
        videoUri: resolvedVideoUri,
        storagePath: videoRecording?.storage_path ?? undefined,
      }

      if (cachedAnalysis.storagePath && resolvedVideoUri.startsWith('file://')) {
        useVideoHistoryStore.getState().setLocalUri(cachedAnalysis.storagePath, resolvedVideoUri)
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
