// Hybrid camera recording store - switches between VisionCamera and Expo Camera implementations
import { log } from '@my/ui'

/**
 * Hybrid Camera Recording Store - switches between VisionCamera and Expo Camera implementations
 * Uses VisionCamera for dev builds (full features) and Expo Camera for Expo Go (compatibility)
 */
export const useCameraRecordingStore = () => {
  // Use environment variable instead of runtime feature flag to avoid conditional hook calls
  const useVisionCamera = process.env.EXPO_PUBLIC_USE_VISION_CAMERA === 'true'

  if (useVisionCamera) {
    // Use VisionCamera store implementation - dynamic import to avoid module evaluation in Expo Go
    try {
      const { useCameraRecordingStore: useVisionStore } = require('./cameraRecording.vision')
      return useVisionStore()
    } catch (error) {
      log.warn('VisionCamera store not available, falling back to Expo Camera store:', error)
      // Fallback to Expo Camera if VisionCamera fails to load
      const { useCameraRecordingStore: useExpoStore } = require('./cameraRecording.expo')
      return useExpoStore()
    }
  }

  // Use Expo Camera store implementation
  const { useCameraRecordingStore: useExpoStore } = require('./cameraRecording.expo')
  return useExpoStore()
}
