/**
 * Unified Pose Detection Hook for Phase 3 AI Integration
 * Cross-platform interface for MoveNet Lightning pose detection
 * Automatically delegates to native or web implementation
 */

import { Platform } from 'react-native'
import { getOptimalPoseConfig } from '../config/poseDetectionConfig'
// Platform-specific imports will be resolved at runtime
// import { usePoseDetectionNative } from './usePoseDetection.native';
// import { usePoseDetectionWeb } from './usePoseDetection.web';
import type { PoseDetectionConfig, PoseDetectionResult, UsePoseDetection } from '../types/pose'

/**
 * Unified pose detection hook that works across platforms
 */
export function usePoseDetection(initialConfig?: Partial<PoseDetectionConfig>): UsePoseDetection {
  const isNative = Platform.OS !== 'web'

  // Get optimal configuration for current platform
  const defaultConfig = getOptimalPoseConfig()
  const config = initialConfig ? { ...defaultConfig, ...initialConfig } : defaultConfig

  // Delegate to platform-specific implementation
  if (isNative) {
    // Dynamic import for native implementation
    const { usePoseDetectionNative } = require('./usePoseDetection.native')
    return usePoseDetectionNative(config)
  }

  // Dynamic import for web implementation
  const { usePoseDetectionWeb } = require('./usePoseDetection.web')
  return usePoseDetectionWeb(config)
}

/**
 * Hook for pose detection with performance monitoring integration
 */
export function usePoseDetectionWithPerformance(initialConfig?: Partial<PoseDetectionConfig>) {
  const poseDetection = usePoseDetection(initialConfig)

  // TODO: Integrate with performance store from Phase 2
  // This will be implemented when performance store integration is ready

  return {
    ...poseDetection,

    // Additional performance-aware methods
    adaptToPerformance: (performanceMetrics: any) => {
      // Adjust pose detection settings based on system performance
      // Example adaptive logic (to be refined)
      const currentConfig = poseDetection.state.config
      if (performanceMetrics.cpuUsage > 80) {
        poseDetection.updateConfig({
          targetFps: Math.max(15, currentConfig.targetFps - 5),
          enableGpuAcceleration: false,
        })
      } else if (performanceMetrics.cpuUsage < 50) {
        poseDetection.updateConfig({
          targetFps: Math.min(30, currentConfig.targetFps + 5),
          enableGpuAcceleration: true,
        })
      }
    },

    adaptToThermalState: (thermalState: 'normal' | 'fair' | 'serious' | 'critical') => {
      switch (thermalState) {
        case 'critical':
          poseDetection.stopDetection()
          break
        case 'serious':
          poseDetection.updateConfig({
            targetFps: 15,
            enableGpuAcceleration: false,
            enableMultiThreading: false,
          })
          break
        case 'fair':
          poseDetection.updateConfig({
            targetFps: 24,
            enableGpuAcceleration: true,
            enableMultiThreading: true,
          })
          break
        case 'normal':
          poseDetection.updateConfig({
            targetFps: 30,
            enableGpuAcceleration: true,
            enableMultiThreading: true,
          })
          break
      }
    },

    adaptToBatteryLevel: (batteryLevel: number) => {
      if (batteryLevel < 10) {
        poseDetection.stopDetection()
      } else if (batteryLevel < 20) {
        poseDetection.updateConfig({
          targetFps: 15,
          enableGpuAcceleration: false,
        })
      } else if (batteryLevel < 50) {
        poseDetection.updateConfig({
          targetFps: 24,
          enableGpuAcceleration: true,
        })
      } else {
        poseDetection.updateConfig({
          targetFps: 30,
          enableGpuAcceleration: true,
        })
      }
    },
  }
}

/**
 * Utility functions for pose detection
 */
export const PoseDetectionUtils = {
  /**
   * Check if pose detection is supported on current platform
   */
  isSupported: (): boolean => {
    if (Platform.OS === 'web') {
      // Check for WebGL support
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return !!gl
      } catch {
        return false
      }
    } else {
      // Assume native platforms support TensorFlow Lite
      return true
    }
  },

  /**
   * Get platform-specific capabilities
   */
  getCapabilities: () => {
    const isNative = Platform.OS !== 'web'

    return {
      platform: isNative ? 'native' : 'web',
      supportsGpuAcceleration: isNative || PoseDetectionUtils.hasWebGLSupport(),
      supportsMultiThreading: isNative || PoseDetectionUtils.hasWebWorkerSupport(),
      supportsBackgroundProcessing: isNative,
      maxInputResolution: isNative ? { width: 512, height: 512 } : { width: 256, height: 256 },
      recommendedFps: isNative ? 30 : 24,
    }
  },

  /**
   * Check WebGL support for web platform
   */
  hasWebGLSupport: (): boolean => {
    if (typeof window === 'undefined') return false

    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  },

  /**
   * Check Web Worker support for web platform
   */
  hasWebWorkerSupport: (): boolean => {
    return typeof Worker !== 'undefined'
  },

  /**
   * Validate pose detection result
   */
  validatePoseResult: (pose: PoseDetectionResult): boolean => {
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      return false
    }

    // Check if all keypoints have valid coordinates
    return pose.keypoints.every(
      (keypoint) =>
        keypoint.x >= 0 &&
        keypoint.x <= 1 &&
        keypoint.y >= 0 &&
        keypoint.y <= 1 &&
        keypoint.confidence >= 0 &&
        keypoint.confidence <= 1
    )
  },

  /**
   * Filter poses by confidence threshold
   */
  filterByConfidence: (poses: PoseDetectionResult[], threshold: number): PoseDetectionResult[] => {
    return poses.filter((pose) => pose.confidence >= threshold)
  },

  /**
   * Calculate pose similarity between two poses
   */
  calculatePoseSimilarity: (pose1: PoseDetectionResult, pose2: PoseDetectionResult): number => {
    if (pose1.keypoints.length !== pose2.keypoints.length) {
      return 0
    }

    let totalDistance = 0
    let validKeypoints = 0

    for (let i = 0; i < pose1.keypoints.length; i++) {
      const kp1 = pose1.keypoints[i]
      const kp2 = pose2.keypoints[i]

      // Only compare keypoints with sufficient confidence
      if (kp1.confidence > 0.3 && kp2.confidence > 0.3) {
        const distance = Math.sqrt((kp1.x - kp2.x) ** 2 + (kp1.y - kp2.y) ** 2)
        totalDistance += distance
        validKeypoints++
      }
    }

    if (validKeypoints === 0) return 0

    const averageDistance = totalDistance / validKeypoints
    // Convert distance to similarity (0-1, where 1 is identical)
    return Math.max(0, 1 - averageDistance)
  },

  /**
   * Smooth pose data using temporal filtering
   */
  smoothPoses: (poses: PoseDetectionResult[], smoothingFactor = 0.7): PoseDetectionResult[] => {
    if (poses.length < 2) return poses

    const smoothedPoses = [poses[0]] // First pose remains unchanged

    for (let i = 1; i < poses.length; i++) {
      const currentPose = poses[i]
      const previousPose = smoothedPoses[i - 1]

      const smoothedKeypoints = currentPose.keypoints.map((keypoint, idx) => {
        const prevKeypoint = previousPose.keypoints[idx]

        return {
          ...keypoint,
          x: prevKeypoint.x * smoothingFactor + keypoint.x * (1 - smoothingFactor),
          y: prevKeypoint.y * smoothingFactor + keypoint.y * (1 - smoothingFactor),
          confidence: Math.max(prevKeypoint.confidence, keypoint.confidence),
        }
      })

      smoothedPoses.push({
        ...currentPose,
        keypoints: smoothedKeypoints,
        confidence: Math.max(previousPose.confidence, currentPose.confidence),
      })
    }

    return smoothedPoses
  },
}

/**
 * Export platform-specific hooks for direct use if needed
 * Note: These are dynamic imports and may not be available at compile time
 */
// export { usePoseDetectionNative } from './usePoseDetection.native';
// export { usePoseDetectionWeb } from './usePoseDetection.web';
