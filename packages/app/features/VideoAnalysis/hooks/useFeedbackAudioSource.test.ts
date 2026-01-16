import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook, waitFor } from '@testing-library/react'

import { getFirstAudioUrlForFeedback } from '@my/api'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { checkCachedAudio, persistAudioFile } from '../utils/audioCache'
import { type FeedbackAudioItem, useFeedbackAudioSource } from './useFeedbackAudioSource'

// Mock dependencies
jest.mock('@my/api', () => ({
  getFirstAudioUrlForFeedback: jest.fn(),
}))

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../utils/audioCache', () => ({
  checkCachedAudio: jest.fn(),
  getCachedAudioPath: jest.fn((id: string, ext = 'wav') => `/path/${id}.${ext}`),
  persistAudioFile: jest.fn(),
}))

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}))

const mockGetFirstAudioUrlForFeedback = jest.mocked(getFirstAudioUrlForFeedback)
const mockCheckCachedAudio = jest.mocked(checkCachedAudio)
const mockPersistAudioFile = jest.mocked(persistAudioFile)

describe('useFeedbackAudioSource', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Reset store state
    useFeedbackAudioStore.setState({
      audioPaths: {},
      audioUrls: {},
      errors: {},
      activeAudio: null,
      isPlaying: false,
      controller: null,
    })

    // Default mocks
    mockCheckCachedAudio.mockResolvedValue(false)
    mockGetFirstAudioUrlForFeedback.mockResolvedValue({
      ok: true,
      url: 'https://example.com/audio.mp3',
    })
    mockPersistAudioFile.mockResolvedValue('/path/to/audio.mp3')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('audioUrls clearing on analysis change', () => {
    it('should clear audioUrls when feedbackItems becomes empty', async () => {
      // ARRANGE: Set up initial state with audioUrls populated
      const initialItems: FeedbackAudioItem[] = [
        { id: '1', timestamp: 0, audioStatus: 'completed' },
      ]

      // Set initial audioUrls in store
      useFeedbackAudioStore.setState({
        audioUrls: { '1': 'https://example.com/audio1.mp3' },
      })

      const { rerender } = renderHook(({ items }) => useFeedbackAudioSource(items), {
        initialProps: { items: initialItems },
      })

      // Fast-forward to let initial processing complete
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ACT: Change to empty feedbackItems
      act(() => {
        rerender({ items: [] })
      })

      // Fast-forward timers to trigger effect
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ASSERT: audioUrls should be cleared (empty object)
      await waitFor(() => {
        const state = useFeedbackAudioStore.getState()
        expect(state.audioUrls).toEqual({})
      })
    })

    it('should clear audioUrls when navigating to different analysis', async () => {
      // ARRANGE: First analysis with feedback items
      const analysisAItems: FeedbackAudioItem[] = [
        { id: '1', timestamp: 0, audioStatus: 'completed' },
      ]

      // Set initial audioUrls for analysis A
      useFeedbackAudioStore.setState({
        audioUrls: { '1': 'https://example.com/audio1.mp3' },
      })

      const { rerender } = renderHook(({ items }) => useFeedbackAudioSource(items), {
        initialProps: { items: analysisAItems },
      })

      // Fast-forward to let first analysis process
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ACT: Navigate to different analysis with different feedback IDs
      const analysisBItems: FeedbackAudioItem[] = [
        { id: '2', timestamp: 0, audioStatus: 'completed' },
      ]

      act(() => {
        rerender({ items: analysisBItems })
      })

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ASSERT: audioUrls should not contain old analysis A entry
      await waitFor(() => {
        const state = useFeedbackAudioStore.getState()
        // Old analysis ID should not be present (either cleared or replaced)
        // Since we're testing clearing behavior, we check that '1' is not in the final state
        // when we switch to analysis B
        expect(state.audioUrls['1']).toBeUndefined()
      })
    })

    it('should NOT clear audioUrls when audioStatus changes for same items', async () => {
      // ARRANGE: Initial items with processing status
      const initialItems: FeedbackAudioItem[] = [
        { id: '1', timestamp: 0, audioStatus: 'processing' },
        { id: '2', timestamp: 1000, audioStatus: 'queued' },
      ]

      // Set audioUrls in store (e.g., from previous completed feedback)
      useFeedbackAudioStore.setState({
        audioUrls: { '1': 'https://example.com/audio1.mp3' },
      })

      const { rerender } = renderHook(({ items }) => useFeedbackAudioSource(items), {
        initialProps: { items: initialItems },
      })

      // Fast-forward to let initial processing complete
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ACT: Change audioStatus for item 1 (processing → completed)
      const updatedItems: FeedbackAudioItem[] = [
        { id: '1', timestamp: 0, audioStatus: 'completed' },
        { id: '2', timestamp: 1000, audioStatus: 'queued' },
      ]

      act(() => {
        rerender({ items: updatedItems })
      })

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // ASSERT: audioUrls should still contain the URL for item 1
      await waitFor(() => {
        const state = useFeedbackAudioStore.getState()
        expect(state.audioUrls['1']).toBe('https://example.com/audio1.mp3')
      })
    })
  })
})
