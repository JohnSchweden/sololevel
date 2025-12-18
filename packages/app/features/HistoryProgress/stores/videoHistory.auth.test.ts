import { setupVideoHistoryCacheCleanup, useVideoHistoryStore } from './videoHistory'

describe('VideoHistoryStore Auth Cleanup', () => {
  beforeEach(() => {
    // Clear cache and reset state before each test
    const store = useVideoHistoryStore.getState()
    store.resetAll()
  })

  describe('setupVideoHistoryCacheCleanup', () => {
    it('should NOT clear cache on initial auth state (null user)', () => {
      // ARRANGE: Populate cache
      const store = useVideoHistoryStore.getState()
      const analysisData = {
        id: 1,
        videoId: 10,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: new Date().toISOString(),
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
      }

      store.addToCache(analysisData)

      // Verify cache was populated
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // ARRANGE: Mock auth store with subscriber tracking
      let currentState = { user: null, session: null }
      const subscribers: Array<(state: any) => void> = []

      const mockAuthStore = {
        subscribe: (callback: (state: any) => void) => {
          subscribers.push(callback)
          // Simulate initial auth state (no user) - should NOT trigger clear
          callback(currentState)
          return () => {
            const index = subscribers.indexOf(callback)
            if (index > -1) subscribers.splice(index, 1)
          }
        },
      }

      // ACT: Setup cleanup (should not clear on initial null state)
      setupVideoHistoryCacheCleanup(mockAuthStore)

      // ASSERT: Cache should still have entries (not cleared on init when previousUserId is null)
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)
    })

    it('should NOT clear cache when user logs out (userId -> null)', () => {
      // ARRANGE: Populate cache
      const store = useVideoHistoryStore.getState()
      store.addToCache({
        id: 1,
        videoId: 10,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: new Date().toISOString(),
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
      })

      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // ARRANGE: Mock auth store with state changes
      let currentState: { user: { id: string } | null; session: {} | null } = {
        user: { id: 'user-123' },
        session: {},
      }
      const subscribers: Array<(state: any) => void> = []

      const mockAuthStore = {
        subscribe: (callback: (state: any) => void) => {
          subscribers.push(callback)
          // Initial state with user (establishes previousUserId = 'user-123')
          callback(currentState)
          return () => {
            const index = subscribers.indexOf(callback)
            if (index > -1) subscribers.splice(index, 1)
          }
        },
      }

      // ACT: Setup cleanup (establishes previousUserId = 'user-123')
      setupVideoHistoryCacheCleanup(mockAuthStore)

      // Verify cache intact after initial subscription
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // Simulate logout (user changes from userId to null)
      currentState = { user: null, session: null }
      subscribers.forEach((sub) => sub(currentState))

      // ASSERT: Cache should NOT be cleared on logout
      // Implementation only clears when switching between two real users.
      // Logout cleanup is handled by signOut() via clearAllUserData.
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)
    })

    it('should clear cache when user switches (user change: userId1 -> userId2)', () => {
      // ARRANGE: Populate cache
      const store = useVideoHistoryStore.getState()
      store.addToCache({
        id: 1,
        videoId: 10,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: new Date().toISOString(),
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
      })

      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // ARRANGE: Mock auth store with state changes
      let currentState = { user: { id: 'user-123' }, session: {} }
      const subscribers: Array<(state: any) => void> = []

      const mockAuthStore = {
        subscribe: (callback: (state: any) => void) => {
          subscribers.push(callback)
          // Initial state with first user (establishes previousUserId = 'user-123')
          callback(currentState)
          return () => {
            const index = subscribers.indexOf(callback)
            if (index > -1) subscribers.splice(index, 1)
          }
        },
      }

      // ACT: Setup cleanup (establishes previousUserId = 'user-123')
      setupVideoHistoryCacheCleanup(mockAuthStore)

      // Verify cache still intact after initial subscription
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // Simulate user switch (user changes from user-123 to user-456)
      currentState = { user: { id: 'user-456' }, session: {} }
      subscribers.forEach((sub) => sub(currentState))

      // ASSERT: Cache should be cleared on user switch
      expect(useVideoHistoryStore.getState().cache.size).toBe(0)
    })

    it('should NOT clear cache when user remains the same', () => {
      // ARRANGE: Populate cache
      const store = useVideoHistoryStore.getState()
      store.addToCache({
        id: 1,
        videoId: 10,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: new Date().toISOString(),
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
      })

      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // ARRANGE: Mock auth store with state changes
      let currentState = { user: { id: 'user-123' }, session: {} }
      const subscribers: Array<(state: any) => void> = []

      const mockAuthStore = {
        subscribe: (callback: (state: any) => void) => {
          subscribers.push(callback)
          // Initial state with user (establishes previousUserId = 'user-123')
          callback(currentState)
          return () => {
            const index = subscribers.indexOf(callback)
            if (index > -1) subscribers.splice(index, 1)
          }
        },
      }

      // ACT: Setup cleanup (establishes previousUserId = 'user-123')
      setupVideoHistoryCacheCleanup(mockAuthStore)

      // Verify cache still intact after initial subscription
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)

      // Simulate same user state update (no change)
      currentState = { user: { id: 'user-123' }, session: {} }
      subscribers.forEach((sub) => sub(currentState))

      // ASSERT: Cache should NOT be cleared (same user)
      expect(useVideoHistoryStore.getState().cache.size).toBe(1)
    })
  })
})
