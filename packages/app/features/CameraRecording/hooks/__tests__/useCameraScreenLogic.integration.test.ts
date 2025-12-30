import { act, renderHook, waitFor } from '@testing-library/react'
/// <reference types="jest" />
// No imports needed - jest-expo preset provides globals
import { useCameraScreenLogic } from '../useCameraScreenLogic'

// Mock logger
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock API functions used in the pipeline
jest.mock('@my/api', () => ({
  computeVideoTimingParams: jest.fn(() => ({
    duration: 30,
    feedbackCount: 3,
    targetTimestamps: [10, 20, 30],
  })),
  startGeminiVideoAnalysis: jest.fn(() =>
    Promise.resolve({
      analysisId: 456,
      status: 'queued',
      message: 'Analysis queued successfully',
    })
  ),
  uploadVideo: jest.fn(() =>
    Promise.resolve({
      id: 123,
      filename: 'recorded_video.mp4',
      storage_path: 'user123/timestamp_recorded_video.mp4',
      upload_status: 'completed',
    })
  ),
}))

// Mock compression and file utilities
jest.mock('../../../../services/videoCompression', () => ({
  compressVideo: jest.fn(() =>
    Promise.resolve({
      compressedUri: 'file:///compressed/video.mp4',
      metadata: { size: 1024 * 1024, duration: 30 },
    })
  ),
}))

jest.mock('../../../../utils/files', () => ({
  uriToBlob: jest.fn(() => Promise.resolve(new Blob(['mock data'], { type: 'video/mp4' }))),
}))

// Mock AsyncStorage
jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn(() => Promise.resolve('record')),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  }),
  { virtual: true }
)

// Mock crypto for upload progress store
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-123'),
  },
})

// Enable Immer MapSet plugin for tests
jest.mock('immer', () => {
  const immer = jest.requireActual('immer')
  immer.enableMapSet()
  return immer
})

// Mock the recording state machine
jest.mock('../useRecordingStateMachine', () => ({
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

// Note: useScreenStateTransition is not used by useCameraScreenLogic
// Screen state management is handled separately

// Mock the tab persistence hook
const mockSetActiveTab = jest.fn()
jest.mock('../useTabPersistence', () => ({
  useTabPersistence: jest.fn(() => ({
    activeTab: 'record',
    setActiveTab: mockSetActiveTab,
    isLoading: false,
  })),
}))

describe('useCameraScreenLogic Integration', () => {
  const defaultProps = {
    cameraRef: { current: null },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Recording State Integration', () => {
    it('should start with idle recording state', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(result.current.recordingState).toBe('idle')
      expect(result.current.isRecording).toBe(false)
      expect(result.current.duration).toBe(0)
      expect(result.current.formattedDuration).toBe('0:00')
    })

    it('should provide recording actions', () => {
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      expect(typeof result.current.handleStartRecording).toBe('function')
      expect(typeof result.current.handlePauseRecording).toBe('function')
      expect(typeof result.current.handleResumeRecording).toBe('function')
      expect(typeof result.current.handleStopRecording).toBe('function')
    })

    it('should handle video recording completion', () => {
      // This test verifies that the video recording integration is set up correctly
      const { result } = renderHook(() => useCameraScreenLogic(defaultProps))

      // Verify that the video recording handler is properly integrated
      expect(typeof result.current.handleVideoRecorded).toBe('function')
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
      expect(typeof result.current.confirmNavigation).toBe('function')
      expect(typeof result.current.cancelNavigation).toBe('function')
      expect(typeof result.current.handleCameraReady).toBe('function')
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
    it('should notify parent when video is processed', async () => {
      const onVideoProcessed = jest.fn()
      const { result } = renderHook(() =>
        useCameraScreenLogic({ ...defaultProps, onVideoProcessed })
      )

      act(() => {
        result.current.handleVideoRecorded('test-video-uri.mp4')
      })

      await waitFor(() => {
        expect(onVideoProcessed).toHaveBeenCalledWith('test-video-uri.mp4')
      })
    })

    it('should navigate to video analysis screen after recording stops', async () => {
      const onVideoProcessed = jest.fn()
      const mockProps = {
        ...defaultProps,
        onVideoProcessed,
        cameraRef: { current: null },
      }

      // Mock the recording state machine to return a stopped state with video URI
      const mockUseRecordingStateMachine = jest.requireMock('../useRecordingStateMachine')
      mockUseRecordingStateMachine.useRecordingStateMachine.mockReturnValueOnce({
        recordingState: 'stopped',
        duration: 5000,
        formattedDuration: '0:05',
        startRecording: jest.fn(),
        pauseRecording: jest.fn(),
        resumeRecording: jest.fn(),
        stopRecording: jest.fn(),
        resetRecording: jest.fn(),
        canRecord: false,
        canPause: false,
        canResume: false,
        canStop: false,
      })

      const { result } = renderHook(() => useCameraScreenLogic(mockProps))

      // Simulate video recording completion (now async with compression/upload/analysis)
      await act(async () => {
        await result.current.handleVideoRecorded('/path/to/recorded/video.mp4')
      })

      // Navigation should happen after the async pipeline completes
      expect(onVideoProcessed).toHaveBeenCalledWith('/path/to/recorded/video.mp4')
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
        useCameraScreenLogic({ ...defaultProps, onVideoProcessed: undefined })
      )

      // Should not throw when calling video processed without callback
      expect(() => {
        act(() => {
          result.current.handleVideoRecorded('test-video.mp4')
        })
      }).not.toThrow()
    })
  })
})
