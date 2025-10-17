// Use real TanStack Query implementation
jest.unmock('@tanstack/react-query')
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useInsightsData } from './useInsightsData'

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

// Test wrapper with QueryClient
function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return Wrapper
}

describe('useInsightsData', () => {
  describe('Data Fetching', () => {
    it('should return insights data structure', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert - Wait for query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.weeklyStats).toBeDefined()
      expect(result.current.data?.focusAreas).toBeDefined()
      expect(result.current.data?.achievements).toBeDefined()
      expect(result.current.data?.quickStats).toBeDefined()
    })

    it('should return weekly stats with activity data', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const weeklyStats = result.current.data?.weeklyStats
      expect(weeklyStats).toBeDefined()
      expect(weeklyStats?.totalSessions).toBeGreaterThan(0)
      expect(weeklyStats?.improvement).toBeDefined()
      expect(weeklyStats?.weeklyProgress).toBeDefined()
      expect(weeklyStats?.dailyActivity).toBeDefined()
      expect(Array.isArray(weeklyStats?.dailyActivity)).toBe(true)
      expect(weeklyStats?.dailyActivity.length).toBe(7) // 7 days
    })

    it('should return focus areas with progress and priority', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const focusAreas = result.current.data?.focusAreas
      expect(Array.isArray(focusAreas)).toBe(true)
      expect(focusAreas?.length).toBeGreaterThan(0)

      const firstFocus = focusAreas?.[0]
      expect(firstFocus).toHaveProperty('title')
      expect(firstFocus).toHaveProperty('progress')
      expect(firstFocus).toHaveProperty('priority')
      expect(['high', 'medium', 'low']).toContain(firstFocus?.priority)
    })

    it('should return achievements with complete metadata', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const achievements = result.current.data?.achievements
      expect(Array.isArray(achievements)).toBe(true)
      expect(achievements?.length).toBeGreaterThan(0)

      const firstAchievement = achievements?.[0]
      expect(firstAchievement).toHaveProperty('title')
      expect(firstAchievement).toHaveProperty('date')
      expect(firstAchievement).toHaveProperty('type')
      expect(firstAchievement).toHaveProperty('icon')
      expect(['streak', 'technique', 'record']).toContain(firstAchievement?.type)
    })

    it('should return quick stats with numeric values', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const quickStats = result.current.data?.quickStats
      expect(quickStats).toBeDefined()
      expect(typeof quickStats?.streakDays).toBe('number')
      expect(typeof quickStats?.avgSessionTime).toBe('number')
      expect(quickStats?.streakDays).toBeGreaterThanOrEqual(0)
      expect(quickStats?.avgSessionTime).toBeGreaterThan(0)
    })
  })

  describe('Query State Management', () => {
    it('should provide query state properties', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert - Wait for completion
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify query state properties exist
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isError')
      expect(result.current).toHaveProperty('isSuccess')
      expect(result.current).toHaveProperty('data')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refetch')
    })

    it('should provide refetch function', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.refetch).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should provide error state property', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // In success case, error should be null
      expect(result.current).toHaveProperty('error')
      expect(result.current.error).toBeNull()
      expect(result.current.isError).toBe(false)
    })
  })

  describe('Data Structure Validation', () => {
    it('should have consistent data structure across all sections', async () => {
      // Arrange
      const queryClient = createTestQueryClient()

      // Act
      const { result } = renderHook(() => useInsightsData(), {
        wrapper: createWrapper(queryClient),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const data = result.current.data
      expect(data).toBeDefined()

      // Verify all top-level properties exist
      expect(data).toHaveProperty('weeklyStats')
      expect(data).toHaveProperty('focusAreas')
      expect(data).toHaveProperty('achievements')
      expect(data).toHaveProperty('quickStats')

      // Verify weeklyStats structure
      expect(data?.weeklyStats).toHaveProperty('totalSessions')
      expect(data?.weeklyStats).toHaveProperty('improvement')
      expect(data?.weeklyStats).toHaveProperty('weeklyProgress')
      expect(data?.weeklyStats).toHaveProperty('dailyActivity')

      // Verify arrays are not empty
      expect(data?.weeklyStats.dailyActivity.length).toBeGreaterThan(0)
      expect(data?.focusAreas.length).toBeGreaterThan(0)
      expect(data?.achievements.length).toBeGreaterThan(0)
    })
  })
})
