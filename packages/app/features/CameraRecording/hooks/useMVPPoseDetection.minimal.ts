/**
 * POST-MVP: Pose detection hooks - see restoration checklist
 * See: docs/migration/pose-detection-packages-restoration-checklist.md
 */

// Use logger instead of console
import { log } from '@my/logging'

log.debug('useMVPPoseDetection', '🔍 MINIMAL: Module loading START')

import { useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'

// Test adding the types import that might be causing the issue
import type {
  MVPPoseDetectionConfig,
  MVPPoseDetectionResult,
  MVPPoseDetectionState,
  UseMVPPoseDetection,
} from '../types/MVPpose'
import { DEFAULT_MVP_POSE_CONFIG } from '../types/MVPpose'

export function useMVPPoseDetection(initialConfig?: Partial<MVPPoseDetectionConfig>) {
  // Removed excessive logging

  const isNative = Platform.OS !== 'web'

  const [config] = useState<MVPPoseDetectionConfig>(() => ({
    ...DEFAULT_MVP_POSE_CONFIG,
    ...initialConfig,
  }))

  const [state, setState] = useState<MVPPoseDetectionState>({
    isInitialized: false,
    isDetecting: false,
    isEnabled: true,
    currentPose: null,
    config,
    error: null,
  })

  const detectionRef = useRef<any>(null)
  const currentPoseRef = useRef<MVPPoseDetectionResult | null>(null)

  const startDetection = useCallback(async (): Promise<void> => {
    log.debug('useMVPPoseDetection', '🔍 MINIMAL: startDetection called')

    try {
      if (!state.isEnabled) {
        throw new Error('Pose detection is disabled')
      }

      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }))

      // Delegate to platform-specific implementation
      if (isNative) {
        const { startMVPPoseDetectionNative } = require('./useMVPPoseDetection.native')
        detectionRef.current = await startMVPPoseDetectionNative(
          config,
          (pose: MVPPoseDetectionResult) => {
            currentPoseRef.current = pose
            setState((prev) => ({
              ...prev,
              currentPose: pose,
              isInitialized: true,
            }))
            // Debug actual pose data structure - throttled logging
            if (pose && pose.keypoints && Math.random() < 0.1) {
              // Only log 10% of poses
              log.debug('useMVPPoseDetection', '🔍 POSE DATA', {
                keypointCount: pose.keypoints.length,
                confidence: pose.confidence.toFixed(3),
                nose: pose.keypoints.find((kp) => kp.name === 'nose'),
                leftWrist: pose.keypoints.find((kp) => kp.name === 'left_wrist'),
                rightWrist: pose.keypoints.find((kp) => kp.name === 'right_wrist'),
                leftEye: pose.keypoints.find((kp) => kp.name === 'left_eye'),
                rightEye: pose.keypoints.find((kp) => kp.name === 'right_eye'),
                coordinateRange: {
                  minX: Math.min(...pose.keypoints.map((kp) => kp.x)).toFixed(3),
                  maxX: Math.max(...pose.keypoints.map((kp) => kp.x)).toFixed(3),
                  minY: Math.min(...pose.keypoints.map((kp) => kp.y)).toFixed(3),
                  maxY: Math.max(...pose.keypoints.map((kp) => kp.y)).toFixed(3),
                },
              })
            }
          }
        )
      } else {
        const { startMVPPoseDetectionWeb } = require('./useMVPPoseDetection.web')
        detectionRef.current = await startMVPPoseDetectionWeb(
          config,
          (pose: MVPPoseDetectionResult) => {
            currentPoseRef.current = pose
            setState((prev) => ({
              ...prev,
              currentPose: pose,
              isInitialized: true,
            }))
          }
        )
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isDetecting: false,
        error: error instanceof Error ? error.message : 'Failed to start pose detection',
      }))
      throw error
    }
  }, [config, state.isEnabled, isNative])

  const stopDetection = useCallback((): void => {
    log.debug('useMVPPoseDetection', '🔍 MINIMAL: stopDetection called')

    try {
      if (detectionRef.current) {
        if (isNative) {
          const { stopMVPPoseDetectionNative } = require('./useMVPPoseDetection.native')
          stopMVPPoseDetectionNative(detectionRef.current)
        } else {
          const { stopMVPPoseDetectionWeb } = require('./useMVPPoseDetection.web')
          stopMVPPoseDetectionWeb(detectionRef.current)
        }
        detectionRef.current = null
      }

      setState((prev) => ({
        ...prev,
        isDetecting: false,
        currentPose: null,
      }))
      currentPoseRef.current = null
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop pose detection',
      }))
    }
  }, [isNative])

  const toggleDetection = useCallback((): void => {
    if (state.isDetecting) {
      stopDetection()
    } else if (state.isEnabled) {
      startDetection().catch((error) => {
        log.error('Failed to start MVP pose detection:', error)
      })
    }
  }, [state.isDetecting, state.isEnabled, startDetection, stopDetection])

  const updateConfig = useCallback(
    (newConfig: Partial<MVPPoseDetectionConfig>): void => {
      const updatedConfig = { ...config, ...newConfig }
      setState((prev) => ({
        ...prev,
        config: updatedConfig,
      }))
    },
    [config]
  )

  const clearError = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  return {
    currentPose: currentPoseRef.current,
    isDetecting: state.isDetecting,
    isEnabled: state.isEnabled,
    state,
    startDetection,
    stopDetection,
    toggleDetection,
    updateConfig,
    clearError,
  } as UseMVPPoseDetection
}

/**
 * MVP Pose Detection Utilities
 * Simple utility functions for basic pose validation and filtering
 */
export const MVPPoseDetectionUtils = {
  /**
   * Basic pose validation for MVP
   */
  validateMVPPose: (pose: MVPPoseDetectionResult): boolean => {
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      return false
    }

    // Check if keypoints have valid coordinates
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
   * Filter pose by confidence threshold
   */
  filterMVPPoseByConfidence: (
    pose: MVPPoseDetectionResult,
    threshold: number
  ): MVPPoseDetectionResult => {
    return {
      ...pose,
      keypoints: pose.keypoints.filter((keypoint) => keypoint.confidence >= threshold),
    }
  },

  /**
   * Check if MVP pose detection is supported on current platform
   */
  isMVPPoseDetectionSupported: (): boolean => {
    if (Platform.OS === 'web') {
      // Basic WebGL support check for web
      try {
        if (typeof window === 'undefined') return false
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return !!gl
      } catch {
        return false
      }
    } else {
      // Assume native platforms support basic pose detection
      return true
    }
  },

  /**
   * Get basic platform capabilities for MVP
   */
  getMVPCapabilities: () => {
    const isNative = Platform.OS !== 'web'
    return {
      platform: isNative ? 'native' : 'web',
      supportsBasicDetection: true,
      recommendedFps: isNative ? 30 : 24,
      maxInputResolution: isNative ? { width: 256, height: 256 } : { width: 256, height: 256 },
    }
  },
}

log.debug('useMVPPoseDetection', '🔍 MINIMAL: Module loading END')
