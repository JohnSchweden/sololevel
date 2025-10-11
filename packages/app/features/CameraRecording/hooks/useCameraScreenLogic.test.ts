// Mock dependencies
jest.mock('@my/api', () => ({
  computeVideoTimingParams: jest.fn(),
  startGeminiVideoAnalysis: jest.fn(),
  uploadVideo: jest.fn(),
}))

jest.mock('../../../services/videoUploadAndAnalysis', () => ({
  startUploadAndAnalysis: jest.fn(),
}))

const mockAddUploadTask = jest.fn(() => 'temp-task-id')
const mockUpdateUploadProgress = jest.fn()
const mockSetUploadStatus = jest.fn()
const mockInitializeUploadTask = jest.fn()
const mockSetUploadTaskRecordingId = jest.fn()

jest.mock('@app/features/VideoAnalysis/stores/uploadProgress', () => ({
  useUploadProgressStore: {
    getState: jest.fn(() => ({
      addUploadTask: mockAddUploadTask,
      updateUploadProgress: mockUpdateUploadProgress,
      setUploadStatus: mockSetUploadStatus,
      initializeUploadTask: mockInitializeUploadTask,
      setUploadTaskRecordingId: mockSetUploadTaskRecordingId,
    })),
  },
}))

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { computeVideoTimingParams } from '@my/api'

const mockComputeVideoTimingParams = computeVideoTimingParams as jest.MockedFunction<
  typeof computeVideoTimingParams
>

jest.mock('../../../services/videoCompression', () => ({
  compressVideo: jest.fn(),
}))

jest.mock('../../../utils/files', () => ({
  uriToBlob: jest.fn(),
}))

import { startGeminiVideoAnalysis, uploadVideo } from '@my/api'
import { act, renderHook } from '@testing-library/react-hooks'
import { compressVideo } from '../../../services/videoCompression'
import { startUploadAndAnalysis } from '../../../services/videoUploadAndAnalysis'
import { uriToBlob } from '../../../utils/files'
import { useCameraScreenLogic } from './useCameraScreenLogic'

const mockCompressVideo = compressVideo as jest.MockedFunction<typeof compressVideo>
const mockUriToBlob = uriToBlob as jest.MockedFunction<typeof uriToBlob>
const mockUploadVideo = uploadVideo as jest.MockedFunction<typeof uploadVideo>
const mockStartGeminiVideoAnalysis = startGeminiVideoAnalysis as jest.MockedFunction<
  typeof startGeminiVideoAnalysis
>
const mockStartUploadAndAnalysis = startUploadAndAnalysis as jest.MockedFunction<
  typeof startUploadAndAnalysis
>

describe('useCameraScreenLogic', () => {
  const mockProps = {
    onNavigateBack: jest.fn(),
    onNavigateToVideoAnalysis: jest.fn(),
    onTabChange: jest.fn(),
    cameraRef: { current: { startRecording: jest.fn(), stopRecording: jest.fn() } },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAddUploadTask.mockClear()

    // Setup default mocks
    mockCompressVideo.mockResolvedValue({
      compressedUri: 'file:///compressed/video.mp4',
      metadata: { size: 1024 * 1024, duration: 30, format: 'mp4' },
    })

    mockUriToBlob.mockResolvedValue(new Blob(['mock data'], { type: 'video/mp4' }))

    mockUploadVideo.mockResolvedValue({
      id: 123,
      filename: 'compressed_video.mp4',
      storage_path: 'user123/timestamp_compressed_video.mp4',
      upload_status: 'completed',
    } as any)

    mockComputeVideoTimingParams.mockReturnValue({
      duration: 30,
      feedbackCount: 3,
      targetTimestamps: [10, 20, 30],
    })

    mockStartGeminiVideoAnalysis.mockResolvedValue({
      analysisId: 456,
      status: 'queued',
      message: 'Analysis queued successfully',
    })
  })

  describe('handleVideoRecorded', () => {
    it('should navigate immediately and start upload/analysis pipeline', async () => {
      const { result } = renderHook(() => useCameraScreenLogic(mockProps))

      const mockVideoUri = 'file:///recorded/video.mp4'

      // Call handleVideoRecorded - should navigate immediately and start processing
      await act(async () => {
        await result.current.handleVideoRecorded(mockVideoUri)
      })

      // Verify navigation happens immediately
      expect(mockProps.onNavigateToVideoAnalysis).toHaveBeenCalledWith(mockVideoUri)
      expect(mockProps.onNavigateToVideoAnalysis).toHaveBeenCalledTimes(1)

      // Verify the shared upload and analysis service was called
      expect(mockStartUploadAndAnalysis).toHaveBeenCalledWith({
        sourceUri: mockVideoUri,
        originalFilename: 'recorded_video.mp4',
        durationSeconds: 0,
      })
      expect(mockStartUploadAndAnalysis).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleVideoSelected', () => {
    it('should navigate immediately and start upload/analysis pipeline for selected file', async () => {
      const { result } = renderHook(() => useCameraScreenLogic(mockProps))

      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' })
      const mockMetadata = {
        localUri: 'file:///selected/video.mp4',
        originalFilename: 'my_video.mp4',
        duration: 45,
        format: 'mp4',
      }

      // Call handleVideoSelected - should navigate immediately and start processing
      await act(async () => {
        await result.current.handleVideoSelected(mockFile, mockMetadata)
      })

      // Verify navigation happens immediately
      expect(mockProps.onNavigateToVideoAnalysis).toHaveBeenCalledWith(mockMetadata.localUri)
      expect(mockProps.onNavigateToVideoAnalysis).toHaveBeenCalledTimes(1)

      // Verify the shared upload and analysis service was called with file and metadata
      expect(mockStartUploadAndAnalysis).toHaveBeenCalledWith({
        file: mockFile,
        originalFilename: mockMetadata.originalFilename,
        durationSeconds: mockMetadata.duration,
        format: 'mp4',
      })
      expect(mockStartUploadAndAnalysis).toHaveBeenCalledTimes(1)
    })
  })

  // Tests for compression failures, upload failures, etc. are now handled
  // in the videoUploadAndAnalysis service tests, not in this hook test
})
