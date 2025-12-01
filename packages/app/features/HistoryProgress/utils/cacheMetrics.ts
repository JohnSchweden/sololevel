import { log } from '@my/logging'

/**
 * Cache metrics for tracking cache performance
 */
export interface CacheMetrics {
  thumbnails: {
    hits: number
    misses: number
    evictions: number
  }
  videos: {
    hits: number
    misses: number
    evictions: number
  }
}

type CacheType = 'thumbnail' | 'video'

// In-memory metrics store
let metrics: CacheMetrics = {
  thumbnails: {
    hits: 0,
    misses: 0,
    evictions: 0,
  },
  videos: {
    hits: 0,
    misses: 0,
    evictions: 0,
  },
}

/**
 * Record a cache hit
 * @param type - Cache type ('thumbnail' or 'video')
 */
export function recordCacheHit(type: CacheType): void {
  if (type === 'thumbnail') {
    metrics.thumbnails.hits++
  } else {
    metrics.videos.hits++
  }
  // Removed per-hit log - use getCacheMetrics() for aggregated stats
}

/**
 * Record a cache miss
 * @param type - Cache type ('thumbnail' or 'video')
 */
export function recordCacheMiss(type: CacheType): void {
  if (type === 'thumbnail') {
    metrics.thumbnails.misses++
  } else {
    metrics.videos.misses++
  }
  // Removed per-miss log - use getCacheMetrics() for aggregated stats
}

/**
 * Record a cache eviction
 * @param type - Cache type ('thumbnail' or 'video')
 */
export function recordEviction(type: CacheType): void {
  if (type === 'thumbnail') {
    metrics.thumbnails.evictions++
  } else {
    metrics.videos.evictions++
  }
  log.info('cacheMetrics', 'Cache eviction recorded', { type })
}

/**
 * Get current cache metrics
 * @returns Current cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics }
}

/**
 * Calculate hit rate for a cache type
 * @param type - Cache type ('thumbnail' or 'video')
 * @returns Hit rate as a number between 0 and 1 (0 = 0%, 1 = 100%)
 */
export function getHitRate(type: CacheType): number {
  const cacheMetrics = type === 'thumbnail' ? metrics.thumbnails : metrics.videos
  const total = cacheMetrics.hits + cacheMetrics.misses
  if (total === 0) {
    return 0
  }
  return cacheMetrics.hits / total
}

/**
 * Reset all metrics to zero
 */
export function resetMetrics(): void {
  metrics = {
    thumbnails: {
      hits: 0,
      misses: 0,
      evictions: 0,
    },
    videos: {
      hits: 0,
      misses: 0,
      evictions: 0,
    },
  }
  log.debug('cacheMetrics', 'Metrics reset')
}
