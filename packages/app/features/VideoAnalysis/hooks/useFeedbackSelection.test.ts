import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import type { FeedbackPanelItem } from '../types'
import { useFeedbackSelection } from './useFeedbackSelection'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('useFeedbackSelection', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

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

  it('respects select options for seek/audio toggles', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.selectFeedback(deps.item, { seek: false, playAudio: false })
    })

    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()
    expect(deps.feedbackAudio.selectAudio).not.toHaveBeenCalled()

    act(() => {
      result.current.selectFeedback(deps.item, { seek: true, playAudio: true })
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

  it('handles auto highlight with custom duration and cleanup', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, {
        seek: false,
        playAudio: true,
        autoDurationMs: 5,
      })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')
    expect(result.current.highlightSource).toBe('auto')
    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()
    expect(deps.feedbackAudio.selectAudio).toHaveBeenCalledWith('1')

    act(() => {
      jest.runAllTimers()
    })

    expect(result.current.highlightedFeedbackId).toBeNull()
  })

  it('clearHighlight respects matchId and sources', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, { seek: false, playAudio: false })
    })

    act(() => {
      result.current.clearHighlight({ matchId: 'other-id' })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ sources: ['user'] })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ matchId: '1', sources: ['auto'], reason: 'manual-test' })
    })

    expect(result.current.highlightedFeedbackId).toBeNull()
  })
})
