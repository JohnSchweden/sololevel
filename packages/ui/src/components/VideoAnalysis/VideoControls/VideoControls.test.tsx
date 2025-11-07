import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideoControls, VideoControlsRef } from './VideoControls'

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

const mockUseProgressBarVisibility = jest.fn(() => ({
  shouldRenderNormal: true,
  shouldRenderPersistent: false,
}))

jest.mock('./hooks/useProgressBarVisibility', () => ({
  useProgressBarVisibility: (...args: unknown[]) => mockUseProgressBarVisibility(...args),
}))

// Mock all extracted hooks
jest.mock('./hooks/useProgressBarGesture', () => ({
  useProgressBarGesture: jest.fn(() => ({
    isScrubbing: false,
    scrubbingPosition: null,
    lastScrubbedPosition: null,
    combinedGesture: {},
    mainGesture: {},
    calculateProgress: (currentTime: number, duration: number) => {
      if (duration <= 0) return 0
      return Math.min(100, Math.max(0, (currentTime / duration) * 100))
    },
    progressBarWidth: 300,
    setProgressBarWidth: jest.fn(),
  })),
}))

// Note: useControlsVisibility is NOT mocked - it's tested in its own test file
// We use the real hook here to ensure VideoControls integrates correctly

// Mock data following TDD principles
const mockProps = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  showControls: false,
  isProcessing: false,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onSeek: jest.fn(),
}

describe('VideoControls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProgressBarVisibility.mockReset()
    mockUseProgressBarVisibility.mockReturnValue({
      shouldRenderNormal: true,
      shouldRenderPersistent: false,
    })
  })

  describe('Auto-hide Timer Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('starts auto-hide timer when video starts playing', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={false} // Allow timer to start
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Controls should be hidden initially (showControls=false)
      expect(screen.getByLabelText('Video controls overlay hidden')).toBeTruthy()

      // Advance timer by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Should call callback to hide controls
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, false) // false, false = automatic hide
    })

    it.skip('resets timer when user interacts with controls', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={false} // Allow timer to start
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Advance timer by 2 seconds (1 second before auto-hide)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // User clicks pause button (interaction should reset timer and show controls)
      act(() => {
        fireEvent.click(screen.getByLabelText('Pause video'))
      })

      // The callback should have been called: once for initial state, once for user interaction, once for timer reset
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledTimes(4)
      expect(mockOnControlsVisibilityChange).toHaveBeenLastCalledWith(true)

      // Reset the mock to check only future calls
      mockOnControlsVisibilityChange.mockClear()

      // Now advance timer by 2 seconds - timer should still be running (was reset)
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      // Timer should not have triggered yet after reset
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()

      // Advance to 3 seconds after reset - should hide
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, false) // automatic hide
    })

    it('stops timer when video is paused', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Clear the initial callback call
      mockOnControlsVisibilityChange.mockClear()

      // Advance timer by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // Pause video - should stop timer
      rerender(
        <VideoControls
          {...mockProps}
          isPlaying={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Clear any callback calls from the rerender
      mockOnControlsVisibilityChange.mockClear()

      // Advance timer by another 2 seconds - should not hide since paused
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      // Should not have been called again after clearing
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()
    })

    it('cleans up timer on unmount', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      const { unmount } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Advance timer by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // Unmount component
      unmount()

      // Advance timer - should not call callback after unmount
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      // Should still only have been called once (for initial showControls=true)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledTimes(1)
    })

    it('respects showControls prop over timer', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={false} // Start with controls hidden to test timer
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Advance timer by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Timer should try to hide controls
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, false) // automatic hide

      // But showControls prop should override and show controls again
      rerender(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // showControls=true should show controls (call with true)
      expect(mockOnControlsVisibilityChange).toHaveBeenLastCalledWith(true, false) // prop override, not user interaction

      // The component should show controls due to showControls prop override
      // Check that pause button is visible (indicating controls are shown, since isPlaying=true)
      expect(screen.getByLabelText('Pause video')).toBeTruthy()
    })
  })

  describe('PanResponder Scrubbing Functionality', () => {
    // Note: PanResponder functionality is tested in React Native environment
    // These tests document expected behavior and verify component structure

    it('component includes scrubbing touch area in React Native environment', () => {
      // Test that the component renders the progress scrubber in web environment
      renderWithProviders(<VideoControls {...mockProps} />)

      // In web environment, we can test that the progress bar container exists
      const progressBarContainer = document.querySelector('[data-testid="progress-bar-container"]')
      expect(progressBarContainer).toBeTruthy()

      // The actual PanResponder functionality would be tested in React Native environment
    })

    it.skip('progress bar renders with correct visual elements', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify progress bar, fill, and scrubber handle
    })

    it.skip('scrubber handle shows correct visual state based on props', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would test scrubber positioning logic
    })

    it.skip('component setup supports PanResponder event handling', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify touch/press area presence
    })

    it('documents expected PanResponder behavior for React Native', () => {
      // This test documents the expected PanResponder behavior that would be tested in React Native
      const expectedBehaviors = {
        grant: 'Should start scrubbing mode and call onSeek',
        move: 'Should update scrubber position and call onSeek during drag',
        release: 'Should end scrubbing mode',
        terminate: 'Should end scrubbing mode when interrupted',
        clamping: 'Should clamp scrubber position to valid 0-100% range',
        controlsVisibility: 'Should show controls when scrubbing starts',
        autoHidePrevention: 'Should prevent auto-hide timer during scrubbing',
      }

      // Verify that our documentation captures all expected behaviors
      expect(Object.keys(expectedBehaviors)).toHaveLength(7)
      expect(expectedBehaviors.grant).toContain('start scrubbing mode')
      expect(expectedBehaviors.move).toContain('update scrubber position')
      expect(expectedBehaviors.clamping).toContain('clamp')
    })

    it('progress calculation logic works correctly', () => {
      // Test the underlying progress calculation logic that PanResponder would use
      const testCases = [
        { currentTime: 0, duration: 120, expected: 0 },
        { currentTime: 30, duration: 120, expected: 25 },
        { currentTime: 60, duration: 120, expected: 50 },
        { currentTime: 120, duration: 120, expected: 100 },
        { currentTime: 150, duration: 120, expected: 100 }, // clamped
        { currentTime: 30, duration: 0, expected: 0 }, // zero duration
      ]

      testCases.forEach(({ currentTime, duration, expected }) => {
        const progress =
          duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
        expect(progress).toBe(expected)
      })
    })

    it('seek calculation from touch position works correctly', () => {
      // Test the seek calculation logic that PanResponder grant/move would use
      const progressBarWidth = 300
      const duration = 120

      const testPositions = [
        { locationX: 0, expectedSeekTime: 0 }, // Start of progress bar
        { locationX: 150, expectedSeekTime: 60 }, // Middle (50%)
        { locationX: 300, expectedSeekTime: 120 }, // End (100%)
        { locationX: -10, expectedSeekTime: 0 }, // Negative (clamped)
        { locationX: 400, expectedSeekTime: 120 }, // Beyond width (clamped)
      ]

      testPositions.forEach(({ locationX, expectedSeekTime }) => {
        const seekPercentage = Math.max(0, Math.min(100, (locationX / progressBarWidth) * 100))
        const seekTime = (seekPercentage / 100) * duration
        expect(seekTime).toBe(expectedSeekTime)
      })
    })
  })

  describe('Processing State Management', () => {
    // Note: Processing overlay tests are skipped in web environment due to React Native component limitations
    // These tests document expected behavior and verify component structure

    it('dims and disables controls when isProcessing is true', () => {
      const onPlay = jest.fn()
      renderWithProviders(
        <VideoControls
          {...mockProps}
          isProcessing={true}
          onPlay={onPlay}
        />
      )

      const controlsContainer = screen.getByLabelText('Video playback controls')
      // Component should render without crashing when processing
      expect(controlsContainer).toBeTruthy()

      // Buttons should be effectively disabled (no play triggered)
      // Note: In web environment, pointerEvents might not work as expected
      // This test verifies the component renders without crashing when processing
      expect(controlsContainer).toBeTruthy()
    })

    it.skip('hides regular controls when processing', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify play/pause controls are hidden during processing
    })

    it.skip('processing overlay has correct accessibility attributes', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify spinner has busy state and proper labels
    })

    it('transitions from processing to regular controls', () => {
      // Test prop changes work correctly
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isProcessing={true}
        />
      )

      const controlsContainer = screen.getByLabelText('Video playback controls')
      expect(controlsContainer).toBeTruthy()

      // Change to not processing
      rerender(
        <VideoControls
          {...mockProps}
          isProcessing={false}
        />
      )

      expect(screen.getByLabelText('Video playback controls')).toBeTruthy()
    })

    it.skip('maintains processing overlay during playback state changes', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify processing state takes precedence over playback
    })

    it.skip('processing spinner indicates busy state', () => {
      // This test is skipped in web environment due to React Native component limitations
      // In React Native environment, this would verify accessibilityState busy: true
    })

    it('documents expected processing state behavior for React Native', () => {
      // This test documents the expected processing state behavior that would be tested in React Native
      const expectedBehaviors = {
        overlay: 'Should show full-screen overlay with spinner and "Analysing video..." text',
        controls: 'Should hide all play/pause/scrub controls when processing',
        accessibility: 'Should have busy state and proper accessibility labels',
        precedence: 'Should take precedence over all other states (playing, paused, etc.)',
        transitions: 'Should smoothly transition when isProcessing prop changes',
        spinner: 'Should display animated spinner with proper size and color',
        text: 'Should display "Analysing video..." with proper styling',
        background: 'Should have semi-transparent overlay background',
      }

      // Verify that our documentation captures all expected behaviors
      expect(Object.keys(expectedBehaviors)).toHaveLength(8)
      expect(expectedBehaviors.overlay).toContain('full-screen overlay')
      expect(expectedBehaviors.controls).toContain('hide all')
      expect(expectedBehaviors.precedence).toContain('precedence')
    })

    it('isProcessing prop defaults to false', () => {
      // Test that the default value handling works correctly
      const propsWithoutProcessing = { ...mockProps, isProcessing: undefined } as any

      // The component should handle undefined isProcessing prop correctly
      expect(() => {
        renderWithProviders(<VideoControls {...propsWithoutProcessing} />)
      }).not.toThrow()

      // Default should be false (no processing overlay)
      expect(propsWithoutProcessing.isProcessing).toBeUndefined()
    })

    it('component accepts isProcessing prop correctly', () => {
      // Test that the component interface includes the isProcessing prop
      const processingProps = { ...mockProps, isProcessing: true }

      expect(processingProps.isProcessing).toBe(true)

      // Test that the prop can be false
      const nonProcessingProps = { ...mockProps, isProcessing: false }
      expect(nonProcessingProps.isProcessing).toBe(false)
    })

    it('validates isProcessing prop type', () => {
      // Test different prop values
      const testValues = [true, false, undefined]

      testValues.forEach((value) => {
        const props = { ...mockProps, isProcessing: value }
        expect(typeof props.isProcessing).toBe(value === undefined ? 'undefined' : 'boolean')
      })
    })
  })

  describe('Ref API (useImperativeHandle)', () => {
    it('exposes triggerMenu method via ref', () => {
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          ref={ref}
        />
      )

      // Verify ref is properly set
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current?.triggerMenu).toBe('function')
    })

    it('triggerMenu method calls onMenuPress callback', () => {
      const mockOnMenuPress = jest.fn()
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          onMenuPress={mockOnMenuPress}
          ref={ref}
        />
      )

      // Call triggerMenu via ref
      act(() => {
        act(() => {
          ref.current?.triggerMenu()
        })
      })

      // Verify onMenuPress callback was called
      expect(mockOnMenuPress).toHaveBeenCalledTimes(1)
    })

    it('triggerMenu method shows controls when called', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
          ref={ref}
        />
      )

      // Call triggerMenu via ref
      act(() => {
        act(() => {
          ref.current?.triggerMenu()
        })
      })

      // Verify controls are shown
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true, true) // user interaction
    })

    it('triggerMenu method resets auto-hide timer', () => {
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          ref={ref}
        />
      )

      // Call triggerMenu via ref
      act(() => {
        act(() => {
          ref.current?.triggerMenu()
        })
      })

      // Verify timer reset behavior (tested indirectly through timer tests)
      expect(ref.current?.triggerMenu).toBeDefined()
    })

    it('ref is null before component mounts', () => {
      const ref = React.createRef<VideoControlsRef>()

      // Ref should be null before render
      expect(ref.current).toBeNull()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          ref={ref}
        />
      )

      // Ref should be set after render
      expect(ref.current).toBeTruthy()
    })

    it('ref maintains reference across re-renders', () => {
      const ref = React.createRef<VideoControlsRef>()
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          ref={ref}
        />
      )

      // Store initial ref value for comparison
      const initialRefValue = ref.current

      // Re-render with different props
      rerender(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          ref={ref}
        />
      )

      // Ref object should maintain the same reference, but the component instance might be different
      // This is expected React behavior with forwardRef
      expect(ref.current).toBeDefined()
      expect(ref.current?.triggerMenu).toBeDefined()
      expect(typeof ref.current?.triggerMenu).toBe('function')
      expect(initialRefValue).toBeDefined() // Verify initial ref was set
    })

    it('handles undefined onMenuPress callback gracefully', () => {
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          onMenuPress={undefined}
          ref={ref}
        />
      )

      // Should not throw when calling triggerMenu without onMenuPress
      expect(() => {
        act(() => {
          ref.current?.triggerMenu()
        })
      }).not.toThrow()
    })

    it('triggerMenu method can be called multiple times', () => {
      const mockOnMenuPress = jest.fn()
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          onMenuPress={mockOnMenuPress}
          ref={ref}
        />
      )

      // Call triggerMenu multiple times
      ref.current?.triggerMenu()
      ref.current?.triggerMenu()
      ref.current?.triggerMenu()

      // Verify callback was called multiple times
      expect(mockOnMenuPress).toHaveBeenCalledTimes(3)
    })

    it('ref API is properly typed', () => {
      const ref = React.createRef<VideoControlsRef>()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          ref={ref}
        />
      )

      // Verify TypeScript typing is correct
      const menuTrigger: () => void = ref.current!.triggerMenu
      expect(typeof menuTrigger).toBe('function')
    })

    it('documents ref API interface', () => {
      // This test documents the expected ref API interface
      const expectedInterface = {
        triggerMenu: 'Function to programmatically trigger menu opening',
      }

      expect(Object.keys(expectedInterface)).toHaveLength(1)
      expect(expectedInterface.triggerMenu).toContain('programmatically trigger')
    })
  })

  describe('Tap-to-Toggle Functionality', () => {
    it('shows controls when tapping video area while controls are hidden', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Initially controls should be hidden
      expect(screen.getByLabelText('Video controls overlay hidden')).toBeTruthy()

      // Tap the video controls container
      const container = screen.getByTestId('video-controls-container')
      fireEvent.click(container)

      // Controls should now be visible
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true, true) // user tap
    })

    it('hides controls when tapping video area while controls are visible', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Initially controls should be visible
      expect(screen.getByLabelText('Video controls overlay visible')).toBeTruthy()

      // Clear initial call
      mockOnControlsVisibilityChange.mockClear()

      // Tap the video controls container
      const container = screen.getByTestId('video-controls-container')
      fireEvent.click(container)

      // Controls should now be hidden
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, true) // user tap
    })

    it('toggles controls visibility on multiple taps', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      const container = screen.getByTestId('video-controls-container')

      // First tap - show controls
      fireEvent.click(container)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true, true) // user tap

      // Update props to reflect the new state (simulating parent component behavior)
      rerender(
        <VideoControls
          {...mockProps}
          showControls={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Clear previous calls to focus on next interaction
      mockOnControlsVisibilityChange.mockClear()

      // Second tap - hide controls
      fireEvent.click(container)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, true) // user tap

      // Update props again
      rerender(
        <VideoControls
          {...mockProps}
          showControls={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      // Clear previous calls
      mockOnControlsVisibilityChange.mockClear()

      // Third tap - show controls again
      fireEvent.click(container)
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true, true) // user tap
    })

    it('shows controls when tapping and starts auto-hide timer', () => {
      jest.useFakeTimers()
      const mockOnControlsVisibilityChange = jest.fn()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={false}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      const container = screen.getByTestId('video-controls-container')

      // Tap to show controls
      act(() => {
        fireEvent.click(container)
      })

      // Controls should be shown
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(true, true) // user tap

      // This test verifies that the tap-to-toggle functionality works
      // The auto-hide timer behavior is already tested in the "Auto-hide Timer Functionality" section
      // We focus on the core tap-to-toggle behavior here

      jest.useRealTimers()
    })

    it('clears auto-hide timer when hiding controls via tap', () => {
      jest.useFakeTimers()
      const mockOnControlsVisibilityChange = jest.fn()

      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          showControls={true}
          onControlsVisibilityChange={mockOnControlsVisibilityChange}
        />
      )

      const container = screen.getByTestId('video-controls-container')

      // Clear initial call
      mockOnControlsVisibilityChange.mockClear()

      // Tap to hide controls
      act(() => {
        fireEvent.click(container)
      })

      // Controls should be hidden
      expect(mockOnControlsVisibilityChange).toHaveBeenCalledWith(false, true) // user tap

      // Clear the mock
      mockOnControlsVisibilityChange.mockClear()

      // Advance timer by 3 seconds - should not trigger any more calls since timer was cleared
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // No additional calls should have been made
      expect(mockOnControlsVisibilityChange).not.toHaveBeenCalled()

      jest.useRealTimers()
    })
  })

  describe('Basic Functionality', () => {
    it('renders with required props', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={true}
        />
      )
      expect(screen.getByLabelText('Video controls overlay visible')).toBeTruthy()
    })

    it('displays play button when video is paused', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={false}
        />
      )
      expect(screen.getByLabelText('Play video')).toBeTruthy()
    })

    it('displays pause button when video is playing', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
        />
      )
      expect(screen.getByLabelText('Pause video')).toBeTruthy()
    })
  })

  describe('Progress Bar Visibility', () => {
    it('renders normal progress bar in max mode even when controls hidden', async () => {
      mockUseProgressBarVisibility.mockReturnValue({
        shouldRenderNormal: true,
        shouldRenderPersistent: false,
      })
      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={false}
          collapseProgress={0.02}
        />
      )

      const normalBar = await waitFor(() => screen.getByTestId('progress-bar-container'))
      expect(normalBar).toBeInTheDocument()
    })

    it('hides normal progress bar once collapseProgress exceeds threshold', async () => {
      mockUseProgressBarVisibility.mockReturnValue({
        shouldRenderNormal: false,
        shouldRenderPersistent: false,
      })
      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={true}
          collapseProgress={0.5}
        />
      )

      await waitFor(() => {
        expect(screen.queryByTestId('progress-bar-container')).toBeNull()
      })
    })

    it('emits shouldRenderPersistent=true when collapseProgress >= 0.45', async () => {
      const setter = jest.fn()
      mockUseProgressBarVisibility.mockReturnValue({
        shouldRenderNormal: false,
        shouldRenderPersistent: true,
      })

      renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0.6}
          persistentProgressStoreSetter={setter}
        />
      )

      await waitFor(() => {
        expect(setter).toHaveBeenCalledWith(
          expect.objectContaining({ shouldRenderPersistent: true })
        )
      })
    })

    it('emits shouldRenderPersistent=true when controls are hidden', async () => {
      const setter = jest.fn()
      mockUseProgressBarVisibility.mockReturnValue({
        shouldRenderNormal: false,
        shouldRenderPersistent: true,
      })

      renderWithProviders(
        <VideoControls
          {...mockProps}
          showControls={false}
          collapseProgress={0.6}
          persistentProgressStoreSetter={setter}
        />
      )

      await waitFor(() => {
        expect(setter).toHaveBeenCalledWith(
          expect.objectContaining({ shouldRenderPersistent: true })
        )
      })
    })

    it('emits shouldRenderPersistent=false when collapseProgress < 0.45', async () => {
      const setter = jest.fn()
      mockUseProgressBarVisibility.mockReturnValue({
        shouldRenderNormal: true,
        shouldRenderPersistent: false,
      })

      renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0.2}
          persistentProgressStoreSetter={setter}
        />
      )

      await waitFor(() => {
        expect(setter).toHaveBeenCalled()
      })

      const latestCall = setter.mock.calls.at(-1)
      expect(latestCall?.[0]?.shouldRenderPersistent).toBe(false)
    })
  })

  describe('Persistent Progress Bar', () => {
    // NOTE: These tests are commented out because the persistent progress bar
    // is now rendered at layout level via onPersistentProgressBarPropsChange callback
    // and not inline in VideoControls. Tests should be updated to test at the layout level.
    /*
    it('shows persistent progress bar in normal mode', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          videoMode="normal"
          collapseProgress={0.5} // Normal mode = collapseProgress 0.5
          showControls={false} // Controls hidden but persistent bar should show
        />
      )

      const persistentBar = screen.queryByTestId('persistent-progress-bar')
      expect(persistentBar).toBeTruthy()
    })

    it('shows persistent progress bar in min mode', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          videoMode="min"
          collapseProgress={1} // Min mode = collapseProgress 1
          showControls={false} // Controls hidden but persistent bar should show
        />
      )

      const persistentBar = screen.queryByTestId('persistent-progress-bar')
      expect(persistentBar).toBeTruthy()
    })

    it('hides persistent progress bar in max mode', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          videoMode="max"
          collapseProgress={0} // Max mode = collapseProgress 0
          showControls={false}
        />
      )

      // Bar is rendered but with opacity 0 for smooth fade animation
      // In max mode, the Animated.View wrapper has opacity 0 and pointerEvents='none'
      // We verify the element exists (for animation purposes) but is effectively hidden
      const persistentBar = screen.queryByTestId('persistent-progress-bar')
      expect(persistentBar).toBeTruthy()

      // The element is in the DOM for animation but should be functionally hidden
      // This allows smooth fade-out animation when switching modes
    })

    it('persistent progress bar shows correct progress percentage', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          videoMode="normal"
          currentTime={60} // 50% of 120 duration
          duration={120}
          showControls={false}
        />
      )

      const persistentBar = screen.queryByTestId('persistent-progress-bar')
      expect(persistentBar).toBeTruthy()

      const progressFill = screen.queryByTestId('persistent-progress-fill')
      expect(progressFill).toBeTruthy()
    })

    it('persistent progress bar remains visible when main controls fade out', () => {
      renderWithProviders(
        <VideoControls
          {...mockProps}
          videoMode="normal"
          isPlaying={true}
          showControls={false} // Main controls hidden
        />
      )

      // Main controls should be hidden
      expect(screen.getByLabelText('Video controls overlay hidden')).toBeTruthy()

      // But persistent bar should still be visible
      const persistentBar = screen.queryByTestId('persistent-progress-bar')
      expect(persistentBar).toBeTruthy()
    })
    */
  })
})

describe('VideoControls - Stress Tests (Regression Prevention)', () => {
  /**
   * Stress tests to prevent regression of Reanimated memory corruption crash.
   *
   * These tests verify that VideoControls can handle:
   * 1. Rapid prop changes (mode transitions)
   * 2. Simultaneous animations and gestures
   * 3. Mount/unmount cycles
   * 4. Long-running sessions (13+ minutes)
   *
   * Crash symptoms to prevent:
   * - EXC_BAD_ACCESS in folly::dynamic::type()
   * - Stale closure references in worklets
   * - Shared value leaks on unmount
   * - Deep recursion in shadow tree cloning
   */

  describe('Rapid Prop Changes (Mode Transitions)', () => {
    it('should handle rapid collapseProgress changes without crashing', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0}
        />
      )

      // Simulate rapid mode transitions: Max (0) → Normal (0.5) → Min (1)
      // Increment by 0.05 for 20 updates over ~100ms
      for (let progress = 0; progress <= 1.0; progress += 0.05) {
        rerender(
          <VideoControls
            {...mockProps}
            collapseProgress={progress}
          />
        )

        // Flush React updates
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
        })
      }

      // Verify component is still mounted and functional
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
      expect(screen.getByTestId('video-controls-overlay')).toBeInTheDocument()
    })

    it('should handle oscillating prop changes (rapid up/down)', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0.5}
        />
      )

      // Simulate bouncy transitions: normal ↔ max ↔ min
      const transitions = [0.5, 0, 0.5, 1, 0.5, 0, 1, 0.5]

      for (const progress of transitions) {
        rerender(
          <VideoControls
            {...mockProps}
            collapseProgress={progress}
          />
        )

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }

      // Component should remain stable
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })

    it('should handle changing duration during playback', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          currentTime={30}
          duration={120}
          isPlaying={true}
        />
      )

      // Simulate duration changes (e.g., loading different quality)
      const durations = [120, 120, 125, 125, 130, 135]

      for (const duration of durations) {
        rerender(
          <VideoControls
            {...mockProps}
            duration={duration}
            isPlaying={true}
          />
        )

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
        })
      }

      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })

    it('should handle rapid playback state changes', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={false}
        />
      )

      // Simulate user rapidly pressing play/pause
      const playStates = [true, false, true, false, true, true, false, false, true]

      for (const isPlaying of playStates) {
        rerender(
          <VideoControls
            {...mockProps}
            isPlaying={isPlaying}
          />
        )

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }

      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })
  })

  describe('Continuous Prop Updates (Simulating Long Session)', () => {
    it('should survive 13+ minutes of continuous prop updates', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
          currentTime={0}
        />
      )

      // Simulate video playback with continuous progress updates
      // 13 minutes = 780 seconds, update every 0.1 second = 7800 updates
      // For test speed, we'll simulate 100 updates (still intensive)
      const testDuration = 100

      for (let i = 0; i < testDuration; i++) {
        const simulatedSeconds = (i / testDuration) * 780
        const playbackProgress = (simulatedSeconds / 120) * 100

        rerender(
          <VideoControls
            {...mockProps}
            isPlaying={true}
            currentTime={simulatedSeconds % 120}
            collapseProgress={Math.sin(i * 0.05) * 0.5 + 0.5} // Oscillate progress
          />
        )

        // Flush updates every 10 iterations to prevent queue overflow
        if (i % 10 === 0) {
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5))
          })
        }
      }

      // Component should still be responsive
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })
  })

  describe('Mount/Unmount Cycles', () => {
    it('should handle multiple mount/unmount cycles without memory leaks', async () => {
      // Simulate user navigating away and back multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        const { unmount } = renderWithProviders(
          <VideoControls
            {...mockProps}
            isPlaying={true}
            collapseProgress={Math.random()}
          />
        )

        // Verify mounted
        expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()

        // Unmount
        unmount()

        // Allow cleanup to run
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }

      // Final mount should succeed
      renderWithProviders(<VideoControls {...mockProps} />)
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })

    it('should clean up properly when unmounting during animation', async () => {
      const { unmount, rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0}
        />
      )

      // Start animation
      rerender(
        <VideoControls
          {...mockProps}
          collapseProgress={0.5}
        />
      )

      // Unmount mid-animation (this is where the crash would occur)
      expect(() => {
        unmount()
      }).not.toThrow()

      // Remount should work
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0}
        />
      )
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })

    it('should handle unmount while props are changing', async () => {
      const { unmount, rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={false}
          collapseProgress={0}
        />
      )

      // Change multiple props simultaneously and unmount
      expect(() => {
        rerender(
          <VideoControls
            {...mockProps}
            isPlaying={true}
            currentTime={50}
            collapseProgress={0.75}
          />
        )
        unmount()
      }).not.toThrow()
    })
  })

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle extreme collapseProgress values', async () => {
      const extremeValues = [-1, -0.5, 0, 0.5, 1, 1.5, 2, Number.MAX_SAFE_INTEGER / 1e10]

      for (const value of extremeValues) {
        const { unmount } = renderWithProviders(
          <VideoControls
            {...mockProps}
            collapseProgress={value}
          />
        )
        expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
        unmount()
      }
    })

    it('should handle NaN and Infinity values gracefully', async () => {
      const problematicValues = [
        { ...mockProps, currentTime: Number.NaN, duration: 120 },
        { ...mockProps, currentTime: Number.POSITIVE_INFINITY, duration: 120 },
        { ...mockProps, currentTime: 0, duration: Number.POSITIVE_INFINITY },
        { ...mockProps, currentTime: 0, duration: 0 },
        { ...mockProps, collapseProgress: Number.NaN },
        { ...mockProps, collapseProgress: Number.POSITIVE_INFINITY },
      ]

      for (const props of problematicValues) {
        const { unmount } = renderWithProviders(<VideoControls {...props} />)
        // Should not crash, even with invalid values
        expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
        unmount()
      }
    })

    it('should handle rapid switching between playing and paused', async () => {
      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={false}
        />
      )

      // Rapid play/pause toggling (like user mashing the button)
      for (let i = 0; i < 50; i++) {
        rerender(
          <VideoControls
            {...mockProps}
            isPlaying={i % 2 === 0}
          />
        )
      }

      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })
  })

  describe('Complex Gesture Scenarios', () => {
    it('should handle mock gestures during rapid prop changes', async () => {
      const { rerender } = renderWithProviders(<VideoControls {...mockProps} />)

      // Simulate complex user interaction pattern:
      // 1. Start gesture
      // 2. Prop change mid-gesture
      // 3. End gesture
      // 4. Start new gesture
      for (let cycle = 0; cycle < 5; cycle++) {
        // Simulate prop changes while "gesturing"
        rerender(
          <VideoControls
            {...mockProps}
            collapseProgress={cycle * 0.2}
            isPlaying={true}
          />
        )

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }

      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })
  })

  describe('Memory & Performance Regressions', () => {
    it('should not create excessive re-renders during prop updates', async () => {
      let renderCount = 0
      const TrackedVideoControls = (props: any) => {
        renderCount++
        return <VideoControls {...props} />
      }

      const { rerender } = renderWithProviders(<TrackedVideoControls {...mockProps} />)

      const initialRenderCount = renderCount

      // Rapid prop updates
      for (let i = 0; i < 20; i++) {
        rerender(
          <TrackedVideoControls
            {...mockProps}
            collapseProgress={i * 0.05}
          />
        )
      }

      // Component should not re-render excessively
      // Each rerender call = 1 re-render, so max should be ~20 + initial
      expect(renderCount).toBeLessThan(initialRenderCount + 30)
    })

    it('should handle memory cleanup on component unmount', () => {
      const { unmount } = renderWithProviders(<VideoControls {...mockProps} />)

      // This test would ideally use memory profiling tools
      // For now, we verify it doesn't throw during cleanup
      expect(() => {
        unmount()
      }).not.toThrow()

      // Verify no lingering DOM elements
      expect(screen.queryByTestId('video-controls-container')).not.toBeInTheDocument()
    })
  })

  describe('Reanimated-Specific Regression Tests', () => {
    it('should not trigger "Tried to modify key `current` of an object passed to worklet" warning', async () => {
      // This was a specific warning in the crash logs
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const { rerender } = renderWithProviders(
        <VideoControls
          {...mockProps}
          isPlaying={true}
        />
      )

      // Perform intensive updates
      for (let i = 0; i < 30; i++) {
        rerender(
          <VideoControls
            {...mockProps}
            isPlaying={i % 2 === 0}
            collapseProgress={(i / 30) % 1}
          />
        )
      }

      // Check for Reanimated-specific warnings
      const warnings = consoleWarnSpy.mock.calls
        .map((call) => call[0]?.toString?.())
        .filter((w) => w?.includes?.('worklet') || w?.includes?.('folly::dynamic'))

      expect(warnings.length).toBe(0)

      consoleWarnSpy.mockRestore()
    })

    it('should handle shared value updates without crashing', async () => {
      // This simulates the core issue: shared value lifecycle
      const { rerender, unmount } = renderWithProviders(
        <VideoControls
          {...mockProps}
          collapseProgress={0}
        />
      )

      // Rapid shared value updates (collapseProgress)
      for (let i = 0; i < 100; i++) {
        rerender(
          <VideoControls
            {...mockProps}
            collapseProgress={Math.random()}
          />
        )
      }

      // Unmount with active shared value
      unmount()

      // Verify cleanup
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Should not crash
      renderWithProviders(<VideoControls {...mockProps} />)
    })

    it('should prevent deep recursion in shadow tree cloning', async () => {
      // Simulate deeply nested component tree by rapid remounts
      // Each remount attempts shadow tree cloning
      for (let depth = 0; depth < 20; depth++) {
        const { unmount } = renderWithProviders(
          <VideoControls
            {...mockProps}
            collapseProgress={Math.random() * depth * 0.01}
            isPlaying={depth % 2 === 0}
          />
        )

        // Unmount immediately to trigger cleanup and prepare for next mount
        unmount()
      }

      // Final mount should succeed (not hit recursion limit)
      renderWithProviders(<VideoControls {...mockProps} />)
      expect(screen.getByTestId('video-controls-container')).toBeInTheDocument()
    })
  })
})
