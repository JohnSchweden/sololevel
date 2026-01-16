import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import {
  normalizeFeedbackCategory,
  useFeedbackStatusIntegration,
} from './useFeedbackStatusIntegration'

const mockUnsubscribeFromAnalysis = jest.fn<() => void>()
const mockSubscribeToAnalysisFeedbacks = jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockGetFeedbacksByAnalysisId = jest.fn<() => any[]>().mockReturnValue([])

const mockUnsubscribeStore = jest.fn()

const mockFeedbackStatusStoreState = {
  getFeedbacksByAnalysisId: mockGetFeedbacksByAnalysisId,
  getFeedbackById: jest.fn(() => null),
  setSSMLStatus: jest.fn(),
  setAudioStatus: jest.fn(),
  subscribeToAnalysisFeedbacks: mockSubscribeToAnalysisFeedbacks,
  unsubscribeFromAnalysis: mockUnsubscribeFromAnalysis,
  subscriptions: new Set<string>(),
  subscriptionStatus: new Map<string, string>(),
  getDiagnostics: jest.fn(() => null),
  recordDiagnosticEvent: jest.fn(),
}

// Mock feedback status store
jest.mock('@app/features/VideoAnalysis/stores/feedbackStatus', () => {
  const mockStore = (selector?: (state: typeof mockFeedbackStatusStoreState) => any) => {
    if (!selector) {
      return mockFeedbackStatusStoreState
    }
    return selector(mockFeedbackStatusStoreState)
  }
  mockStore.getState = () => mockFeedbackStatusStoreState
  mockStore.subscribe = jest.fn((_selector, _listener) => mockUnsubscribeStore)
  return {
    useFeedbackStatusStore: mockStore,
  }
})

// Mock logging
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('useFeedbackStatusIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUnsubscribeFromAnalysis.mockClear()
    mockUnsubscribeStore.mockClear()
    mockSubscribeToAnalysisFeedbacks.mockClear()
    mockSubscribeToAnalysisFeedbacks.mockResolvedValue(undefined)
    mockGetFeedbacksByAnalysisId.mockReturnValue([])
    mockFeedbackStatusStoreState.subscriptions.clear()
    mockFeedbackStatusStoreState.subscriptionStatus.clear()
  })

  it('returns initial state when no analysisId is provided', () => {
    const { result } = renderHook(() => useFeedbackStatusIntegration(undefined))

    expect(result.current.feedbacks).toEqual([])
    expect(result.current.isSubscribed).toBe(false)
  })

  it('returns initial state when empty string analysisId is provided', () => {
    const { result } = renderHook(() => useFeedbackStatusIntegration(''))

    expect(result.current.feedbacks).toEqual([])
    expect(result.current.isSubscribed).toBe(false)
  })

  it('always unsubscribes on cleanup even when guards prevent subscription', async () => {
    mockUnsubscribeFromAnalysis.mockClear()

    const { rerender, unmount } = renderHook(
      ({ analysisId, isHistoryMode }) => useFeedbackStatusIntegration(analysisId, isHistoryMode),
      {
        initialProps: { analysisId: 'analysis-123', isHistoryMode: false },
      }
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Subscription should be called
    expect(mockSubscribeToAnalysisFeedbacks).toHaveBeenCalledWith('analysis-123')

    // Change to history mode (should skip subscription)
    rerender({ analysisId: 'analysis-123', isHistoryMode: true })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Unsubscribe should have been called when guards changed
    expect(mockUnsubscribeFromAnalysis).toHaveBeenCalledWith('analysis-123')

    // Unmount - should call unsubscribe again (defensive cleanup)
    unmount()

    // Verify unsubscribe was called at least once (either on rerender or unmount)
    expect(mockUnsubscribeFromAnalysis).toHaveBeenCalledWith('analysis-123')
  })

  it('unsubscribes on unmount even when subscription failed', async () => {
    mockUnsubscribeFromAnalysis.mockClear()
    mockSubscribeToAnalysisFeedbacks.mockRejectedValueOnce(new Error('Subscription failed'))

    const { unmount } = renderHook(() => useFeedbackStatusIntegration('analysis-123', false))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Subscription failed, but cleanup should still unsubscribe
    unmount()

    // Should still call unsubscribe (store handles idempotency)
    expect(mockUnsubscribeFromAnalysis).toHaveBeenCalledWith('analysis-123')
  })
})

describe('normalizeFeedbackCategory', () => {
  it('normalizes posture and movement categories regardless of casing', () => {
    expect(normalizeFeedbackCategory('Posture')).toBe('posture')
    expect(normalizeFeedbackCategory('movement')).toBe('movement')
    expect(normalizeFeedbackCategory('Posture & Movement')).toBe('posture')
  })

  it('maps speech-based categories to voice', () => {
    expect(normalizeFeedbackCategory('Speech')).toBe('voice')
    expect(normalizeFeedbackCategory('Vocal Variety')).toBe('voice')
    expect(normalizeFeedbackCategory(' voice ')).toBe('voice')
  })

  it('defaults unknown categories to voice', () => {
    expect(normalizeFeedbackCategory('Confidence')).toBe('voice')
    expect(normalizeFeedbackCategory('')).toBe('voice')
  })
})
