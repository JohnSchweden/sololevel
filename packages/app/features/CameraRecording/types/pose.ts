/**
 * Pose Detection Types for Phase 3 AI Integration
 * Comprehensive type definitions for MoveNet Lightning pose detection
 * Cross-platform compatibility between TensorFlow Lite (native) and TensorFlow.js (web)
 */

/**
 * Pose keypoint names following MoveNet Lightning model
 */
export type PoseKeypointName =
  | "nose"
  | "left_eye"
  | "right_eye"
  | "left_ear"
  | "right_ear"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle";

/**
 * Individual pose keypoint with normalized coordinates
 */
export interface PoseKeypoint {
  name: PoseKeypointName;
  x: number; // Normalized coordinate 0-1
  y: number; // Normalized coordinate 0-1
  confidence: number; // Confidence score 0-1
}

/**
 * Complete pose detection result
 */
export interface PoseDetectionResult {
  keypoints: PoseKeypoint[];
  confidence: number; // Overall pose confidence
  timestamp: number; // Detection timestamp in ms
  frameId?: string; // Optional frame identifier
}

/**
 * Pose detection configuration
 */
export interface PoseDetectionConfig {
  // Model settings
  modelType: "lightning" | "thunder"; // MoveNet model variant
  confidenceThreshold: number; // Minimum confidence for valid detection
  maxDetections: number; // Maximum number of poses to detect

  // Performance settings
  targetFps: number; // Target detection frame rate
  enableGpuAcceleration: boolean; // Use GPU acceleration when available
  enableMultiThreading: boolean; // Use background threading

  // Quality settings
  inputResolution: {
    width: number;
    height: number;
  };
  enableSmoothing: boolean; // Temporal smoothing of pose data
  smoothingFactor: number; // Smoothing strength 0-1

  // Platform-specific settings
  native?: {
    useQuantizedModel: boolean; // Use quantized TFLite model
    numThreads: number; // Number of CPU threads
    delegate: "cpu" | "gpu" | "nnapi"; // TFLite delegate
  };

  web?: {
    backend: "webgl" | "cpu" | "webgpu"; // TensorFlow.js backend
    enableWebWorker: boolean; // Use Web Worker for processing
    modelUrl?: string; // Custom model URL
  };
}

/**
 * Pose detection performance metrics
 */
export interface PoseDetectionMetrics {
  // Timing metrics
  averageInferenceTime: number; // ms
  peakInferenceTime: number; // ms
  currentFps: number;
  targetFps: number;

  // Quality metrics
  averageConfidence: number;
  detectionRate: number; // Successful detections / total frames
  droppedFrames: number;

  // Resource usage
  memoryUsage: number; // MB
  cpuUsage: number; // Percentage
  gpuUsage?: number; // Percentage (if available)

  // Error tracking
  totalDetections: number;
  failedDetections: number;
  errorRate: number;
}

/**
 * Pose detection state
 */
export interface PoseDetectionState {
  // Status
  isInitialized: boolean;
  isDetecting: boolean;
  isModelLoading: boolean;

  // Current detection
  currentPose: PoseDetectionResult | null;
  lastDetectionTime: number;

  // Configuration
  config: PoseDetectionConfig;

  // Performance
  metrics: PoseDetectionMetrics;

  // Error handling
  error: string | null;
  lastError: string | null;
}

/**
 * Pose detection events
 */
export interface PoseDetectionEvents {
  onPoseDetected: (pose: PoseDetectionResult) => void;
  onDetectionStarted: () => void;
  onDetectionStopped: () => void;
  onModelLoaded: () => void;
  onError: (error: string) => void;
  onPerformanceUpdate: (metrics: PoseDetectionMetrics) => void;
}

/**
 * Pose data buffer for compression and storage
 */
export interface PoseDataBuffer {
  // Buffer metadata
  id: string;
  startTime: number;
  endTime: number;
  duration: number;

  // Pose data
  poses: PoseDetectionResult[];
  frameCount: number;

  // Compression info
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;

  // Synchronization
  videoTimestamp?: number;
  sessionId?: string;
}

/**
 * Pose overlay rendering configuration
 */
export interface PoseOverlayConfig {
  // Visibility
  showKeypoints: boolean;
  showConnections: boolean;
  showConfidence: boolean;

  // Styling
  keypointRadius: number;
  connectionWidth: number;
  colors: {
    keypoint: string;
    connection: string;
    lowConfidence: string;
    highConfidence: string;
  };

  // Animation
  enableAnimation: boolean;
  animationDuration: number; // ms
  interpolationFrames: number;

  // Scaling
  scaleWithConfidence: boolean;
  minScale: number;
  maxScale: number;

  // Confidence filtering
  confidenceThreshold: number;

  // Platform-specific configurations
  skia?: {
    enableGlow: boolean;
    enableTrails: boolean;
    enableParticles: boolean;
    animationDuration: number;
    glowRadius: number;
    trailLength: number;
    particleCount: number;
  };

  webgl?: {
    enableWebGL: boolean;
    enableAntialiasing: boolean;
    enableBloom: boolean;
    enableTrails: boolean;
    maxTrailLength: number;
    bloomIntensity: number;
    animationSpeed: number;
    particleCount: number;
  };
}

/**
 * Pose connection definitions for skeleton rendering
 */
export interface PoseConnection {
  from: PoseKeypointName;
  to: PoseKeypointName;
  color?: string;
  width?: number;
}

/**
 * Standard pose connections for human skeleton
 */
export const POSE_CONNECTIONS: PoseConnection[] = [
  // Head
  { from: "nose", to: "left_eye" },
  { from: "nose", to: "right_eye" },
  { from: "left_eye", to: "left_ear" },
  { from: "right_eye", to: "right_ear" },

  // Torso
  { from: "left_shoulder", to: "right_shoulder" },
  { from: "left_shoulder", to: "left_hip" },
  { from: "right_shoulder", to: "right_hip" },
  { from: "left_hip", to: "right_hip" },

  // Arms
  { from: "left_shoulder", to: "left_elbow" },
  { from: "left_elbow", to: "left_wrist" },
  { from: "right_shoulder", to: "right_elbow" },
  { from: "right_elbow", to: "right_wrist" },

  // Legs
  { from: "left_hip", to: "left_knee" },
  { from: "left_knee", to: "left_ankle" },
  { from: "right_hip", to: "right_knee" },
  { from: "right_knee", to: "right_ankle" },
];

/**
 * Pose detection hook interface
 */
export interface UsePoseDetection {
  // State
  state: PoseDetectionState;
  currentPose: PoseDetectionResult | null;
  isDetecting: boolean;
  isInitialized: boolean;

  // Controls
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  pauseDetection: () => void;
  resumeDetection: () => void;

  // Configuration
  updateConfig: (config: Partial<PoseDetectionConfig>) => void;
  resetConfig: () => void;

  // Data management
  exportPoseData: () => PoseDataBuffer;
  clearPoseData: () => void;

  // Performance
  getMetrics: () => PoseDetectionMetrics;
  resetMetrics: () => void;
}

/**
 * Platform-specific pose detection interfaces
 */
export interface NativePoseDetection extends UsePoseDetection {
  // Native-specific methods
  loadTFLiteModel: (modelPath: string) => Promise<void>;
  setDelegate: (delegate: "cpu" | "gpu" | "nnapi") => void;
  setNumThreads: (numThreads: number) => void;
}

export interface WebPoseDetection extends UsePoseDetection {
  // Web-specific methods
  loadTensorFlowModel: (modelUrl: string) => Promise<void>;
  setBackend: (backend: "webgl" | "cpu" | "webgpu") => Promise<void>;
  enableWebWorker: (enable: boolean) => void;
}

/**
 * Pose data compression utilities
 */
export interface PoseDataCompression {
  compress: (poses: PoseDetectionResult[]) => Uint8Array;
  decompress: (data: Uint8Array) => PoseDetectionResult[];
  getCompressionRatio: (
    original: PoseDetectionResult[],
    compressed: Uint8Array,
  ) => number;
}

/**
 * Pose validation utilities
 */
export interface PoseValidation {
  validatePose: (pose: PoseDetectionResult) => boolean;
  validateKeypoint: (keypoint: PoseKeypoint) => boolean;
  filterByConfidence: (
    poses: PoseDetectionResult[],
    threshold: number,
  ) => PoseDetectionResult[];
  smoothPoses: (
    poses: PoseDetectionResult[],
    factor: number,
  ) => PoseDetectionResult[];
}

/**
 * Default pose detection configuration
 */
export const DEFAULT_POSE_CONFIG: PoseDetectionConfig = {
  modelType: "lightning",
  confidenceThreshold: 0.3,
  maxDetections: 1,
  targetFps: 30,
  enableGpuAcceleration: true,
  enableMultiThreading: true,
  inputResolution: {
    width: 256,
    height: 256,
  },
  enableSmoothing: true,
  smoothingFactor: 0.7,
  native: {
    useQuantizedModel: true,
    numThreads: 4,
    delegate: "gpu",
  },
  web: {
    backend: "webgl",
    enableWebWorker: true,
  },
};

/**
 * Default pose overlay configuration
 */
export const DEFAULT_OVERLAY_CONFIG: PoseOverlayConfig = {
  showKeypoints: true,
  showConnections: true,
  showConfidence: false,
  keypointRadius: 4,
  connectionWidth: 2,
  colors: {
    keypoint: "#00ff00",
    connection: "#ffffff",
    lowConfidence: "#ff6b6b",
    highConfidence: "#51cf66",
  },
  enableAnimation: true,
  animationDuration: 100,
  interpolationFrames: 3,
  scaleWithConfidence: true,
  minScale: 0.5,
  maxScale: 1.0,
  confidenceThreshold: 0.3,
  skia: {
    enableGlow: true,
    enableTrails: false,
    enableParticles: false,
    animationDuration: 200,
    glowRadius: 8,
    trailLength: 10,
    particleCount: 20,
  },
  webgl: {
    enableWebGL: true,
    enableAntialiasing: true,
    enableBloom: true,
    enableTrails: false,
    maxTrailLength: 10,
    bloomIntensity: 0.3,
    animationSpeed: 1.0,
    particleCount: 20,
  },
};
