/**
 * Hook for processing uploaded videos with pose detection
 * Integrates video processing service with analysis service
 */

import {
  PoseData,
  computeVideoTimingParams,
  createAnalysisJobWithPoseProcessing,
  startGeminiVideoAnalysis,
  updateAnalysisJobWithPoseData,
} from '@my/api'
import { log } from '@my/logging'
import { useCallback, useState } from 'react'
import type { PoseDetectionResult, PoseKeypointName } from '../features/CameraRecording/types/pose'
import { VideoProcessingProgress, videoProcessingService } from '../services/videoProcessingService'

export interface VideoProcessingState {
  isProcessing: boolean
  progress: VideoProcessingProgress | null
  error: string | null
  analysisJobId: number | null
}

export interface VideoProcessingResult {
  analysisJobId: number
  poseData: PoseDetectionResult[]
  metadata: {
    totalFrames: number
    processedFrames: number
    averageConfidence: number
    processingTime: number
  }
}

/**
 * Hook for processing uploaded videos with pose detection
 */
export function useVideoProcessing() {
  const [state, setState] = useState<VideoProcessingState>({
    isProcessing: false,
    progress: null,
    error: null,
    analysisJobId: null,
  })

  const processVideo = useCallback(
    async (videoRecordingId: number, videoPath: string): Promise<VideoProcessingResult> => {
      setState({
        isProcessing: true,
        progress: null,
        error: null,
        analysisJobId: null,
      })

      try {
        log.info(`Starting video processing for recording ${videoRecordingId}: ${videoPath}`)

        // Step 1: Create analysis job
        const analysisJob = await createAnalysisJobWithPoseProcessing(videoRecordingId)
        setState((prev) => ({ ...prev, analysisJobId: analysisJob.id }))

        log.info(`Created analysis job ${analysisJob.id} for video processing`)

        // Step 2: Set up progress tracking
        videoProcessingService.onProgress((progress) => {
          setState((prev) => ({ ...prev, progress }))
        })

        // Step 3: Process video for pose detection
        const result = await videoProcessingService.processVideoForPoseDetection(videoPath)

        // Step 4: Convert pose data to analysis service format
        const poseData: PoseData = {
          frames: result.poseData.map((frame) => ({
            timestamp: frame.timestamp,
            keypoints: frame.keypoints.map((kp, index) => ({
              x: kp.x,
              y: kp.y,
              confidence: kp.confidence,
              name: `keypoint_${index}`, // Add a default name for each keypoint
            })),
          })),
          metadata: {
            fps: result.metadata.frameRate,
            duration: result.metadata.totalFrames / result.metadata.frameRate,
            total_frames: result.metadata.totalFrames,
          },
        }

        // Step 5: Update analysis job with pose data
        await updateAnalysisJobWithPoseData(analysisJob.id, poseData)

        // Step 6: Compute video timing parameters and start AI analysis
        const videoDuration = poseData.metadata.duration
        const timingParams = computeVideoTimingParams(videoDuration)

        log.info(`Computed timing params for video analysis`, {
          duration: videoDuration,
          feedbackCount: timingParams.feedbackCount,
          targetTimestamps: timingParams.targetTimestamps,
        })

        // Start Gemini video analysis with computed timing parameters
        const analysisResponse = await startGeminiVideoAnalysis({
          videoPath,
          userId: 'current-user', // TODO: Get from auth context
          videoSource: 'uploaded_video',
          timingParams,
        })

        log.info(`AI analysis started for job ${analysisJob.id}`, {
          analysisId: analysisResponse.analysisId,
          status: analysisResponse.status,
        })

        // Step 7: Clean up
        videoProcessingService.cleanup()

        setState({
          isProcessing: false,
          progress: null,
          error: null,
          analysisJobId: analysisJob.id,
        })

        // Convert pose data to PoseDetectionResult format
        const poseDetectionResults: PoseDetectionResult[] = result.poseData.map(
          (frame, frameIndex) => ({
            keypoints: frame.keypoints.map((kp, index) => ({
              x: kp.x,
              y: kp.y,
              confidence: kp.confidence,
              name: (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'][index] ||
                'nose') as PoseKeypointName,
            })),
            confidence:
              frame.keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / frame.keypoints.length,
            timestamp: frame.timestamp,
            frameId: `frame_${frameIndex}`,
          })
        )

        return {
          analysisJobId: analysisJob.id,
          poseData: poseDetectionResults,
          metadata: result.metadata,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        log.error('Video processing failed', error)

        setState({
          isProcessing: false,
          progress: null,
          error: errorMessage,
          analysisJobId: null,
        })

        throw error
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: null,
      error: null,
      analysisJobId: null,
    })
  }, [])

  return {
    ...state,
    processVideo,
    reset,
  }
}
