// @ts-nocheck - POST-MVP: Component disabled, type checking disabled for preserved implementation
/**
 * Native Skia-based Pose Overlay Component
 *
 * POST-MVP: Pose detection feature - see restoration checklist
 * This component renders pose detection overlays using React Native Skia
 * for high-performance native rendering with smooth animations and
 * advanced visual effects.
 *
 * @platform native
 * @requires @shopify/react-native-skia (removed - see docs/migration/pose-detection-packages-restoration-checklist.md)
 */

import {
  DEFAULT_MVP_OVERLAY_CONFIG,
  type MVPPoseConnection,
  type MVPPoseDetectionResult,
  type MVPPoseKeypoint,
  MVP_POSE_CONNECTIONS,
} from '@app/features/CameraRecording/types/MVPpose'
// POST-MVP: @shopify/react-native-skia removed (pose detection feature)
// import {
//   Blur,
//   Canvas,
//   Circle,
//   ColorMatrix,
//   Group,
//   Line,
//   Paint,
//   Path,
//   Skia,
// } from '@shopify/react-native-skia'
import React, { useMemo } from 'react'
import { View } from 'react-native'
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { PoseOverlayUtils } from '../../../utils/PoseOverlayUtils'
import type { PoseOverlayProps } from './PoseOverlay'

/**
 * Skia-specific configuration
 */
interface SkiaOverlayConfig {
  enableGlow: boolean
  enableTrails: boolean
  enableParticles: boolean
  animationDuration: number
  glowRadius: number
  trailLength: number
  particleCount: number
}

/**
 * Native Skia pose overlay component
 */
export function PoseOverlayNative({
  pose,
  config = {},
  width,
  height,
  style,
  onPoseUpdate,
}: PoseOverlayProps) {
  // POST-MVP: Component disabled - @shopify/react-native-skia removed
  // See: docs/migration/pose-detection-packages-restoration-checklist.md
  // Original implementation preserved in git history for future restoration
  // To restore: see docs/migration/pose-detection-packages-restoration-checklist.md
  return null
  // POST-MVP: Original implementation removed - see git history
}

/**
 * Skia-specific utilities for native pose rendering
 * POST-MVP: Commented out - references undefined Skia variable
 * See: docs/migration/pose-detection-packages-restoration-checklist.md
 */
// export const SkiaPoseUtils = {
//   /**
//    * Create animated pose path with morphing
//    */
//   createAnimatedPath: (
//     fromPose: MVPPoseDetectionResult,
//     toPose: MVPPoseDetectionResult,
//     progress: number
//   ) => {
//     const path = Skia.Path.Make()
//
//     // Interpolate between poses
//     const interpolatedPose = PoseOverlayUtils.interpolatePoses(fromPose, toPose, progress)
//
//     // Create path from interpolated pose
//     interpolatedPose.keypoints.forEach((keypoint: MVPPoseKeypoint, index: number) => {
//       if (index === 0) {
//         path.moveTo(keypoint.x, keypoint.y)
//       } else {
//         path.lineTo(keypoint.x, keypoint.y)
//       }
//     })
//
//     return path
//   },
//
//   /**
//    * Create particle system for pose effects
//    */
//   createParticleSystem: (pose: MVPPoseDetectionResult, particleCount: number) => {
//     const particles: Array<{
//       x: number
//       y: number
//       size: number
//       opacity: number
//       velocity: { x: number; y: number }
//     }> = []
//
//     pose.keypoints.forEach((keypoint: MVPPoseKeypoint) => {
//       if (keypoint.confidence > 0.5) {
//         for (let i = 0; i < particleCount / pose.keypoints.length; i++) {
//           particles.push({
//             x: keypoint.x + (Math.random() - 0.5) * 20,
//             y: keypoint.y + (Math.random() - 0.5) * 20,
//             size: Math.random() * 3 + 1,
//             opacity: Math.random() * 0.5 + 0.5,
//             velocity: {
//               x: (Math.random() - 0.5) * 2,
//               y: (Math.random() - 0.5) * 2,
//             },
//           })
//         }
//       }
//     })
//
//     return particles
//   },
//
//   /**
//    * Create trail effect for pose movement
//    */
//   createTrailEffect: (
//     currentPose: MVPPoseDetectionResult,
//     previousPoses: MVPPoseDetectionResult[],
//     trailLength: number
//   ) => {
//     const trails: MVPPoseKeypoint[][] = []
//
//     currentPose.keypoints.forEach((keypoint: MVPPoseKeypoint, keypointIndex: number) => {
//       const trail = [keypoint]
//
//       // Add previous positions
//       for (let i = 0; i < Math.min(trailLength, previousPoses.length); i++) {
//         const prevPose = previousPoses[previousPoses.length - 1 - i]
//         if (prevPose && prevPose.keypoints[keypointIndex]) {
//           trail.push(prevPose.keypoints[keypointIndex])
//         }
//       }
//
//       trails.push(trail)
//     })
//
//     return trails
//   },
//
//   /**
//    * Optimize Skia rendering for performance
//    */
//   optimizeForPerformance: (pose: MVPPoseDetectionResult) => {
//     // Reduce keypoint count for low-end devices
//     const highConfidenceKeypoints = pose.keypoints.filter(
//       (kp: MVPPoseKeypoint) => kp.confidence > 0.7
//     )
//
//     return {
//       ...pose,
//       keypoints: highConfidenceKeypoints.length > 5 ? highConfidenceKeypoints : pose.keypoints,
//     }
//   },
// }

// Export both the specific implementation and the generic name for compatibility
export { PoseOverlayNative as PoseOverlay }
export default PoseOverlayNative
