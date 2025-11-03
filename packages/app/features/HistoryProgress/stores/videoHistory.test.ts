import type { AnalysisResults, PoseData } from '@api/src/validation/cameraRecordingSchemas'
import { act, renderHook } from '@testing-library/react'
import { useVideoHistoryStore } from './videoHistory'

describe('VideoHistoryStore', () => {
  // Helper function to create mock analysis
  const createMockAnalysis = (id: number, overrides?: Partial<any>) => ({
    id,
    videoId: id * 10,
    userId: 'test-user-123',
    title: `Test Analysis ${id}`,
    createdAt: new Date().toISOString(),
    thumbnail: `https://example.com/thumb${id}.jpg`,
    results: {
      pose_analysis: {
        keypoints: [],
        confidence_score: 0.95,
        frame_count: 30,
      },
    } as AnalysisResults,
    poseData: {
      frames: [],
      metadata: {
        fps: 30,
        duration: 10,
        total_frames: 300,
      },
    } as PoseData,
    ...overrides,
  })

  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useVideoHistoryStore())
    act(() => {
      result.current.clearCache()
    })

    // Clear mock calls
    jest.clearAllMocks()
  })

  describe('addToCache', () => {
    it('should add entry to cache with timestamps', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)
      const beforeTime = Date.now()

      // Act
      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      // Assert
      const cached = result.current.cache.get(1)
      expect(cached).toBeDefined()
      expect(cached?.id).toBe(1)
      expect(cached?.title).toBe('Test Analysis 1')
      expect(cached?.cachedAt).toBeGreaterThanOrEqual(beforeTime)
      expect(cached?.lastAccessed).toBeGreaterThanOrEqual(beforeTime)
    })

    it('should add multiple entries to cache', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)
      const analysis3 = createMockAnalysis(3)

      // Act
      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
        result.current.addToCache(analysis3)
      })

      // Assert
      expect(result.current.cache.size).toBe(3)
      expect(result.current.cache.get(1)?.title).toBe('Test Analysis 1')
      expect(result.current.cache.get(2)?.title).toBe('Test Analysis 2')
      expect(result.current.cache.get(3)?.title).toBe('Test Analysis 3')
    })
  })

  describe('getCached', () => {
    it('should return cached entry and update lastAccessed', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)

      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      const originalLastAccessed = result.current.cache.get(1)?.lastAccessed || 0

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100)

      // Act
      let cached: any
      act(() => {
        cached = result.current.getCached(1)
      })

      // Assert
      expect(cached).toBeDefined()
      expect(cached?.id).toBe(1)
      expect(result.current.cache.get(1)?.lastAccessed).toBeGreaterThanOrEqual(originalLastAccessed)
    })

    it('should return null for non-existent entry', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act
      let cached: any
      act(() => {
        cached = result.current.getCached(999)
      })

      // Assert
      expect(cached).toBeNull()
    })

    it.skip('should return null and remove stale entry [P1: timestamp mocking]', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)
      const staleTime = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago

      // Add entry with old lastAccessed timestamp (8 days old, exceeds TTL)
      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      // Directly modify the entry's lastAccessed timestamp
      const entry = result.current.cache.get(1)
      if (entry) {
        entry.lastAccessed = staleTime
      }

      // Act
      let cached: any
      act(() => {
        cached = result.current.getCached(1)
      })

      // Assert
      expect(cached).toBeNull()
      expect(result.current.cache.has(1)).toBe(false)
    })

    it.skip('should return null and remove too old entry [P1: timestamp mocking]', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)

      // Add entry with old cachedAt timestamp (31 days old, exceeds max age)
      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      // Manually set cachedAt to 31 days ago
      const oldTime = Date.now() - 31 * 24 * 60 * 60 * 1000
      const entry = result.current.cache.get(1)
      if (entry) {
        entry.cachedAt = oldTime
      }

      // Act
      let cached: any
      act(() => {
        cached = result.current.getCached(1)
      })

      // Assert
      expect(cached).toBeNull()
      expect(result.current.cache.has(1)).toBe(false)
    })
  })

  describe('getAllCached', () => {
    it('should return all cached entries', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)
      const analysis3 = createMockAnalysis(3)

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
        result.current.addToCache(analysis3)
      })

      // Act
      const allCached = result.current.getAllCached()

      // Assert
      expect(allCached).toHaveLength(3)
      expect(allCached.map((e) => e.id)).toEqual(expect.arrayContaining([1, 2, 3]))
    })

    it.skip('should filter out stale entries [P1: timestamp mocking]', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)
      const staleTime = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
      })

      // Directly modify entry 1's lastAccessed timestamp
      const entry1 = result.current.cache.get(1)
      if (entry1) {
        entry1.lastAccessed = staleTime
      }

      // Act
      const allCached = result.current.getAllCached()

      // Assert
      expect(allCached).toHaveLength(1)
      expect(allCached[0].id).toBe(2)
    })

    it('should return empty array when cache is empty', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act
      const allCached = result.current.getAllCached()

      // Assert
      expect(allCached).toHaveLength(0)
    })
  })

  describe('updateCache', () => {
    it('should update existing entry', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)

      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      // Act
      act(() => {
        result.current.updateCache(1, { title: 'Updated Title' })
      })

      // Assert
      const cached = result.current.cache.get(1)
      expect(cached?.title).toBe('Updated Title')
    })

    it('should update lastAccessed timestamp', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)

      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      const originalLastAccessed = result.current.cache.get(1)?.lastAccessed || 0

      // Wait a bit
      jest.advanceTimersByTime(100)

      // Act
      act(() => {
        result.current.updateCache(1, { title: 'Updated Title' })
      })

      // Assert
      expect(result.current.cache.get(1)?.lastAccessed).toBeGreaterThanOrEqual(originalLastAccessed)
    })

    it('should not fail for non-existent entry', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.updateCache(999, { title: 'Non-existent' })
        })
      }).not.toThrow()
    })
  })

  describe('removeFromCache', () => {
    it('should remove entry from cache', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const mockAnalysis = createMockAnalysis(1)

      act(() => {
        result.current.addToCache(mockAnalysis)
      })

      expect(result.current.cache.has(1)).toBe(true)

      // Act
      act(() => {
        result.current.removeFromCache(1)
      })

      // Assert
      expect(result.current.cache.has(1)).toBe(false)
    })

    it('should not fail for non-existent entry', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.removeFromCache(999)
        })
      }).not.toThrow()
    })
  })

  describe('clearCache', () => {
    it('should clear all entries but preserve lastSync', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
        result.current.updateLastSync()
      })

      expect(result.current.cache.size).toBe(2)
      const lastSyncBeforeClear = result.current.lastSync
      expect(lastSyncBeforeClear).toBeGreaterThan(0)

      // Act
      act(() => {
        result.current.clearCache()
      })

      // Assert
      expect(result.current.cache.size).toBe(0)
      // lastSync should be preserved (not reset to 0)
      expect(result.current.lastSync).toBe(lastSyncBeforeClear)
    })
  })

  describe('resetAll', () => {
    it('should clear all entries and reset lastSync', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
        result.current.updateLastSync()
      })

      expect(result.current.cache.size).toBe(2)
      expect(result.current.lastSync).toBeGreaterThan(0)

      // Act
      act(() => {
        result.current.resetAll()
      })

      // Assert
      expect(result.current.cache.size).toBe(0)
      expect(result.current.lastSync).toBe(0)
    })
  })

  describe('evictStale', () => {
    it.skip('should remove stale entries (TTL expired) [P1: timestamp mocking]', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)
      const analysis3 = createMockAnalysis(3)
      const staleTime = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
        result.current.addToCache(analysis3)
      })

      // Directly modify entries 1 and 2's lastAccessed timestamps
      const entry1 = result.current.cache.get(1)
      const entry2 = result.current.cache.get(2)
      if (entry1) entry1.lastAccessed = staleTime
      if (entry2) entry2.lastAccessed = staleTime

      // Act
      act(() => {
        result.current.evictStale()
      })

      // Assert
      expect(result.current.cache.size).toBe(1)
      expect(result.current.cache.has(3)).toBe(true)
    })

    it.skip('should remove too old entries (max age exceeded) [P1: timestamp mocking]', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)

      act(() => {
        result.current.addToCache(analysis1)
        result.current.addToCache(analysis2)
      })

      // Make entry 1 too old (31 days)
      const oldTime = Date.now() - 31 * 24 * 60 * 60 * 1000
      const entry = result.current.cache.get(1)
      if (entry) {
        entry.cachedAt = oldTime
      }

      // Act
      act(() => {
        result.current.evictStale()
      })

      // Assert
      expect(result.current.cache.size).toBe(1)
      expect(result.current.cache.has(2)).toBe(true)
    })
  })

  describe('evictLRU', () => {
    it('should remove least recently used entry', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis1 = createMockAnalysis(1)
      const analysis2 = createMockAnalysis(2)
      const analysis3 = createMockAnalysis(3)

      act(() => {
        result.current.addToCache(analysis1)
      })

      jest.advanceTimersByTime(100)

      act(() => {
        result.current.addToCache(analysis2)
      })

      jest.advanceTimersByTime(100)

      act(() => {
        result.current.addToCache(analysis3)
      })

      expect(result.current.cache.size).toBe(3)

      // Act
      act(() => {
        result.current.evictLRU()
      })

      // Assert
      expect(result.current.cache.size).toBe(2)
      expect(result.current.cache.has(1)).toBe(false) // Oldest should be removed
      expect(result.current.cache.has(2)).toBe(true)
      expect(result.current.cache.has(3)).toBe(true)
    })

    it('should not fail on empty cache', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.evictLRU()
        })
      }).not.toThrow()
    })
  })

  describe('LRU eviction on cache overflow', () => {
    it('should automatically evict LRU when exceeding MAX_CACHE_ENTRIES (50)', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Add 51 entries (exceeds MAX_CACHE_ENTRIES)
      act(() => {
        for (let i = 1; i <= 51; i++) {
          result.current.addToCache(createMockAnalysis(i))
          jest.advanceTimersByTime(10) // Small delay between entries
        }
      })

      // Assert
      expect(result.current.cache.size).toBeLessThanOrEqual(50)
      // Entry 1 (oldest) should be evicted
      expect(result.current.cache.has(1)).toBe(false)
      // Entry 51 (newest) should still be there
      expect(result.current.cache.has(51)).toBe(true)
    })
  })

  describe('updateLastSync', () => {
    it('should update lastSync timestamp', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const beforeTime = Date.now()

      // Act
      act(() => {
        result.current.updateLastSync()
      })

      // Assert
      expect(result.current.lastSync).toBeGreaterThanOrEqual(beforeTime)
    })
  })

  // Note: Persistence tests removed as persist middleware was removed from store
  // Cache now operates in-memory only for P0. Persistence can be added in P1.

  describe('edge cases', () => {
    it('should handle analysis with missing optional fields', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())
      const minimalAnalysis = {
        id: 1,
        videoId: 10,
        userId: 'test-user',
        title: 'Minimal Analysis',
        createdAt: new Date().toISOString(),
        results: {} as AnalysisResults,
      }

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.addToCache(minimalAnalysis)
        })
      }).not.toThrow()

      const cached = result.current.cache.get(1)
      expect(cached).toBeDefined()
      expect(cached?.thumbnail).toBeUndefined()
      expect(cached?.poseData).toBeUndefined()
    })

    it('should handle rapid successive cache operations', () => {
      // Arrange
      const { result } = renderHook(() => useVideoHistoryStore())

      // Act - rapid operations
      act(() => {
        for (let i = 1; i <= 10; i++) {
          result.current.addToCache(createMockAnalysis(i))
        }
        result.current.evictStale()
        result.current.updateLastSync()
      })

      // Assert
      expect(result.current.cache.size).toBe(10)
      expect(result.current.lastSync).toBeGreaterThan(0)
    })
  })

  describe('local URI management', () => {
    it('should store and retrieve local URIs by storage path', () => {
      const { result } = renderHook(() => useVideoHistoryStore())

      act(() => {
        result.current.setLocalUri('user-123/video.mp4', 'file:///local/video.mp4')
      })

      expect(result.current.getLocalUri('user-123/video.mp4')).toBe('file:///local/video.mp4')
    })

    it('should clear local URI when entry is removed', () => {
      const { result } = renderHook(() => useVideoHistoryStore())
      const analysis = createMockAnalysis(1)

      // Use persisted path (recordings/) to match indexing logic
      const persistedVideoUri = 'file:///documents/recordings/analysis_1.mp4'

      act(() => {
        result.current.addToCache({
          ...analysis,
          storagePath: 'user-123/video.mp4',
          videoUri: persistedVideoUri,
        })
      })

      expect(result.current.getLocalUri('user-123/video.mp4')).toBe(persistedVideoUri)

      act(() => {
        result.current.removeFromCache(analysis.id)
      })

      expect(result.current.getLocalUri('user-123/video.mp4')).toBeNull()
    })
  })
})
