/**
 * Type Adapter for MVP Pose Detection
 * Converts MVP pose types to production pose types for component compatibility
 */

import type { MVPPoseDetectionResult, MVPPoseKeypoint } from '../types/MVPpose'
import type { PoseDetectionResult, PoseKeypoint } from '../types/pose'

/**
 * Convert MVP pose detection result to production pose detection result
 * This allows MVP hooks to work with existing production-ready UI components
 */
export function adaptMVPPoseToProduction(mvpPose: MVPPoseDetectionResult): PoseDetectionResult {
  const adaptedKeypoints: PoseKeypoint[] = mvpPose.keypoints.map(
    (mvpKeypoint: MVPPoseKeypoint) => ({
      name: mvpKeypoint.name as any, // MVP and production use same keypoint names
      x: mvpKeypoint.x,
      y: mvpKeypoint.y,
      confidence: mvpKeypoint.confidence,
    })
  )

  return {
    keypoints: adaptedKeypoints,
    confidence: mvpPose.confidence,
    timestamp: mvpPose.timestamp,
    // frameId is optional in production type, not needed for MVP
  }
}

/**
 * Convert production pose detection result to MVP pose detection result
 * Useful for testing or when transitioning from production to MVP mode
 */
export function adaptProductionPoseToMVP(
  productionPose: PoseDetectionResult
): MVPPoseDetectionResult {
  const adaptedKeypoints: MVPPoseKeypoint[] = productionPose.keypoints.map(
    (keypoint: PoseKeypoint) => ({
      name: keypoint.name as any, // Production and MVP use same keypoint names
      x: keypoint.x,
      y: keypoint.y,
      confidence: keypoint.confidence,
    })
  )

  return {
    keypoints: adaptedKeypoints,
    confidence: productionPose.confidence,
    timestamp: productionPose.timestamp,
  }
}

/**
 * Check if MVP pose result is compatible with production components
 */
export function isMVPPoseCompatible(mvpPose: MVPPoseDetectionResult): boolean {
  return (
    mvpPose &&
    Array.isArray(mvpPose.keypoints) &&
    typeof mvpPose.confidence === 'number' &&
    typeof mvpPose.timestamp === 'number' &&
    mvpPose.keypoints.every(
      (kp) =>
        typeof kp.x === 'number' &&
        typeof kp.y === 'number' &&
        typeof kp.confidence === 'number' &&
        typeof kp.name === 'string'
    )
  )
}
