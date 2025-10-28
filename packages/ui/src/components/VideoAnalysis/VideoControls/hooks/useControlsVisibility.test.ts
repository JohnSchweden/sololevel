import { act, renderHook } from '@testing-library/react'
import { useControlsVisibility } from './useControlsVisibility'

/**
 * Test suite for useControlsVisibility hook
 *
 * Tests controls visibility management including:
 * - Auto-hide timer functionality
 * - Tap-to-toggle behavior
 * - State synchronization with external props
 * - Timer cleanup and edge cases
 *
 * ## Test Coverage Focus:
 * - Auto-hide timer starts/stops based on playback state
 * - Scrubbing prevents auto-hide
 * - External showControls prop synchronization
 * - Tap-to-toggle shows/hides controls
 * - Timer cleanup on unmount
 */
describe('useControlsVisibility', () => {
  // Arrange: Common test configuration
  const defaultConfig = {
    showControls: false,
    isPlaying: false,
    isScrubbing: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Auto-hide Timer Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('should start auto-hide timer when video starts playing', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: true, // Start with controls visible
            isPlaying: true,
            autoHideDelayMs: 1000, // Use 1000ms for faster test
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Assert: Controls should be visible initially
      expect(result.current.controlsVisible).toBe(true)

      // Clear initial callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 1 second (auto-hide delay)
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Assert: Controls should be hidden
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false)
      expect(result.current.controlsVisible).toBe(false)
    })

    it('should stop auto-hide timer when video is paused', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true, // Start playing
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 500ms (less than auto-hide delay)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Act: Pause video (should stop timer)
      rerender({
        config: {
          ...defaultConfig,
          showControls: false,
          isPlaying: false, // Paused
          onControlsVisibilityChange: mockOnControlsVisibilityChange,
        },
      })

      // Clear callback calls from rerender
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by another 2 seconds (timer should be stopped, so controls stay visible)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // Assert: Controls should still be visible (timer stopped)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should prevent auto-hide when user is scrubbing', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Start scrubbing (should prevent auto-hide)
      rerender({
        config: {
          ...defaultConfig,
          showControls: false,
          isPlaying: true,
          isScrubbing: true, // Scrubbing
          onControlsVisibilityChange: mockOnControlsVisibilityChange,
        },
      })

      // Act: Advance timer by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Assert: Controls should still be visible (scrubbing prevents auto-hide)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should respect showControls prop over timer', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            autoHideDelayMs: 1000, // Use 1000ms for faster test
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 1 second (should hide controls)
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Assert: Controls should be hidden
      expect(result.current.controlsVisible).toBe(false)

      // Act: Force show controls via prop
      rerender({
        config: {
          ...defaultConfig,
          showControls: true, // Force visible
          isPlaying: true,
          onControlsVisibilityChange: mockOnControlsVisibilityChange,
        },
      })

      // Assert: Controls should be visible (prop overrides timer)
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should reset timer on user interaction', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            autoHideDelayMs: 1000, // Use 1000ms for faster test
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 500ms (less than auto-hide delay)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Act: User interaction (reset timer)
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 500ms more (should not hide yet - timer was reset)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Assert: Controls should still be visible (timer was reset)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
      expect(result.current.controlsVisible).toBe(true)

      // Act: Advance timer by another 500ms (now 1000ms total since reset)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Assert: Controls should now be hidden (timer expired)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false)
      expect(result.current.controlsVisible).toBe(false)
    })

    it('should clean up timer on unmount', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result, unmount } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 500ms (less than auto-hide delay)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Act: Unmount component (should clean up timer)
      unmount()

      // Act: Advance timer by another 2 seconds (timer should be cleaned up)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // Assert: Callback should not be called after unmount (timer was cleaned up)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
    })

    it('should use custom autoHideDelayMs when provided', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const customDelay = 5000 // 5 seconds
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            autoHideDelayMs: customDelay,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Show controls
      act(() => {
        result.current.showControlsAndResetTimer()
      })

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 2 seconds (should not hide yet)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // Assert: Controls should still be visible
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
      expect(result.current.controlsVisible).toBe(true)

      // Act: Advance timer by another 3 seconds (total 5 seconds)
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Assert: Controls should now be hidden
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false)
      expect(result.current.controlsVisible).toBe(false)
    })
  })

  describe('Tap-to-Toggle Functionality', () => {
    it('should show controls when tapping while controls are hidden', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Assert: Controls should be hidden initially
      expect(result.current.controlsVisible).toBe(false)

      // Act: Tap to show controls
      act(() => {
        result.current.handlePress()
      })

      // Assert: Controls should now be visible
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true)
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should hide controls when tapping while controls are visible', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: true, // Start with controls visible
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Assert: Controls should be visible initially
      expect(result.current.controlsVisible).toBe(true)

      // Clear initial callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Tap to hide controls
      act(() => {
        result.current.handlePress()
      })

      // Assert: Controls should now be hidden
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false)
      expect(result.current.controlsVisible).toBe(false)
    })

    it('should clear auto-hide timer when hiding controls via tap', () => {
      jest.useFakeTimers()

      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: true,
            isPlaying: true,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Clear initial callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Tap to hide controls (should clear timer)
      act(() => {
        result.current.handlePress()
      })

      // Assert: Controls should be hidden
      expect(result.current.controlsVisible).toBe(false)

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Assert: No additional callback calls (timer was cleared)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()

      jest.useRealTimers()
    })

    it('should start auto-hide timer when showing controls via tap', () => {
      jest.useFakeTimers()

      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            isPlaying: true,
            autoHideDelayMs: 1000, // Use 1000ms for faster test
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Act: Tap to show controls
      act(() => {
        result.current.handlePress()
      })

      // Assert: Controls should be visible
      expect(result.current.controlsVisible).toBe(true)

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Advance timer by 1 second (should auto-hide)
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Assert: Controls should be hidden (timer was started)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false)
      expect(result.current.controlsVisible).toBe(false)

      jest.useRealTimers()
    })
  })

  describe('Visibility State Synchronization', () => {
    it('should sync with external showControls prop on mount', () => {
      // Arrange & Act
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: true,
          },
        },
      })

      // Assert: Controls should match showControls prop
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should sync with external showControls prop changes', () => {
      // Arrange
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
          },
        },
      })

      // Assert: Controls should be hidden initially (default state)
      expect(result.current.controlsVisible).toBe(false)

      // Act: Change showControls prop to true (forces visible)
      rerender({
        config: {
          ...defaultConfig,
          showControls: true,
        },
      })

      // Assert: Controls should now be visible (forced by showControls=true)
      expect(result.current.controlsVisible).toBe(true)

      // Act: Change showControls back to false
      rerender({
        config: {
          ...defaultConfig,
          showControls: false,
        },
      })

      // Assert: Controls remain visible (showControls=false doesn't override user state)
      // Only user tap (handlePress) or timer can hide them now
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should call onControlsVisibilityChange when showControls prop changes', () => {
      // Arrange
      const mockOnControlsVisibilityChange = jest.fn()
      const { rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            onControlsVisibilityChange: mockOnControlsVisibilityChange,
          },
        },
      })

      // Clear initial callback call
      mockOnControlsVisibilityChange.mockClear()

      // Act: Change showControls to true
      rerender({
        config: {
          ...defaultConfig,
          showControls: true,
          onControlsVisibilityChange: mockOnControlsVisibilityChange,
        },
      })

      // Assert: Callback should be called with true
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true)

      // Clear callback calls
      mockOnControlsVisibilityChange.mockClear()

      // Act: Change showControls to false (this doesn't force controls hidden)
      rerender({
        config: {
          ...defaultConfig,
          showControls: false,
          onControlsVisibilityChange: mockOnControlsVisibilityChange,
        },
      })

      // Assert: Callback is NOT called because showControls=false doesn't force hide
      // (controls remain visible until timer or user tap hides them)
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
    })

    it('should handle missing onControlsVisibilityChange callback gracefully', () => {
      // Arrange & Act
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: {
            ...defaultConfig,
            showControls: false,
            onControlsVisibilityChange: undefined,
          },
        },
      })

      // Assert: Should not throw when calling methods without callback
      expect(() => {
        act(() => {
          result.current.handlePress()
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          result.current.showControlsAndResetTimer()
        })
      }).not.toThrow()
    })
  })

  describe('Hook Return Interface', () => {
    it('should return all required properties', () => {
      // Arrange & Act
      const { result } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: defaultConfig,
        },
      })

      // Assert
      expect(result.current).toHaveProperty('controlsVisible')
      expect(result.current).toHaveProperty('handlePress')
      expect(result.current).toHaveProperty('showControlsAndResetTimer')
      expect(result.current).toHaveProperty('resetAutoHideTimer')
    })

    it('should return functions with stable references', () => {
      // Arrange
      const { result, rerender } = renderHook(({ config }) => useControlsVisibility(config), {
        initialProps: {
          config: defaultConfig,
        },
      })

      // Act
      const firstHandlePress = result.current.handlePress
      const firstShowControlsAndResetTimer = result.current.showControlsAndResetTimer
      const firstResetAutoHideTimer = result.current.resetAutoHideTimer

      rerender({
        config: defaultConfig,
      })

      // Assert: Functions should maintain stable references
      expect(result.current.handlePress).toBe(firstHandlePress)
      expect(result.current.showControlsAndResetTimer).toBe(firstShowControlsAndResetTimer)
      expect(result.current.resetAutoHideTimer).toBe(firstResetAutoHideTimer)
    })
  })
})
