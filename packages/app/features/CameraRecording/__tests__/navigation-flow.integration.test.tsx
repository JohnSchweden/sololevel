/**
 * Integration Test: Camera Recording to Video Analysis Navigation Flow
 *
 * This test verifies the complete navigation flow from the camera recording screen
 * to the video analysis screen, testing the actual component integration.
 */

import { act, renderHook } from '@testing-library/react'
import { useCameraScreenLogic } from '../hooks/useCameraScreenLogic'

// Mock logger
jest.mock('@ui/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('record')),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

// Mock recording state machine
jest.mock('../hooks/useRecordingStateMachine', () => ({
  useRecordingStateMachine: jest.fn(() => ({
    recordingState: 'idle',
    duration: 0,
    formattedDuration: '0:00',
    startRecording: jest.fn(),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    stopRecording: jest.fn(),
    resetRecording: jest.fn(),
    canRecord: true,
    canPause: false,
    canResume: false,
    canStop: false,
  })),
}))

// Mock camera controls
jest.mock('../hooks/useCameraControls', () => ({
  useCameraControls: jest.fn(() => ({
    cameraType: 'back',
    flashMode: 'off',
    isCameraReady: true,
    switchCamera: jest.fn(),
    toggleFlash: jest.fn(),
    handleCameraReady: jest.fn(),
  })),
}))

describe('Camera Recording Navigation Flow Integration', () => {
  const defaultProps = {
    onNavigateBack: undefined,
    onNavigateToVideoAnalysis: undefined,
    onTabChange: undefined,
    cameraRef: { current: null },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should navigate to video analysis screen when recording completes', () => {
    const mockOnNavigateToVideoAnalysis = jest.fn()
    const mockProps = {
      ...defaultProps,
      onNavigateToVideoAnalysis: mockOnNavigateToVideoAnalysis,
    }

    const { result } = renderHook(() => useCameraScreenLogic(mockProps))

    // Simulate video recording completion
    act(() => {
      result.current.handleVideoRecorded('file:///recorded-video.mp4')
    })

    // Verify navigation callback was called with correct video URI
    expect(mockOnNavigateToVideoAnalysis).toHaveBeenCalledWith('file:///recorded-video.mp4')
  })

  it('should handle navigation back callback', () => {
    const mockOnNavigateBack = jest.fn()
    const mockProps = {
      ...defaultProps,
      onNavigateBack: mockOnNavigateBack,
    }

    const { result } = renderHook(() => useCameraScreenLogic(mockProps))

    // Simulate navigation back
    act(() => {
      result.current.handleNavigateBack()
    })

    // Verify navigation back callback was called
    expect(mockOnNavigateBack).toHaveBeenCalled()
  })

  it('should handle tab change callback', () => {
    const mockOnTabChange = jest.fn()
    const mockProps = {
      ...defaultProps,
      onTabChange: mockOnTabChange,
    }

    const { result } = renderHook(() => useCameraScreenLogic(mockProps))

    // Simulate tab change
    act(() => {
      result.current.handleTabChange('coach')
    })

    // Verify tab change callback was called
    expect(mockOnTabChange).toHaveBeenCalledWith('coach')
  })

  it('should handle missing navigation callbacks gracefully', () => {
    const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

    // These should not throw errors even without callbacks
    expect(() => {
      act(() => {
        result.current.handleVideoRecorded('test-video.mp4')
        result.current.handleNavigateBack()
        result.current.handleTabChange('insights')
      })
    }).not.toThrow()
  })

  it('should provide all expected navigation functions', () => {
    const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

    // Verify all navigation functions are available
    expect(typeof result.current.handleVideoRecorded).toBe('function')
    expect(typeof result.current.handleNavigateBack).toBe('function')
    expect(typeof result.current.handleTabChange).toBe('function')
  })

  it('should handle multiple video recordings with navigation', () => {
    const mockOnNavigateToVideoAnalysis = jest.fn()
    const mockProps = {
      ...defaultProps,
      onNavigateToVideoAnalysis: mockOnNavigateToVideoAnalysis,
    }

    const { result } = renderHook(() => useCameraScreenLogic(mockProps))

    // Simulate multiple video recordings
    act(() => {
      result.current.handleVideoRecorded('file:///video1.mp4')
    })

    act(() => {
      result.current.handleVideoRecorded('file:///video2.mp4')
    })

    // Verify navigation was called for each video
    expect(mockOnNavigateToVideoAnalysis).toHaveBeenCalledTimes(2)
    expect(mockOnNavigateToVideoAnalysis).toHaveBeenNthCalledWith(1, 'file:///video1.mp4')
    expect(mockOnNavigateToVideoAnalysis).toHaveBeenNthCalledWith(2, 'file:///video2.mp4')
  })
})
