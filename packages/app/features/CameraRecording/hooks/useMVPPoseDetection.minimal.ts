console.log('🔍 MINIMAL: Module loading START')

import { useState, useCallback, useRef } from 'react'
import { Platform } from 'react-native'

// Test adding the logger import that was in the original
import { log } from '@my/ui/src/utils/logger'

// Test adding the types import that might be causing the issue
import type {
  MVPPoseDetectionConfig,
  MVPPoseDetectionResult,
  MVPPoseDetectionState,
  UseMVPPoseDetection,
} from '../types/MVPpose'
import { DEFAULT_MVP_POSE_CONFIG } from '../types/MVPpose'

export function useMVPPoseDetection(initialConfig?: Partial<MVPPoseDetectionConfig>) {
  console.log('🔍 MINIMAL: Hook called')
  
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
    console.log('🔍 MINIMAL: startDetection called')
    setState((prev) => ({
      ...prev,
      isDetecting: true,
      error: null,
    }))
  }, [])

  const stopDetection = useCallback((): void => {
    console.log('🔍 MINIMAL: stopDetection called')
    setState((prev) => ({
      ...prev,
      isDetecting: false,
      currentPose: null,
    }))
  }, [])

  return {
    currentPose: currentPoseRef.current,
    isDetecting: state.isDetecting,
    isEnabled: state.isEnabled,
    state,
    startDetection,
    stopDetection,
    toggleDetection: () => console.log('🔍 MINIMAL: toggleDetection called'),
    updateConfig: () => console.log('🔍 MINIMAL: updateConfig called'),
    clearError: () => console.log('🔍 MINIMAL: clearError called'),
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

console.log('🔍 MINIMAL: Module loading END')
