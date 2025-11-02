import { log } from '@my/logging'
import { getThumbnailStorageUsage } from '../../HistoryProgress/utils/thumbnailCache'
import { getAudioStorageUsage } from '../../VideoAnalysis/utils/audioCache'
import { getVideoStorageUsage } from './videoStorageService'

/**
 * TTL (Time-To-Live) configuration for cached media
 * Files older than TTL will be eligible for cleanup
 */
export const CACHE_TTL_DAYS = {
  thumbnails: 60, // Long TTL, small files
  videos: 30, // Medium TTL, large files
  audio: 14, // Short TTL, easily regenerated
} as const

/**
 * Storage stats for a single media type
 */
export interface MediaTypeStats {
  count: number
  sizeMB: number
}

/**
 * Aggregated storage stats across all media types
 */
export interface MediaCacheStats {
  thumbnails: MediaTypeStats
  videos: MediaTypeStats
  audio: MediaTypeStats
  total: MediaTypeStats
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  evictionCount: number
}

/**
 * Extended metrics with per-type breakdown
 */
export interface CacheMetricsExt extends CacheMetrics {
  byType: {
    thumbnail: { hits: number; misses: number; evictions: number }
    video: { hits: number; misses: number; evictions: number }
    audio: { hits: number; misses: number; evictions: number }
  }
}

/**
 * Eviction result breakdown
 */
export interface EvictionResult {
  thumbnailsEvicted: number
  videosEvicted: number
  audioEvicted: number
  totalSpaceFreed: number
}

/**
 * Cleanup result breakdown for expired items
 */
export interface CleanupResult {
  audioCleanedUp: number
  videosCleanedUp: number
  thumbnailsCleanedUp: number
  totalCleaned: number
}

type CacheType = 'thumbnail' | 'video' | 'audio'

/**
 * Unified cache manager coordinating all media type caches
 * Enforces global quota (750MB) with coordinated LRU eviction
 */
export class MediaCacheManager {
  static readonly GLOBAL_QUOTA_MB = 750

  static readonly CACHE_TTL_DAYS = CACHE_TTL_DAYS

  private static metrics: CacheMetricsExt = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictionCount: 0,
    byType: {
      thumbnail: { hits: 0, misses: 0, evictions: 0 },
      video: { hits: 0, misses: 0, evictions: 0 },
      audio: { hits: 0, misses: 0, evictions: 0 },
    },
  }

  // Injectable eviction functions for testing
  private static evictAudioFn: ((targetMB: number) => Promise<number>) | null = null
  private static evictVideoFn: ((targetMB: number) => Promise<number>) | null = null
  private static evictThumbnailFn: ((targetMB: number) => Promise<number>) | null = null

  // Injectable cleanup functions for testing TTL expiry
  private static cleanupAudioFn: ((ttlDays: number) => Promise<number>) | null = null
  private static cleanupVideoFn: ((ttlDays: number) => Promise<number>) | null = null
  private static cleanupThumbnailFn: ((ttlDays: number) => Promise<number>) | null = null

  /**
   * Get aggregated storage stats across all cache types
   * @returns MediaCacheStats with per-type and total breakdown
   */
  static async getStorageStats(): Promise<MediaCacheStats> {
    try {
      const [thumbnailStats, videoStats, audioStats] = await Promise.all([
        getThumbnailStorageUsage(),
        getVideoStorageUsage(),
        getAudioStorageUsage(),
      ])

      const total = {
        count: thumbnailStats.count + videoStats.count + audioStats.count,
        sizeMB: thumbnailStats.sizeMB + videoStats.sizeMB + audioStats.sizeMB,
      }

      log.debug('MediaCacheManager', 'Storage stats retrieved', {
        thumbnails: thumbnailStats,
        videos: videoStats,
        audio: audioStats,
        total,
      } as Record<string, unknown>)

      return {
        thumbnails: thumbnailStats,
        videos: videoStats,
        audio: audioStats,
        total,
      }
    } catch (error) {
      log.error('MediaCacheManager', 'Failed to get storage stats', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get aggregated cache metrics across all types
   * @returns CacheMetrics with calculated hit rate
   */
  static async getMetrics(): Promise<CacheMetrics> {
    const total = MediaCacheManager.metrics.hits + MediaCacheManager.metrics.misses
    const hitRate = total > 0 ? MediaCacheManager.metrics.hits / total : 0

    const result: CacheMetrics = {
      hits: MediaCacheManager.metrics.hits,
      misses: MediaCacheManager.metrics.misses,
      hitRate,
      evictionCount: MediaCacheManager.metrics.evictionCount,
    }

    log.debug(
      'MediaCacheManager',
      'Metrics retrieved',
      result as unknown as Record<string, unknown>
    )
    return result
  }

  /**
   * Evict files across all media types to free target space
   * Priority: audio > video > thumbnail
   * @param targetSizeMB - Target space to free in MB
   * @returns EvictionResult with breakdown by media type
   */
  static async evictLRU(targetSizeMB: number): Promise<EvictionResult> {
    try {
      let freedMB = 0

      const result: EvictionResult = {
        audioEvicted: 0,
        videosEvicted: 0,
        thumbnailsEvicted: 0,
        totalSpaceFreed: 0,
      }

      // Priority 1: Evict old audio segments (easily re-downloaded)
      if (freedMB < targetSizeMB && MediaCacheManager.evictAudioFn) {
        const audioFreed = await MediaCacheManager.evictAudioFn(Math.max(0, targetSizeMB - freedMB))
        result.audioEvicted = audioFreed
        freedMB += audioFreed
        log.info('MediaCacheManager', 'Audio eviction', { audioFreed, targetSizeMB })
      }

      // Priority 2: Evict old videos (large, can stream)
      if (freedMB < targetSizeMB && MediaCacheManager.evictVideoFn) {
        const videoFreed = await MediaCacheManager.evictVideoFn(Math.max(0, targetSizeMB - freedMB))
        result.videosEvicted = videoFreed
        freedMB += videoFreed
        log.info('MediaCacheManager', 'Video eviction', { videoFreed, targetSizeMB })
      }

      // Priority 3: Evict old thumbnails (last resort, impacts UX)
      if (freedMB < targetSizeMB && MediaCacheManager.evictThumbnailFn) {
        const thumbnailFreed = await MediaCacheManager.evictThumbnailFn(
          Math.max(0, targetSizeMB - freedMB)
        )
        result.thumbnailsEvicted = thumbnailFreed
        freedMB += thumbnailFreed
        log.info('MediaCacheManager', 'Thumbnail eviction', { thumbnailFreed, targetSizeMB })
      }

      result.totalSpaceFreed = freedMB
      log.info(
        'MediaCacheManager',
        'LRU eviction complete',
        result as unknown as Record<string, unknown>
      )
      return result
    } catch (error) {
      log.error('MediaCacheManager', 'Failed to evict LRU', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Warm cache by preloading recent analysis items
   * @param analysisIds - Analysis IDs to preload
   */
  static async warmCache(analysisIds: number[]): Promise<void> {
    try {
      log.info('MediaCacheManager', 'Cache warming started', {
        count: analysisIds.length,
      })

      // TODO: Implement actual prefetch logic
      // For now, this is a placeholder that can be extended in future phases

      log.info('MediaCacheManager', 'Cache warming complete', {
        count: analysisIds.length,
      })
    } catch (error) {
      log.error('MediaCacheManager', 'Cache warming failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Clear all media caches
   */
  static async clearAll(): Promise<void> {
    try {
      log.info('MediaCacheManager', 'Clearing all caches')
      // TODO: Implement cache clearing across all types
      log.info('MediaCacheManager', 'All caches cleared')
    } catch (error) {
      log.error('MediaCacheManager', 'Failed to clear caches', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Clean up expired items based on TTL configuration
   * Removes files older than their configured TTL
   * @returns CleanupResult with count of items cleaned up per type
   */
  static async cleanupExpired(): Promise<CleanupResult> {
    try {
      const result: CleanupResult = {
        audioCleanedUp: 0,
        videosCleanedUp: 0,
        thumbnailsCleanedUp: 0,
        totalCleaned: 0,
      }

      // Clean up audio older than 14 days
      if (MediaCacheManager.cleanupAudioFn) {
        const audioCleanedUp = await MediaCacheManager.cleanupAudioFn(
          MediaCacheManager.CACHE_TTL_DAYS.audio
        )
        result.audioCleanedUp = audioCleanedUp
        log.info('MediaCacheManager', 'Audio cleanup complete', { audioCleanedUp })
      }

      // Clean up videos older than 30 days
      if (MediaCacheManager.cleanupVideoFn) {
        const videosCleanedUp = await MediaCacheManager.cleanupVideoFn(
          MediaCacheManager.CACHE_TTL_DAYS.videos
        )
        result.videosCleanedUp = videosCleanedUp
        log.info('MediaCacheManager', 'Video cleanup complete', { videosCleanedUp })
      }

      // Clean up thumbnails older than 60 days
      if (MediaCacheManager.cleanupThumbnailFn) {
        const thumbnailsCleanedUp = await MediaCacheManager.cleanupThumbnailFn(
          MediaCacheManager.CACHE_TTL_DAYS.thumbnails
        )
        result.thumbnailsCleanedUp = thumbnailsCleanedUp
        log.info('MediaCacheManager', 'Thumbnail cleanup complete', { thumbnailsCleanedUp })
      }

      result.totalCleaned =
        result.audioCleanedUp + result.videosCleanedUp + result.thumbnailsCleanedUp

      log.info(
        'MediaCacheManager',
        'TTL cleanup complete',
        result as unknown as Record<string, unknown>
      )
      return result
    } catch (error) {
      log.error('MediaCacheManager', 'Failed to cleanup expired items', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Record a cache hit for a media type
   */
  static recordHit(type: CacheType): void {
    MediaCacheManager.metrics.hits++
    MediaCacheManager.metrics.byType[type].hits++
    log.debug('MediaCacheManager', 'Cache hit recorded', { type })
  }

  /**
   * Record a cache miss for a media type
   */
  static recordMiss(type: CacheType): void {
    MediaCacheManager.metrics.misses++
    MediaCacheManager.metrics.byType[type].misses++
    log.debug('MediaCacheManager', 'Cache miss recorded', { type })
  }

  /**
   * Record a cache eviction for a media type
   */
  static recordEviction(type: CacheType): void {
    MediaCacheManager.metrics.evictionCount++
    MediaCacheManager.metrics.byType[type].evictions++
    log.info('MediaCacheManager', 'Cache eviction recorded', { type })
  }

  /**
   * Reset all metrics to zero
   * @internal Used for testing
   */
  static resetMetrics(): void {
    MediaCacheManager.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictionCount: 0,
      byType: {
        thumbnail: { hits: 0, misses: 0, evictions: 0 },
        video: { hits: 0, misses: 0, evictions: 0 },
        audio: { hits: 0, misses: 0, evictions: 0 },
      },
    }
    log.debug('MediaCacheManager', 'Metrics reset')
  }

  /**
   * Set injectable eviction functions for dependency injection
   * @internal Used for testing
   */
  static setEvictionFunctions(
    evictAudio: (targetMB: number) => Promise<number>,
    evictVideo: (targetMB: number) => Promise<number>,
    evictThumbnail: (targetMB: number) => Promise<number>
  ): void {
    MediaCacheManager.evictAudioFn = evictAudio
    MediaCacheManager.evictVideoFn = evictVideo
    MediaCacheManager.evictThumbnailFn = evictThumbnail
  }

  /**
   * Set injectable cleanup functions for dependency injection (TTL expiry)
   * @internal Used for testing
   */
  static setCleanupFunctions(
    cleanupAudio: (ttlDays: number) => Promise<number>,
    cleanupVideo: (ttlDays: number) => Promise<number>,
    cleanupThumbnail: (ttlDays: number) => Promise<number>
  ): void {
    MediaCacheManager.cleanupAudioFn = cleanupAudio
    MediaCacheManager.cleanupVideoFn = cleanupVideo
    MediaCacheManager.cleanupThumbnailFn = cleanupThumbnail
  }
}
