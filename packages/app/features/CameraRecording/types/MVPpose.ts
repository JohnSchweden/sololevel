/**
 * MVP Pose Detection Types
 * Simplified type definitions for basic pose detection functionality
 * Focused on essential features without advanced performance monitoring or complex configurations
 */

/**
 * Essential pose keypoint names for MVP
 * Using standard MoveNet Lightning model keypoints
 */
export type MVPPoseKeypointName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'

/**
 * Simplified pose keypoint with normalized coordinates
 */
export interface MVPPoseKeypoint {
  name: MVPPoseKeypointName
  x: number // Normalized coordinate 0-1
  y: number // Normalized coordinate 0-1
  confidence: number // Confidence score 0-1
}

/**
 * Basic pose detection result for MVP
 */
export interface MVPPoseDetectionResult {
  keypoints: MVPPoseKeypoint[]
  confidence: number // Overall pose confidence
  timestamp: number // Detection timestamp in ms
}

/**
 * Essential pose detection configuration for MVP
 */
export interface MVPPoseDetectionConfig {
  // Basic model settings
  modelType: 'lightning' | 'thunder' // MoveNet model variant
  confidenceThreshold: number // Minimum confidence for valid detection
  targetFps: number // Target detection frame rate

  // Simple quality setting
  inputResolution: {
    width: number
    height: number
  }
}

/**
 * MVP pose detection state
 */
export interface MVPPoseDetectionState {
  // Basic status
  isInitialized: boolean
  isDetecting: boolean
  isEnabled: boolean // Simple toggle for pose detection

  // Current detection
  currentPose: MVPPoseDetectionResult | null

  // Configuration
  config: MVPPoseDetectionConfig

  // Simple error handling
  error: string | null
}

/**
 * MVP pose detection events
 */
export interface MVPPoseDetectionEvents {
  onPoseDetected?: (pose: MVPPoseDetectionResult) => void
  onDetectionStarted?: () => void
  onDetectionStopped?: () => void
  onError?: (error: string) => void
}

/**
 * Simple pose detection hook interface for MVP
 */
export interface UseMVPPoseDetection {
  // State
  state: MVPPoseDetectionState
  currentPose: MVPPoseDetectionResult | null
  isDetecting: boolean
  isEnabled: boolean

  // Basic controls
  startDetection: () => Promise<void>
  stopDetection: () => void
  toggleDetection: () => void

  // Configuration
  updateConfig: (config: Partial<MVPPoseDetectionConfig>) => void

  // Error handling
  clearError: () => void
}

/**
 * Basic pose connections for skeleton rendering (MVP)
 */
export interface MVPPoseConnection {
  from: MVPPoseKeypointName
  to: MVPPoseKeypointName
}

/**
 * Essential pose connections for human skeleton
 */
export const MVP_POSE_CONNECTIONS: MVPPoseConnection[] = [
  // Head
  { from: 'nose', to: 'left_eye' },
  { from: 'nose', to: 'right_eye' },
  { from: 'left_eye', to: 'left_ear' },
  { from: 'right_eye', to: 'right_ear' },

  // Torso
  { from: 'left_shoulder', to: 'right_shoulder' },
  { from: 'left_shoulder', to: 'left_hip' },
  { from: 'right_shoulder', to: 'right_hip' },
  { from: 'left_hip', to: 'right_hip' },

  // Arms
  { from: 'left_shoulder', to: 'left_elbow' },
  { from: 'left_elbow', to: 'left_wrist' },
  { from: 'right_shoulder', to: 'right_elbow' },
  { from: 'right_elbow', to: 'right_wrist' },

  // Legs
  { from: 'left_hip', to: 'left_knee' },
  { from: 'left_knee', to: 'left_ankle' },
  { from: 'right_hip', to: 'right_knee' },
  { from: 'right_knee', to: 'right_ankle' },
]

/**
 * Default MVP pose detection configuration
 */
export const DEFAULT_MVP_POSE_CONFIG: MVPPoseDetectionConfig = {
  modelType: 'lightning',
  confidenceThreshold: 0.3,
  targetFps: 30,
  inputResolution: {
    width: 256,
    height: 256,
  },
}

/**
 * MVP pose overlay configuration (simplified)
 */
export interface MVPPoseOverlayConfig {
  showKeypoints: boolean
  showConnections: boolean
  showConfidence?: boolean
  keypointRadius: number
  connectionWidth: number
  colors: {
    keypoint: string
    connection: string
    lowConfidence: string
    highConfidence: string
  }
  confidenceThreshold: number
  // Platform-specific configs (optional)
  skia?: any
  webgl?: any
}

/**
 * Default MVP overlay configuration
 */
export const DEFAULT_MVP_OVERLAY_CONFIG: MVPPoseOverlayConfig = {
  showKeypoints: true,
  showConnections: true,
  keypointRadius: 4,
  connectionWidth: 2,
  colors: {
    keypoint: '#00ff00',
    connection: '#ffffff',
    lowConfidence: '#ff6b6b',
    highConfidence: '#51cf66',
  },
  confidenceThreshold: 0.3,
}
