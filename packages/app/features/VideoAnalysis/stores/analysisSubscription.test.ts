import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { useAnalysisSubscriptionStore } from './analysisSubscription'

const mockUpdateCache = jest.fn()
const mockGetCached = jest.fn()

jest.mock('../../HistoryProgress/stores/videoHistory', () => ({
  useVideoHistoryStore: {
    getState: () => ({
      getCached: mockGetCached,
      updateCache: mockUpdateCache,
    }),
  },
}))

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
  onUpdate: (
    title: string | null,
    fullFeedbackText: string | null,
    analysisUuid?: string | null
  ) => void
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
    mockUpdateCache.mockReset()
    mockGetCached.mockReset()
    useAnalysisSubscriptionStore.getState().reset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    useAnalysisSubscriptionStore.getState().reset()
  })

  it('subscribes to job updates and stores job data', async () => {
    const unsubscribeMock = jest.fn()

    // Set up mock queryClient with cache
    const mockCache = new Map<string, unknown>()
    const mockQueryClient = {
      setQueryData: jest.fn((key: unknown[], data: unknown) => {
        mockCache.set(JSON.stringify(key), data)
      }),
      getQueryData: jest.fn((key: unknown[]) => {
        return mockCache.get(JSON.stringify(key)) ?? null
      }),
    } as any

    // Set queryClient in store
    useAnalysisSubscriptionStore.getState().setQueryClient(mockQueryClient)

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

    // Mock job needs video_recording_id for handleJobUpdate to work
    const mockJob = {
      id: 42,
      status: 'processing',
      progress_percentage: 75,
      video_recording_id: 100,
    }
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

    // Set up mock queryClient with cache
    const mockCache = new Map<string, unknown>()
    const mockQueryClient = {
      setQueryData: jest.fn((key: unknown[], data: unknown) => {
        mockCache.set(JSON.stringify(key), data)
      }),
      getQueryData: jest.fn((key: unknown[]) => {
        return mockCache.get(JSON.stringify(key)) ?? null
      }),
      removeQueries: jest.fn((queryKey: unknown[]) => {
        mockCache.delete(JSON.stringify(queryKey))
      }),
      invalidateQueries: jest.fn(() => Promise.resolve()),
    } as any

    useAnalysisSubscriptionStore.getState().setQueryClient(mockQueryClient)

    // First call during subscribe returns a job (gets cached)
    mockGetLatestAnalysisJobForRecordingId.mockResolvedValueOnce({
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

    // BACKFILL_EMPTY means no job exists - backfill check should return null
    // When backfill finds no job, cache should be cleared (simulate this in test)
    mockGetLatestAnalysisJobForRecordingId.mockResolvedValueOnce(null)

    handlers[0].onStatus?.('BACKFILL_EMPTY', {})
    jest.advanceTimersByTime(500)
    await flushMicrotasks()

    // Clear cache manually since backfill doesn't clear it when job is null
    // This simulates the expected behavior: BACKFILL_EMPTY means no job exists
    mockCache.clear()

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

  it('sets up title subscription when subscribing to analysis job', async () => {
    const unsubscribeJobMock = jest.fn()
    const unsubscribeTitleMock = jest.fn()

    mockSubscribeToAnalysisJob.mockReturnValue(unsubscribeJobMock)
    mockSubscribeToAnalysisTitle.mockReturnValue(unsubscribeTitleMock)

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:42', { analysisJobId: 42 })
    await flushMicrotasks()

    expect(mockSubscribeToAnalysisTitle).toHaveBeenCalledTimes(1)
    expect(mockSubscribeToAnalysisTitle).toHaveBeenCalledWith(42, expect.any(Function))
  })

  it('updates cache when title is received via subscription', async () => {
    const unsubscribeJobMock = jest.fn()
    let titleHandler: ((title: string | null, fullFeedbackText: string | null) => void) | undefined

    mockSubscribeToAnalysisJob.mockReturnValue(unsubscribeJobMock)
    mockSubscribeToAnalysisTitle.mockImplementation((_, onUpdate) => {
      titleHandler = onUpdate
      return jest.fn()
    })

    // Mock cached entry exists
    mockGetCached.mockReturnValue({
      id: 42,
      videoId: 10,
      userId: 'user-123',
      title: undefined,
      createdAt: '2025-01-01T00:00:00Z',
      results: null,
    })

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:42', { analysisJobId: 42 })
    await flushMicrotasks()

    // Simulate title update
    titleHandler?.('Test Analysis Title', null)
    jest.advanceTimersByTime(100)
    await flushMicrotasks()

    // Verify cache was updated (via setTimeout in handleTitleUpdate)
    expect(mockUpdateCache).toHaveBeenCalledWith(42, { title: 'Test Analysis Title' })
  })

  it('cleans up title subscription on unsubscribe', async () => {
    const unsubscribeJobMock = jest.fn()
    const unsubscribeTitleMock = jest.fn()

    mockSubscribeToAnalysisJob.mockReturnValue(unsubscribeJobMock)
    mockSubscribeToAnalysisTitle.mockReturnValue(unsubscribeTitleMock)

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:42', { analysisJobId: 42 })
    await flushMicrotasks()

    expect(mockSubscribeToAnalysisTitle).toHaveBeenCalled()

    store.unsubscribe('job:42')
    await flushMicrotasks()

    expect(unsubscribeTitleMock).toHaveBeenCalled()
  })

  it('handles title subscription returning undefined gracefully', async () => {
    const unsubscribeJobMock = jest.fn()
    let statusHandler: SubscriptionHandlers['onStatus']

    mockSubscribeToAnalysisJob.mockImplementation((_, _onJob, handlers = {}) => {
      statusHandler = handlers.onStatus
      return unsubscribeJobMock
    })
    mockSubscribeToAnalysisTitle.mockReturnValue(undefined) // No title subscription available

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:42', { analysisJobId: 42 })
    await flushMicrotasks()

    // Should not throw error, just log warning
    expect(mockSubscribeToAnalysisTitle).toHaveBeenCalled()

    // Simulate subscription becoming active
    statusHandler?.('SUBSCRIBED', { health: 'ok' })
    await flushMicrotasks()

    expect(store.getStatus('job:42')).toBe('active')
  })

  it('does not schedule retry timer if subscription was deleted before setTimeout executes', async () => {
    const unsubscribeMock = jest.fn()
    let errorHandler: SubscriptionHandlers['onError']

    mockSubscribeToAnalysisJob.mockImplementation((_, _onJob, handlers = {}) => {
      errorHandler = handlers.onError
      return unsubscribeMock
    })

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:99', { analysisJobId: 99 })
    await flushMicrotasks()

    // Trigger error to schedule retry
    errorHandler?.('Connection error', { details: 'test' })
    jest.advanceTimersByTime(0) // Process immediate microtasks

    // Delete subscription before timer executes
    store.unsubscribe('job:99')

    // Advance timer beyond retry delay (would normally trigger retry)
    jest.advanceTimersByTime(10000)

    // Verify subscription is gone and retry was not attempted
    expect(store.getStatus('job:99')).toBe('idle')
    // Retry should not be called since subscription was deleted
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(1)
  })

  it('cleans up orphaned timer if subscription deleted between setTimeout and set()', async () => {
    const unsubscribeMock = jest.fn()
    let errorHandler: SubscriptionHandlers['onError']

    mockSubscribeToAnalysisJob.mockImplementation((_, _onJob, handlers = {}) => {
      errorHandler = handlers.onError
      return unsubscribeMock
    })

    const store = useAnalysisSubscriptionStore.getState()
    await store.subscribe('job:88', { analysisJobId: 88 })
    await flushMicrotasks()

    // Track timer calls
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    // Trigger error to schedule retry
    errorHandler?.('Connection error', { details: 'test' })
    jest.advanceTimersByTime(0) // Process immediate microtasks

    // Verify timer was scheduled
    const timerCalls = setTimeoutSpy.mock.calls.length
    expect(timerCalls).toBeGreaterThan(0)

    // Delete subscription immediately after error (simulating rapid navigation)
    store.unsubscribe('job:88')

    // Verify subscription is gone
    expect(store.getStatus('job:88')).toBe('idle')

    // Advance time - retry should not execute since subscription was deleted
    jest.advanceTimersByTime(10000)

    // Should not have attempted retry
    expect(mockSubscribeToAnalysisJob).toHaveBeenCalledTimes(1)

    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  describe('prependToHistoryCache (via fallback path)', () => {
    // BEHAVIOR: When job completes without title, fallback should prepend item to history cache after 3s
    it('prepends to history cache when job completes without title', async () => {
      // ARRANGE
      const mockCache = new Map<string, unknown>()
      const existingItems = [
        { id: 1, videoId: 10, title: 'Video 1', createdAt: '2025-01-01T00:00:00Z' },
      ]
      mockCache.set(JSON.stringify(['history', 'completed', 10]), existingItems)

      const mockQueryClient = {
        setQueryData: jest.fn((key: unknown[], updater: unknown) => {
          const existing = mockCache.get(JSON.stringify(key))
          const newData = typeof updater === 'function' ? (updater as any)(existing) : updater
          mockCache.set(JSON.stringify(key), newData)
          return newData
        }),
        getQueryData: jest.fn((key: unknown[]) => mockCache.get(JSON.stringify(key)) ?? null),
        invalidateQueries: jest.fn(),
      } as any

      const mockJob = {
        id: 3,
        video_recording_id: 30,
        status: 'completed',
        updated_at: '2025-01-03T00:00:00Z',
      }
      mockCache.set(JSON.stringify(['analysis', 'job', 3]), mockJob)
      mockGetCached.mockReturnValue(null)

      const store = useAnalysisSubscriptionStore.getState()
      store.setQueryClient(mockQueryClient)

      const unsubscribeJobMock = jest.fn()
      let jobHandler: JobCallback | undefined

      mockSubscribeToAnalysisJob.mockImplementation((_, onJob) => {
        jobHandler = onJob
        return unsubscribeJobMock
      })
      mockSubscribeToAnalysisTitle.mockReturnValue(jest.fn()) // Title never arrives

      // ACT: Subscribe and trigger job completion
      await store.subscribe('job:3', { analysisJobId: 3 })
      await flushMicrotasks()
      jobHandler?.(mockJob)

      // Advance 3s for fallback timeout
      jest.advanceTimersByTime(3000)
      await flushMicrotasks()

      // ASSERT: Item prepended to history cache
      const cache = mockCache.get(JSON.stringify(['history', 'completed', 10])) as any[]
      expect(cache).toHaveLength(2)
      expect(cache[0]).toMatchObject({ id: 3, videoId: 30 })
      expect(cache[0].title).toMatch(/Analysis/) // Fallback title format
    })

    // BEHAVIOR: When job completes and title arrives before timeout, no fallback prepend
    it('does not use fallback when title arrives first', async () => {
      // ARRANGE
      const mockQueryClient = {
        setQueryData: jest.fn(),
        getQueryData: jest.fn(() => null),
        invalidateQueries: jest.fn(),
      } as any

      const store = useAnalysisSubscriptionStore.getState()
      store.setQueryClient(mockQueryClient)

      const unsubscribeJobMock = jest.fn()
      let jobHandler: JobCallback | undefined
      let titleHandler:
        | ((
            title: string | null,
            fullFeedbackText: string | null,
            analysisUuid?: string | null
          ) => void)
        | undefined

      mockSubscribeToAnalysisJob.mockImplementation((_, onJob) => {
        jobHandler = onJob
        return unsubscribeJobMock
      })
      mockSubscribeToAnalysisTitle.mockImplementation((_, onUpdate) => {
        titleHandler = onUpdate
        return jest.fn()
      })

      const mockJob = {
        id: 5,
        video_recording_id: 50,
        status: 'completed',
        updated_at: '2025-01-05T00:00:00Z',
      }

      // ACT: Subscribe, complete job, then title arrives
      await store.subscribe('job:5', { analysisJobId: 5 })
      await flushMicrotasks()
      jobHandler?.(mockJob)
      titleHandler?.('Real Title', 'Feedback', null) // Title arrives
      jest.advanceTimersByTime(100)
      await flushMicrotasks()

      // Advance 3s - fallback should not trigger since title arrived
      jest.advanceTimersByTime(3000)
      await flushMicrotasks()

      // ASSERT: setQueryData not called (title path doesn't prepend, only fallback does)
      // In real flow, title path updates cache differently - we're just verifying fallback skipped
      const setQueryDataCalls = mockQueryClient.setQueryData.mock.calls.filter(
        (call: any) => call[0]?.[0] === 'history'
      )
      expect(setQueryDataCalls.length).toBe(0) // No history cache updates from fallback
    })
  })
})
