import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import type {
  AnalysisJob,
  SubscriptionOptions,
  SubscriptionState,
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
  const retryFailedFeedback: FeedbackStatus['retryFailedFeedback'] = jest.fn(() => {})
  const cleanup: FeedbackStatus['cleanup'] = jest.fn(() => {})

  return {
    feedbackItems: [],
    feedbacks: [] as FeedbackStatusState[],
    stats: {
      total: 0,
      ssmlCompleted: 0,
      audioCompleted: 0,
      fullyCompleted: 0,
      hasFailures: false,
      isProcessing: false,
      completionPercentage: 0,
    },
    isSubscribed: false,
    isProcessing: false,
    hasFailures: false,
    isFullyCompleted: false,
    getFeedbackById,
    retryFailedFeedback,
    cleanup,
    ...overrides,
  }
}

const mockUploadStoreState = {
  getLatestActiveTask: jest.fn<() => UploadTask | null>(),
  getTaskByRecordingId: jest.fn<(recordingId: number) => UploadTask | null>(),
}

const mockAnalysisStoreState = {
  subscribe: jest.fn<(key: string, options: SubscriptionOptions) => Promise<void>>(),
  unsubscribe: jest.fn<(key: string) => void>(),
  retry: jest.fn<(key: string) => Promise<void>>(),
  subscriptions: new Map<
    string,
    Pick<SubscriptionState, 'status'> & {
      job?: AnalysisJob | null
    }
  >(),
}

const mockUploadProgress = jest.fn<(recordingId: number) => UploadProgress | undefined>()
const mockFeedbackStatusIntegration = jest.fn<(analysisId?: string) => FeedbackStatus>()
const mockGetAnalysisIdForJobId = jest.fn<(jobId: number) => Promise<string | null>>()

jest.mock('@my/api', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
  }

  return {
    getAnalysisIdForJobId: (jobId: number) => mockGetAnalysisIdForJobId(jobId),
    supabase: mockSupabase,
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

describe('useAnalysisState', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockUploadStoreState.getLatestActiveTask.mockReturnValue(null)
    mockUploadStoreState.getTaskByRecordingId.mockReturnValue(null)
    mockAnalysisStoreState.subscribe.mockResolvedValue(undefined)
    mockAnalysisStoreState.unsubscribe.mockImplementation(() => {})
    mockAnalysisStoreState.retry.mockResolvedValue(undefined)
    mockAnalysisStoreState.subscriptions = new Map()
    mockUploadProgress.mockReturnValue(undefined)
    mockFeedbackStatusIntegration.mockReturnValue(createFeedbackStatus())
    mockGetAnalysisIdForJobId.mockResolvedValue(null)
    ;(global as any).__DEV__ = true
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
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
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'recording:123',
        {
          job: { id: 55, status: 'processing', progress_percentage: 42, video_recording_id: 123 },
          status: 'active',
        },
      ],
    ])

    const { result } = renderHook(() => useAnalysisState(undefined, 123, 'processing'))

    expect(result.current.phase).toBe('analyzing')
    expect(result.current.progress.analysis).toBe(42)
  })

  it('returns generating-feedback when analysis completed but feedback not ready', () => {
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:77',
        {
          job: { id: 77, status: 'completed', progress_percentage: 100, video_recording_id: 123 },
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
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:90',
        {
          job: {
            id: 90,
            status: 'failed',
            progress_percentage: 80,
            video_recording_id: 500,
            error_message: 'Edge function error',
          },
          status: 'failed',
        },
      ],
    ])

    const { result } = renderHook(() => useAnalysisState(90, undefined, 'processing'))

    expect(result.current.phase).toBe('error')
    expect(result.current.error).toEqual({ phase: 'analysis', message: 'Edge function error' })
  })

  it('invokes retry on analysis subscription store when retry called', async () => {
    mockAnalysisStoreState.retry.mockResolvedValue(undefined)
    mockAnalysisStoreState.subscriptions = new Map([
      [
        'job:77',
        {
          job: { id: 77, status: 'failed', progress_percentage: 0, video_recording_id: 123 },
          status: 'failed',
        },
      ],
    ])

    const { result } = renderHook(() => useAnalysisState(77, undefined, 'processing'))

    await act(async () => {
      await result.current.retry()
    })

    expect(mockAnalysisStoreState.retry).toHaveBeenCalledWith('job:77')
  })
})
