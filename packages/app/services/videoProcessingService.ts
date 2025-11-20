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
  // Post-MVP: Keep for API compatibility
  // @ts-expect-error - unused private field, kept for future post-MVP implementation
  private progressCallback?: ProgressCallback

  constructor(config: VideoProcessingConfig = {}) {
    this.config = {
      maxFrames: config.maxFrames ?? 1800,
      frameRate: config.frameRate ?? 30,
      quality: config.quality ?? 'medium',
      enableProgress: config.enableProgress ?? true,
    }
  }

  // Post-MVP: Keep method signature for API compatibility, but no-op
  onProgress(_callback: ProgressCallback): void {
    // No-op: pose detection is post-MVP
  }

  async processVideoForPoseDetection(videoPath: string): Promise<ProcessingResult> {
    log.info('videoProcessingService', 'Video processing requested', {
      videoPath,
      config: this.config,
    })

    // Post-MVP: react-native-video-processing is excluded from build
    // Pose detection will be implemented post-MVP
    const error = new Error(
      'Video processing for pose detection is not available. This is a post-MVP feature.'
    )

    log.error('videoProcessingService', 'Video processing not available (post-MVP)', {
      videoPath,
      error: error.message,
    })

    throw error
  }

  // Post-MVP: Method kept for future implementation
  // @ts-expect-error - unused private method, kept for future post-MVP implementation
  private simulatePoseDetection(
    _frame: unknown
  ): Array<{ x: number; y: number; confidence: number }> {
    // Simulate pose detection keypoints (17 keypoints for human pose)
    // Will be implemented post-MVP
    return []
  }

  getMemoryUsage(): number {
    // Simulate memory usage in MB
    return Math.random() * 100 + 50
  }

  cleanup(): void {
    this.progressCallback = undefined
    log.info('videoProcessingService', 'Video processing service cleaned up')
  }
}

// Export singleton instance
export const videoProcessingService = new VideoProcessingService()
