/**
 * MVP Pose Detection Hook
 * Simplified pose detection functionality for rapid MVP development
 * Cross-platform interface that delegates to native or web implementations
 */

import { log } from '@my/ui/src/utils/logger'
log.debug('🔍 DEBUG: useMVPPoseDetection.ts module loading - START')

// Test minimal imports first
import { useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'

// Temporarily comment out potentially problematic imports
// import { log } from '@my/ui/src/utils/logger'
// import type {
//   MVPPoseDetectionConfig,
//   MVPPoseDetectionResult,
//   MVPPoseDetectionState,
//   UseMVPPoseDetection,
// } from '../types/MVPpose'
// import { DEFAULT_MVP_POSE_CONFIG } from '../types/MVPpose'

// Temporary minimal types
interface MVPPoseDetectionConfig {
  modelType: string
  confidenceThreshold: number
  targetFps: number
  inputResolution: { width: number; height: number }
}

interface MVPPoseDetectionResult {
  keypoints: any[]
  confidence: number
  timestamp: number
}

interface MVPPoseDetectionState {
  isInitialized: boolean
  isDetecting: boolean
  isEnabled: boolean
  currentPose: MVPPoseDetectionResult | null
  config: MVPPoseDetectionConfig
  error: string | null
}

interface UseMVPPoseDetection {
  state: MVPPoseDetectionState
  currentPose: MVPPoseDetectionResult | null
  isDetecting: boolean
  isEnabled: boolean
  startDetection: () => Promise<void>
  stopDetection: () => void
  toggleDetection: () => void
  updateConfig: (config: Partial<MVPPoseDetectionConfig>) => void
  clearError: () => void
}

const DEFAULT_MVP_POSE_CONFIG: MVPPoseDetectionConfig = {
  modelType: 'lightning',
  confidenceThreshold: 0.3,
  targetFps: 30,
  inputResolution: { width: 256, height: 256 },
}

/**
 * Simplified MVP pose detection hook
 * Provides basic pose detection without complex performance monitoring
 */
export function useMVPPoseDetection(
  initialConfig?: Partial<MVPPoseDetectionConfig>
): UseMVPPoseDetection {
  const isNative = Platform.OS !== 'web'

  if (__DEV__) {
    log.debug('🎯 useMVPPoseDetection initialized:', { isNative, initialConfig })
  }

  // MVP configuration - simple and focused
  const [config, setConfig] = useState<MVPPoseDetectionConfig>(() => ({
    ...DEFAULT_MVP_POSE_CONFIG,
    ...initialConfig,
  }))

  // Basic MVP state
  const [state, setState] = useState<MVPPoseDetectionState>({
    isInitialized: false,
    isDetecting: false,
    isEnabled: true,
    currentPose: null,
    config,
    error: null,
  })

  // Simple state tracking
  const detectionRef = useRef<any>(null)
  const currentPoseRef = useRef<MVPPoseDetectionResult | null>(null)

  // Basic pose detection controls
  const startDetection = useCallback(async (): Promise<void> => {
    try {
      if (!state.isEnabled) {
        throw new Error('Pose detection is disabled')
      }

      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }))

      // Temporarily disable platform-specific implementation to test module loading
      log.debug('🔍 DEBUG: startDetection called, isNative:', isNative)

      // Mock implementation for testing
      setTimeout(() => {
        const mockPose: MVPPoseDetectionResult = {
          keypoints: [],
          confidence: 0.5,
          timestamp: Date.now(),
        }
        currentPoseRef.current = mockPose
        setState((prev) => ({
          ...prev,
          currentPose: mockPose,
          isInitialized: true,
        }))
      }, 100)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isDetecting: false,
        error: error instanceof Error ? error.message : 'Failed to start pose detection',
      }))
      throw error
    }
  }, [config, state.isEnabled])

  const stopDetection = useCallback((): void => {
    log.debug('🔍 DEBUG: stopDetection called')

    setState((prev) => ({
      ...prev,
      isDetecting: false,
      currentPose: null,
    }))
    currentPoseRef.current = null
    detectionRef.current = null
  }, [])

  const toggleDetection = useCallback((): void => {
    if (state.isDetecting) {
      stopDetection()
    } else if (state.isEnabled) {
      startDetection().catch((error) => {})
    }
  }, [state.isDetecting, state.isEnabled, startDetection, stopDetection])

  const updateConfig = useCallback(
    (newConfig: Partial<MVPPoseDetectionConfig>): void => {
      const updatedConfig = { ...config, ...newConfig }
      setConfig(updatedConfig)
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
    // State
    state,
    currentPose: currentPoseRef.current,
    isDetecting: state.isDetecting,
    isEnabled: state.isEnabled,

    // Basic controls
    startDetection,
    stopDetection,
    toggleDetection,

    // Configuration
    updateConfig,

    // Error handling
    clearError,
  }
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

log.debug('🔍 DEBUG: useMVPPoseDetection.ts module loading - END')
