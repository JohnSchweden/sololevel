import { type AnalysisJobWithVideo, type AnalysisResults, getUserAnalysisJobs } from '@my/api'
import { log } from '@my/logging'
import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
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
 * Transform AnalysisJobWithVideo from API to CachedAnalysis format
 * Checks file existence for local URIs to avoid broken thumbnails
 *
 * Thumbnail Resolution Flow (3-Tier Caching):
 * ```
 * transformToCache(job) for each video:
 *   │
 *   ├─ metadata.thumbnailUri present? (local temp path from expo-video-thumbnails)
 *   │   │
 *   │   ├─ Yes → Check file exists (FileSystem.getInfoAsync)
 *   │   │   │
 *   │   │   ├─ File exists → Use local URI ✓ (Tier 1: Temp file)
 *   │   │   │                (fast, no network, temp path)
 *   │   │   │
 *   │   │   └─ File missing → Fallback to Tier 2/3
 *   │   │                      (persistent disk cache → cloud CDN)
 *   │   │
 *   │   └─ No → Check Tier 2: Persistent disk cache
 *   │            │
 *   │            ├─ ${documentDirectory}thumbnails/${videoId}.jpg exists?
 *   │            │   │
 *   │            │   ├─ Yes → Use persistent path ✓ (Tier 2: Disk cache)
 *   │            │   │        (survives app restart, instant load)
 *   │            │   │
 *   │            │   └─ No → Fallback to Tier 3: Cloud CDN
 *   │            │             (thumbnail_url → download & persist)
 *   │            │             (persist in background, return cloud URL)
 *   │
 *   ├─ metadata.localUri present? (persistent documentDirectory path for video)
 *   │   │
 *   │   └─ Yes → Store in Zustand localUriIndex map for video playback
 *   │
 *   └─ Output: CachedAnalysis with thumbnail URI (stored in Zustand cache)
 * ```
 *
 * Implementation Details:
 * - Tier 1: Temp files from expo-video-thumbnails (deleted on app restart)
 * - Tier 2: Persistent disk cache in ${documentDirectory}thumbnails/ (survives app restart)
 * - Tier 3: Cloud CDN (thumbnail_url) with automatic persistence to Tier 2
 * - Persistence is non-blocking (returns cloud URL immediately, downloads in background)
 * - Subsequent app restarts use Tier 2 disk cache (zero network requests)
 */
async function transformToCache(
  job: AnalysisJobWithVideo
): Promise<Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'>> {
  // Check if metadata.thumbnailUri exists, otherwise fall back to thumbnail_url
  let thumbnail: string | undefined
  const metadataThumbnail = job.video_recordings?.metadata?.thumbnailUri

  if (metadataThumbnail && Platform.OS !== 'web') {
    try {
      // Check if local thumbnail exists
      const fileInfo = await FileSystem.getInfoAsync(metadataThumbnail)
      if (fileInfo.exists) {
        thumbnail = metadataThumbnail
        recordCacheHit('thumbnail')
        log.debug('useHistoryQuery', 'Using local thumbnail', { thumbnail })
      } else {
        log.debug('useHistoryQuery', 'Local thumbnail missing, checking persistent disk cache', {
          metadataThumbnail,
        })

        // Check persistent disk cache before falling back to cloud
        if (job.video_recordings) {
          try {
            const persistentPath = getCachedThumbnailPath(job.video_recordings.id)
            const persistentInfo = await FileSystem.getInfoAsync(persistentPath)
            if (persistentInfo.exists) {
              thumbnail = persistentPath
              recordCacheHit('thumbnail')
              log.debug('useHistoryQuery', 'Using persistent disk cache thumbnail', {
                videoId: job.video_recordings.id,
                path: persistentPath,
              })
            }
          } catch (error) {
            log.warn('useHistoryQuery', 'Failed to check persistent disk cache', {
              error: error instanceof Error ? error.message : String(error),
              videoId: job.video_recordings.id,
            })
          }
        }

        // Fallback to cloud if persistent cache doesn't exist
        if (!thumbnail) {
          recordCacheMiss('thumbnail')
          thumbnail = job.video_recordings?.thumbnail_url || undefined

          // Persist cloud thumbnail to disk (non-blocking)
          if (thumbnail && thumbnail.startsWith('http') && job.video_recordings) {
            const videoId = job.video_recordings.id
            const analysisId = job.id // Capture for cache update
            persistThumbnailFile(videoId, thumbnail)
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
                log.warn('useHistoryQuery', 'Failed to persist thumbnail, using cloud URL', {
                  videoId,
                  error: errorMessage,
                  originalError: error instanceof Error ? error.message : String(error),
                })
              })
          }
        }
      }
    } catch (error) {
      log.warn('useHistoryQuery', 'Failed to check thumbnail existence', {
        error: error instanceof Error ? error.message : String(error),
        metadataThumbnail,
      })
      // Fall back to cloud on error
      thumbnail = job.video_recordings?.thumbnail_url || undefined
    }
  } else {
    // No metadata thumbnailUri - check persistent disk cache first
    if (Platform.OS !== 'web' && job.video_recordings) {
      try {
        const persistentPath = getCachedThumbnailPath(job.video_recordings.id)
        const persistentInfo = await FileSystem.getInfoAsync(persistentPath)
        if (persistentInfo.exists) {
          thumbnail = persistentPath
          recordCacheHit('thumbnail')
          log.debug('useHistoryQuery', 'Using persistent disk cache thumbnail', {
            videoId: job.video_recordings.id,
            path: persistentPath,
          })
        }
      } catch (error) {
        log.warn('useHistoryQuery', 'Failed to check persistent disk cache', {
          error: error instanceof Error ? error.message : String(error),
          videoId: job.video_recordings.id,
        })
      }
    }

    // Fallback to cloud if persistent cache doesn't exist
    if (!thumbnail) {
      recordCacheMiss('thumbnail')
      thumbnail = metadataThumbnail || job.video_recordings?.thumbnail_url || undefined

      // Persist cloud thumbnail to disk if URL starts with http (non-blocking)
      if (thumbnail && thumbnail.startsWith('http') && job.video_recordings) {
        const videoId = job.video_recordings.id
        const analysisId = job.id // Capture for cache update
        persistThumbnailFile(videoId, thumbnail)
          .then((persistentPath) => {
            log.info('useHistoryQuery', 'Thumbnail persisted to disk', {
              videoId,
              path: persistentPath,
            })
            // Update cache entry with persistent path
            const { updateCache } = useVideoHistoryStore.getState()
            updateCache(analysisId, { thumbnail: persistentPath })
          })
          .catch((error) => {
            log.warn('useHistoryQuery', 'Failed to persist thumbnail, using cloud URL', {
              videoId,
              error: error instanceof Error ? error.message : String(error),
            })
          })
      }
    }
  }

  // Use storage_path to construct Supabase Storage URL, or fall back to filename
  const videoUri = job.video_recordings?.storage_path || job.video_recordings?.filename
  const storagePath = job.video_recordings?.storage_path || undefined

  return {
    id: job.id,
    videoId: job.video_recording_id,
    userId: job.user_id,
    title: `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
    createdAt: job.created_at,
    thumbnail,
    videoUri,
    storagePath,
    results: job.results as AnalysisResults,
    poseData: job.pose_data as any,
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
 * 1. Check in-memory cache first (< 50ms)
 * 2. If cache is fresh (< 60s since last sync), return cached data
 * 3. Otherwise, fetch from database and update cache
 * 4. Apply stale-while-revalidate (5 min stale time)
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
 *
 * @param limit - Maximum number of videos to fetch (default: 10)
 * @returns Query result with video items for display
 */
export function useHistoryQuery(limit = 10) {
  const cache = useVideoHistoryStore()

  return useQuery({
    queryKey: ['history', 'completed', limit],
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
        const videoItems = await Promise.all(
          sortedCompletedJobs.map(async (job: any) => {
            const cacheEntry = await transformToCache(job)

            // Register local thumbnail / video URIs from metadata for cache reuse
            const metadata = job.video_recordings?.metadata as Record<string, unknown> | undefined
            if (cacheEntry.storagePath) {
              const localVideoUri =
                (metadata?.localUri as string | undefined) ||
                (metadata?.videoUri as string | undefined)
              if (typeof localVideoUri === 'string' && localVideoUri.startsWith('file://')) {
                cache.setLocalUri(cacheEntry.storagePath, localVideoUri)
                cacheEntry.videoUri = localVideoUri
              }
            }

            cache.addToCache(cacheEntry)

            // Get from cache to ensure we have cached and lastAccessed
            const cached = cache.getCached(job.id)
            const videoItem = cached
              ? transformToVideoItem(cached)
              : transformToVideoItem({
                  ...cacheEntry,
                  cachedAt: Date.now(),
                  lastAccessed: Date.now(),
                })

            // // Debug: Log transformation
            // log.debug('useHistoryQuery', 'Transformed video item', {
            //   jobId: job.id,
            //   hasThumbnail: !!videoItem.thumbnailUri,
            //   thumbnailPreview: videoItem.thumbnailUri
            //     ? videoItem.thumbnailUri.substring(0, 80)
            //     : 'none',
            // })

            return videoItem
          })
        )

        // Update last sync timestamp
        cache.updateLastSync()

        // Ensure consistent ordering (newest first)
        const sortedVideoItems = [...videoItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        const duration = Date.now() - startTime
        log.info('useHistoryQuery', 'Database fetch completed', {
          totalJobs: jobs.length,
          completedJobs: completedJobs.length,
          cacheUpdated: true,
          duration,
          limit,
          statusFilter: 'completed',
        })

        return sortedVideoItems
      } catch (error) {
        const duration = Date.now() - startTime
        log.error('useHistoryQuery', 'Failed to fetch analysis history', {
          error: error instanceof Error ? error.message : String(error),
          duration,
        })
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - TanStack Query owns cache freshness
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    // Note: Zustand store is used for AsyncStorage persistence and data transformation
    // TanStack Query handles all cache timing and refetch strategies
  })
}
