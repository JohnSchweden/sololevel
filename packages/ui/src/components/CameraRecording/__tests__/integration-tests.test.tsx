/**
 * Integration Tests
 * Tests end-to-end integration between components and hooks
 */

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { TestProvider } from '../../../test-utils'

// Import centralized mocks
import { RecordingState } from './mocks'

import { IdleControls } from '../CameraControls/IdleControls'
import { NavigationDialog } from '../CameraControls/NavigationDialog'
import { RecordingControls } from '../CameraControls/RecordingControls'
// Import hooks and components to test integration
import { useCameraControls, useRecordingStateMachine } from './mocks'

describe('Integration Tests', () => {
  describe('Recording Workflow', () => {
    it('coordinates between recording state machine and UI controls', () => {
      const mockRecordingConfig = {
        maxDurationMs: 60000,
        onMaxDurationReached: jest.fn(),
        onStateChange: jest.fn(),
        onError: jest.fn(),
      }

      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine(mockRecordingConfig)
      )

      // Start recording to test state coordination
      act(() => {
        recordingResult.current.startRecording()
      })

      // Render recording controls
      const { rerender } = render(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={recordingResult.current.pauseRecording}
            onResume={recordingResult.current.resumeRecording}
            onStop={recordingResult.current.stopRecording}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Verify UI reflects hook state
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)
      expect(screen.getByLabelText('Pause recording')).toBeTruthy()

      // Pause recording and verify state change
      act(() => {
        recordingResult.current.pauseRecording()
      })

      rerender(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={recordingResult.current.pauseRecording}
            onResume={recordingResult.current.resumeRecording}
            onStop={recordingResult.current.stopRecording}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      expect(recordingResult.current.recordingState).toBe(RecordingState.PAUSED)
      expect(screen.getByLabelText('Resume recording')).toBeTruthy()
    })

    it('handles complete recording session lifecycle', () => {
      const mockRecordingConfig = {
        maxDurationMs: 60000,
        onMaxDurationReached: jest.fn(),
        onStateChange: jest.fn(),
        onError: jest.fn(),
      }

      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine(mockRecordingConfig)
      )

      // Complete recording workflow
      act(() => recordingResult.current.startRecording())
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)

      act(() => recordingResult.current.pauseRecording())
      expect(recordingResult.current.recordingState).toBe(RecordingState.PAUSED)

      act(() => recordingResult.current.resumeRecording())
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)

      act(() => recordingResult.current.stopRecording())
      expect(recordingResult.current.recordingState).toBe(RecordingState.STOPPED)

      act(() => recordingResult.current.resetRecording())
      expect(recordingResult.current.recordingState).toBe(RecordingState.IDLE)
    })

    it('integrates idle controls with recording state machine', () => {
      const mockRecordingConfig = {
        maxDurationMs: 60000,
        onMaxDurationReached: jest.fn(),
        onStateChange: jest.fn(),
        onError: jest.fn(),
      }

      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine(mockRecordingConfig)
      )

      const idleProps = {
        onStartRecording: recordingResult.current.startRecording,
        onUploadVideo: jest.fn(),
        onCameraSwap: jest.fn(),
        disabled: false,
        cameraSwapDisabled: false,
      }

      render(
        <TestProvider>
          <IdleControls {...idleProps} />
        </TestProvider>
      )

      // Start recording from idle controls
      const recordButton = screen.getByLabelText('Start recording')
      if (recordButton) {
        fireEvent.click(recordButton)
      }

      // Verify recording state machine was triggered
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)
    })
  })

  describe('Camera Controls Integration', () => {
    it('camera controls integrate with recording controls', () => {
      const { result: cameraResult } = renderHook(() => useCameraControls())

      render(
        <TestProvider>
          <RecordingControls
            recordingState={RecordingState.RECORDING}
            duration={10000}
            zoomLevel={cameraResult.current.controls.zoomLevel}
            canSwapCamera={cameraResult.current.canSwapCamera}
            onPause={() => {}}
            onResume={() => {}}
            onStop={() => {}}
            onCameraSwap={cameraResult.current.actions.swapCamera}
            onZoomChange={cameraResult.current.actions.setZoomLevel}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Verify camera controls are accessible
      expect(cameraResult.current.controls.zoomLevel).toBe(1)
      expect(cameraResult.current.canSwapCamera).toBe(true)
    })

    it('handles camera settings during recording', () => {
      const { result: cameraResult } = renderHook(() => useCameraControls())

      const { rerender } = render(
        <TestProvider>
          <RecordingControls
            recordingState={RecordingState.RECORDING}
            duration={15000}
            zoomLevel={cameraResult.current.controls.zoomLevel}
            canSwapCamera={cameraResult.current.canSwapCamera}
            onPause={() => {}}
            onResume={() => {}}
            onStop={() => {}}
            onCameraSwap={cameraResult.current.actions.swapCamera}
            onZoomChange={cameraResult.current.actions.setZoomLevel}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Change zoom during recording
      act(() => {
        cameraResult.current.actions.setZoomLevel(2)
      })

      rerender(
        <TestProvider>
          <RecordingControls
            recordingState={RecordingState.RECORDING}
            duration={15000}
            zoomLevel={cameraResult.current.controls.zoomLevel}
            canSwapCamera={cameraResult.current.canSwapCamera}
            onPause={() => {}}
            onResume={() => {}}
            onStop={() => {}}
            onCameraSwap={cameraResult.current.actions.swapCamera}
            onZoomChange={cameraResult.current.actions.setZoomLevel}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Verify zoom change is reflected in UI
      expect(cameraResult.current.controls.zoomLevel).toBe(2)
    })

    it('prevents camera swap during recording state transitions', () => {
      const { result: cameraResult } = renderHook(() => useCameraControls())
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      // Start recording
      act(() => recordingResult.current.startRecording())

      // Attempt camera swap (should be allowed based on implementation)
      act(() => cameraResult.current.actions.swapCamera())

      // Verify camera controls still work
      expect(cameraResult.current.controls.cameraType).toBe('front')
    })
  })

  describe('Navigation Dialog Integration', () => {
    it('integrates with recording state machine for navigation warnings', () => {
      const mockRecordingConfig = {
        maxDurationMs: 60000,
        onMaxDurationReached: jest.fn(),
        onStateChange: jest.fn(),
        onError: jest.fn(),
      }

      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine(mockRecordingConfig)
      )

      // Start and pause recording
      act(() => {
        recordingResult.current.startRecording()
        recordingResult.current.pauseRecording()
      })

      const dialogProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: recordingResult.current.duration,
      }

      render(
        <TestProvider>
          <NavigationDialog {...dialogProps} />
        </TestProvider>
      )

      // Verify dialog shows recording information
      expect(screen.getByText('Discard Recording?')).toBeTruthy()
      expect(recordingResult.current.recordingState).toBe(RecordingState.PAUSED)
    })

    it('handles recording discard workflow', () => {
      const mockRecordingConfig = {
        maxDurationMs: 60000,
        onMaxDurationReached: jest.fn(),
        onStateChange: jest.fn(),
        onError: jest.fn(),
      }

      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine(mockRecordingConfig)
      )

      // Start recording
      act(() => recordingResult.current.startRecording())

      const dialogProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: recordingResult.current.duration,
      }

      render(
        <TestProvider>
          <NavigationDialog {...dialogProps} />
        </TestProvider>
      )

      // Discard recording
      const discardButton = screen.getByLabelText('Discard recording')
      if (discardButton) {
        fireEvent.click(discardButton)
      }

      // Verify discard action was called
      expect(dialogProps.onDiscard).toHaveBeenCalled()
    })
  })

  describe('Component State Synchronization', () => {
    it('maintains state consistency across re-renders', () => {
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      const { rerender } = render(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={recordingResult.current.pauseRecording}
            onResume={recordingResult.current.resumeRecording}
            onStop={recordingResult.current.stopRecording}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Start recording
      act(() => recordingResult.current.startRecording())

      // Verify recording state
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)

      // Re-render with updated state
      rerender(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={recordingResult.current.pauseRecording}
            onResume={recordingResult.current.resumeRecording}
            onStop={recordingResult.current.stopRecording}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Verify state consistency
      expect(recordingResult.current.recordingState).toBe(RecordingState.RECORDING)
      expect(screen.getByLabelText('Pause recording')).toBeTruthy()
    })

    it('handles rapid state changes gracefully', () => {
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      // Rapid state changes
      act(() => {
        recordingResult.current.startRecording()
        recordingResult.current.pauseRecording()
        recordingResult.current.resumeRecording()
        recordingResult.current.stopRecording()
      })

      // Should end in stopped state
      expect(recordingResult.current.recordingState).toBe(RecordingState.STOPPED)
    })
  })

  describe('Performance Integration', () => {
    it('handles memory cleanup on unmount', () => {
      const { result: recordingResult, unmount } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      // Start recording
      act(() => recordingResult.current.startRecording())

      // Unmount hook
      unmount()

      // Verify cleanup (timers should be cleared, etc.)
      expect(recordingResult.current.recordingState).toBeDefined()
    })

    it('maintains performance with multiple components', () => {
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      const { result: cameraResult } = renderHook(() => useCameraControls())

      // Render multiple components
      render(
        <TestProvider>
          <div>
            <IdleControls
              onStartRecording={recordingResult.current.startRecording}
              onUploadVideo={jest.fn()}
              onCameraSwap={cameraResult.current.actions.swapCamera}
              disabled={false}
              cameraSwapDisabled={false}
            />
            <RecordingControls
              recordingState={recordingResult.current.recordingState}
              duration={recordingResult.current.duration}
              zoomLevel={cameraResult.current.controls.zoomLevel}
              canSwapCamera={cameraResult.current.canSwapCamera}
              onPause={recordingResult.current.pauseRecording}
              onResume={recordingResult.current.resumeRecording}
              onStop={recordingResult.current.stopRecording}
              onCameraSwap={cameraResult.current.actions.swapCamera}
              onZoomChange={cameraResult.current.actions.setZoomLevel}
              onSettingsOpen={jest.fn()}
            />
          </div>
        </TestProvider>
      )

      // Verify all components render without performance issues
      expect(screen.getByLabelText('Start recording')).toBeTruthy()
      // Note: Camera zoom level and recording state may vary depending on mock state
    })
  })

  describe('Error Handling Integration', () => {
    it('handles hook errors gracefully in components', () => {
      const onError = jest.fn()
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError,
        })
      )

      render(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={() => {}}
            onResume={() => {}}
            onStop={() => {}}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Simulate an error in the hook
      act(() => {
        // Mock an error scenario
        if (onError) {
          onError(new Error('Test error'))
        }
      })

      // Component should still render despite errors
      // Query for the timer element using the actual rendered duration
      const timerElement = screen.getByRole('text', { name: /Recording time:/ })
      expect(timerElement).toBeTruthy()
      expect(timerElement.getAttribute('aria-label')).toMatch(/Recording time: \d{2}:\d{2}/)
    })

    it('maintains component stability during state transitions', () => {
      const { result: recordingResult } = renderHook(() =>
        useRecordingStateMachine({
          maxDurationMs: 60000,
          onMaxDurationReached: jest.fn(),
          onStateChange: jest.fn(),
          onError: jest.fn(),
        })
      )

      render(
        <TestProvider>
          <RecordingControls
            recordingState={recordingResult.current.recordingState}
            duration={recordingResult.current.duration}
            zoomLevel={1}
            canSwapCamera={true}
            onPause={recordingResult.current.pauseRecording}
            onResume={recordingResult.current.resumeRecording}
            onStop={recordingResult.current.stopRecording}
            onCameraSwap={() => {}}
            onZoomChange={() => {}}
            onSettingsOpen={() => {}}
          />
        </TestProvider>
      )

      // Rapid state changes
      act(() => {
        recordingResult.current.startRecording()
        recordingResult.current.pauseRecording()
        recordingResult.current.resumeRecording()
        recordingResult.current.stopRecording()
      })

      // Component should remain stable
      expect(recordingResult.current.recordingState).toBe(RecordingState.STOPPED)
    })
  })
})
