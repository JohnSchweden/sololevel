import { act, renderHook } from '@testing-library/react'
import { useCameraScreenLogic } from '../hooks/useCameraScreenLogic'

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
      filename: 'compressed_video.mp4',
      storage_path: 'user123/timestamp_compressed_video.mp4',
      upload_status: 'completed',
    })
  ),
}))

// Mock compression and file utilities
jest.mock('../../../services/videoCompression', () => ({
  compressVideo: jest.fn(() =>
    Promise.resolve({
      compressedUri: 'file:///compressed/video.mp4',
      metadata: { size: 1024 * 1024, duration: 30, format: 'mp4' },
    })
  ),
}))

jest.mock('../../../utils/files', () => ({
  uriToBlob: jest.fn(() => Promise.resolve(new Blob(['mock data'], { type: 'video/mp4' }))),
}))

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('record')),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}))

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

// Basic integration to validate pipeline wiring
describe('upload-analysis-integration', () => {
  const mockProps = {
    onNavigateBack: jest.fn(),
    onNavigateToVideoAnalysis: jest.fn(),
    cameraRef: { current: { startRecording: jest.fn(), stopRecording: jest.fn() } },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('compresses, converts to blob, uploads, and starts analysis', async () => {
    const { result } = renderHook(() => useCameraScreenLogic(mockProps))

    const mockVideoUri = 'file:///recorded/video.mp4'

    await act(async () => {
      await result.current.handleVideoRecorded(mockVideoUri)
    })

    const { compressVideo } = require('../../../services/videoCompression')
    const { uriToBlob } = require('../../../utils/files')
    const { uploadVideo } = require('@my/api')

    // Compression called with recorded URI
    expect(compressVideo).toHaveBeenCalledWith(mockVideoUri)

    // Blob conversion called with compressed URI
    expect(uriToBlob).toHaveBeenCalledWith('file:///compressed/video.mp4')

    // Upload called with proper payload
    expect(uploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.any(Blob),
        originalFilename: 'recorded_video.mp4',
        durationSeconds: 30,
        format: 'mp4',
        onProgress: expect.any(Function),
        onError: expect.any(Function),
        onUploadInitialized: expect.any(Function),
      })
    )

    // Analysis is now auto-started server-side after upload (not called from client)

    // Navigates to analysis screen immediately
    expect(mockProps.onNavigateToVideoAnalysis).toHaveBeenCalledWith(mockVideoUri)
  })
})
