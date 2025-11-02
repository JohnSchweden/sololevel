import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  getCacheMetrics,
  getHitRate,
  recordCacheHit,
  recordCacheMiss,
  recordEviction,
  resetMetrics,
} from './cacheMetrics'

describe('cacheMetrics', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('recordCacheHit', () => {
    it('should increment hit count for thumbnail cache', () => {
      recordCacheHit('thumbnail')
      recordCacheHit('thumbnail')
      const metrics = getCacheMetrics()
      expect(metrics.thumbnails.hits).toBe(2)
      expect(metrics.thumbnails.misses).toBe(0)
    })

    it('should increment hit count for video cache', () => {
      recordCacheHit('video')
      const metrics = getCacheMetrics()
      expect(metrics.videos.hits).toBe(1)
      expect(metrics.videos.misses).toBe(0)
    })
  })

  describe('recordCacheMiss', () => {
    it('should increment miss count for thumbnail cache', () => {
      recordCacheMiss('thumbnail')
      recordCacheMiss('thumbnail')
      const metrics = getCacheMetrics()
      expect(metrics.thumbnails.hits).toBe(0)
      expect(metrics.thumbnails.misses).toBe(2)
    })

    it('should increment miss count for video cache', () => {
      recordCacheMiss('video')
      const metrics = getCacheMetrics()
      expect(metrics.videos.hits).toBe(0)
      expect(metrics.videos.misses).toBe(1)
    })
  })

  describe('recordEviction', () => {
    it('should increment eviction count for thumbnail cache', () => {
      recordEviction('thumbnail')
      recordEviction('thumbnail')
      const metrics = getCacheMetrics()
      expect(metrics.thumbnails.evictions).toBe(2)
    })

    it('should increment eviction count for video cache', () => {
      recordEviction('video')
      const metrics = getCacheMetrics()
      expect(metrics.videos.evictions).toBe(1)
    })
  })

  describe('getHitRate', () => {
    it('should calculate hit rate correctly', () => {
      recordCacheHit('thumbnail')
      recordCacheHit('thumbnail')
      recordCacheMiss('thumbnail')
      const hitRate = getHitRate('thumbnail')
      expect(hitRate).toBe(2 / 3) // 2 hits / 3 total requests
    })

    it('should return 0 when no requests made', () => {
      const hitRate = getHitRate('thumbnail')
      expect(hitRate).toBe(0)
    })

    it('should return 1 when all requests hit', () => {
      recordCacheHit('thumbnail')
      recordCacheHit('thumbnail')
      const hitRate = getHitRate('thumbnail')
      expect(hitRate).toBe(1)
    })
  })

  describe('getCacheMetrics', () => {
    it('should return all metrics with correct structure', () => {
      recordCacheHit('thumbnail')
      recordCacheMiss('video')
      recordEviction('thumbnail')
      const metrics = getCacheMetrics()
      expect(metrics).toEqual({
        thumbnails: {
          hits: 1,
          misses: 0,
          evictions: 1,
        },
        videos: {
          hits: 0,
          misses: 1,
          evictions: 0,
        },
      })
    })
  })

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', () => {
      recordCacheHit('thumbnail')
      recordCacheMiss('video')
      recordEviction('thumbnail')
      resetMetrics()
      const metrics = getCacheMetrics()
      expect(metrics.thumbnails.hits).toBe(0)
      expect(metrics.thumbnails.misses).toBe(0)
      expect(metrics.thumbnails.evictions).toBe(0)
      expect(metrics.videos.hits).toBe(0)
      expect(metrics.videos.misses).toBe(0)
      expect(metrics.videos.evictions).toBe(0)
    })
  })
})
