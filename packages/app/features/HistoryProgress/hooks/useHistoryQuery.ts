import { type AnalysisJobWithVideo, type AnalysisResults, getUserAnalysisJobs } from '@my/api'
import { log } from '@my/logging'
import { useQuery } from '@tanstack/react-query'
import { useVideoHistoryStore } from '../stores/videoHistory'
import type { CachedAnalysis } from '../stores/videoHistory'

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
 */
function transformToCache(
  job: AnalysisJobWithVideo
): Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> {
  // Prefer local thumbnail (metadata.thumbnailUri) over cloud thumbnail (thumbnail_url) for immediate display
  const thumbnail =
    job.video_recordings?.metadata?.thumbnailUri || job.video_recordings?.thumbnail_url || undefined
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
 * @param limit - Maximum number of videos to fetch (default: 10)
 * @returns Query result with video items for display
 */
export function useHistoryQuery(limit = 10) {
  const cache = useVideoHistoryStore()

  return useQuery({
    queryKey: ['history', 'completed', limit],
    queryFn: async (): Promise<VideoItem[]> => {
      const startTime = Date.now()

      // Check cache first
      const cached = cache.getAllCached()
      const now = Date.now()
      const cacheAge = now - cache.lastSync
      const isCacheFresh = cached.length > 0 && cacheAge < 60000 // 60s

      if (isCacheFresh) {
        // Cache hit - return immediately
        const duration = Date.now() - startTime
        log.debug('useHistoryQuery', 'Cache hit', {
          count: cached.length,
          cacheAge,
          duration,
          limit,
        })

        // Return cached data (sorted by createdAt desc, limited to requested count)
        return cached
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit)
          .map(transformToVideoItem)
      }

      // Cache miss - fetch from database
      log.debug('useHistoryQuery', 'Cache miss, fetching from database', {
        cachedCount: cached.length,
        cacheAge,
        limit,
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
        const videoItems = sortedCompletedJobs.map((job: any) => {
          const cacheEntry = transformToCache(job)

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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  })
}
