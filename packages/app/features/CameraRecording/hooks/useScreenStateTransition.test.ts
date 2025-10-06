import { act, renderHook } from '@testing-library/react'
import { RecordingState } from '../types'
/// <reference types="jest" />
// No imports needed - jest-expo preset provides globals
import { useScreenStateTransition } from './useScreenStateTransition'

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('useScreenStateTransition', () => {
  const defaultProps = {
    onNavigateToVideoPlayer: jest.fn(),
    onNavigateToCamera: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should start in camera mode', () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      expect(result.current.screenState).toBe('camera')
      expect(result.current.isVideoPlayerMode).toBe(false)
      expect(result.current.isCameraMode).toBe(true)
    })
  })

  describe('State Transitions', () => {
    it('should transition to video player when recording stops', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // Initially in camera mode
      expect(result.current.screenState).toBe('camera')

      // Simulate recording stopping
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete (100ms delay in the hook)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Should transition to video player mode
      expect(result.current.screenState).toBe('videoPlayer')
      expect(result.current.isVideoPlayerMode).toBe(true)
      expect(result.current.isCameraMode).toBe(false)
      expect(defaultProps.onNavigateToVideoPlayer).toHaveBeenCalledWith({
        videoUri: expect.any(String),
        duration: 30000,
      })
    })

    it('should not transition when recording is in other states', () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // Test various recording states that should not trigger transition
      const nonTransitionStates = [
        RecordingState.IDLE,
        RecordingState.RECORDING,
        RecordingState.PAUSED,
      ]

      nonTransitionStates.forEach((state) => {
        act(() => {
          result.current.handleRecordingStateChange(state, 0)
        })

        expect(result.current.screenState).toBe('camera')
        expect(defaultProps.onNavigateToVideoPlayer).not.toHaveBeenCalled()
      })
    })

    it('should transition back to camera when restart is requested', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // First transition to video player
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      expect(result.current.screenState).toBe('videoPlayer')

      // Then restart recording
      act(() => {
        result.current.handleRestartRecording()
      })

      expect(result.current.screenState).toBe('camera')
      expect(result.current.isCameraMode).toBe(true)
      expect(result.current.isVideoPlayerMode).toBe(false)
      expect(defaultProps.onNavigateToCamera).toHaveBeenCalled()
    })

    it('should transition back to camera when continue to analysis is requested', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // First transition to video player
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      expect(result.current.screenState).toBe('videoPlayer')

      // Then continue to analysis
      act(() => {
        result.current.handleContinueToAnalysis()
      })

      expect(result.current.screenState).toBe('camera')
      expect(result.current.isCameraMode).toBe(true)
      expect(result.current.isVideoPlayerMode).toBe(false)
      expect(defaultProps.onNavigateToCamera).toHaveBeenCalled()
    })
  })

  describe('Video Data Management', () => {
    it('should store video data when transitioning to video player', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 45000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      expect(result.current.videoData).toEqual({
        videoUri: expect.any(String),
        duration: 45000,
      })
    })

    it('should clear video data when transitioning back to camera', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // Transition to video player
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      expect(result.current.videoData).toBeDefined()

      // Transition back to camera
      act(() => {
        result.current.handleRestartRecording()
      })

      expect(result.current.videoData).toBeNull()
    })

    it('should generate unique video URI for each recording', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // First recording
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      const firstVideoUri = result.current.videoData?.videoUri

      // Restart and record again
      act(() => {
        result.current.handleRestartRecording()
      })

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 25000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      const secondVideoUri = result.current.videoData?.videoUri

      expect(firstVideoUri).not.toBe(secondVideoUri)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid recording state gracefully', () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      // Should not throw when receiving invalid state
      expect(() => {
        act(() => {
          result.current.handleRecordingStateChange('invalid' as RecordingState, 0)
        })
      }).not.toThrow()

      // Should remain in camera mode
      expect(result.current.screenState).toBe('camera')
    })

    it('should handle negative duration gracefully', async () => {
      const { result } = renderHook(() => useScreenStateTransition(defaultProps))

      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, -1000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Should still transition but with 0 duration
      expect(result.current.screenState).toBe('videoPlayer')
      expect(result.current.videoData?.duration).toBe(0)
    })
  })

  describe('Callback Integration', () => {
    it('should call onNavigateToVideoPlayer with correct data', async () => {
      const onNavigateToVideoPlayer = jest.fn()
      const { result } = renderHook(() =>
        useScreenStateTransition({
          ...defaultProps,
          onNavigateToVideoPlayer,
        })
      )

      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 35000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      expect(onNavigateToVideoPlayer).toHaveBeenCalledWith({
        videoUri: expect.stringMatching(/^file:\/\/recording_\d+\.mp4$/),
        duration: 35000,
      })
    })

    it('should call onNavigateToCamera when returning to camera', async () => {
      const onNavigateToCamera = jest.fn()
      const { result } = renderHook(() =>
        useScreenStateTransition({
          ...defaultProps,
          onNavigateToCamera,
        })
      )

      // Transition to video player first
      act(() => {
        result.current.handleRecordingStateChange(RecordingState.STOPPED, 30000)
      })

      // Wait for the setTimeout to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Then return to camera
      act(() => {
        result.current.handleRestartRecording()
      })

      expect(onNavigateToCamera).toHaveBeenCalled()
    })
  })
})
