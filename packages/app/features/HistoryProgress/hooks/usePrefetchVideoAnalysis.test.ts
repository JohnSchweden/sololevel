import { renderHook, waitFor } from '@testing-library/react'
import { useNetworkQuality } from './useNetworkQuality'
import { usePrefetchVideoAnalysis } from './usePrefetchVideoAnalysis'

jest.mock('./useNetworkQuality')

const mockQueryClient = {
  prefetchQuery: jest.fn(),
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
}

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => mockQueryClient),
}))

const mockVideoHistoryStoreState = {
  getCached: jest.fn(),
  getUuid: jest.fn(),
  setUuid: jest.fn(),
}

jest.mock('../stores/videoHistory', () => ({
  useVideoHistoryStore: jest.fn(
    (selector?: (state: typeof mockVideoHistoryStoreState) => unknown) =>
      selector ? selector(mockVideoHistoryStoreState) : mockVideoHistoryStoreState
  ),
}))

const mockFeedbackStatusStoreState = {
  addFeedback: jest.fn(),
  getFeedbacksByAnalysisId: jest.fn(),
}

jest.mock('../../VideoAnalysis/stores/feedbackStatus', () => ({
  useFeedbackStatusStore: jest.fn(
    (selector?: (state: typeof mockFeedbackStatusStoreState) => unknown) =>
      selector ? selector(mockFeedbackStatusStoreState) : mockFeedbackStatusStoreState
  ),
}))

jest.mock('../../VideoAnalysis/hooks/useHistoricalAnalysis', () => ({
  fetchHistoricalAnalysisData: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@my/api', () => ({
  getAnalysisIdForJobId: jest.fn(async (jobId: number) => `uuid-${jobId}`),
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            returns: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  },
}))

describe('usePrefetchVideoAnalysis', () => {
  const mockUseNetworkQuality = useNetworkQuality as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseNetworkQuality.mockReturnValue('slow')
    mockQueryClient.prefetchQuery.mockResolvedValue(undefined)
    mockQueryClient.getQueryData.mockReturnValue(undefined)
    mockQueryClient.setQueryData.mockImplementation(() => {})
    mockVideoHistoryStoreState.getCached.mockImplementation(() => ({
      id: 1,
      videoId: 1,
      userId: 'user-1',
      title: 'Test',
      createdAt: new Date().toISOString(),
      results: {} as any,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
    }))
    mockFeedbackStatusStoreState.getFeedbacksByAnalysisId.mockReturnValue([])
  })

  it('prefetches next window when last visible index advances on slow networks', async () => {
    const analysisIds = Array.from({ length: 10 }, (_, index) => index + 1)

    const { rerender } = renderHook(
      ({ lastVisibleIndex }) =>
        usePrefetchVideoAnalysis(analysisIds, {
          lastVisibleIndex,
        }),
      { initialProps: { lastVisibleIndex: 2 } }
    )

    // For slow networks, hook prefetches 4 items immediately (immediateCount: 4)
    // Scroll-aware prefetch may also trigger additional items based on lastVisibleIndex
    await waitFor(() => {
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalled()
    })

    const initialCallCount = mockQueryClient.prefetchQuery.mock.calls.length
    // Should prefetch at least 4 items (immediateCount for slow networks)
    expect(initialCallCount).toBeGreaterThanOrEqual(4)

    rerender({ lastVisibleIndex: 4 })

    await waitFor(() => {
      // After scroll, additional items should be prefetched
      expect(mockQueryClient.prefetchQuery.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })
})
