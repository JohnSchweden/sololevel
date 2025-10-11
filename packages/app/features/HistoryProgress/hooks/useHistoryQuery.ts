import { type AnalysisResults, getUserAnalysisJobs } from '@my/api'
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
 * Transform AnalysisJob from API to CachedAnalysis format
 */
function transformToCache(job: {
  id: number
  user_id: string
  video_recording_id: number
  title: string | null
  created_at: string
  results: any
  pose_data?: any
  video_recordings?: {
    thumbnail_url?: string
  }
}): Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'> {
  return {
    id: job.id,
    videoId: job.video_recording_id,
    userId: job.user_id,
    title: job.title || `Analysis ${new Date(job.created_at).toLocaleDateString()}`,
    createdAt: job.created_at,
    thumbnail: job.video_recordings?.thumbnail_url,
    results: job.results as AnalysisResults,
    poseData: job.pose_data,
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
 * @returns Query result with video items for display
 */
export function useHistoryQuery() {
  const cache = useVideoHistoryStore()

  return useQuery({
    queryKey: ['history', 'completed'],
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
        })

        // Return cached data (sorted by createdAt desc)
        return cached
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(transformToVideoItem)
      }

      // Cache miss - fetch from database
      log.debug('useHistoryQuery', 'Cache miss, fetching from database', {
        cachedCount: cached.length,
        cacheAge,
      })

      try {
        const jobs = await getUserAnalysisJobs()

        // Filter completed jobs only
        const completedJobs = jobs.filter((job: any) => job.status === 'completed')

        // Work with newest-first order for cache + UI consistency
        const sortedCompletedJobs = [...completedJobs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        // Update cache with completed jobs and transform to VideoItem
        const videoItems = sortedCompletedJobs.map((job: any) => {
          const cacheEntry = transformToCache(job)
          cache.addToCache(cacheEntry)

          // Get from cache to ensure we have cached and lastAccessed
          const cached = cache.getCached(job.id)
          return cached
            ? transformToVideoItem(cached)
            : transformToVideoItem({
                ...cacheEntry,
                cachedAt: Date.now(),
                lastAccessed: Date.now(),
              })
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
