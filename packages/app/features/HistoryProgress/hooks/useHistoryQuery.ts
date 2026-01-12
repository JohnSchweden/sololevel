import { safeSetQueryData } from '@app/utils/safeCacheUpdate'
import {
  type AnalysisJobWithVideo,
  type AnalysisResults,
  type PoseData,
  getUserAnalysisJobs,
} from '@my/api'
import { log } from '@my/logging'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import React from 'react'
import { Platform } from 'react-native'
import { useVideoHistoryStore } from '../stores/videoHistory'
import type { CachedAnalysis } from '../stores/videoHistory'
import { recordCacheHit, recordCacheMiss } from '../utils/cacheMetrics'
import { getNetworkErrorMessage } from '../utils/networkDetection'
import { getCachedThumbnailPath, persistThumbnailFile } from '../utils/thumbnailCache'

/**
 * Video item for display in UI (simplified from CachedAnalysis)
 */
export interface VideoItem {
  id: number
  videoId: number
  title: string
  createdAt: string
  thumbnailUri?: string
  /**
   * Original cloud thumbnail URL for recovery when thumbnailUri is a stale file:// path.
   * Used by prefetch hooks to download thumbnails when local paths no longer exist.
   */
  cloudThumbnailUrl?: string
  /**
   * Full AI-generated feedback text. Available when analysis completes.
   */
  fullFeedbackText?: string
}

/**
 * Transform AnalysisJobWithVideo from API to CachedAnalysis format.
 *
 * The transform is intentionally **non-blocking** – it returns synchronously with the
 * best thumbnail URI we already know about and defers filesystem checks to background
 * promises. This mirrors the expectations enforced by the history query tests:
 *
 * - Metadata thumbnails always win for the initial return, even if a later filesystem
 *   probe determines the local file is gone. Downstream consumers see the metadata URI
 *   immediately, while async callbacks repair the cache.
 * - If the metadata file is missing we look for the persistent disk cache, and only
 *   if that is absent do we fall back to the `thumbnail_url` CDN path. Those follow-up
 *   checks happen via chained `FileSystem.getInfoAsync` calls so we never block render
 *   time.
 * - When we do fall back to the cloud URL we still kick off a background persistence
 *   attempt; success updates the Zustand store with the durable path, failures are
 *   logged but the synchronous return stays untouched.
 *
 * @returns Cached analysis data with the currently known thumbnail and video URI.
 */
function transformToCache(
  job: AnalysisJobWithVideo
): Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> {
  // CRITICAL: Return immediately with available thumbnail, don't await file checks
  let thumbnail: string | null = null
  const metadataThumbnail = job.video_recordings?.metadata?.thumbnailUri
  const cloudThumbnail = job.video_recordings?.thumbnail_url ?? null

  // Prefer metadata thumbnail (assume exists), fallback to cloud
  if (metadataThumbnail && Platform.OS !== 'web') {
    thumbnail = metadataThumbnail
    recordCacheHit('thumbnail')
  } else if (cloudThumbnail) {
    thumbnail = cloudThumbnail
    recordCacheMiss('thumbnail')
  }

  // Background: Check if metadata thumbnail actually exists on disk
  // (non-blocking, doesn't delay return)
  if (metadataThumbnail && Platform.OS !== 'web' && job.video_recordings) {
    const videoId = job.video_recordings.id
    const analysisId = job.id

    // Fire and forget - don't await
    void FileSystem.getInfoAsync(metadataThumbnail)
      .then((fileInfo) => {
        if (!fileInfo.exists) {
          // Metadata thumbnail doesn't exist, check persistent cache in background
          const persistentPath = getCachedThumbnailPath(videoId)
          return FileSystem.getInfoAsync(persistentPath)
            .then((persistentInfo) => {
              if (persistentInfo.exists) {
                // Update store with persistent path
                const { updateCache } = useVideoHistoryStore.getState()
                updateCache(analysisId, { thumbnail: persistentPath })
                if (__DEV__) {
                  log.debug('useHistoryQuery', 'Updated thumbnail to persistent cache', {
                    videoId,
                    path: persistentPath,
                  })
                }
              }
            })
            .catch((error) => {
              if (__DEV__) {
                log.debug('useHistoryQuery', 'Persistent cache check failed', {
                  error: error instanceof Error ? error.message : String(error),
                  videoId,
                })
              }
            })
        }
        return undefined
      })
      .catch((error) => {
        if (__DEV__) {
          log.debug('useHistoryQuery', 'Metadata thumbnail existence check failed', {
            error: error instanceof Error ? error.message : String(error),
            videoId,
          })
        }
      })
  }

  // Background: ALWAYS persist cloud thumbnail to disk (non-blocking)
  // This ensures thumbnails are available even when metadata.thumbnailUri is a stale temp path
  // The persistent cache path will be used on subsequent loads
  if (
    cloudThumbnail &&
    typeof cloudThumbnail === 'string' &&
    cloudThumbnail.startsWith('http') &&
    job.video_recordings
    // REMOVED: !metadataThumbnail condition - always persist for recovery from stale paths
  ) {
    const videoId = job.video_recordings.id
    const analysisId = job.id
    const persistentCachePath = getCachedThumbnailPath(videoId)

    // Check if already persisted before downloading
    void FileSystem.getInfoAsync(persistentCachePath)
      .then((info) => {
        if (info.exists) {
          // Already persisted - just update cache with persistent path
          const { updateCache } = useVideoHistoryStore.getState()
          updateCache(analysisId, { thumbnail: persistentCachePath })
          log.debug('useHistoryQuery', 'Using existing persistent thumbnail', {
            videoId,
            path: persistentCachePath,
          })
          return
        }

        // Not persisted yet - download and persist
        return persistThumbnailFile(videoId, cloudThumbnail).then((persistedPath) => {
          log.info('useHistoryQuery', 'Thumbnail persisted to disk', {
            videoId,
            path: persistedPath,
          })
          // Update cache entry with persistent path
          const { updateCache } = useVideoHistoryStore.getState()
          updateCache(analysisId, { thumbnail: persistedPath })
        })
      })
      .catch(async (error) => {
        const errorMessage = await getNetworkErrorMessage('thumbnail', error)
        log.warn('useHistoryQuery', 'Failed to persist thumbnail', {
          videoId,
          error: errorMessage,
        })
      })
  }

  // Resolve video URI from localUriIndex (device-local Zustand + AsyncStorage)
  // After migration to remote storage, metadata.localUri is no longer written to DB
  // CRITICAL: storagePath is NOT a playable URI - it's a Supabase storage key
  // Only set videoUri if we have an actual local file path from localUriIndex
  const storagePath = job.video_recordings?.storage_path
  const localUri = storagePath ? useVideoHistoryStore.getState().getLocalUri(storagePath) : null
  // videoUri should be undefined if we don't have a local file - useHistoricalAnalysis will resolve it
  const videoUri = localUri ?? null

  // Use AI-generated title from analyses table if available, otherwise fall back to generated title
  // Note: analyses is a one-to-one relationship, so Supabase returns it as an object, not an array
  const analysesData = (job as any).analyses
  // Handle both object (one-to-one) and array (if it were one-to-many) cases
  const analysesTitle = Array.isArray(analysesData) ? analysesData[0]?.title : analysesData?.title
  const analysesfullFeedbackText = Array.isArray(analysesData)
    ? analysesData[0]?.full_feedback_text
    : analysesData?.full_feedback_text
  const fallbackTitle = `Analysis ${new Date(job.created_at).toLocaleDateString()}`
  const analysisTitle = analysesTitle || fallbackTitle

  return {
    id: job.id,
    videoId: job.video_recording_id,
    userId: job.user_id,
    title: analysisTitle,
    fullFeedbackText: analysesfullFeedbackText ?? undefined,
    createdAt: job.created_at,
    thumbnail: thumbnail ?? undefined,
    // Store cloud URL for recovery when local file:// paths become stale (cleared on app restart)
    cloudThumbnailUrl: cloudThumbnail ?? undefined,
    videoUri: videoUri ?? undefined,
    storagePath: storagePath ?? undefined,
    results: job.results as AnalysisResults,
    poseData: (job.pose_data as PoseData | null) || undefined,
    avatarAssetKeyUsed: (job as any).avatar_asset_key_used ?? undefined,
  }
}

/**
 * Transform CachedAnalysis to VideoItem for UI
 */
function transformToVideoItem(cached: CachedAnalysis): VideoItem {
  return {
    id: cached.id,
    videoId: cached.videoId,
    title: cached.title,
    createdAt: cached.createdAt,
    thumbnailUri: cached.thumbnail,
    cloudThumbnailUrl: cached.cloudThumbnailUrl,
    fullFeedbackText: cached.fullFeedbackText,
  }
}

/**
 * Resolve stale thumbnails from cached data (background, non-blocking)
 *
 * When loading from Zustand cache, thumbnailUri may be a stale file:// path
 * from a previous session (temp paths get cleared on app restart).
 *
 * This function:
 * 1. Checks each cached item's thumbnailUri
 * 2. If it's a stale file:// path, checks persistent cache at Documents/thumbnails/{videoId}.jpg
 * 3. If persistent cache exists, updates Zustand and TanStack Query caches
 * 4. If not, downloads from cloudThumbnailUrl and persists
 */
async function resolveStaleThumbailsFromCache(
  cachedItems: CachedAnalysis[],
  queryClient: ReturnType<typeof useQueryClient>,
  limit: number
): Promise<void> {
  const { updateCache } = useVideoHistoryStore.getState()

  for (const item of cachedItems) {
    // Skip if no thumbnail or already using our persistent cache path
    if (!item.thumbnail) continue
    if (item.thumbnail.includes('Documents/thumbnails/')) continue

    // Any file:// path that's NOT in our persistent cache is potentially stale
    // On fresh install, metadata.thumbnailUri contains paths from original device
    // HTTP URLs are valid cloud URLs that should be downloaded and persisted
    const isFileUrl = item.thumbnail.startsWith('file://')
    const isHttpUrl = item.thumbnail.startsWith('http')

    // Skip if it's neither a file URL nor an HTTP URL (shouldn't happen)
    if (!isFileUrl && !isHttpUrl) {
      continue
    }

    const persistentPath = getCachedThumbnailPath(item.videoId)

    try {
      // Check if persistent cache exists
      const info = await FileSystem.getInfoAsync(persistentPath)

      if (info.exists) {
        // Persistent cache exists - update caches
        updateCache(item.id, { thumbnail: persistentPath })
        queryClient.setQueryData<VideoItem[]>(['history', 'completed', limit], (old) => {
          if (!old) return old
          return old.map((v) => (v.id === item.id ? { ...v, thumbnailUri: persistentPath } : v))
        })
        log.debug('useHistoryQuery', 'Resolved stale thumbnail from persistent cache', {
          analysisId: item.id,
          videoId: item.videoId,
          persistentPath,
        })
      } else if (item.cloudThumbnailUrl?.startsWith('http')) {
        // No persistent cache - download from cloud URL
        const downloadedPath = await persistThumbnailFile(item.videoId, item.cloudThumbnailUrl)
        updateCache(item.id, { thumbnail: downloadedPath })
        queryClient.setQueryData<VideoItem[]>(['history', 'completed', limit], (old) => {
          if (!old) return old
          return old.map((v) => (v.id === item.id ? { ...v, thumbnailUri: downloadedPath } : v))
        })
        log.info('useHistoryQuery', 'Downloaded thumbnail for stale cached item', {
          analysisId: item.id,
          videoId: item.videoId,
          downloadedPath,
        })
      } else {
        log.debug('useHistoryQuery', 'Cannot resolve stale thumbnail - no cloud URL', {
          analysisId: item.id,
          videoId: item.videoId,
          thumbnail: item.thumbnail.substring(0, 60),
        })
      }
    } catch (error) {
      log.warn('useHistoryQuery', 'Failed to resolve stale thumbnail', {
        analysisId: item.id,
        videoId: item.videoId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * Hook for fetching user's analysis history with cache-first strategy
 *
 * Strategy:
 * 1. Display persisted Zustand cache data instantly (no loading spinner, no network)
 * 2. Skip database refetch on mount if cache exists (refetchOnMount: false)
 * 3. Refetch only when:
 *    - Cache explicitly invalidated (new analysis completed via useCameraScreenLogic)
 *    - First app launch (no cache exists)
 *    - User manually pulls to refresh
 *
 * Cache Invalidation Triggers (Event-Driven):
 * - New recording started: `queryClient.invalidateQueries({ queryKey: analysisKeys.historyCompleted() })`
 *   (handled in useCameraScreenLogic.ts line 183)
 * - Video deleted: Explicit invalidation (when implemented)
 * - User pull-to-refresh: Manual refetch
 *
 * Note: We use event-driven invalidation instead of time-based staleTime because:
 * - Supabase Realtime subscriptions notify us when data changes
 * - We know exactly when new videos are added (recording completion)
 * - No need to poll/refetch on app foreground if data hasn't changed
 * - Cache remains valid indefinitely until explicitly invalidated
 *
 * Thumbnail Resolution Flow (3-Tier Caching):
 * ```
 * 1. Tier 1: metadata.thumbnailUri (temp file) → Check existence → Use if exists
 * 2. Tier 2: ${documentDirectory}thumbnails/${videoId}.jpg (persistent) → Check existence → Use if exists
 * 3. Tier 3: thumbnail_url (cloud CDN) → Download & persist to Tier 2 → Return cloud URL
 * ```
 *
 * Implementation:
 * - Thumbnails persist to disk automatically when fetched from cloud
 * - Subsequent app restarts use persistent disk cache (zero network requests)
 * - Persistence is non-blocking (doesn't delay UI rendering)
 * - Error handling: persistence failures don't block thumbnail display
 * - Cached data from Zustand store is used as initialData for instant display on app restart
 *
 * @param limit - Maximum number of videos to fetch (default: 10)
 * @returns Query result with video items for display
 */
export function useHistoryQuery(limit = 10) {
  const cache = useVideoHistoryStore()
  const queryClient = useQueryClient()

  // Store manages its own hydration state - just wait for it
  const isHydrated = useVideoHistoryStore((state) => state._isHydrated)

  // Fallback: trigger hydration if not already done by Provider (eager hydration)
  // Provider triggers ensureHydrated() 1s after startup, but this is a safety net
  // if useHistoryQuery is used before Provider's timer fires.
  // ensureHydrated() is idempotent (checks _isHydrated first).
  React.useEffect(() => {
    if (!isHydrated) {
      useVideoHistoryStore.getState().ensureHydrated()
    }
  }, [isHydrated])

  // BATTLE-TESTED FIX #1: Pre-populate TanStack Query cache with Zustand data
  // This is better than initialData because it populates the actual cache,
  // eliminating duplication and making refetch logic simpler
  React.useEffect(() => {
    if (!isHydrated) {
      if (__DEV__) {
        log.debug('useHistoryQuery', 'Skipping cache population - store not hydrated yet')
      }
      return
    }

    const state = useVideoHistoryStore.getState()
    const allCached = state.getAllCached()
    if (allCached.length === 0) {
      if (__DEV__) {
        log.debug('useHistoryQuery', 'Skipping cache population - no cached data')
      }
      return
    }

    // Sort by newest first and limit
    const sorted = [...allCached]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)

    const mostRecentTimestamp = sorted[0]?.cachedAt ?? Date.now()
    const videoItems = sorted.map(transformToVideoItem)

    // Pre-populate TanStack Query cache with Zustand data
    // This makes the cache the single source of truth
    // Note: TanStack Query will set dataUpdatedAt to current time, which is fine
    // Cache invalidation is event-driven, not time-based
    safeSetQueryData(
      queryClient,
      ['history', 'completed', limit],
      videoItems,
      'useHistoryQuery.hydrate'
    )

    if (__DEV__) {
      log.debug('useHistoryQuery', 'Pre-populated TanStack Query cache', {
        count: videoItems.length,
        updatedAt: new Date(mostRecentTimestamp).toISOString(),
        ageMinutes: ((Date.now() - mostRecentTimestamp) / 60000).toFixed(2),
      })
    }

    // CRITICAL FIX: Resolve stale thumbnails from cached data
    // Cached thumbnailUri may be stale file:// paths from previous sessions
    // Check persistent cache and download from cloud URL if needed
    if (Platform.OS !== 'web') {
      void resolveStaleThumbailsFromCache(sorted, queryClient, limit)
    }
  }, [isHydrated, queryClient, limit])

  // Build query options - cache already populated via setQueryData above
  const queryOptions = React.useMemo(() => {
    // Check Zustand store directly (source of truth) to determine if cache is empty
    // This is more reliable than checking TanStack Query cache which may not be populated yet
    const state = useVideoHistoryStore.getState()
    const allCached = isHydrated ? state.getAllCached() : []
    const cachedCount = allCached.length
    const lastSync = state.lastSync
    const now = Date.now()
    const FRESHNESS_WINDOW_MS = 60_000 // 60s: avoid spam when navigating rapidly
    const isStale = lastSync === 0 || now - lastSync > FRESHNESS_WINDOW_MS

    // Refetch when cache is empty, or when cache is partial AND stale.
    // This keeps event-driven invalidation but avoids re-fetch spam on rapid re-entry.
    const shouldRefetchOnMount = cachedCount === 0 || (cachedCount < limit && isStale)

    if (__DEV__ && isHydrated) {
      log.debug('useHistoryQuery', 'Query options - checking Zustand store', {
        cachedCount,
        limit,
        lastSync,
        isStale,
        shouldRefetchOnMount,
        isHydrated,
      })
    }

    const baseOptions = {
      queryKey: ['history', 'completed', limit] as const,
      // CRITICAL: Wait for store to hydrate before enabling query
      enabled: isHydrated,
      // Refetch if cache is incomplete (fewer items than limit)
      // Otherwise, skip refetch since cache is already populated
      refetchOnMount: shouldRefetchOnMount,
      // Event-driven invalidation: Don't refetch on app foreground
      // Cache is invalidated explicitly when new videos are added (useCameraScreenLogic)
      refetchOnWindowFocus: false,
      queryFn: async (): Promise<VideoItem[]> => {
        const startTime = Date.now()

        // Zustand store is used for persistence and data transformation
        // Cache invalidation is event-driven (new recording, deletion, pull-to-refresh)
        if (__DEV__) {
          log.debug('useHistoryQuery', 'Fetching history data', {
            limit,
            cacheVersion: cache.version,
          })
        }

        try {
          // Fetch only completed jobs from database (more efficient than filtering in JS)
          const jobs = await getUserAnalysisJobs(limit, 'completed')

          // Debug: Log raw jobs data and status distribution
          const statusDistribution = jobs.reduce(
            (acc, job: any) => {
              const status = job.status || 'unknown'
              acc[status] = (acc[status] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          if (__DEV__) {
            log.debug('useHistoryQuery', 'Raw jobs from API', {
              totalJobs: jobs.length,
              limit,
              statusDistribution,
              sampleJob: jobs[0]
                ? {
                    id: jobs[0].id,
                    status: jobs[0].status,
                    hasVideoRecordings: !!jobs[0].video_recordings,
                    storagePath: jobs[0].video_recordings?.storage_path,
                    thumbnailUrl: jobs[0].video_recordings?.thumbnail_url,
                    hasThumbnailMetadata: !!(jobs[0].video_recordings?.metadata as any)
                      ?.thumbnailUri,
                  }
                : 'no jobs',
            })
          }

          // All jobs should be completed (filtered at DB level), but keep as safety check
          const completedJobs = jobs.filter((job: any) => job.status === 'completed')

          // Work with newest-first order for cache + UI consistency
          const sortedCompletedJobs = [...completedJobs].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )

          // Update cache with completed jobs and transform to VideoItem
          // Batch all cache entries in a single store update to prevent cascade re-renders
          const cacheEntries: Array<Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'>> = []

          // CRITICAL FIX: transformToCache now returns synchronously
          // No longer awaits file checks - they happen in background
          // This eliminates the 300-1000ms blocking I/O that caused 60→10 FPS drop
          const videoItemsData = sortedCompletedJobs.map((job: any) => {
            const cacheEntry = transformToCache(job)
            cacheEntries.push(cacheEntry)

            // localUri mappings are no longer stored in DB metadata
            // They're maintained in localUriIndex (set during upload and background downloads)

            return { jobId: job.id, cacheEntry }
          })

          // Batch apply all cache updates in a single store transaction to prevent cascade re-renders
          // This replaces 10 separate addToCache calls with 1 batched update
          const now = Date.now()
          cache.addMultipleToCache(
            cacheEntries.map((entry) => ({
              ...entry,
              cachedAt: now,
              lastAccessed: now,
            })),
            [] // No localUri updates from DB - maintained in localUriIndex separately
          )

          // CRITICAL: Update lastSync timestamp to record when fetch occurred
          // This enables the 60-second freshness window to prevent refetch loops
          cache.updateLastSync()

          // Get cached entries and transform to VideoItems
          const videoItems = videoItemsData.map(({ jobId }) => {
            const cached = cache.getCached(jobId)
            if (!cached) {
              throw new Error(`Failed to cache entry for job ${jobId}`)
            }
            return transformToVideoItem(cached)
          })

          const duration = Date.now() - startTime
          log.info('useHistoryQuery', 'History data fetched and cached', {
            duration,
            videoItemsCount: videoItems.length,
            limit,
            cacheSize: cache.cache.size,
          })

          // CRITICAL FIX: Resolve stale thumbnails from freshly fetched data
          // On fresh install, metadata.thumbnailUri may be stale temp paths from original device
          // This runs in background (non-blocking) and updates both Zustand and TanStack Query
          if (Platform.OS !== 'web') {
            const freshCachedItems = videoItemsData
              .map(({ jobId }) => cache.getCached(jobId))
              .filter((item): item is CachedAnalysis => item !== null)
            void resolveStaleThumbailsFromCache(freshCachedItems, queryClient, limit)
          }

          return videoItems
        } catch (error) {
          const duration = Date.now() - startTime
          log.error('useHistoryQuery', 'Failed to fetch history data', {
            duration,
            error: error instanceof Error ? error.message : String(error),
            limit,
          })
          throw error
        }
      },
      // Event-driven cache: Never auto-stale, only invalidate on explicit events
      // (new recording, deletion, pull-to-refresh)
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
    }

    return baseOptions
  }, [limit, cache, isHydrated, queryClient])

  const queryResult = useQuery(queryOptions)

  // CRITICAL FIX: Manually trigger refetch if cache is empty after hydration completes
  // TanStack Query's refetchOnMount is evaluated on mount, not when query becomes enabled
  // So we need to manually check and refetch if needed when hydration completes
  const hasTriggeredRefetchRef = React.useRef(false)
  React.useEffect(() => {
    if (!isHydrated || hasTriggeredRefetchRef.current) {
      return
    }

    const state = useVideoHistoryStore.getState()
    const allCached = state.getAllCached()
    const cachedCount = allCached.length

    // Only trigger refetch if cache is completely empty (first load)
    // If we have any data, show it - don't refetch just because cachedCount < limit
    if (cachedCount === 0) {
      hasTriggeredRefetchRef.current = true
      if (__DEV__) {
        log.debug('useHistoryQuery', 'Cache empty, triggering refetch', {
          cachedCount,
          limit,
        })
      }
      // Use setTimeout to avoid calling refetch during render
      setTimeout(() => {
        queryResult.refetch()
      }, 100) // Small delay to ensure query is ready
    }
  }, [isHydrated, limit, queryResult])

  return queryResult
}
