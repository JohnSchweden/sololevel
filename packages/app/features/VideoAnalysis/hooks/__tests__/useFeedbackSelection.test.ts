import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import type { FeedbackPanelItem } from '../../types'
import { useFeedbackSelection } from '../useFeedbackSelection'

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('useFeedbackSelection', () => {
  const createFeedbackDeps = () => {
    const feedbackAudio = {
      audioUrls: {
        '1': 'https://cdn.example.com/audio.mp3',
      },
      selectAudio: jest.fn(),
      clearActiveAudio: jest.fn(),
      errors: {},
    }

    const audioController = {
      setIsPlaying: jest.fn(),
      seekTo: jest.fn(),
    }

    const videoPlayback = {
      seek: jest.fn(),
      currentTime: 5,
    }

    const item: FeedbackPanelItem = {
      id: '1',
      timestamp: 2000,
      text: 'Feedback text',
      type: 'suggestion',
      category: 'voice',
      ssmlStatus: 'completed',
      audioStatus: 'completed',
      confidence: 1,
    }

    return { feedbackAudio, audioController, videoPlayback, item }
  }

  it('selects feedback and triggers audio playback', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.selectFeedback(deps.item)
    })

    expect(result.current.selectedFeedbackId).toBe('1')
    expect(deps.videoPlayback.seek).toHaveBeenCalledWith(2)
    expect(deps.feedbackAudio.selectAudio).toHaveBeenCalledWith('1')
    expect(deps.audioController.setIsPlaying).toHaveBeenCalledWith(true)
  })

  it('clears selection and audio state', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.selectFeedback(deps.item)
    })

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedFeedbackId).toBeNull()
    expect(deps.feedbackAudio.clearActiveAudio).toHaveBeenCalled()
    expect(deps.audioController.setIsPlaying).toHaveBeenCalledWith(false)
  })

  it('allows manually triggering coach speaking duration', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.triggerCoachSpeaking(10)
    })

    expect(result.current.isCoachSpeaking).toBe(true)

    act(() => {
      result.current.triggerCoachSpeaking(0)
    })

    expect(result.current.isCoachSpeaking).toBe(false)
  })
})
