import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { useAnalysisSubscriptionStore } from './analysisSubscription'

type SubscriptionHandlers = {
  onStatus?: (status: string, details?: unknown) => void
  onError?: (error: string, details?: unknown) => void
}

type JobCallback = (job: any) => void

type SubscriptionMock = (
  id: number,
  onJob: JobCallback,
  handlers?: SubscriptionHandlers
) => () => void

type RecordingSubscriptionMock = (
  recordingId: number,
  onJob: JobCallback,
  handlers?: SubscriptionHandlers
) => () => void

type LatestJobFetcher = (recordingId: number) => Promise<any>
type TitleSubscriptionMock = (
  jobId: number,
  onTitle: (title: string | null) => void
) => (() => void) | undefined

const mockSubscribeToAnalysisJob = jest.fn() as jest.MockedFunction<SubscriptionMock>
const mockSubscribeToLatestAnalysisJobByRecordingId =
  jest.fn() as jest.MockedFunction<RecordingSubscriptionMock>
const mockGetLatestAnalysisJobForRecordingId = jest.fn() as jest.MockedFunction<LatestJobFetcher>
const mockSubscribeToAnalysisTitle = jest.fn() as jest.MockedFunction<TitleSubscriptionMock>

jest.mock('@my/api', () => ({
  __esModule: true,
  subscribeToAnalysisJob: (...args: Parameters<SubscriptionMock>) =>
    mockSubscribeToAnalysisJob(...args),
  subscribeToLatestAnalysisJobByRecordingId: (...args: Parameters<RecordingSubscriptionMock>) =>
    mockSubscribeToLatestAnalysisJobByRecordingId(...args),
  getLatestAnalysisJobForRecordingId: (...args: Parameters<LatestJobFetcher>) =>
    mockGetLatestAnalysisJobForRecordingId(...args),
  subscribeToAnalysisTitle: (...args: Parameters<TitleSubscriptionMock>) =>
    mockSubscribeToAnalysisTitle(...args),
}))

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('analysisSubscription store', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSubscribeToAnalysisJob.mockReset()
    mockSubscribeToLatestAnalysisJobByRecordingId.mockReset()
    mockGetLatestAnalysisJobForRecordingId.mockReset()
    mockSubscribeToAnalysisTitle.mockReset()
    mockSubscribeToAnalysisTitle.mockReturnValue(undefined) // Default: no title subscription
    useAnalysisSubscriptionStore.getState().reset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    useAnalysisSubscriptionStore.getState().reset()
  })

  it('subscribes to job updates and stores job data', async () => {
    const unsubscribeMock = jest.fn()

    let statusHandler: SubscriptionHandlers['onStatus']
    let jobHandler: JobCallback | undefined

    mockSubscribeToAnalysisJob.mockImplementation((_, onJob, handlers = {}) => {
      jobHandler = onJob
      statusHandler = handlers.onStatus
      return unsubscribeMock
    })

    await useAnalysisSubscriptionStore.getState().subscribe('job:42', { analysisJobId: 42 })
    await flushMicrotasks()

    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(1)
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledWith(
      42,
      expect.any(Function),
      expect.objectContaining({ onStatus: expect.any(Function), onError: expect.any(Function) })
    )

    statusHandler?.('SUBSCRIBED', { health: 'ok' })

    const store = useAnalysisSubscriptionStore.getState()
    expect(store.getStatus('job:42')).toBe('active')

    const mockJob = { id: 42, status: 'processing', progress_percentage: 75 }
    jobHandler?.(mockJob)

    expect(store.getJob('job:42')).toEqual(mockJob)

    store.unsubscribe('job:42')
    expect(unsubscribeMock).toHaveBeenCalled()
    expect(store.getStatus('job:42')).toBe('idle')
  })

  it('deduplicates active subscriptions', async () => {
    mockSubscribeToAnalysisJob.mockReturnValue(jest.fn())

    const store = useAnalysisSubscriptionStore.getState()

    await store.subscribe('job:7', { analysisJobId: 7 })
    await flushMicrotasks()
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(1)

    useAnalysisSubscriptionStore.setState((draft) => {
      const subscription = draft.subscriptions.get('job:7')
      if (subscription) {
        subscription.status = 'active'
      }
    })

    await store.subscribe('job:7', { analysisJobId: 7 })
    await flushMicrotasks()
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(1)
  })

  it('retries subscription with exponential backoff up to the limit', async () => {
    const unsubscribeMock = jest.fn()

    const jobHandlers: SubscriptionHandlers[] = []

    let subscriptionCount = 0

    mockSubscribeToAnalysisJob.mockImplementation((_, _onJob, handlers = {}) => {
      jobHandlers.push({ onStatus: handlers.onStatus, onError: handlers.onError })
      subscriptionCount += 1
      return unsubscribeMock
    })

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:9', { analysisJobId: 9 })
    await flushMicrotasks()

    expect(jobHandlers).toHaveLength(1)

    jobHandlers[0].onError?.('CHANNEL_ERROR', { reason: 'network' })

    jest.advanceTimersByTime(300)
    await flushMicrotasks()
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(2)

    jobHandlers[1].onError?.('CHANNEL_ERROR', { reason: 'timeout' })
    jest.advanceTimersByTime(600)
    await flushMicrotasks()
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(3)

    jobHandlers[2].onError?.('CHANNEL_ERROR', { reason: 'timeout' })
    jest.advanceTimersByTime(1200)
    await flushMicrotasks()
    expect(subscriptionCount).toBe(4)
    expect(store.getStatus('job:9')).toBe('pending')
  })

  it('supports recording subscriptions with backfill check', async () => {
    const unsubscribeMock = jest.fn()

    const handlers: Array<{ onStatus?: SubscriptionHandlers['onStatus'] }> = []

    mockSubscribeToLatestAnalysisJobByRecordingId.mockImplementation((_, _onJob, options = {}) => {
      handlers.push({ onStatus: options.onStatus })
      return unsubscribeMock
    })

    mockGetLatestAnalysisJobForRecordingId.mockResolvedValue({
      id: 99,
      status: 'completed',
      video_recording_id: 123,
      progress_percentage: 100,
    })

    await useAnalysisSubscriptionStore.getState().subscribe('recording:123', { recordingId: 123 })
    await flushMicrotasks()

    expect(mockSubscribeToLatestAnalysisJobByRecordingId).toHaveBeenCalledWith(
      123,
      expect.any(Function),
      expect.objectContaining({ onStatus: expect.any(Function), onError: expect.any(Function) })
    )

    handlers[0].onStatus?.('BACKFILL_EMPTY', {})
    jest.advanceTimersByTime(500)
    await flushMicrotasks()

    const job = useAnalysisSubscriptionStore.getState().getJob('recording:123')
    expect(job).toBeNull()
  })

  it('cleans up timers and subscriptions on reset', async () => {
    const unsubscribeMock = jest.fn()
    mockSubscribeToAnalysisJob.mockReturnValue(unsubscribeMock)

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:55', { analysisJobId: 55 })
    await flushMicrotasks()

    useAnalysisSubscriptionStore.setState((draft) => {
      const subscription = draft.subscriptions.get('job:55')
      if (subscription) {
        subscription.retryTimeoutId = setTimeout(() => {}, 1000)
        subscription.backfillTimeoutId = setTimeout(() => {}, 1000)
      }
    })

    store.reset()

    expect(unsubscribeMock).toHaveBeenCalled()
    expect(store.getStatus('job:55')).toBe('idle')
  })
})
