import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import React from 'react'
import { Platform } from 'react-native'

import type { CachedAnalysis } from '@app/features/HistoryProgress/stores/videoHistory'
import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { createSignedDownloadUrl, getAnalysisJob, supabase } from '@my/api'
import { log } from '@my/logging'

const isAbsoluteUri = (uri: string) =>
  uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://')

/**
 * Signed URL cache for session reuse (Task 35 Module 2)
 * Stores signed URLs with expiry timestamps to reduce API calls and improve edge cache hit rate
 */
interface SignedUrlCacheEntry {
  signedUrl: string
  expiresAt: number
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>()

/**
 * Get cached signed URL if still valid, otherwise return null
 */
function getCachedSignedUrl(storagePath: string): string | null {
  const cached = signedUrlCache.get(storagePath)
  if (!cached) {
    return null
  }

  const now = Date.now()
  if (now >= cached.expiresAt) {
    // Expired, remove from cache
    signedUrlCache.delete(storagePath)
    return null
  }

  return cached.signedUrl
}

/**
 * Cache signed URL with TTL (slightly before actual expiry to prevent edge cases)
 */
function cacheSignedUrl(storagePath: string, signedUrl: string, ttlSeconds: number): void {
  const expiresAt = Date.now() + (ttlSeconds - 60) * 1000 // Expire 60s before actual TTL
  signedUrlCache.set(storagePath, { signedUrl, expiresAt })
}

async function tryResolveLocalUri(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath || Platform.OS === 'web') {
    return null
  }

  const localUri = useVideoHistoryStore.getState().getLocalUri(storagePath)
  if (!localUri) {
    return null
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri)
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
  context: { analysisId: number; localUriHint?: string }
): Promise<string> {
  if (!storagePath) {
    return FALLBACK_VIDEO_URI
  }

  // Prefer local URI from metadata hint (from video_recordings.metadata.localUri)
  if (context.localUriHint && Platform.OS !== 'web') {
    try {
      const fileInfo = await FileSystem.getInfoAsync(context.localUriHint)
      if (fileInfo.exists) {
        log.info('useHistoricalAnalysis', 'Resolved video to metadata local URI', {
          analysisId: context.analysisId,
          storagePath,
          localUri: context.localUriHint,
        })
        return context.localUriHint
      }
    } catch (error) {
      log.warn('useHistoricalAnalysis', 'Local URI from metadata not accessible', {
        storagePath,
        localUri: context.localUriHint,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Fallback to store cached URI
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

  // Check session cache for signed URL (Task 35 Module 2: Session reuse for edge cache benefits)
  const cachedSignedUrl = getCachedSignedUrl(storagePath)
  if (cachedSignedUrl) {
    log.info('useHistoricalAnalysis', 'Reusing cached signed URL', {
      analysisId: context.analysisId,
      storagePath,
      urlReused: true,
    })
    return cachedSignedUrl
  }

  // Generate new signed URL with 1-hour TTL
  const signedUrlTTL = 3600 // 1 hour
  const { data: signedResult, error: signedError } = await createSignedDownloadUrl(
    'raw',
    storagePath,
    signedUrlTTL
  )

  if (signedError || !signedResult?.signedUrl) {
    log.error('useHistoricalAnalysis', 'Failed to create signed URL for historical video', {
      analysisId: context.analysisId,
      storagePath,
      error: typeof signedError === 'string' ? signedError : (signedError ?? 'unknown error'),
    })
    return FALLBACK_VIDEO_URI
  }

  // Cache the signed URL for session reuse
  cacheSignedUrl(storagePath, signedResult.signedUrl, signedUrlTTL)

  log.info('useHistoricalAnalysis', 'Generated new signed URL', {
    analysisId: context.analysisId,
    storagePath,
    ttlSeconds: signedUrlTTL,
    urlReused: false,
  })

  return signedResult.signedUrl
}

/**
 * Internal data structure returned from query (before cache updates)
 */
interface HistoricalAnalysisData {
  analysis: CachedAnalysis | null
  pendingCacheUpdates?: {
    videoUri?: string
    localUriMappings?: Array<{ storagePath: string; localUri: string }>
  }
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
  const setLocalUri = useVideoHistoryStore((state) => state.setLocalUri)

  const query = useQuery({
    queryKey: ['analysis', 'historical', analysisId],
    queryFn: async (): Promise<HistoricalAnalysisData> => {
      if (!analysisId) {
        return { analysis: null }
      }

      // Check cache first
      const cached = getCached(analysisId)
      if (cached) {
        if (cached.videoUri?.startsWith('file://')) {
          return { analysis: cached }
        }

        const resolvedVideoUri = await resolveHistoricalVideoUri(
          cached.storagePath ?? cached.videoUri ?? null,
          {
            analysisId,
          }
        )

        const updatedCached = { ...cached, videoUri: resolvedVideoUri }

        log.info('useHistoricalAnalysis', 'Returning cached analysis', {
          analysisId,
          hasVideoUri: !!updatedCached.videoUri,
          videoUri: updatedCached.videoUri,
          cachedAt: new Date(updatedCached.cachedAt).toISOString(),
        })

        // Return data with pending cache update (to be applied in useEffect)
        return {
          analysis: updatedCached,
          pendingCacheUpdates:
            resolvedVideoUri !== cached.videoUri ? { videoUri: resolvedVideoUri } : undefined,
        }
      }

      // Fallback to database - fetch job with video recording details
      const job = await getAnalysisJob(analysisId)

      if (!job) {
        return { analysis: null }
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
      // Extract local URI from metadata to use as hint for resolution
      const localMetadata = (videoRecording?.metadata as Record<string, unknown> | undefined) ?? {}
      const localUriHint =
        typeof localMetadata.localUri === 'string' ? localMetadata.localUri : undefined

      // Resolve video URI (prefers local URI hint from metadata)
      const resolvedVideoUri = await resolveHistoricalVideoUri(
        videoRecording?.storage_path ?? null,
        {
          analysisId,
          localUriHint,
        }
      )

      const localUriMappings: Array<{ storagePath: string; localUri: string }> = []

      // Collect local URI mappings to apply later in useEffect
      if (videoRecording?.storage_path && resolvedVideoUri.startsWith('file://')) {
        localUriMappings.push({
          storagePath: videoRecording.storage_path,
          localUri: resolvedVideoUri,
        })
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

      // Return data with cache updates to apply in useEffect
      // Note: We return a temporary analysis object that will be added to cache in useEffect
      return {
        analysis: {
          ...cachedAnalysis,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
        },
        pendingCacheUpdates: {
          localUriMappings: localUriMappings.length > 0 ? localUriMappings : undefined,
        },
      }
    },
    enabled: !!analysisId,
    staleTime: Number.POSITIVE_INFINITY, // Historical data doesn't change
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  })

  // Apply cache updates after query completes (outside render cycle)
  const { data: queryData } = query

  // Effect to handle cache updates
  React.useEffect(() => {
    if (!queryData?.analysis || !analysisId) {
      return
    }

    const { analysis, pendingCacheUpdates } = queryData

    // Apply local URI mappings
    if (pendingCacheUpdates?.localUriMappings) {
      for (const { storagePath, localUri } of pendingCacheUpdates.localUriMappings) {
        setLocalUri(storagePath, localUri)
      }
    }

    // Check if this analysis is already in cache
    const existingCached = getCached(analysisId)

    if (existingCached) {
      // Update existing cache entry
      const updates: Partial<CachedAnalysis> = {
        lastAccessed: Date.now(),
      }

      // Update videoUri if changed
      if (
        pendingCacheUpdates?.videoUri &&
        pendingCacheUpdates.videoUri !== existingCached.videoUri
      ) {
        updates.videoUri = pendingCacheUpdates.videoUri
      }

      updateCache(analysisId, updates)
    } else {
      // Add new entry to cache (from database fetch)
      const { cachedAt, lastAccessed, ...analysisData } = analysis
      addToCache(analysisData)
    }
  }, [queryData, analysisId, getCached, addToCache, updateCache, setLocalUri])

  // Return transformed query result with just the analysis data
  return {
    ...query,
    data: queryData?.analysis ?? null,
  }
}
