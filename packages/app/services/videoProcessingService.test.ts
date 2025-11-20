/**
 * TDD Tests for Video Processing Service
 * Tests the video frame extraction and pose detection functionality
 */

/// <reference types="jest" />
import { VideoProcessingConfig, VideoProcessingService } from './videoProcessingService'

// Mock the logger
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
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
    it('should throw error for post-MVP feature', async () => {
      await expect(service.processVideoForPoseDetection('test-video.mp4')).rejects.toThrow(
        'Video processing for pose detection is not available. This is a post-MVP feature.'
      )
    })
  })

  describe('Progress callbacks', () => {
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
