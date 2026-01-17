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

// Mock logging (must be before imports)
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Import log after mock to get the mocked version
import { log } from '@my/logging'

// Mock supabase - must be defined before the mock
const mockFunctionsInvoke = jest.fn<() => Promise<{ data: any; error: any }>>()

jest.mock('@my/api', () => {
  return {
    get supabase() {
      return {
        functions: {
          invoke: mockFunctionsInvoke,
        },
      }
    },
  }
})

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
    mockFunctionsInvoke.mockReset()
    mockFunctionsInvoke.mockResolvedValue({ data: { status: 'completed' }, error: null })
    // Clear log mocks
    ;(log.debug as jest.Mock).mockClear()
    ;(log.info as jest.Mock).mockClear()
    ;(log.warn as jest.Mock).mockClear()
    ;(log.error as jest.Mock).mockClear()
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

  it('retryFailedFeedback calls backend endpoint when audio is failed', async () => {
    // ARRANGE: Mock feedback with failed audio status
    const failedFeedback = {
      id: 1,
      analysisId: 'test-analysis-uuid',
      message: 'Test feedback',
      category: 'voice',
      timestampSeconds: 1.0,
      confidence: 0.9,
      ssmlStatus: 'completed' as const,
      audioStatus: 'failed' as const,
      ssmlAttempts: 0,
      audioAttempts: 1,
      ssmlLastError: null,
      audioLastError: 'Audio generation failed',
      ssmlUpdatedAt: new Date().toISOString(),
      audioUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: Date.now(),
      isSubscribed: false,
    }

    mockFeedbackStatusStoreState.getFeedbackById.mockReturnValue(failedFeedback as any)

    mockGetFeedbacksByAnalysisId.mockReturnValue([failedFeedback] as any)

    const { result } = renderHook(() => useFeedbackStatusIntegration('test-analysis-uuid'))

    // ACT: Call retryFailedFeedback
    await act(async () => {
      await result.current.retryFailedFeedback('1')
    })

    // ASSERT: Should set status to 'retrying' and call backend endpoint
    expect(mockFeedbackStatusStoreState.setAudioStatus).toHaveBeenCalledWith(1, 'retrying')
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('ai-analyze-video/retry-audio', {
      body: {
        analysisId: 'test-analysis-uuid',
        feedbackIds: [1],
      },
    })
    // Verify retry was logged (may be called multiple times with different data)
    const retryLogCalls = (log.info as jest.Mock).mock.calls.filter(
      (call) =>
        (typeof call[1] === 'string' && call[1].includes('Retrying audio')) ||
        (typeof call[1] === 'string' && call[1].includes('Audio retry initiated'))
    )
    expect(retryLogCalls.length).toBeGreaterThan(0)
  })

  it('retryFailedFeedback reverts to failed status when backend call fails', async () => {
    // ARRANGE: Mock feedback with failed audio status and backend error
    const failedFeedback = {
      id: 2,
      analysisId: 'test-analysis-uuid',
      message: 'Test feedback',
      category: 'voice',
      timestampSeconds: 1.0,
      confidence: 0.9,
      ssmlStatus: 'completed' as const,
      audioStatus: 'failed' as const,
      ssmlAttempts: 0,
      audioAttempts: 1,
      ssmlLastError: null,
      audioLastError: 'Audio generation failed',
      ssmlUpdatedAt: new Date().toISOString(),
      audioUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: Date.now(),
      isSubscribed: false,
    }

    mockFeedbackStatusStoreState.getFeedbackById.mockReturnValue(failedFeedback as any)
    mockGetFeedbacksByAnalysisId.mockReturnValue([failedFeedback] as any)

    // Mock backend call to fail
    const backendError = { message: 'Network error' }
    mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: backendError })

    const { result } = renderHook(() => useFeedbackStatusIntegration('test-analysis-uuid'))

    // ACT: Call retryFailedFeedback
    await act(async () => {
      await result.current.retryFailedFeedback('2')
    })

    // ASSERT: Should first set to 'retrying', then revert to 'failed' on error
    expect(mockFeedbackStatusStoreState.setAudioStatus).toHaveBeenCalledWith(2, 'retrying')
    expect(mockFeedbackStatusStoreState.setAudioStatus).toHaveBeenCalledWith(
      2,
      'failed',
      'Network error'
    )
    expect(log.error).toHaveBeenCalledWith(
      'useFeedbackStatusIntegration',
      expect.stringContaining('Failed to invoke retry-audio'),
      expect.any(Object)
    )
  })

  it('retryFailedFeedback does nothing when feedback not found', async () => {
    // ARRANGE: Mock getFeedbackById to return null
    mockFeedbackStatusStoreState.getFeedbackById.mockReturnValue(null)
    mockGetFeedbacksByAnalysisId.mockReturnValue([])

    const { result } = renderHook(() => useFeedbackStatusIntegration('test-analysis-uuid'))

    // ACT: Call retryFailedFeedback with non-existent ID
    await act(async () => {
      await result.current.retryFailedFeedback('999')
    })

    // ASSERT: Should not call backend or update status
    expect(mockFeedbackStatusStoreState.setAudioStatus).not.toHaveBeenCalled()
    expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(
      'useFeedbackStatusIntegration',
      expect.stringContaining('not found for retry')
    )
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
