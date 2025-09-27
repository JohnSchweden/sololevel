/// <reference types="jest" />
import { act } from '@testing-library/react'
// No imports needed - jest-expo preset provides globals
import { useFeedbackStatusStore } from '../feedbackStatus'

const exampleFeedback = {
  id: 1,
  analysis_id: 'analysis-1',
  message: 'Keep your back straight.',
  category: 'posture',
  timestamp_seconds: 12.3,
  confidence: 0.9,
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

describe('feedbackStatus store', () => {
  beforeEach(() => {
    useFeedbackStatusStore.getState().reset()
  })

  it('adds and updates feedback metadata', () => {
    act(() => {
      useFeedbackStatusStore.getState().addFeedback(exampleFeedback)
    })

    let feedback = useFeedbackStatusStore.getState().feedbacks.get(exampleFeedback.id)
    expect(feedback?.ssmlStatus).toBe('queued')
    expect(feedback?.audioStatus).toBe('queued')
    expect(feedback?.ssmlAttempts).toBe(0)
    expect(feedback?.audioAttempts).toBe(0)

    act(() => {
      useFeedbackStatusStore.getState().setSSMLStatus(exampleFeedback.id, 'processing')
      useFeedbackStatusStore.getState().setAudioStatus(exampleFeedback.id, 'processing')
    })

    feedback = useFeedbackStatusStore.getState().feedbacks.get(exampleFeedback.id)
    expect(feedback?.ssmlStatus).toBe('processing')
    expect(feedback?.audioStatus).toBe('processing')

    act(() => {
      useFeedbackStatusStore.getState().updateFeedback(exampleFeedback.id, {
        ssml_status: 'failed',
        audio_status: 'failed',
        ssml_attempts: 3,
        audio_attempts: 2,
        ssml_last_error: 'Timeout',
        audio_last_error: 'Quota exceeded',
      })
    })

    feedback = useFeedbackStatusStore.getState().feedbacks.get(exampleFeedback.id)
    expect(feedback?.ssmlStatus).toBe('failed')
    expect(feedback?.audioStatus).toBe('failed')
    expect(feedback?.ssmlAttempts).toBe(3)
    expect(feedback?.audioAttempts).toBe(2)
    expect(feedback?.ssmlLastError).toBe('Timeout')
    expect(feedback?.audioLastError).toBe('Quota exceeded')
  })

  it('produces aggregate statistics with attempts', () => {
    act(() => {
      useFeedbackStatusStore.getState().addFeedback({
        ...exampleFeedback,
        id: 1,
        ssml_status: 'processing',
        audio_status: 'queued',
        ssml_attempts: 1,
      })
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
})
