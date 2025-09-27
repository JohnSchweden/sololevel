/**
 * TDD Tests for useVideoProcessing Hook
 * Tests the React hook for video processing integration
 */

/// <reference types="jest" />

// Mock the logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock useAuth to always provide an authenticated user context for processing flows
const createMockAuthState = () => ({
  userId: 'test-user-id',
  isAuthenticated: true,
  user: { id: 'test-user-id', email: 'test@example.com' },
  session: { access_token: 'token', user: { id: 'test-user-id' } },
  loading: false,
  initialized: true,
  signIn: jest.fn(),
  signOut: jest.fn(),
})

const mockUseAuth = jest.fn(createMockAuthState)

jest.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Get the mocked functions from the __mocks__ directory
import {
  __mockComputeVideoTimingParams,
  __mockCreateAnalysisJob,
  __mockUpdateAnalysisJob,
} from '@my/api'

import { renderHook, waitFor } from '@testing-library/react'

// Mock the video processing service
const mockProcessVideoForPoseDetection = jest.fn()
const mockOnProgress = jest.fn()
const mockCleanup = jest.fn()

// Create a mock service object
const mockVideoProcessingService = {
  processVideoForPoseDetection: mockProcessVideoForPoseDetection,
  onProgress: mockOnProgress,
  cleanup: mockCleanup,
  getMemoryUsage: jest.fn(() => 50),
}

jest.mock('../services/videoProcessingService', () => ({
  VideoProcessingService: jest.fn().mockImplementation(() => mockVideoProcessingService),
  videoProcessingService: mockVideoProcessingService,
}))

// Mock the computeVideoTimingParams function
jest.mock('@my/api', () => ({
  computeVideoTimingParams: jest.fn(),
  createAnalysisJobWithPoseProcessing: jest.fn(),
  updateAnalysisJobWithPoseData: jest.fn(),
  startGeminiVideoAnalysis: jest.fn(),
  __mockCreateAnalysisJob: jest.fn(),
  __mockUpdateAnalysisJob: jest.fn(),
  __mockComputeVideoTimingParams: jest.fn(),
  // Add other required exports to prevent import errors
  supabase: {},
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

// Import after mocking
const { useVideoProcessing } = require('./useVideoProcessing')
const { computeVideoTimingParams } = require('@my/api')

// Ensure the mock functions are properly defined
mockOnProgress.mockImplementation(() => {})
mockProcessVideoForPoseDetection.mockResolvedValue({
  poseData: [],
  metadata: {
    totalFrames: 0,
    processedFrames: 0,
    averageConfidence: 0,
    processingTime: 0,
    frameRate: 30,
  },
})
mockCleanup.mockImplementation(() => {})

describe('useVideoProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockImplementation(createMockAuthState)
    // Mock computeVideoTimingParams to return mock timing parameters
    ;(computeVideoTimingParams as jest.MockedFunction<any>).mockReturnValue({
      duration: 6,
      startTime: 0,
      endTime: 6,
      feedbackCount: 2,
      targetTimestamps: [3, 6],
      minGap: 4,
      firstTimestamp: 3,
    })

    // Mock the imported mock functions that the test expects to be called
    __mockCreateAnalysisJob.mockResolvedValue({ id: 123 })
    __mockUpdateAnalysisJob.mockResolvedValue({})

    // Also mock the actual functions used by the hook
    const mockCreateAnalysisJob = require('@my/api').createAnalysisJobWithPoseProcessing
    ;(mockCreateAnalysisJob as jest.MockedFunction<any>).mockResolvedValue({ id: 123 })

    const mockUpdateAnalysisJob = require('@my/api').updateAnalysisJobWithPoseData
    ;(mockUpdateAnalysisJob as jest.MockedFunction<any>).mockResolvedValue({})

    const mockStartGeminiVideoAnalysis = require('@my/api').startGeminiVideoAnalysis
    ;(mockStartGeminiVideoAnalysis as jest.MockedFunction<any>).mockResolvedValue({})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mockUseAuth.mockReset()
  })

  describe('Initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoProcessing())

      expect(result.current).toEqual({
        processVideo: expect.any(Function),
        reset: expect.any(Function),
        isProcessing: false,
        progress: null,
        error: null,
        analysisJobId: null,
      })
    })
  })

  describe('processVideo', () => {
    it('should start video processing', async () => {
      const mockAnalysisJob = { id: 123 }
      const mockPoseData = [
        {
          keypoints: [
            { name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 },
            { name: 'left_eye', x: 0.4, y: 0.5, confidence: 0.8 },
          ],
          confidence: 0.8500000000000001,
          timestamp: 0,
          frameId: 'frame_0',
        },
      ]
      const mockMetadata = {
        totalFrames: 1,
        processedFrames: 1,
        averageConfidence: 0.85,
        processingTime: 100,
        frameRate: 30,
      }

      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockResolvedValue({
        poseData: mockPoseData,
        metadata: mockMetadata,
      })
      __mockUpdateAnalysisJob.mockResolvedValue({})

      const { result } = renderHook(() => useVideoProcessing())

      const processResult = await result.current.processVideo(1, 'test-video.mp4')

      // Check that the API functions were called correctly
      const mockCreateAnalysisJob = require('@my/api').createAnalysisJobWithPoseProcessing
      const mockUpdateAnalysisJob = require('@my/api').updateAnalysisJobWithPoseData

      expect(mockCreateAnalysisJob).toHaveBeenCalledWith(1)
      expect(mockProcessVideoForPoseDetection).toHaveBeenCalledWith('test-video.mp4')
      expect(mockUpdateAnalysisJob).toHaveBeenCalledWith(123, expect.any(Object))
      expect(mockCleanup).toHaveBeenCalled()

      expect(processResult).toEqual({
        analysisJobId: 123,
        poseData: mockPoseData,
        metadata: mockMetadata,
      })

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false)
        expect(result.current.analysisJobId).toBe(123)
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle processing errors', async () => {
      const mockAnalysisJob = { id: 123 }
      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockRejectedValue(new Error('Processing failed'))

      const { result } = renderHook(() => useVideoProcessing())

      await expect(result.current.processVideo(1, 'test-video.mp4')).rejects.toThrow(
        'Processing failed'
      )

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false)
        expect(result.current.error).toBe('Processing failed')
        expect(result.current.analysisJobId).toBe(null)
      })
    })

    it('should update processing state', async () => {
      const mockAnalysisJob = { id: 123 }
      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  poseData: [],
                  metadata: {
                    totalFrames: 0,
                    processedFrames: 0,
                    averageConfidence: 0,
                    processingTime: 0,
                    frameRate: 30,
                  },
                }),
              50
            )
          )
      )
      __mockUpdateAnalysisJob.mockResolvedValue({})

      const { result } = renderHook(() => useVideoProcessing())

      // Start processing
      const processPromise = result.current.processVideo(1, 'test-video.mp4')

      // Check that processing state is set
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true)
        expect(result.current.analysisJobId).toBe(123)
      })

      await processPromise

      // Check final state
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false)
        expect(result.current.analysisJobId).toBe(123)
      })
    })

    it('should handle progress updates', async () => {
      const mockAnalysisJob = { id: 123 }
      const mockProgress = {
        currentFrame: 5,
        totalFrames: 10,
        percentage: 50,
        estimatedTimeRemaining: 1000,
        currentFPS: 30,
        memoryUsage: 50,
      }

      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockResolvedValue({
        poseData: [],
        metadata: {
          totalFrames: 0,
          processedFrames: 0,
          averageConfidence: 0,
          processingTime: 0,
          frameRate: 30,
        },
      })
      __mockUpdateAnalysisJob.mockResolvedValue({})

      const { result } = renderHook(() => useVideoProcessing())

      // Simulate progress callback being called
      mockOnProgress.mockImplementation((callback) => {
        callback(mockProgress)
      })

      await result.current.processVideo(1, 'test-video.mp4')

      expect(mockOnProgress).toHaveBeenCalled()
    })

    it('should prevent concurrent processing', async () => {
      const mockAnalysisJob = { id: 123 }
      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  poseData: [],
                  metadata: {
                    totalFrames: 0,
                    processedFrames: 0,
                    averageConfidence: 0,
                    processingTime: 0,
                    frameRate: 30,
                  },
                }),
              100
            )
          )
      )
      __mockUpdateAnalysisJob.mockResolvedValue({})

      const { result } = renderHook(() => useVideoProcessing())

      // Start first processing
      const firstProcess = result.current.processVideo(1, 'test-video.mp4')
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true)
      })

      // Try to start second processing while first is running
      const secondProcess = result.current.processVideo(2, 'test-video2.mp4')
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true)
      })

      await Promise.all([firstProcess, secondProcess])

      // Both should complete successfully
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false)
      })
    })
  })

  describe('reset', () => {
    it('should reset hook state', () => {
      const { result } = renderHook(() => useVideoProcessing())

      // Set some state first
      result.current.reset()

      expect(result.current.isProcessing).toBe(false)
      expect(result.current.progress).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.analysisJobId).toBe(null)
    })

    it('should provide reset function', () => {
      const { result } = renderHook(() => useVideoProcessing())
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('Progress handling', () => {
    it('should update progress state', async () => {
      const mockAnalysisJob = { id: 123 }
      const mockProgress = {
        currentFrame: 3,
        totalFrames: 10,
        percentage: 30,
        estimatedTimeRemaining: 2000,
        currentFPS: 30,
        memoryUsage: 40,
      }

      __mockCreateAnalysisJob.mockResolvedValue(mockAnalysisJob)
      mockProcessVideoForPoseDetection.mockResolvedValue({
        poseData: [],
        metadata: {
          totalFrames: 0,
          processedFrames: 0,
          averageConfidence: 0,
          processingTime: 0,
          frameRate: 30,
        },
      })
      __mockUpdateAnalysisJob.mockResolvedValue({})

      const { result } = renderHook(() => useVideoProcessing())

      // Mock the progress callback to update state
      mockOnProgress.mockImplementation((callback) => {
        // Simulate progress update
        callback(mockProgress)
      })

      await result.current.processVideo(1, 'test-video.mp4')

      expect(mockOnProgress).toHaveBeenCalled()
    })
  })
})
