// Mock logging before any imports
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

import { log } from '@my/logging'
// No imports needed for Jest globals
import { act } from '@testing-library/react'
// No imports needed - jest-expo preset provides globals
import { useFeedbackStatusStore } from './feedbackStatus'

const createMockChannel = () => {
  const unsubscribeFn = jest.fn()
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((callback: (status: string) => void) => {
      callback('SUBSCRIBED')
      return { unsubscribe: unsubscribeFn }
    }),
  }
  return channel
}

const createMockFrom = () => ({
  select: jest.fn(() => ({
    eq: jest.fn(() => ({
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
})

jest.mock('@my/api', () => ({
  supabase: {
    channel: jest.fn(() => createMockChannel()),
    from: jest.fn(() => createMockFrom()),
  },
}))

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe.skip('feedbackStatus store', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    act(() => {
      useFeedbackStatusStore.getState().reset()
    })
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  it('adds and updates feedback metadata', () => {
    const exampleFeedback = {
      id: 1,
      analysis_id: 'test-analysis',
      message: 'Example feedback',
      category: 'posture',
      timestamp_seconds: 1.5,
      confidence: 0.95,
      ssml_status: 'queued' as const,
      audio_status: 'queued' as const,
      ssml_attempts: 0,
      audio_attempts: 0,
      ssml_last_error: null,
      audio_last_error: null,
      ssml_updated_at: new Date().toISOString(),
      audio_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    act(() => {
      useFeedbackStatusStore.getState().addFeedback(exampleFeedback)
    })

    const feedback = useFeedbackStatusStore.getState().getFeedbackById(1)
    expect(feedback).toBeTruthy()
    expect(feedback?.message).toBe('Example feedback')
    expect(feedback?.ssmlStatus).toBe('queued')

    // Update SSML status
    act(() => {
      useFeedbackStatusStore.getState().setSSMLStatus(1, 'processing')
    })

    const updated = useFeedbackStatusStore.getState().getFeedbackById(1)
    expect(updated?.ssmlStatus).toBe('processing')
  })

  it('produces aggregate statistics with attempts', () => {
    const exampleFeedback = {
      id: 1,
      analysis_id: 'test-analysis',
      message: 'Example feedback',
      category: 'posture',
      timestamp_seconds: 1.5,
      confidence: 0.95,
      ssml_status: 'processing' as const,
      audio_status: 'queued' as const,
      ssml_attempts: 1,
      audio_attempts: 0,
      ssml_last_error: null,
      audio_last_error: null,
      ssml_updated_at: new Date().toISOString(),
      audio_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    act(() => {
      useFeedbackStatusStore.getState().addFeedback(exampleFeedback)
      useFeedbackStatusStore.getState().addFeedback({
        ...exampleFeedback,
        id: 2,
        ssml_status: 'failed',
        audio_status: 'failed',
        ssml_attempts: 2,
        audio_attempts: 4,
      })
    })

    const stats = useFeedbackStatusStore.getState().getStats()
    expect(stats.ssmlProcessing).toBe(1)
    expect(stats.audioQueued).toBe(1)
    expect(stats.ssmlFailed).toBe(1)
    expect(stats.audioFailed).toBe(1)
    expect(stats.maxSSMLAttempts).toBe(2)
    expect(stats.maxAudioAttempts).toBe(4)
  })

  it('tracks subscription status transitions correctly', async () => {
    const subscribe = useFeedbackStatusStore.getState().subscribeToAnalysisFeedbacks

    const unsubscribeMock = jest.fn()
    const channelMock = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback: (status: string) => void) => {
        // Immediately invoke callback with SUBSCRIBED
        callback('SUBSCRIBED')
        return { unsubscribe: unsubscribeMock }
      }),
    }

    const { supabase } = require('@my/api')
    supabase.channel = jest.fn(() => channelMock)
    supabase.from = jest.fn(() => createMockFrom())

    await expect(subscribe('analysis-1')).resolves.toBeUndefined()

    const state = useFeedbackStatusStore.getState()
    expect(state.subscriptionStatus.get('analysis-1')).toBe('active')
    expect(state.subscriptions.has('analysis-1')).toBe(true)
    expect(log.info).toHaveBeenCalledWith(
      'FeedbackStatusStore',
      'Successfully subscribed to analysis analysis-1'
    )
  })
})
