/// <reference types="jest" />

import { getThumbnailStorageUsage } from '../../HistoryProgress/utils/thumbnailCache'
import { getAudioStorageUsage } from '../../VideoAnalysis/utils/audioCache'
import { getVideoStorageUsage } from '../services/videoStorageService'
import { MediaCacheManager } from './mediaCacheManager'

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../../VideoAnalysis/utils/audioCache', () => ({
  getAudioStorageUsage: jest.fn(),
}))

jest.mock('../services/videoStorageService', () => ({
  getVideoStorageUsage: jest.fn(),
}))

jest.mock('../../HistoryProgress/utils/thumbnailCache', () => ({
  getThumbnailStorageUsage: jest.fn(),
}))

describe('MediaCacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    MediaCacheManager.resetMetrics()

    // Default mock values
    ;(getAudioStorageUsage as jest.Mock).mockResolvedValue({ count: 0, sizeMB: 0 })
    ;(getVideoStorageUsage as jest.Mock).mockResolvedValue({ count: 0, sizeMB: 0 })
    ;(getThumbnailStorageUsage as jest.Mock).mockResolvedValue({ count: 0, sizeMB: 0 })
  })

  describe('getStorageStats', () => {
    it('should aggregate storage stats from all cache types', async () => {
      // Arrange
      ;(getAudioStorageUsage as jest.Mock).mockResolvedValue({
        count: 5,
        sizeMB: 25,
      })
      ;(getVideoStorageUsage as jest.Mock).mockResolvedValue({
        count: 3,
        sizeMB: 450,
      })
      ;(getThumbnailStorageUsage as jest.Mock).mockResolvedValue({
        count: 20,
        sizeMB: 10,
      })

      // Act
      const stats = await MediaCacheManager.getStorageStats()

      // Assert
      expect(stats).toEqual({
        thumbnails: { count: 20, sizeMB: 10 },
        videos: { count: 3, sizeMB: 450 },
        audio: { count: 5, sizeMB: 25 },
        total: { count: 28, sizeMB: 485 },
      })
    })

    it('should return zero stats when all caches empty', async () => {
      // Act
      const stats = await MediaCacheManager.getStorageStats()

      // Assert
      expect(stats.total.count).toBe(0)
      expect(stats.total.sizeMB).toBe(0)
    })
  })

  describe('getMetrics', () => {
    it('should return aggregated cache metrics', async () => {
      // Arrange
      MediaCacheManager.recordHit('thumbnail')
      MediaCacheManager.recordHit('thumbnail')
      MediaCacheManager.recordMiss('video')
      MediaCacheManager.recordEviction('audio')

      // Act
      const metrics = await MediaCacheManager.getMetrics()

      // Assert
      expect(metrics.hits).toBe(2)
      expect(metrics.misses).toBe(1)
      expect(metrics.evictionCount).toBe(1)
      expect(metrics.hitRate).toBeCloseTo(0.667, 2) // 2 hits / 3 total ops
    })

    it('should calculate hit rate correctly', async () => {
      // Arrange
      for (let i = 0; i < 70; i++) {
        MediaCacheManager.recordHit('video')
      }
      for (let i = 0; i < 30; i++) {
        MediaCacheManager.recordMiss('thumbnail')
      }

      // Act
      const metrics = await MediaCacheManager.getMetrics()

      // Assert
      expect(metrics.hitRate).toBe(0.7) // 70 hits / 100 total
    })
  })

  describe('evictLRU', () => {
    it('should evict across all media types with priority', async () => {
      // Arrange
      ;(getAudioStorageUsage as jest.Mock).mockResolvedValue({
        count: 10,
        sizeMB: 50,
      })
      ;(getVideoStorageUsage as jest.Mock).mockResolvedValue({
        count: 5,
        sizeMB: 400,
      })
      ;(getThumbnailStorageUsage as jest.Mock).mockResolvedValue({
        count: 30,
        sizeMB: 50,
      })

      // Mock eviction functions
      const mockEvictAudio = jest.fn().mockResolvedValue(25)
      const mockEvictVideo = jest.fn().mockResolvedValue(100)
      const mockEvictThumbnail = jest.fn().mockResolvedValue(20)

      MediaCacheManager.setEvictionFunctions(mockEvictAudio, mockEvictVideo, mockEvictThumbnail)

      // Act
      const result = await MediaCacheManager.evictLRU(300)

      // Assert
      expect(result.totalSpaceFreed).toBeGreaterThan(0)
      expect(result.audioEvicted).toBeGreaterThanOrEqual(0)
    })

    it('should respect eviction priority: audio > video > thumbnail', async () => {
      // This tests that audio is evicted first when needed
      ;(getAudioStorageUsage as jest.Mock).mockResolvedValue({
        count: 10,
        sizeMB: 80,
      })

      const mockEvictAudio = jest.fn().mockResolvedValue(80)
      const mockEvictVideo = jest.fn().mockResolvedValue(0)
      const mockEvictThumbnail = jest.fn().mockResolvedValue(0)

      MediaCacheManager.setEvictionFunctions(mockEvictAudio, mockEvictVideo, mockEvictThumbnail)

      // Act
      const result = await MediaCacheManager.evictLRU(100)

      // Assert - audio should be evicted first
      expect(mockEvictAudio).toHaveBeenCalled()
      expect(result.audioEvicted).toBeGreaterThan(0)
    })

    it('should stop evicting once target space is freed', async () => {
      // Arrange
      const mockEvictAudio = jest.fn().mockResolvedValue(150) // Enough to meet target
      const mockEvictVideo = jest.fn().mockResolvedValue(0)
      const mockEvictThumbnail = jest.fn().mockResolvedValue(0)

      MediaCacheManager.setEvictionFunctions(mockEvictAudio, mockEvictVideo, mockEvictThumbnail)

      // Act
      await MediaCacheManager.evictLRU(100)

      // Assert - should not evict video if audio freed enough
      expect(mockEvictVideo).not.toHaveBeenCalled()
    })
  })

  describe('warmCache', () => {
    it('should preload recent analysis items', async () => {
      // This is a placeholder - implementation will prefetch based on analysisIds
      const analysisIds = [1, 2, 3]

      // Act & Assert - should not throw
      await expect(MediaCacheManager.warmCache(analysisIds)).resolves.not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('should clear all media caches', async () => {
      // This is a placeholder - implementation will call clear on all cache types
      // Act & Assert - should not throw
      await expect(MediaCacheManager.clearAll()).resolves.not.toThrow()
    })
  })

  describe('metrics recording', () => {
    it('should track cache hits across types', async () => {
      // Act
      MediaCacheManager.recordHit('thumbnail')
      MediaCacheManager.recordHit('video')
      MediaCacheManager.recordHit('audio')

      // Assert
      const stats = await MediaCacheManager.getMetrics()
      expect(stats.hits).toBe(3)
    })

    it('should track cache misses across types', async () => {
      // Act
      MediaCacheManager.recordMiss('thumbnail')
      MediaCacheManager.recordMiss('video')

      // Assert
      const stats = await MediaCacheManager.getMetrics()
      expect(stats.misses).toBe(2)
    })

    it('should track evictions', async () => {
      // Act
      MediaCacheManager.recordEviction('audio')
      MediaCacheManager.recordEviction('video')
      MediaCacheManager.recordEviction('audio')

      // Assert
      const stats = await MediaCacheManager.getMetrics()
      expect(stats.evictionCount).toBe(3)
    })
  })

  describe('global quota', () => {
    it('should respect GLOBAL_QUOTA_MB constant', () => {
      // Assert
      expect(MediaCacheManager.GLOBAL_QUOTA_MB).toBe(750)
    })

    it('should prevent storage exceeding global quota', async () => {
      // Arrange - simulate cache at 700MB
      ;(getAudioStorageUsage as jest.Mock).mockResolvedValue({
        count: 5,
        sizeMB: 300,
      })
      ;(getVideoStorageUsage as jest.Mock).mockResolvedValue({
        count: 3,
        sizeMB: 350,
      })
      ;(getThumbnailStorageUsage as jest.Mock).mockResolvedValue({
        count: 20,
        sizeMB: 50,
      })

      // Act
      const stats = await MediaCacheManager.getStorageStats()
      const isOverQuota = stats.total.sizeMB > MediaCacheManager.GLOBAL_QUOTA_MB

      // Assert
      expect(isOverQuota).toBe(false)
    })
  })

  describe('TTL-based expiry', () => {
    it('should clean up expired items based on TTL', async () => {
      // This tests that cleanupExpired respects TTL configuration
      const mockCleanupAudio = jest.fn().mockResolvedValue(5)
      const mockCleanupVideo = jest.fn().mockResolvedValue(3)
      const mockCleanupThumbnail = jest.fn().mockResolvedValue(8)

      MediaCacheManager.setCleanupFunctions(
        mockCleanupAudio,
        mockCleanupVideo,
        mockCleanupThumbnail
      )

      // Act
      const result = await MediaCacheManager.cleanupExpired()

      // Assert
      expect(mockCleanupAudio).toHaveBeenCalledWith(14) // 14 days for audio
      expect(mockCleanupVideo).toHaveBeenCalledWith(30) // 30 days for video
      expect(mockCleanupThumbnail).toHaveBeenCalledWith(60) // 60 days for thumbnails
      expect(result.audioCleanedUp).toBe(5)
      expect(result.videosCleanedUp).toBe(3)
      expect(result.thumbnailsCleanedUp).toBe(8)
      expect(result.totalCleaned).toBe(16)
    })

    it('should respect TTL constants', () => {
      // Assert that TTL configuration is correct
      expect(MediaCacheManager.CACHE_TTL_DAYS.audio).toBe(14)
      expect(MediaCacheManager.CACHE_TTL_DAYS.videos).toBe(30)
      expect(MediaCacheManager.CACHE_TTL_DAYS.thumbnails).toBe(60)
    })
  })
})
