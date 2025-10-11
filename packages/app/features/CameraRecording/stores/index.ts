// Export CameraRecording-specific stores

// Camera Recording - Hybrid store (switches between VisionCamera and Expo Camera)
export { useCameraRecordingStore } from './cameraRecording'

// Re-export selectors and hooks from the implementations
export type {
  CameraPermissions,
  CameraRecordingStore,
  CameraSettings,
  PerformanceMetrics,
  RecordingMetrics,
} from './cameraRecording.vision'

export { useCameraRecordingSelectors, useRecordingTimer } from './cameraRecording.vision'
