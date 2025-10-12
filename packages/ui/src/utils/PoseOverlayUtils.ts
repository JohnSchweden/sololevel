/**
 * Pose Overlay Utilities
 * Shared utility functions for pose overlay rendering across platforms
 */

// Temporarily define types locally to avoid import issues
type PoseKeypointName =
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

interface PoseKeypoint {
  name: PoseKeypointName
  x: number
  y: number
  confidence: number
}

interface PoseDetectionResult {
  keypoints: PoseKeypoint[]
  confidence: number
  timestamp: number
  frameId?: string
}

interface PoseOverlayConfig {
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
  // Optional properties for advanced features (not used in MVP)
  enableAnimation?: boolean
  animationDuration?: number
  interpolationFrames?: number
  scaleWithConfidence?: boolean
  minScale?: number
  maxScale?: number
}

interface PoseConnection {
  from: PoseKeypointName
  to: PoseKeypointName
  color?: string
  width?: number
}

const DEFAULT_OVERLAY_CONFIG: PoseOverlayConfig = {
  showKeypoints: true,
  showConnections: true,
  showConfidence: false,
  keypointRadius: 4,
  connectionWidth: 2,
  colors: {
    keypoint: '#00ff00',
    connection: '#ffffff',
    lowConfidence: '#ff6b6b',
    highConfidence: '#51cf66',
  },
  confidenceThreshold: 0.3,
  enableAnimation: true,
  animationDuration: 100,
  interpolationFrames: 3,
  scaleWithConfidence: true,
  minScale: 0.5,
  maxScale: 1.0,
}

const POSE_CONNECTIONS: PoseConnection[] = [
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

export const PoseOverlayUtils = {
  /**
   * Convert normalized pose coordinates to screen coordinates
   */
  normalizeCoordinates: (
    pose: PoseDetectionResult,
    screenWidth: number,
    screenHeight: number
  ): PoseDetectionResult => {
    return {
      ...pose,
      keypoints: pose.keypoints.map((keypoint) => ({
        ...keypoint,
        x: keypoint.x * screenWidth,
        y: keypoint.y * screenHeight,
      })),
    }
  },

  /**
   * Filter keypoints by confidence threshold
   */
  filterKeypointsByConfidence: (
    pose: PoseDetectionResult,
    threshold: number
  ): PoseDetectionResult => {
    return {
      ...pose,
      keypoints: pose.keypoints.filter((kp) => kp.confidence >= threshold),
    }
  },

  /**
   * Filter pose by confidence threshold (alias for filterKeypointsByConfidence)
   */
  filterByConfidence: (pose: PoseDetectionResult, threshold: number): PoseDetectionResult => {
    return PoseOverlayUtils.filterKeypointsByConfidence(pose, threshold)
  },

  /**
   * Get color based on confidence level
   */
  getConfidenceColor: (
    confidence: number,
    config: PoseOverlayConfig = DEFAULT_OVERLAY_CONFIG
  ): string => {
    if (confidence >= 0.7) {
      return config.colors.highConfidence
    }
    if (confidence >= 0.3) {
      return config.colors.keypoint
    }
    return config.colors.lowConfidence
  },

  /**
   * Get keypoint radius based on confidence
   */
  getKeypointRadius: (
    confidence: number,
    config: PoseOverlayConfig = DEFAULT_OVERLAY_CONFIG
  ): number => {
    if (!config.scaleWithConfidence) {
      return config.keypointRadius
    }

    const minScale = config.minScale ?? 0.5
    const maxScale = config.maxScale ?? 1.0
    const scale = minScale + confidence * (maxScale - minScale)
    return config.keypointRadius * scale
  },

  /**
   * Get connections to render based on available keypoints
   */
  getValidConnections: (
    pose: PoseDetectionResult,
    connections: PoseConnection[] = POSE_CONNECTIONS,
    minConfidence = 0.3
  ): PoseConnection[] => {
    return connections.filter((connection) => {
      const fromKeypoint = pose.keypoints.find((kp) => kp.name === connection.from)
      const toKeypoint = pose.keypoints.find((kp) => kp.name === connection.to)

      return (
        fromKeypoint &&
        toKeypoint &&
        fromKeypoint.confidence >= minConfidence &&
        toKeypoint.confidence >= minConfidence
      )
    })
  },

  /**
   * Calculate bounding box for pose
   */
  getPoseBoundingBox: (pose: PoseDetectionResult) => {
    const validKeypoints = pose.keypoints.filter((kp) => kp.confidence > 0.3)

    if (validKeypoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    const xs = validKeypoints.map((kp) => kp.x)
    const ys = validKeypoints.map((kp) => kp.y)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  },

  /**
   * Interpolate between two poses for smooth animation
   */
  interpolatePoses: (
    pose1: PoseDetectionResult,
    pose2: PoseDetectionResult,
    factor: number // 0-1, where 0 = pose1, 1 = pose2
  ): PoseDetectionResult => {
    if (pose1.keypoints.length !== pose2.keypoints.length) {
      return pose2 // Fallback to target pose
    }

    const interpolatedKeypoints = pose1.keypoints.map((kp1, index) => {
      const kp2 = pose2.keypoints[index]

      return {
        name: kp1.name,
        x: kp1.x + (kp2.x - kp1.x) * factor,
        y: kp1.y + (kp2.y - kp1.y) * factor,
        confidence: Math.max(kp1.confidence, kp2.confidence),
      }
    })

    return {
      keypoints: interpolatedKeypoints,
      confidence: Math.max(pose1.confidence, pose2.confidence),
      timestamp: pose2.timestamp,
    }
  },
}
