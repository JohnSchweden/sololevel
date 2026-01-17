import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import type {
  AnalysisJob,
  SubscriptionOptions,
  SubscriptionState,
  SubscriptionStatus,
} from '@app/features/VideoAnalysis/stores/analysisSubscription'
import type { FeedbackStatusState } from '@app/features/VideoAnalysis/stores/feedbackStatus'
import type { UploadTask } from '@app/features/VideoAnalysis/stores/uploadProgress'

import { useAnalysisState } from './useAnalysisState'

type UploadProgress = {
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  percentage?: number
}

type FeedbackStatus = ReturnType<
  typeof import('./useFeedbackStatusIntegration').useFeedbackStatusIntegration
>

const createFeedbackStatus = (overrides: Partial<FeedbackStatus> = {}): FeedbackStatus => {
  const getFeedbackById: FeedbackStatus['getFeedbackById'] = jest.fn(() => null)
  const retryFailedFeedback: FeedbackStatus['retryFailedFeedback'] = jest.fn(async () => {})
  const cleanup: FeedbackStatus['cleanup'] = jest.fn(() => {})

  return {
    feedbackItems: [],
    feedbacks: [] as FeedbackStatusState[],
    stats: {
      total: 0,
      ssmlCompleted: 0,
      audioCompleted: 0,
      fullyCompleted: 0,
      hasBlockingFailures: false,
      hasAudioFailures: false,
      hasFailures: false,
      isProcessing: false,
      completionPercentage: 0,
    },
    isSubscribed: false,
    isProcessing: false,
    hasFailures: false,
    hasBlockingFailures: false,
    hasAudioFailures: false,
    isFullyCompleted: false,
    getFeedbackById,
    retryFailedFeedback,
    cleanup,
    diagnostics: null,
    ...overrides,
  }
}

const mockUploadStoreState = {
  getLatestActiveTask: jest.fn<() => UploadTask | null>(),
  getTaskByRecordingId: jest.fn<(recordingId: number) => UploadTask | null>(),
}

const subscriptionsMap = new Map<
  string,
  Pick<SubscriptionState, 'status'> & {
    job?: AnalysisJob | null
  }
>()

const mockAnalysisStoreState = {
  subscribe: jest.fn<(key: string, options: SubscriptionOptions) => Promise<void>>(),
  unsubscribe: jest.fn<(key: string) => void>(),
  retry: jest.fn<(key: string) => Promise<void>>(),
  getStatus: jest.fn<(key: string) => SubscriptionStatus>((key: string): SubscriptionStatus => {
    // FIXED: Read from mockAnalysisStoreState.subscriptions instead of closed-over subscriptionsMap
    // This ensures getStatus always reads from the current Map instance, even when tests reassign it
    const sub = mockAnalysisStoreState.subscriptions.get(key)
    return (sub?.status ?? 'idle') as SubscriptionStatus
  }),
  subscriptions: subscriptionsMap,
}

const mockUploadProgress = jest.fn<(recordingId: number) => UploadProgress | undefined>()
const mockFeedbackStatusIntegration = jest.fn<(analysisId?: string) => FeedbackStatus>()
const mockGetAnalysisIdForJobId = jest.fn<(jobId: number) => Promise<string | null>>()
const mockUseAnalysisJob = jest.fn<(jobId: number) => { data: AnalysisJob | null }>()
const mockUseAnalysisJobByVideoId = jest.fn<(videoId: number) => { data: AnalysisJob | null }>()
const mockUseAnalysisJobBatched =
  jest.fn<(analysisJobId?: number, videoRecordingId?: number) => { data: AnalysisJob | null }>()

const mockFunctionsInvoke = jest.fn<() => Promise<{ data: any; error: any }>>()

jest.mock('@my/api', () => {
  return {
    getAnalysisIdForJobId: (jobId: number) => mockGetAnalysisIdForJobId(jobId),
    get supabase() {
      return {
        auth: {
          getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
        },
        functions: {
          invoke: mockFunctionsInvoke,
        },
      }
    },
  }
})

jest.mock('@app/hooks/useVideoUpload', () => {
  return {
    useUploadProgress: (recordingId: number) => ({ data: mockUploadProgress(recordingId) }),
  }
})

jest.mock('@app/features/VideoAnalysis/stores/uploadProgress', () => {
  const selectorWrapper = (selector?: (state: typeof mockUploadStoreState) => any) => {
    return selector ? selector(mockUploadStoreState) : mockUploadStoreState
  }

  selectorWrapper.getState = () => mockUploadStoreState

  return {
    useUploadProgressStore: selectorWrapper,
  }
})

jest.mock('@app/features/VideoAnalysis/stores/analysisSubscription', () => {
  const selectorWrapper = (selector?: (state: typeof mockAnalysisStoreState) => any) => {
    return selector ? selector(mockAnalysisStoreState) : mockAnalysisStoreState
  }

  selectorWrapper.getState = () => mockAnalysisStoreState

  return {
    useAnalysisSubscriptionStore: selectorWrapper,
  }
})

jest.mock('./useFeedbackStatusIntegration', () => {
  return {
    useFeedbackStatusIntegration: (analysisId?: string) =>
      mockFeedbackStatusIntegration(analysisId),
  }
})

jest.mock('@app/hooks/useAnalysis', () => {
  return {
    useAnalysisJob: (jobId: number) => mockUseAnalysisJob(jobId),
    useAnalysisJobByVideoId: (videoId: number) => mockUseAnalysisJobByVideoId(videoId),
    useAnalysisJobBatched: (analysisJobId?: number, videoRecordingId?: number) =>
      mockUseAnalysisJobBatched(analysisJobId, videoRecordingId),
  }
})

describe('useAnalysisState', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockUploadStoreState.getLatestActiveTask.mockReturnValue(null)
    mockUploadStoreState.getTaskByRecordingId.mockReturnValue(null)
    mockAnalysisStoreState.subscribe.mockResolvedValue(undefined)
    mockAnalysisStoreState.unsubscribe.mockImplementation(() => {})
    mockAnalysisStoreState.retry.mockResolvedValue(undefined)
    mockFunctionsInvoke.mockReset()
    mockAnalysisStoreState.subscriptions = new Map()
    mockUploadProgress.mockReturnValue(undefined)
    mockFeedbackStatusIntegration.mockReturnValue(createFeedbackStatus())
    mockGetAnalysisIdForJobId.mockResolvedValue(null)
    mockUseAnalysisJob.mockReturnValue({ data: null })
    mockUseAnalysisJobByVideoId.mockReturnValue({ data: null })
    mockUseAnalysisJobBatched.mockReturnValue({ data: null })
    ;(global as any).__DEV__ = true
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('always unsubscribes on cleanup even if shouldSubscribeToRealtime becomes false', () => {
    mockAnalysisStoreState.subscriptions = new Map()
    mockAnalysisStoreState.unsubscribe.mockClear()

    const { rerender, unmount } = renderHook(
      ({ isHistoryMode }) => useAnalysisState(42, undefined, 'processing', isHistoryMode),
      {
        initialProps: { isHistoryMode: false },
      }
    )

    // Subscribe should be called
    expect(mockAnalysisStoreState.subscribe).toHaveBeenCalledWith(
      'job:42',
      expect.objectContaining({ analysisJobId: 42 })
    )

    // Change to history mode (shouldSubscribeToRealtime becomes false)
    rerender({ isHistoryMode: true })

    // Unsubscribe should have been called when dependency changed
    expect(mockAnalysisStoreState.unsubscribe).toHaveBeenCalledWith('job:42')

    // Clean up
    unmount()

    // Unsubscribe should be called again on unmount (defensive cleanup)
    expect(mockAnalysisStoreState.unsubscribe).toHaveBeenCalledTimes(2)
  })

  it('unsubscribes on unmount even when subscription key changes', () => {
    mockAnalysisStoreState.unsubscribe.mockClear()

    const { rerender, unmount } = renderHook(
      ({ analysisJobId }) => useAnalysisState(analysisJobId, undefined, 'processing'),
      {
        initialProps: { analysisJobId: 42 },
      }
    )

    // First subscription
    expect(mockAnalysisStoreState.subscribe).toHaveBeenCalledWith(
      'job:42',
      expect.objectContaining({ analysisJobId: 42 })
    )

    // Change to different job
    rerender({ analysisJobId: 99 })

    // Should unsubscribe from old and subscribe to new
    expect(mockAnalysisStoreState.unsubscribe).toHaveBeenCalledWith('job:42')
    expect(mockAnalysisStoreState.subscribe).toHaveBeenCalledWith(
      'job:99',
      expect.objectContaining({ analysisJobId: 99 })
    )

    // Unmount - should unsubscribe from current subscription
    unmount()
    expect(mockAnalysisStoreState.unsubscribe).toHaveBeenCalledWith('job:99')
  })

  it('returns uploading phase when upload is in progress', () => {
    mockUploadProgress.mockReturnValueOnce({ status: 'uploading', percentage: 35 })

    const { result } = renderHook(() => useAnalysisState(undefined, 123, 'processing'))

    expect(result.current.phase).toBe('uploading')
    expect(result.current.isProcessing).toBe(true)
    expect(result.current.progress.upload).toBe(35)
  })

  it('returns upload-complete phase when upload finished and no analysis job yet', () => {
    mockUploadProgress.mockReturnValueOnce({ status: 'completed', percentage: 100 })

    const { result } = renderHook(() => useAnalysisState(undefined, 123, 'processing'))

    expect(result.current.phase).toBe('upload-complete')
    expect(result.current.isProcessing).toBe(true)
  })

  it('returns analyzing phase when analysis job is processing', () => {
    mockUploadProgress.mockReturnValueOnce({ status: 'completed', percentage: 100 })
    const analysisJob = {
      id: 55,
      status: 'processing' as const,
      progress_percentage: 42,
      video_recording_id: 123,
    }
    mockUseAnalysisJobBatched.mockReturnValueOnce({ data: analysisJob })
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'recording:123',
        {
          job: analysisJob,
          status: 'active',
        },
      ],
    ])

    const { result } = renderHook(() => useAnalysisState(undefined, 123, 'processing'))

    expect(result.current.phase).toBe('analyzing')
    expect(result.current.progress.analysis).toBe(42)
  })

  it('returns generating-feedback when analysis completed but feedback not ready', () => {
    const analysisJob = {
      id: 77,
      status: 'completed' as const,
      progress_percentage: 100,
      video_recording_id: 123,
    }
    mockUseAnalysisJobBatched.mockReturnValueOnce({ data: analysisJob })
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:77',
        {
          job: analysisJob,
          status: 'active',
        },
      ],
    ])
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Play audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'processing',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    const { result } = renderHook(() => useAnalysisState(77, undefined, 'processing'))

    expect(result.current.phase).toBe('generating-feedback')
    expect(result.current.isProcessing).toBe(true)
  })

  it('returns ready when first playable feedback is available', () => {
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:88',
        {
          job: { id: 88, status: 'completed', progress_percentage: 100, video_recording_id: 123 },
          status: 'active',
        },
      ],
    ])
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Completed audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'completed',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 1,
          fullyCompleted: 1,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: false,
          completionPercentage: 100,
        },
        isProcessing: false,
        isFullyCompleted: true,
      })
    )

    const { result } = renderHook(() => useAnalysisState(88, undefined, 'processing'))

    expect(result.current.phase).toBe('ready')
    expect(result.current.isProcessing).toBe(false)
  })

  it('returns ready when audio is retrying (background retry - video stays playable)', () => {
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:89',
        {
          job: { id: 89, status: 'completed', progress_percentage: 100, video_recording_id: 124 },
          status: 'active',
        },
      ],
    ])
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Retrying audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'retrying',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    const { result } = renderHook(() => useAnalysisState(89, undefined, 'processing'))

    // Phase should stay 'ready' during audio retry - video remains playable
    expect(result.current.phase).toBe('ready')
    expect(result.current.isProcessing).toBe(false)
  })

  it('prevents flicker: video stays playable once ready, even when status transitions queued→processing→completed', () => {
    // This test demonstrates the flicker bug fix:
    // Initial: queued (should NOT be playable yet)
    // Transition: processing (should NOT cause flicker if video was already playable)
    // Final: completed (should be playable)
    const analysisJob = {
      id: 91,
      status: 'completed' as const,
      progress_percentage: 100,
      video_recording_id: 126,
    }
    mockUseAnalysisJobBatched.mockReturnValue({ data: analysisJob })
    mockGetAnalysisIdForJobId.mockResolvedValue('analysis-uuid-91') // Mock UUID resolution
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:91',
        {
          job: analysisJob,
          status: 'active',
        },
      ],
    ])

    // Initial state: queued (video should NOT be playable yet)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Initial queued',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'queued',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    const { result, rerender } = renderHook(() => useAnalysisState(91, undefined, 'processing'))

    // Initial: queued should NOT make video playable (waiting for completed/failed/retrying)
    expect(result.current.phase).toBe('generating-feedback')
    expect(result.current.firstPlayableReady).toBe(false)

    // Transition to processing (should NOT cause flicker - video wasn't playable yet)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Processing audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'processing',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    rerender()

    // Still not playable (processing is not a playable state)
    expect(result.current.phase).toBe('generating-feedback')
    expect(result.current.firstPlayableReady).toBe(false)

    // Final: completed (NOW video becomes playable)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Completed audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'completed',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 1,
          fullyCompleted: 1,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: false,
          completionPercentage: 100,
        },
        isProcessing: false,
        isFullyCompleted: true,
      })
    )

    rerender()

    // Now playable - and should stay playable (latch mechanism)
    expect(result.current.phase).toBe('ready')
    expect(result.current.firstPlayableReady).toBe(true)

    // Verify latch: even if status changes back to processing (shouldn't happen, but test robustness)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Back to processing',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'processing',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    rerender()

    // Latch: should stay playable once it became playable
    expect(result.current.phase).toBe('ready')
    expect(result.current.firstPlayableReady).toBe(true)
  })

  it('returns ready when audio is queued after retry (latch keeps video playable)', () => {
    // Simulates retry flow: failed → retrying (playable) → queued (stays playable via latch)
    const analysisJob = {
      id: 90,
      status: 'completed' as const,
      progress_percentage: 100,
      video_recording_id: 125,
    }
    mockUseAnalysisJobBatched.mockReturnValue({ data: analysisJob })
    mockGetAnalysisIdForJobId.mockResolvedValue('analysis-uuid-90') // Mock UUID resolution
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:90',
        {
          job: analysisJob,
          status: 'active',
        },
      ],
    ])

    // Step 1: retrying status (makes video playable)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Retrying audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'retrying',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    const { result, rerender } = renderHook(() => useAnalysisState(90, undefined, 'processing'))

    // Video becomes playable with retrying status
    expect(result.current.phase).toBe('ready')
    expect(result.current.firstPlayableReady).toBe(true)

    // Step 2: Backend updates to queued (latch keeps video playable)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Queued audio',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'queued',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: true,
          completionPercentage: 0,
        },
        isProcessing: true,
        isFullyCompleted: false,
      })
    )

    rerender()

    // Latch: video stays playable even though queued is not a playable status
    expect(result.current.phase).toBe('ready')
    expect(result.current.firstPlayableReady).toBe(true)
    expect(result.current.isProcessing).toBe(false)
  })

  it('history mode returns ready when completed job and feedback loaded', () => {
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:120',
        {
          job: { id: 120, status: 'completed', progress_percentage: 100, video_recording_id: 999 },
          status: 'active',
        },
      ],
    ])

    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [
          {
            id: 'hist-1',
            timestamp: 100,
            text: 'Historical feedback',
            type: 'suggestion',
            category: 'voice',
            ssmlStatus: 'completed',
            audioStatus: 'completed',
            confidence: 1,
          },
        ],
        stats: {
          total: 1,
          ssmlCompleted: 1,
          audioCompleted: 1,
          fullyCompleted: 1,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: false,
          completionPercentage: 100,
        },
        isProcessing: false,
        isFullyCompleted: true,
      })
    )

    const { result } = renderHook(() => useAnalysisState(120, undefined, 'processing', true))

    expect(result.current.phase).toBe('ready')
    expect(result.current.isProcessing).toBe(false)
  })

  it('history mode returns ready even when no feedback loaded yet (race condition fix)', () => {
    // This tests the fix for videos 5-7 showing processing overlay
    // In history mode, video is playable immediately; feedback loads lazily
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:130',
        {
          job: { id: 130, status: 'completed', progress_percentage: 100, video_recording_id: 1001 },
          status: 'active',
        },
      ],
    ])

    // Simulate no feedback loaded yet (prefetch race condition)
    mockFeedbackStatusIntegration.mockReturnValue(
      createFeedbackStatus({
        feedbackItems: [], // Empty - feedback hasn't loaded yet
        stats: {
          total: 0,
          ssmlCompleted: 0,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasBlockingFailures: false,
          hasAudioFailures: false,
          hasFailures: false,
          isProcessing: false,
          completionPercentage: 0,
        },
        isProcessing: false,
        isFullyCompleted: false, // Not complete because no feedback yet
      })
    )

    const { result } = renderHook(() => useAnalysisState(130, undefined, 'processing', true))

    // CRITICAL: Should be 'ready' NOT 'generating-feedback'
    // Video is playable in history mode even without feedback items
    expect(result.current.phase).toBe('ready')
    expect(result.current.isProcessing).toBe(false)
  })

  it('returns error when upload failed with message', () => {
    mockUploadProgress.mockReturnValueOnce({ status: 'failed', percentage: 20 })
    mockUploadStoreState.getTaskByRecordingId.mockReturnValue({
      id: 'upload-1',
      videoRecordingId: 321,
      filename: 'video.mp4',
      fileSize: 100,
      bytesUploaded: 20,
      progress: 20,
      status: 'failed',
      error: 'Network failure',
      startTime: Date.now(),
      endTime: null,
      retryCount: 0,
      maxRetries: 3,
    })

    const { result } = renderHook(() => useAnalysisState(undefined, 321, 'processing'))

    expect(result.current.phase).toBe('error')
    expect(result.current.error).toEqual({ phase: 'upload', message: 'Network failure' })
  })

  it('returns error when analysis job fails', () => {
    const analysisJob = {
      id: 90,
      status: 'failed' as const,
      progress_percentage: 80,
      video_recording_id: 500,
      error_message: 'Edge function error',
    }
    mockUseAnalysisJobBatched.mockReturnValueOnce({ data: analysisJob })
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:90',
        {
          job: analysisJob,
          status: 'failed',
        },
      ],
    ])

    const { result } = renderHook(() => useAnalysisState(90, undefined, 'processing'))

    expect(result.current.phase).toBe('error')
    expect(result.current.error).toEqual({ phase: 'analysis', message: 'Edge function error' })
  })

  it('calls Edge Function to restart analysis when retry called', async () => {
    // Arrange: Set up failed analysis state
    const analysisJob = {
      id: 77,
      status: 'failed' as const,
      progress_percentage: 0,
      video_recording_id: 123,
    }
    mockUseAnalysisJobBatched.mockReturnValueOnce({ data: analysisJob })
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'recording:123',
        {
          job: analysisJob,
          status: 'failed',
        },
      ],
    ])
    mockFunctionsInvoke.mockResolvedValue({
      data: { analysisId: 78, status: 'queued' },
      error: null,
    })

    // Act: Call retry
    const { result } = renderHook(() => useAnalysisState(undefined, 123, 'processing'))

    // Wait for hook to initialize and set error state
    await act(async () => {
      // Advance timers to allow any pending async operations to complete
      jest.advanceTimersByTime(0)
    })

    // Verify we're in error state
    expect(result.current.phase).toBe('error')
    expect(result.current.error?.phase).toBe('analysis')

    // Call retry
    await act(async () => {
      await result.current.retry()
    })

    // Assert: Edge Function was called with correct parameters
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('ai-analyze-video', {
      body: {
        videoRecordingId: 123,
        videoSource: 'uploaded_video',
      },
    })
  })

  // Arrange-Act-Assert
  describe('feedbackItems array stability', () => {
    it('returns stable feedbackItems array reference when content unchanged', () => {
      const stableFeedbackItems = [
        {
          id: '1',
          timestamp: 1000,
          text: 'Feedback 1',
          type: 'suggestion' as const,
          category: 'voice' as const,
          ssmlStatus: 'completed' as const,
          audioStatus: 'completed' as const,
          confidence: 0.9,
        },
        {
          id: '2',
          timestamp: 2000,
          text: 'Feedback 2',
          type: 'suggestion' as const,
          category: 'posture' as const,
          ssmlStatus: 'completed' as const,
          audioStatus: 'completed' as const,
          confidence: 0.8,
        },
      ]

      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: stableFeedbackItems,
          stats: {
            total: 2,
            ssmlCompleted: 2,
            audioCompleted: 2,
            fullyCompleted: 2,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: false,
            completionPercentage: 100,
          },
          isProcessing: false,
          isFullyCompleted: true,
        })
      )

      const { result, rerender } = renderHook(() => useAnalysisState(77, undefined, 'processing'))

      // Get initial reference
      const firstRenderItems = result.current.feedback.feedbackItems

      // Rerender with same feedback items (but new object reference from mock)
      // This simulates Zustand store update that creates new object but same array content
      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: stableFeedbackItems, // Same content, but could be new array reference
          stats: {
            total: 2,
            ssmlCompleted: 2,
            audioCompleted: 2,
            fullyCompleted: 2,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: false,
            completionPercentage: 100,
          },
          isProcessing: false,
          isFullyCompleted: true,
        })
      )

      rerender()

      // Array reference should be stable when content is unchanged
      const secondRenderItems = result.current.feedback.feedbackItems
      expect(secondRenderItems).toBe(firstRenderItems)
      expect(secondRenderItems).toEqual(stableFeedbackItems)
    })

    it('creates new feedbackItems array reference when content changes', () => {
      const initialFeedbackItems = [
        {
          id: '1',
          timestamp: 1000,
          text: 'Feedback 1',
          type: 'suggestion' as const,
          category: 'voice' as const,
          ssmlStatus: 'completed' as const,
          audioStatus: 'completed' as const,
          confidence: 0.9,
        },
      ]

      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: initialFeedbackItems,
          stats: {
            total: 1,
            ssmlCompleted: 1,
            audioCompleted: 1,
            fullyCompleted: 1,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: false,
            completionPercentage: 100,
          },
          isProcessing: false,
          isFullyCompleted: true,
        })
      )

      const { result, rerender } = renderHook(() => useAnalysisState(77, undefined, 'processing'))

      const firstRenderItems = result.current.feedback.feedbackItems

      // Update with new feedback item (content changed)
      const updatedFeedbackItems = [
        ...initialFeedbackItems,
        {
          id: '2',
          timestamp: 2000,
          text: 'Feedback 2',
          type: 'suggestion' as const,
          category: 'posture' as const,
          ssmlStatus: 'completed' as const,
          audioStatus: 'completed' as const,
          confidence: 0.8,
        },
      ]

      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: updatedFeedbackItems,
          stats: {
            total: 2,
            ssmlCompleted: 2,
            audioCompleted: 2,
            fullyCompleted: 2,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: false,
            completionPercentage: 100,
          },
          isProcessing: false,
          isFullyCompleted: true,
        })
      )

      rerender()

      // Array reference should change when content changes
      const secondRenderItems = result.current.feedback.feedbackItems
      expect(secondRenderItems).not.toBe(firstRenderItems)
      expect(secondRenderItems.length).toBe(2)
      expect(secondRenderItems).toEqual(updatedFeedbackItems)
    })

    it('maintains stable reference when only non-content properties change', () => {
      const stableFeedbackItems = [
        {
          id: '1',
          timestamp: 1000,
          text: 'Feedback 1',
          type: 'suggestion' as const,
          category: 'voice' as const,
          ssmlStatus: 'completed' as const,
          audioStatus: 'completed' as const,
          confidence: 0.9,
        },
      ]

      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: stableFeedbackItems,
          stats: {
            total: 1,
            ssmlCompleted: 1,
            audioCompleted: 1,
            fullyCompleted: 1,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: false,
            completionPercentage: 100,
          },
          isProcessing: false,
          isFullyCompleted: true,
        })
      )

      const { result, rerender } = renderHook(() => useAnalysisState(77, undefined, 'processing'))

      const firstRenderItems = result.current.feedback.feedbackItems

      // Change stats but keep same feedbackItems array
      mockFeedbackStatusIntegration.mockReturnValue(
        createFeedbackStatus({
          feedbackItems: stableFeedbackItems, // Same array reference
          stats: {
            total: 1,
            ssmlCompleted: 1,
            audioCompleted: 1,
            fullyCompleted: 1,
            hasBlockingFailures: false,
            hasAudioFailures: false,
            hasFailures: false,
            isProcessing: true, // Changed, but doesn't affect feedbackItems
            completionPercentage: 100,
          },
          isProcessing: true, // Changed
          isFullyCompleted: true,
        })
      )

      rerender()

      // Array reference should remain stable even if other properties change
      const secondRenderItems = result.current.feedback.feedbackItems
      expect(secondRenderItems).toBe(firstRenderItems)
    })
  })
})
