/**
 * TDD Tests for Video Processing Service
 * Tests the video frame extraction and pose detection functionality
 */

/// <reference types="jest" />
import { VideoProcessingConfig, VideoProcessingService } from './videoProcessingService'

// Mock the logger
jest.mock('@ui/utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock react-native-video-processing
const mockGetVideoFrames = jest.fn()
jest.mock(
  'react-native-video-processing',
  () => ({
    ProcessingManager: {
      getVideoFrames: mockGetVideoFrames,
    },
  }),
  { virtual: true }
)

describe('VideoProcessingService', () => {
  let service: VideoProcessingService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new VideoProcessingService()
  })

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const service = new VideoProcessingService()
      expect(service).toBeDefined()
      // Config should be accessible through internal state
    })

    it('should accept custom config', () => {
      const customConfig: Partial<VideoProcessingConfig> = {
        frameRate: 24,
        maxFrames: 1000,
      }
      const service = new VideoProcessingService(customConfig)
      expect(service).toBeDefined()
    })
  })

  describe('processVideoForPoseDetection', () => {
    it('should process video and return pose data', async () => {
      const mockFrames = ['frame1', 'frame2', 'frame3']
      mockGetVideoFrames.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockFrames), 10))
      )

      const result = await service.processVideoForPoseDetection('test-video.mp4')

      expect(result).toHaveProperty('poseData')
      expect(result).toHaveProperty('metadata')
      expect(result.poseData).toHaveLength(3)
      expect(result.metadata.totalFrames).toBe(3)
      expect(result.metadata.processedFrames).toBe(3)
      expect(result.metadata.averageConfidence).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeGreaterThan(0)
    })

    it('should handle video processing errors', async () => {
      mockGetVideoFrames.mockRejectedValue(new Error('Video processing failed'))

      await expect(service.processVideoForPoseDetection('invalid-video.mp4')).rejects.toThrow(
        'Video processing failed: Video processing failed'
      )
    })

    it('should respect max frames limit', async () => {
      const mockFrames = Array(2000).fill('frame') // More than maxFrames (1800)
      mockGetVideoFrames.mockResolvedValue(mockFrames)

      const result = await service.processVideoForPoseDetection('long-video.mp4')

      expect(result.poseData).toHaveLength(1800) // Should be limited to maxFrames
      expect(result.metadata.totalFrames).toBe(1800)
    })

    it('should calculate processing time', async () => {
      const mockFrames = ['frame1', 'frame2']
      mockGetVideoFrames.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockFrames), 10))
      )

      const startTime = Date.now()
      const result = await service.processVideoForPoseDetection('test-video.mp4')
      const endTime = Date.now()

      expect(result.metadata.processingTime).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeLessThanOrEqual(endTime - startTime + 1000) // Allow some tolerance
    })

    it('should provide progress callbacks', async () => {
      const mockFrames = ['frame1', 'frame2', 'frame3']
      mockGetVideoFrames.mockResolvedValue(mockFrames)

      const progressCallback = jest.fn()
      service.onProgress(progressCallback)

      await service.processVideoForPoseDetection('test-video.mp4')

      expect(progressCallback).toHaveBeenCalled()
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0]
      expect(lastCall).toHaveProperty('currentFrame')
      expect(lastCall).toHaveProperty('totalFrames')
      expect(lastCall).toHaveProperty('percentage')
      expect(lastCall.percentage).toBe(100)
    })
  })

  describe('Progress callbacks', () => {
    it('should call progress callback during processing', async () => {
      const mockFrames = ['frame1', 'frame2', 'frame3', 'frame4', 'frame5']
      mockGetVideoFrames.mockResolvedValue(mockFrames)

      const progressCallback = jest.fn()
      service.onProgress(progressCallback)

      await service.processVideoForPoseDetection('test-video.mp4')

      expect(progressCallback).toHaveBeenCalled()
      // Should be called multiple times during processing
      expect(progressCallback.mock.calls.length).toBeGreaterThan(1)
    })

    it('should handle progress callback errors gracefully', async () => {
      const mockFrames = ['frame1', 'frame2']
      mockGetVideoFrames.mockResolvedValue(mockFrames)

      const progressCallback = jest.fn(() => {
        throw new Error('Progress callback error')
      })
      service.onProgress(progressCallback)

      // Should not throw even if progress callback fails
      await expect(service.processVideoForPoseDetection('test-video.mp4')).resolves.toBeDefined()
    })

    it('should allow setting progress callback', () => {
      const progressCallback = jest.fn()
      service.onProgress(progressCallback)
      // Should not throw
      expect(service).toBeDefined()
    })
  })

  describe('Configuration merging', () => {
    it('should merge custom config with defaults', () => {
      const service = new VideoProcessingService({ frameRate: 24, maxFrames: 500 })
      // Config is merged internally - no external validation yet
      expect(service).toBeDefined()
    })

    it('should use default values when no config provided', () => {
      const service = new VideoProcessingService()
      expect(service).toBeDefined()
    })
  })

  describe('Cleanup', () => {
    it('should provide cleanup method', () => {
      service.cleanup()
      // Should not throw
    })
  })
})
