/**
 * Video Processing Service
 * Handles video frame extraction and pose detection processing
 */

import { log } from '@my/logging'

export interface VideoProcessingConfig {
  maxFrames?: number
  frameRate?: number
  quality?: 'low' | 'medium' | 'high'
  enableProgress?: boolean
}

export interface PoseData {
  keypoints: Array<{
    x: number
    y: number
    confidence: number
  }>
  timestamp: number
  frameIndex: number
}

export interface ProcessingMetadata {
  totalFrames: number
  processedFrames: number
  averageConfidence: number
  processingTime: number
  frameRate: number
}

export interface ProcessingResult {
  poseData: PoseData[]
  metadata: ProcessingMetadata
}

export type VideoProcessingProgress = {
  currentFrame: number
  totalFrames: number
  percentage: number
  estimatedTimeRemaining: number
  currentFPS: number
  memoryUsage: number
}

export type ProgressCallback = (progress: VideoProcessingProgress) => void

export class VideoProcessingService {
  private config: Required<VideoProcessingConfig>
  private progressCallback?: ProgressCallback

  constructor(config: VideoProcessingConfig = {}) {
    this.config = {
      maxFrames: config.maxFrames ?? 1800,
      frameRate: config.frameRate ?? 30,
      quality: config.quality ?? 'medium',
      enableProgress: config.enableProgress ?? true,
    }
  }

  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  private async getProcessingManager() {
    // In test environment, use the mocked version
    if (process.env.NODE_ENV === 'test') {
      const { ProcessingManager } = require('react-native-video-processing')
      return ProcessingManager
    }

    // In production, use dynamic import
    const { ProcessingManager } = await import('react-native-video-processing')
    return ProcessingManager
  }

  async processVideoForPoseDetection(videoPath: string): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      log.info('Starting video processing', { videoPath, config: this.config })

      // Import the processing library dynamically
      const ProcessingManager = await this.getProcessingManager()

      // Get video frames
      const allFrames = await ProcessingManager.getVideoFrames({
        videoPath,
        frameRate: this.config.frameRate,
        quality: this.config.quality,
      })

      // Limit frames to maxFrames
      const frames = allFrames.slice(0, this.config.maxFrames)
      const poseData: PoseData[] = []
      const totalFrames = frames.length
      let processedFrames = 0
      let totalConfidence = 0

      // Process each frame
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]

        // Simulate pose detection (in real implementation, this would call the actual pose detection library)
        const keypoints = this.simulatePoseDetection(frame)
        const confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length

        poseData.push({
          keypoints,
          timestamp: (i / this.config.frameRate) * 1000,
          frameIndex: i,
        })

        processedFrames++
        totalConfidence += confidence

        // Report progress
        if (this.config.enableProgress && this.progressCallback) {
          const currentTime = Date.now()
          const elapsedTime = currentTime - startTime
          const estimatedTimeRemaining =
            (elapsedTime / processedFrames) * (totalFrames - processedFrames)
          const currentFPS = processedFrames / (elapsedTime / 1000)

          try {
            this.progressCallback({
              currentFrame: processedFrames,
              totalFrames,
              percentage: (processedFrames / totalFrames) * 100,
              estimatedTimeRemaining,
              currentFPS,
              memoryUsage: this.getMemoryUsage(),
            })
          } catch (error) {
            log.warn('Progress callback error', { error })
          }
        }
      }

      const processingTime = Date.now() - startTime
      const averageConfidence = totalConfidence / processedFrames

      const result: ProcessingResult = {
        poseData,
        metadata: {
          totalFrames,
          processedFrames,
          averageConfidence,
          processingTime,
          frameRate: this.config.frameRate,
        },
      }

      log.info('Video processing completed', {
        videoPath,
        totalFrames,
        processingTime,
        averageConfidence,
      })

      return result
    } catch (error) {
      log.error('Video processing failed', { videoPath, error })
      throw new Error(
        `Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private simulatePoseDetection(_frame: any): Array<{ x: number; y: number; confidence: number }> {
    // Simulate pose detection keypoints (17 keypoints for human pose)
    const keypoints = []
    for (let i = 0; i < 17; i++) {
      keypoints.push({
        x: Math.random() * 640,
        y: Math.random() * 480,
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      })
    }
    return keypoints
  }

  getMemoryUsage(): number {
    // Simulate memory usage in MB
    return Math.random() * 100 + 50
  }

  cleanup(): void {
    this.progressCallback = undefined
    log.info('Video processing service cleaned up')
  }
}

// Export singleton instance
export const videoProcessingService = new VideoProcessingService()
