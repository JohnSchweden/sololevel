import { type PoseDetectionResult } from '../types/ai-analyze-video.ts'

export function unifyPoseDataFormat(
  poseData: PoseDetectionResult[],
  videoSource: string
): PoseDetectionResult[] {
  return poseData.map((frame) => ({
    ...frame,
    metadata: {
      ...frame.metadata,
      source: videoSource as 'live_recording' | 'uploaded_video',
      processingMethod:
        videoSource === 'live_recording'
          ? ('vision_camera' as const)
          : ('video_processing' as const),
    },
  }))
}

export function calculateAverageConfidence(poseData: PoseDetectionResult[]): number {
  if (poseData.length === 0) return 0
  const totalConfidence = poseData.reduce((sum, pose) => sum + pose.confidence, 0)
  return totalConfidence / poseData.length
}
