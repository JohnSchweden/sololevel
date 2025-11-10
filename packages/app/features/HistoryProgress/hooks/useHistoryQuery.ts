import {
  type AnalysisJobWithVideo,
  type AnalysisResults,
  type PoseData,
  getUserAnalysisJobs,
} from '@my/api'
import { log } from '@my/logging'
import { useQuery } from '@tanstack/react-query'
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
                log.debug('useHistoryQuery', 'Updated thumbnail to persistent cache', {
                  videoId,
                  path: persistentPath,
                })
              }
            })
            .catch((error) => {
              log.debug('useHistoryQuery', 'Persistent cache check failed', {
                error: error instanceof Error ? error.message : String(error),
                videoId,
              })
            })
        }
        return undefined
      })
      .catch((error) => {
        log.debug('useHistoryQuery', 'Metadata thumbnail existence check failed', {
          error: error instanceof Error ? error.message : String(error),
          videoId,
        })
      })
  }

  // Background: Persist cloud thumbnail to disk (non-blocking)
  if (
    cloudThumbnail &&
    typeof cloudThumbnail === 'string' &&
    cloudThumbnail.startsWith('http') &&
    job.video_recordings &&
    !metadataThumbnail // Only persist if not using metadata thumbnail
  ) {
    const videoId = job.video_recordings.id
    const analysisId = job.id

    // Fire and forget - don't await
    void persistThumbnailFile(videoId, cloudThumbnail)
      .then((persistentPath) => {
        log.info('useHistoryQuery', 'Thumbnail persisted to disk', {
          videoId,
          path: persistentPath,
        })
        // Update cache entry with persistent path
        const { updateCache } = useVideoHistoryStore.getState()
        updateCache(analysisId, { thumbnail: persistentPath })
      })
      .catch(async (error) => {
        const errorMessage = await getNetworkErrorMessage('thumbnail', error)
        log.warn('useHistoryQuery', 'Failed to persist thumbnail', {
          videoId,
          error: errorMessage,
        })
      })
  }

  // Resolve video URI: prioritize metadata.localUri if available, otherwise use storage_path
  const metadataLocalUri = (job.video_recordings?.metadata as { localUri?: string } | undefined)
    ?.localUri
  const storagePath = job.video_recordings?.storage_path
  let videoUri: string | null = null

  if (metadataLocalUri && Platform.OS !== 'web') {
    // Use metadata.localUri if available (from recording flow)
    videoUri = metadataLocalUri
    // Note: localUriIndex updates are now batched in the caller to prevent cascade re-renders
    // This function no longer calls setLocalUri directly during transformation
  } else {
    // Fallback to storage_path (will be resolved via signed URL in useHistoricalAnalysis)
    videoUri = storagePath ?? job.video_recordings?.filename ?? null
  }

  return {
    id: job.id,
    videoId: job.video_recording_id,
    userId: job.user_id,
    title: `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
    createdAt: job.created_at,
    thumbnail: thumbnail ?? undefined,
    videoUri: videoUri ?? undefined,
    storagePath: storagePath ?? undefined,
    results: job.results as AnalysisResults,
    poseData: (job.pose_data as PoseData | null) || undefined,
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
  }
}

/**
 * Hook for fetching user's analysis history with cache-first strategy
 *
 * Strategy:
 * 1. Initialize with persisted Zustand cache data (instant display, no loading spinner)
 * 2. Background refetch from database to update cache
 * 3. Apply stale-while-revalidate (5 min stale time)
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

  // Get cached data from Zustand store for initial display (persists across restarts)
  // Only use initialData when cache has data - empty array prevents query from running
  const initialData = React.useMemo(() => {
    const allCached = useVideoHistoryStore.getState().getAllCached()
    if (allCached.length === 0) {
      return null
    }

    // Sort by newest first and limit
    const sorted = [...allCached]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
    return sorted.map(transformToVideoItem)
  }, [limit])

  // Build query options conditionally - only include initialData if we have cached data
  const queryOptions = React.useMemo(() => {
    const baseOptions = {
      queryKey: ['history', 'completed', limit] as const,
      refetchOnMount: true, // Still refetch in background even with initialData
      queryFn: async (): Promise<VideoItem[]> => {
        const startTime = Date.now()

        // TanStack Query handles caching with staleTime (5 minutes)
        // Zustand store is used for persistence and data transformation only
        log.debug('useHistoryQuery', 'Fetching history data', {
          limit,
          cacheVersion: cache.version,
        })

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

          log.debug('useHistoryQuery', 'Raw jobs from API', {
            totalJobs: jobs.length,
            limit,
            statusDistribution,
            sampleJob: jobs[0]
              ? {
                  id: jobs[0].id,
                  status: jobs[0].status,
                  hasVideoRecordings: !!jobs[0].video_recordings,
                  videoRecordingsMetadata: jobs[0].video_recordings?.metadata,
                }
              : 'no jobs',
          })

          // All jobs should be completed (filtered at DB level), but keep as safety check
          const completedJobs = jobs.filter((job: any) => job.status === 'completed')

          // Work with newest-first order for cache + UI consistency
          const sortedCompletedJobs = [...completedJobs].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )

          // Update cache with completed jobs and transform to VideoItem
          // Collect all cache entries and localUri updates to batch them in a single store update
          // This prevents 10 sequential re-renders during pull-to-refresh
          const cacheEntries: Array<Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'>> = []
          const localUriUpdates: Array<[string, string]> = []

          // CRITICAL FIX: transformToCache now returns synchronously
          // No longer awaits file checks - they happen in background
          // This eliminates the 300-1000ms blocking I/O that caused 60→10 FPS drop
          const videoItemsData = sortedCompletedJobs.map((job: any) => {
            const cacheEntry = transformToCache(job)
            cacheEntries.push(cacheEntry)

            // Collect localUri updates instead of applying immediately
            const metadata = job.video_recordings?.metadata as Record<string, unknown> | undefined
            if (cacheEntry.storagePath) {
              const localUri = metadata?.localUri as string | undefined
              if (localUri && localUri.includes('recordings/')) {
                localUriUpdates.push([cacheEntry.storagePath, localUri])
              }
            }

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
            localUriUpdates
          )

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
      staleTime: Number.POSITIVE_INFINITY, // Historical data doesn't change, cache indefinitely
      gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
    }

    // Only include initialData if we have cached data (non-null)
    if (initialData !== null) {
      return { ...baseOptions, initialData }
    }

    return baseOptions
  }, [limit, cache, initialData])

  return useQuery(queryOptions)
}
