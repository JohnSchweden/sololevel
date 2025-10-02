import { describe, expect, it, jest } from '@jest/globals'
import { renderHook } from '@testing-library/react-hooks'

import { getFirstAudioUrlForFeedback } from '@my/api'

import { useFeedbackAudioSource } from '../useFeedbackAudioSource'

jest.mock('@my/api', () => {
  const actual = jest.requireActual('@my/api') as Record<string, unknown>
  return {
    ...actual,
    getFirstAudioUrlForFeedback: jest.fn(),
  }
})

type FeedbackItem = {
  id: string
  timestamp: number
  audioStatus?: 'queued' | 'processing' | 'completed' | 'failed'
}

describe.skip('useFeedbackAudioSource', () => {
  const getAudioMock = getFirstAudioUrlForFeedback as jest.MockedFunction<
    typeof getFirstAudioUrlForFeedback
  >

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches audio url for first completed feedback item and sets it active', async () => {
    getAudioMock.mockResolvedValue({ ok: true, url: 'https://cdn.example.com/audio.mp3' })

    const feedbackItems: FeedbackItem[] = [
      { id: '1', timestamp: 1000, audioStatus: 'completed' },
      { id: '2', timestamp: 2000, audioStatus: 'processing' },
    ]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.activeAudio?.url).toBe('https://cdn.example.com/audio.mp3')
    })

    expect(getAudioMock).toHaveBeenCalledWith(1)
  })

  it('records error when audio fetch fails', async () => {
    getAudioMock.mockResolvedValue({ ok: false, error: 'Network failure' })

    const feedbackItems: FeedbackItem[] = [{ id: '3', timestamp: 1500, audioStatus: 'completed' }]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.errors['3']).toBe('Network failure')
    })

    expect(result.current.activeAudio).toBeNull()
  })

  it('provides manual selection of cached audio', async () => {
    getAudioMock.mockResolvedValue({ ok: true, url: 'https://cdn.example.com/audio.mp3' })

    const feedbackItems: FeedbackItem[] = [
      { id: '4', timestamp: 1200, audioStatus: 'completed' },
      { id: '5', timestamp: 2200, audioStatus: 'completed' },
    ]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.audioUrls['4']).toBeDefined()
    })

    result.current.selectAudio('4')

    expect(result.current.activeAudio?.id).toBe('4')
  })

  it('can clear active audio', async () => {
    getAudioMock.mockResolvedValue({ ok: true, url: 'https://cdn.example.com/audio.mp3' })

    const feedbackItems: FeedbackItem[] = [{ id: '6', timestamp: 1000, audioStatus: 'completed' }]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.activeAudio?.id).toBe('6')
    })

    result.current.clearActiveAudio()

    expect(result.current.activeAudio).toBeNull()
  })

  it('clears stored error', async () => {
    getAudioMock.mockResolvedValue({ ok: false, error: 'Network failure' })

    const feedbackItems: FeedbackItem[] = [{ id: '7', timestamp: 1000, audioStatus: 'completed' }]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.errors['7']).toBe('Network failure')
    })

    result.current.clearError('7')

    expect(result.current.errors['7']).toBeUndefined()
  })

  it('exposes error metadata alongside audio urls', async () => {
    getAudioMock.mockResolvedValueOnce({ ok: false, error: 'Network failure' })

    const feedbackItems: FeedbackItem[] = [{ id: '8', timestamp: 2000, audioStatus: 'completed' }]

    const { result, waitFor } = renderHook(() => useFeedbackAudioSource(feedbackItems))

    await waitFor(() => {
      expect(result.current.errors['8']).toBe('Network failure')
    })
  })
})
