import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import React from 'react'
import { Platform } from 'react-native'

import { VideoStorageService } from '@app/features/CameraRecording/services/videoStorageService'
import type { CachedAnalysis } from '@app/features/HistoryProgress/stores/videoHistory'
import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { recordCacheHit, recordCacheMiss } from '@app/features/HistoryProgress/utils/cacheMetrics'
import { getNetworkErrorMessage } from '@app/features/HistoryProgress/utils/networkDetection'
import { analysisKeys } from '@app/hooks/analysisKeys'
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
const MAX_SIGNED_URL_CACHE_ENTRIES = 64

function pruneSignedUrlCache(): void {
  const now = Date.now()

  signedUrlCache.forEach((entry, storagePath) => {
    if (now >= entry.expiresAt) {
      signedUrlCache.delete(storagePath)
    }
  })

  if (signedUrlCache.size > MAX_SIGNED_URL_CACHE_ENTRIES) {
    const overflow = signedUrlCache.size - MAX_SIGNED_URL_CACHE_ENTRIES
    Array.from(signedUrlCache.keys())
      .slice(0, overflow)
      .forEach((key) => signedUrlCache.delete(key))
  }
}

/**
 * Get cached signed URL if still valid, otherwise return null
 */
function getCachedSignedUrl(storagePath: string): string | null {
  pruneSignedUrlCache()

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
  pruneSignedUrlCache()
}

async function tryResolveLocalUri(
  storagePath: string | null | undefined,
  analysisId?: number
): Promise<string | null> {
  if (!storagePath || Platform.OS === 'web') {
    return null
  }

  // Fast path: Check persisted index
  const localUri = useVideoHistoryStore.getState().getLocalUri(storagePath)
  if (localUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri)
      if (fileInfo.exists) {
        recordCacheHit('video')
        return localUri
      }

      // Local file missing, clear stale mapping
      log.debug('useHistoricalAnalysis', 'Cached local URI missing, clearing stale mapping', {
        storagePath,
        cachedLocalUri: localUri,
        analysisId,
      })
      useVideoHistoryStore.getState().clearLocalUri(storagePath)
    } catch (error) {
      log.warn('useHistoricalAnalysis', 'Failed to stat cached local video', {
        storagePath,
        localUri,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  } else {
    // Log when index lookup fails (helps diagnose persistence issues)
    // Access internal state for debugging (store structure is Map-based)
    const storeState = useVideoHistoryStore.getState() as any
    const indexSize = storeState.localUriIndex?.size ?? 0
    log.debug('useHistoricalAnalysis', 'No cached local URI in index, will check direct path', {
      storagePath,
      analysisId,
      localUriIndexSize: indexSize,
    })
  }

  // Fallback: Direct file check (rebuilds index on cache miss)
  if (analysisId) {
    const directPath = `${FileSystem.documentDirectory}recordings/analysis_${analysisId}.mp4`
    try {
      const fileInfo = await FileSystem.getInfoAsync(directPath)
      if (fileInfo.exists) {
        recordCacheHit('video')
        log.info('useHistoricalAnalysis', 'Rebuilt cache from direct file check', {
          storagePath,
          analysisId,
          directPath,
          reason: 'localUriIndex missing or file not at cached path',
        })
        // Rebuild both index AND cache entry to prevent future rebuilds
        const store = useVideoHistoryStore.getState()

        // Update localUriIndex FIRST (this persists to AsyncStorage)
        store.setLocalUri(storagePath, directPath)

        // Also update the cache entry's videoUri if it exists (fixes stale paths in persisted cache)
        // This ensures both the index AND the cache entry point to the persisted path
        const cachedEntry = store.getCached(analysisId)
        if (cachedEntry) {
          // Update videoUri if it's different AND it's pointing to a stale temporary path
          const isStalePath =
            cachedEntry.videoUri?.includes('Caches/') ||
            cachedEntry.videoUri?.includes('temp/') ||
            cachedEntry.videoUri?.includes('ExponentAsset-')
          if (
            cachedEntry.videoUri !== directPath &&
            (isStalePath || !cachedEntry.videoUri?.includes('recordings/'))
          ) {
            store.updateCache(analysisId, { videoUri: directPath })
            log.debug(
              'useHistoricalAnalysis',
              'Updated cache entry videoUri to match direct path',
              {
                analysisId,
                oldVideoUri: cachedEntry.videoUri,
                newVideoUri: directPath,
                wasStalePath: isStalePath,
              }
            )
          }
        }
        return directPath
      }
    } catch (error) {
      log.warn('useHistoricalAnalysis', 'Failed to check direct file path', {
        storagePath,
        analysisId,
        directPath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return null
}

/**
 * Resolve historical video URI from storage path
 *
 * 4-tier cache resolution order:
 * 1. metadata.localUri (recording flow) - check existence
 * 2. videoHistory.localUriIndex (persistent disk cache) - check existence
 * 3. Signed URL session cache (1-hour TTL)
 * 4. Generate new signed URL + background download
 *
 * Exported for use in prefetch hooks
 */
export async function resolveHistoricalVideoUri(
  storagePath: string | null | undefined,
  context: { analysisId: number; localUriHint?: string; signal?: AbortSignal }
): Promise<string> {
  if (!storagePath) {
    return FALLBACK_VIDEO_URI
  }

  // PRIORITY 1: Check persisted index (localUriIndex) - most reliable, survives restarts
  // This checks documentDirectory/recordings/ which persists across app restarts
  const localUri = await tryResolveLocalUri(storagePath, context.analysisId)
  if (localUri) {
    return localUri
  }

  // PRIORITY 2: Check metadata.localUri hint (might be temporary cache path)
  // Only use if it's in documentDirectory (persisted), skip if it's in Caches (temporary)
  if (context.localUriHint && Platform.OS !== 'web') {
    const isPersistedPath = context.localUriHint.includes('recordings/')
    const isTemporaryPath =
      context.localUriHint.includes('Caches/') || context.localUriHint.includes('temp/')

    // Skip temporary paths - they get cleared on restart
    if (isTemporaryPath) {
      log.debug(
        'useHistoricalAnalysis',
        'Skipping temporary cache path, will use direct file check',
        {
          analysisId: context.analysisId,
          storagePath,
          localUriHint: context.localUriHint,
        }
      )
    } else {
      // Check if metadata URI exists (might be persisted documentDirectory path)
      try {
        const fileInfo = await FileSystem.getInfoAsync(context.localUriHint)
        if (fileInfo.exists) {
          // If it's a persisted path, update index for future use
          if (isPersistedPath) {
            useVideoHistoryStore.getState().setLocalUri(storagePath, context.localUriHint)
          }
          log.info('useHistoricalAnalysis', 'Resolved video to metadata local URI', {
            analysisId: context.analysisId,
            storagePath,
            localUri: context.localUriHint,
            isPersistedPath,
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
  }

  // If we get here, tryResolveLocalUri already checked and fell back to direct file check
  // The direct check would have updated localUriIndex and returned the path if found
  // So we need to check one more time after metadata check failed

  // PRIORITY 3: Final fallback - direct file check (tryResolveLocalUri already tried, but check again in case metadata path blocked it)
  // Actually, tryResolveLocalUri already did this, so if we get here, no local file exists
  // Cache miss - no local file found
  recordCacheMiss('video')

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

  // Trigger background download for future sessions (non-blocking)
  // Only start download if not aborted and signal is not provided (or not aborted)
  if (signedResult.signedUrl && Platform.OS !== 'web' && !context.signal?.aborted) {
    VideoStorageService.downloadVideo(signedResult.signedUrl, context.analysisId, {
      signal: context.signal,
    })
      .then((persistentPath) => {
        // Check if aborted before updating store
        if (context.signal?.aborted) {
          return
        }
        useVideoHistoryStore.getState().setLocalUri(storagePath, persistentPath)
        log.info('useHistoricalAnalysis', 'Video persisted to disk', {
          analysisId: context.analysisId,
          storagePath,
          persistentPath,
        })
      })
      .catch(async (error) => {
        // Don't log abort errors as warnings
        if (context.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return
        }
        const errorMessage = await getNetworkErrorMessage('video', error)
        log.warn('useHistoricalAnalysis', 'Background video download failed', {
          analysisId: context.analysisId,
          storagePath,
          error: errorMessage,
          originalError: error instanceof Error ? error.message : String(error),
        })
        // Non-blocking: Continue with signed URL playback
      })
  }

  return signedResult.signedUrl
}

/**
 * Internal data structure returned from query (before cache updates)
 */
interface HistoricalAnalysisData {
  analysis: CachedAnalysis | null
  pendingCacheUpdates?: {
    videoUri?: string
    title?: string
    localUriMappings?: Array<{ storagePath: string; localUri: string }>
    validateVideoUri?: boolean // Flag to trigger async file validation in useEffect
  }
}

/**
 * Shared queryFn for historical analysis data
 * Used by both useHistoricalAnalysis hook and usePrefetchVideoAnalysis prefetch
 *
 * This function executes during prefetch (on history screen) so all expensive operations
 * (database fetch, URI resolution, file checks) complete BEFORE user navigates.
 * When useHistoricalAnalysis runs, TanStack Query returns cached data instantly.
 *
 * Flow:
 * 1. Check Zustand cache (fast, in-memory)
 * 2. If cached: Re-resolve video URI (file existence check)
 * 3. If not cached: Fetch from database + resolve video URI
 * 4. Return data ready for use
 */
export async function fetchHistoricalAnalysisData(
  analysisId: number
): Promise<HistoricalAnalysisData> {
  const getCached = useVideoHistoryStore.getState().getCached

  // Check cache first
  const cached = getCached(analysisId)
  if (cached) {
    // OPTIMISTIC CACHE RENDERING: Return cached data immediately for fast mount
    // File validation is deferred to useEffect (async, non-blocking)
    // This prevents blocking mount with FileSystem.getInfoAsync calls (~200-500ms)
    // Title is already fresh from prefetch (usePrefetchVideoAnalysis calls this same queryFn)

    // CRITICAL: If cache doesn't have fullFeedbackText or avatarAssetKeyUsed (old cache), fetch in background
    // Don't await - return cached data immediately and update cache asynchronously
    if (!cached.fullFeedbackText || !cached.avatarAssetKeyUsed) {
      // Background fetch to backfill missing fields
      void (async () => {
        // Fetch fullFeedbackText from analyses table
        if (!cached.fullFeedbackText) {
          const { data: analysis, error: analysisError } = (await supabase
            .from('analyses')
            .select('full_feedback_text, user_rating, user_rating_at')
            .eq('job_id', analysisId)
            .single()) as {
            data: {
              full_feedback_text: string | null
              user_rating: 'up' | 'down' | null
              user_rating_at: string | null
            } | null
            error: any
          }

          if (analysisError) {
            log.warn('useHistoricalAnalysis', 'Failed to backfill fullFeedbackText', {
              analysisId,
              error: analysisError.message || analysisError,
            })
          } else if (analysis?.full_feedback_text) {
            useVideoHistoryStore.getState().updateCache(analysisId, {
              fullFeedbackText: analysis.full_feedback_text,
              fullFeedbackRating: analysis.user_rating ?? undefined,
            })
          }
        }

        // Fetch avatarAssetKeyUsed from analysis_jobs table
        if (!cached.avatarAssetKeyUsed) {
          const { data: job, error: jobError } = await supabase
            .from('analysis_jobs')
            .select('avatar_asset_key_used')
            .eq('id', analysisId)
            .single()

          if (jobError) {
            log.warn('useHistoricalAnalysis', 'Failed to backfill avatarAssetKeyUsed', {
              analysisId,
              error: jobError.message || jobError,
            })
          } else if (job?.avatar_asset_key_used) {
            useVideoHistoryStore.getState().updateCache(analysisId, {
              avatarAssetKeyUsed: job.avatar_asset_key_used,
            })
          }
        }
      })()
    }

    // CRITICAL: Detect invalid videoUri (raw storagePath instead of actual URI)
    // Valid URIs start with file://, http://, or https://
    // Raw storage paths like "uuid/videos/date/id/video.mp4" are NOT playable
    const cachedVideoUri = cached.videoUri
    const isValidUri =
      cachedVideoUri &&
      (cachedVideoUri.startsWith('file://') ||
        cachedVideoUri.startsWith('http://') ||
        cachedVideoUri.startsWith('https://'))

    // CRITICAL FIX: If videoUri is missing/invalid but we have storagePath, resolve it NOW
    // Don't defer to useEffect validation - that check fails when videoUri is undefined
    // This happens on fresh install where cache has data but no videoUri
    if (!isValidUri && cached.storagePath) {
      log.debug('useHistoricalAnalysis', 'Cached data missing valid videoUri, resolving now', {
        analysisId,
        cachedVideoUri: cachedVideoUri ?? 'undefined',
        storagePath: cached.storagePath,
      })

      // Resolve video URI synchronously in queryFn
      const resolvedVideoUri = await resolveHistoricalVideoUri(cached.storagePath, { analysisId })

      // Update cache with resolved URI
      useVideoHistoryStore.getState().updateCache(analysisId, { videoUri: resolvedVideoUri })

      const updatedCached = { ...cached, videoUri: resolvedVideoUri }
      return {
        analysis: updatedCached,
        pendingCacheUpdates: {},
      }
    }

    const optimisticVideoUri = isValidUri ? cachedVideoUri : FALLBACK_VIDEO_URI

    // Use cached title immediately (already fresh from prefetch)
    const updatedCached = { ...cached, videoUri: optimisticVideoUri }

    // Removed individual log - batch summaries in usePrefetchVideoAnalysis provide visibility

    // Return data with deferred validation flag
    // File validation will happen in useEffect after mount (non-blocking)
    // Title is already fresh from prefetch (usePrefetchVideoAnalysis calls this same queryFn)
    return {
      analysis: updatedCached,
      pendingCacheUpdates: {
        validateVideoUri: true,
      },
    }
  }

  // Fallback to database - fetch job with video recording details
  const job = await getAnalysisJob(analysisId)

  if (!job) {
    return { analysis: null }
  }

  // Fetch the analysis record to get the AI-generated title and full feedback text
  // Type assertion needed until Supabase types are regenerated
  const { data: analysis, error: analysisError } = (await supabase
    .from('analyses')
    .select('title, full_feedback_text, user_rating, user_rating_at')
    .eq('job_id', analysisId)
    .single()) as {
    data: {
      title: string | null
      full_feedback_text: string | null
      user_rating: 'up' | 'down' | null
      user_rating_at: string | null
    } | null
    error: any
  }

  if (analysisError && analysisError.code !== 'PGRST116') {
    log.warn('useHistoricalAnalysis', 'Failed to fetch analysis title', {
      analysisId,
      error: analysisError.message,
    })
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
  const resolvedVideoUri = await resolveHistoricalVideoUri(videoRecording?.storage_path ?? null, {
    analysisId,
    localUriHint,
  })

  const localUriMappings: Array<{ storagePath: string; localUri: string }> = []

  // Collect local URI mappings to apply later in useEffect
  if (videoRecording?.storage_path && resolvedVideoUri.startsWith('file://')) {
    localUriMappings.push({
      storagePath: videoRecording.storage_path,
      localUri: resolvedVideoUri,
    })
  }

  // Only use real title from database - don't cache dummy titles
  // Title subscription will update it later if it becomes available
  const dbTitle = analysis?.title
  const dbFullFeedbackText = analysis?.full_feedback_text

  const dbFullFeedbackRating = analysis?.user_rating ?? undefined

  const cachedAnalysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> = {
    id: job.id,
    videoId: job.video_recording_id,
    userId: job.user_id,
    title: dbTitle ?? '', // Use empty string as placeholder - subscription will update it
    fullFeedbackText: dbFullFeedbackText ?? undefined,
    fullFeedbackRating: dbFullFeedbackRating,
    createdAt: job.created_at,
    results: job.results as CachedAnalysis['results'],
    poseData: job.pose_data ? (job.pose_data as unknown as CachedAnalysis['poseData']) : undefined,
    videoUri: resolvedVideoUri,
    storagePath: videoRecording?.storage_path ?? undefined,
    avatarAssetKeyUsed: (job as any).avatar_asset_key_used ?? undefined,
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
}

/**
 * Hook for loading historical analysis data with cache-first strategy
 *
 * Strategy:
 * 1. TanStack Query checks cache first (automatically) - if prefetched data exists, returns instantly
 * 2. If cache miss, runs fetchHistoricalAnalysisData (shared with prefetch)
 * 3. Apply cache updates after query completes
 *
 * Prefetch Integration:
 * - usePrefetchVideoAnalysis runs fetchHistoricalAnalysisData during prefetch (on history screen)
 * - This hook uses same queryFn, so TanStack Query returns prefetched data instantly
 * - If prefetch completed before navigation, data loads instantly (0ms, no loading state)
 * - If prefetch missed, queryFn runs normally (database fetch + URI resolution)
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
    queryKey: analysisId ? analysisKeys.historical(analysisId) : ['analysis', 'historical', null],
    queryFn: async (): Promise<HistoricalAnalysisData> => {
      if (!analysisId) {
        return { analysis: null }
      }
      // Use shared queryFn - same logic as prefetch
      // TanStack Query automatically returns prefetched data if available
      return fetchHistoricalAnalysisData(analysisId)
    },
    enabled: !!analysisId,
    staleTime: Number.POSITIVE_INFINITY, // Historical data doesn't change
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  })

  // Apply cache updates after query completes (outside render cycle)
  const { data: queryData } = query

  // Effect to handle cache updates and deferred file validation
  React.useEffect(() => {
    if (!queryData?.analysis || !analysisId) {
      return
    }

    const { analysis, pendingCacheUpdates } = queryData

    // Apply local URI mappings (from database fetch)
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

      // Update videoUri if changed (from database fetch)
      if (
        pendingCacheUpdates?.videoUri &&
        pendingCacheUpdates.videoUri !== existingCached.videoUri
      ) {
        updates.videoUri = pendingCacheUpdates.videoUri
      }

      // Update title if changed (from pendingCacheUpdates.title - set by database fetch path)
      if (pendingCacheUpdates?.title && pendingCacheUpdates.title !== existingCached.title) {
        updates.title = pendingCacheUpdates.title
      }

      // OPTIMISTIC CACHE: Defer file validation to async effect (non-blocking)
      // This validates cached URIs after mount to ensure they're valid and files exist
      // If validation fails, we'll re-resolve the URI and update cache
      if (pendingCacheUpdates?.validateVideoUri && existingCached.videoUri) {
        const cachedUri = existingCached.videoUri
        const isValidUri =
          cachedUri.startsWith('file://') ||
          cachedUri.startsWith('http://') ||
          cachedUri.startsWith('https://')

        // CRITICAL: If cached URI is invalid (raw storagePath), resolve immediately
        if (!isValidUri) {
          log.warn(
            'useHistoricalAnalysis',
            'Invalid cached videoUri (raw storagePath), re-resolving',
            {
              analysisId,
              invalidUri: cachedUri,
              storagePath: existingCached.storagePath,
            }
          )

          // Re-resolve immediately (non-blocking async)
          void (async () => {
            const resolvedVideoUri = await resolveHistoricalVideoUri(
              existingCached.storagePath ?? null,
              { analysisId }
            )
            updateCache(analysisId, { videoUri: resolvedVideoUri })
            log.info('useHistoricalAnalysis', 'Fixed invalid videoUri with resolved URI', {
              analysisId,
              oldUri: cachedUri,
              newUri: resolvedVideoUri,
            })
          })()
        } else if (cachedUri.startsWith('file://')) {
          // Validate local file existence asynchronously (non-blocking)
          void (async () => {
            try {
              const fileInfo = await FileSystem.getInfoAsync(cachedUri)
              if (!fileInfo.exists) {
                // File missing - re-resolve URI and update cache
                log.warn('useHistoricalAnalysis', 'Cached file URI missing, re-resolving', {
                  analysisId,
                  missingUri: cachedUri,
                  storagePath: existingCached.storagePath,
                })

                const resolvedVideoUri = await resolveHistoricalVideoUri(
                  existingCached.storagePath ?? null,
                  {
                    analysisId,
                    localUriHint: cachedUri,
                  }
                )

                // Update cache with resolved URI
                updateCache(analysisId, { videoUri: resolvedVideoUri })
                log.info(
                  'useHistoricalAnalysis',
                  'Re-resolved video URI after validation failure',
                  {
                    analysisId,
                    oldUri: cachedUri,
                    newUri: resolvedVideoUri,
                  }
                )
              }
            } catch (error) {
              log.warn('useHistoricalAnalysis', 'File validation error (non-blocking)', {
                analysisId,
                videoUri: cachedUri,
                error: error instanceof Error ? error.message : String(error),
              })
              // Non-blocking: Continue with optimistic URI even if validation fails
            }
          })()
        }
        // http/https URIs don't need validation - they're already valid remote URLs
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
