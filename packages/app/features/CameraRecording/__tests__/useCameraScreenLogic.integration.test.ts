import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useCameraScreenLogic } from '../hooks/useCameraScreenLogic'
import { RecordingState } from '../types'

// Mock logger
vi.mock('@ui/utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the recording state machine
vi.mock('../hooks/useRecordingStateMachine', () => ({
  useRecordingStateMachine: vi.fn(() => ({
    recordingState: RecordingState.IDLE,
    duration: 0,
    formattedDuration: '0:00',
    startRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    stopRecording: vi.fn(),
    resetRecording: vi.fn(),
    canRecord: true,
    canPause: false,
    canResume: false,
    canStop: false,
  })),
}))

describe('useCameraScreenLogic Integration', () => {
  const defaultProps = {
    onNavigateBack: vi.fn(),
    cameraRef: { current: null },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Screen State Integration', () => {
    it('should start in camera mode', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(result.current.screenState).toBe('camera')
      expect(result.current.isCameraMode).toBe(true)
      expect(result.current.isVideoPlayerMode).toBe(false)
      expect(result.current.videoData).toBeNull()
    })

    it('should provide video player actions', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(typeof result.current.handleRestartRecording).toBe('function')
      expect(typeof result.current.handleContinueToAnalysis).toBe('function')
    })

    it('should handle screen state transitions when recording stops', () => {
      // This test verifies that the integration is set up correctly
      // The actual state transition is tested in the useScreenStateTransition unit tests
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      // Verify that the screen state transition hook is properly integrated
      expect(result.current.screenState).toBeDefined()
      expect(result.current.isVideoPlayerMode).toBeDefined()
      expect(result.current.isCameraMode).toBeDefined()
      expect(result.current.videoData).toBeDefined()
      expect(typeof result.current.handleRestartRecording).toBe('function')
      expect(typeof result.current.handleContinueToAnalysis).toBe('function')
    })
  })

  describe('Camera Controls Integration', () => {
    it('should provide all camera control functions', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      // Camera state
      expect(result.current.cameraType).toBeDefined()
      expect(result.current.zoomLevel).toBeDefined()
      expect(result.current.recordingState).toBeDefined()
      expect(result.current.duration).toBeDefined()
      expect(result.current.formattedDuration).toBeDefined()
      expect(result.current.isRecording).toBeDefined()
      expect(result.current.headerTitle).toBeDefined()
      expect(result.current.cameraReady).toBeDefined()

      // Camera actions
      expect(typeof result.current.handleCameraSwap).toBe('function')
      expect(typeof result.current.handleZoomChange).toBe('function')
      expect(typeof result.current.handleResetZoom).toBe('function')
      expect(typeof result.current.handleStartRecording).toBe('function')
      expect(typeof result.current.handlePauseRecording).toBe('function')
      expect(typeof result.current.handleResumeRecording).toBe('function')
      expect(typeof result.current.handleStopRecording).toBe('function')
      expect(typeof result.current.handleBackPress).toBe('function')
      expect(typeof result.current.handleUploadVideo).toBe('function')
      expect(typeof result.current.handleVideoSelected).toBe('function')
      expect(typeof result.current.handleSettingsOpen).toBe('function')
      expect(typeof result.current.handleNavigateBack).toBe('function')
      expect(typeof result.current.confirmNavigation).toBe('function')
      expect(typeof result.current.cancelNavigation).toBe('function')
      expect(typeof result.current.handleTabChange).toBe('function')
      expect(typeof result.current.handleCameraReady).toBe('function')
      expect(typeof result.current.setShowSideSheet).toBe('function')
      expect(typeof result.current.setShowNavigationDialog).toBe('function')
    })

    it('should handle camera ready state', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(result.current.cameraReady).toBe(false)

      act(() => {
        result.current.handleCameraReady()
      })

      expect(result.current.cameraReady).toBe(true)
    })
  })

  describe('Navigation Integration', () => {
    it('should handle navigation back', () => {
      const onNavigateBack = vi.fn()
      const { result } = renderHook(() => useCameraScreenLogic({ ...defaultProps, onNavigateBack }))

      act(() => {
        result.current.handleNavigateBack()
      })

      expect(onNavigateBack).toHaveBeenCalled()
    })

    it('should handle tab changes', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(result.current.activeTab).toBe('record')

      act(() => {
        result.current.handleTabChange('coach')
      })

      expect(result.current.activeTab).toBe('coach')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing camera ref gracefully', () => {
      const { result } = renderHook(() =>
        useCameraScreenLogic({ ...defaultProps, cameraRef: undefined })
      )

      // Should not throw and should provide default values
      expect(result.current.cameraReady).toBe(false)
      expect(typeof result.current.handleCameraReady).toBe('function')
    })

    it('should handle missing navigation callback gracefully', () => {
      const { result } = renderHook(() =>
        useCameraScreenLogic({ ...defaultProps, onNavigateBack: undefined })
      )

      // Should not throw when calling navigation functions
      expect(() => {
        act(() => {
          result.current.handleNavigateBack()
        })
      }).not.toThrow()
    })
  })
})
