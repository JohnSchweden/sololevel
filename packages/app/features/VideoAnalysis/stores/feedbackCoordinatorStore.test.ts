import { act, renderHook } from '@testing-library/react'

import { useFeedbackCoordinatorStore } from './feedbackCoordinatorStore'

describe('feedbackCoordinatorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useFeedbackCoordinatorStore.getState().reset()
  })

  describe('TDD: Granular selectors prevent unnecessary re-renders', () => {
    it('should allow selective subscription to highlightedFeedbackId only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.highlightedFeedbackId)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBeNull()

      // Act - Change highlightedFeedbackId
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe('feedback-1')

      // Act - Change unrelated state (isCoachSpeaking)
      act(() => {
        useFeedbackCoordinatorStore.getState().setIsCoachSpeaking(true)
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe('feedback-1')
    })

    it('should allow selective subscription to isCoachSpeaking only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.isCoachSpeaking)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBe(false)

      // Act - Change isCoachSpeaking
      act(() => {
        useFeedbackCoordinatorStore.getState().setIsCoachSpeaking(true)
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)

      // Act - Change unrelated state (highlightedFeedbackId)
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)
    })

    it('should allow selective subscription to bubble state only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.bubbleState)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toEqual({
        currentBubbleIndex: null,
        bubbleVisible: false,
      })

      // Act - Change bubble state
      act(() => {
        useFeedbackCoordinatorStore.getState().setBubbleState({
          currentBubbleIndex: 0,
          bubbleVisible: true,
        })
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toEqual({
        currentBubbleIndex: 0,
        bubbleVisible: true,
      })

      // Act - Change unrelated state (highlightedFeedbackId)
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
    })

    it('should allow selective subscription to overlayVisible only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.overlayVisible)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBe(false)

      // Act - Change overlayVisible
      act(() => {
        useFeedbackCoordinatorStore.getState().setOverlayVisible(true)
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)

      // Act - Change unrelated state (activeAudio)
      act(() => {
        useFeedbackCoordinatorStore.getState().setActiveAudio({
          id: 'feedback-1',
          url: 'file://audio.wav',
        })
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)
    })

    it('should allow selective subscription to activeAudio only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.activeAudio)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBeNull()

      // Act - Change activeAudio
      act(() => {
        useFeedbackCoordinatorStore.getState().setActiveAudio({
          id: 'feedback-1',
          url: 'file://audio.wav',
        })
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toEqual({ id: 'feedback-1', url: 'file://audio.wav' })

      // Act - Change unrelated state (overlayVisible)
      act(() => {
        useFeedbackCoordinatorStore.getState().setOverlayVisible(true)
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
    })

    it('should allow selective subscription to isFallbackTimerActive only', () => {
      // Arrange
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.isFallbackTimerActive)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBe(false)

      // Act - Change isFallbackTimerActive
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
      })

      // Assert - Component re-renders
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)

      // Act - Change unrelated state (highlightedFeedbackId)
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
      })

      // Assert - Component does NOT re-render (still 2)
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe(true)
    })

    it('should batch multiple state updates in single transaction', () => {
      // Arrange
      // Subscribe to highlightedFeedbackId only (single primitive, not object)
      const renderCountRef = { current: 0 }
      const { result } = renderHook(() => {
        renderCountRef.current++
        return useFeedbackCoordinatorStore((state) => state.highlightedFeedbackId)
      })

      expect(renderCountRef.current).toBe(1)
      expect(result.current).toBeNull()

      // Act - Batch update multiple properties (including highlightedFeedbackId)
      act(() => {
        useFeedbackCoordinatorStore.getState().batchUpdate({
          highlightedFeedbackId: 'feedback-1',
          isCoachSpeaking: true,
          overlayVisible: true,
        })
      })

      // Assert - Only ONE re-render for the watched property
      expect(renderCountRef.current).toBe(2)
      expect(result.current).toBe('feedback-1')

      // Verify other properties were also updated
      const state = useFeedbackCoordinatorStore.getState()
      expect(state.isCoachSpeaking).toBe(true)
      expect(state.overlayVisible).toBe(true)
    })
  })

  describe('TDD: State updates work correctly', () => {
    it('should initialize with default state', () => {
      const state = useFeedbackCoordinatorStore.getState()

      expect(state.highlightedFeedbackId).toBeNull()
      expect(state.isCoachSpeaking).toBe(false)
      expect(state.bubbleState).toEqual({
        currentBubbleIndex: null,
        bubbleVisible: false,
      })
      expect(state.isFallbackTimerActive).toBe(false)
      expect(state.overlayVisible).toBe(false)
      expect(state.activeAudio).toBeNull()
    })

    it('should update highlightedFeedbackId', () => {
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
      })

      expect(useFeedbackCoordinatorStore.getState().highlightedFeedbackId).toBe('feedback-1')
    })

    it('should update isCoachSpeaking', () => {
      act(() => {
        useFeedbackCoordinatorStore.getState().setIsCoachSpeaking(true)
      })

      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(true)
    })

    it('should update bubble state', () => {
      act(() => {
        useFeedbackCoordinatorStore.getState().setBubbleState({
          currentBubbleIndex: 2,
          bubbleVisible: true,
        })
      })

      expect(useFeedbackCoordinatorStore.getState().bubbleState).toEqual({
        currentBubbleIndex: 2,
        bubbleVisible: true,
      })
    })

    it('should update isFallbackTimerActive', () => {
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
      })

      expect(useFeedbackCoordinatorStore.getState().isFallbackTimerActive).toBe(true)

      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(false)
      })

      expect(useFeedbackCoordinatorStore.getState().isFallbackTimerActive).toBe(false)
    })

    it('should update overlay state', () => {
      act(() => {
        useFeedbackCoordinatorStore.getState().setOverlayVisible(true)
        useFeedbackCoordinatorStore.getState().setActiveAudio({
          id: 'feedback-1',
          url: 'file://audio.wav',
        })
      })

      expect(useFeedbackCoordinatorStore.getState().overlayVisible).toBe(true)
      expect(useFeedbackCoordinatorStore.getState().activeAudio).toEqual({
        id: 'feedback-1',
        url: 'file://audio.wav',
      })
    })

    it('should reset to initial state', () => {
      // Arrange - Set some state
      act(() => {
        useFeedbackCoordinatorStore.getState().setHighlightedFeedbackId('feedback-1')
        useFeedbackCoordinatorStore.getState().setIsCoachSpeaking(true)
        useFeedbackCoordinatorStore.getState().setOverlayVisible(true)
      })

      // Act - Reset
      act(() => {
        useFeedbackCoordinatorStore.getState().reset()
      })

      // Assert - Back to initial state
      const state = useFeedbackCoordinatorStore.getState()
      expect(state.highlightedFeedbackId).toBeNull()
      expect(state.isCoachSpeaking).toBe(false)
      expect(state.overlayVisible).toBe(false)
      expect(state.isFallbackTimerActive).toBe(false)
      expect(state.activeAudio).toBeNull()
    })
  })
})
