/**
 * Enhanced State Management Types for Phase 2 Architecture
 * Comprehensive type definitions for the new enhanced camera recording state system
 */

import type { PerformanceMonitoringState } from "./performance";
import type { ThermalState } from "./thermal";

/**
 * Enhanced recording state machine states
 */
export type EnhancedRecordingState =
  | "idle"
  | "initializing"
  | "ready"
  | "recording"
  | "paused"
  | "stopping"
  | "stopped"
  | "error";

/**
 * Camera type with extended support
 */
export type CameraType = "front" | "back" | "external";

/**
 * Permission status with enhanced granularity
 */
export type PermissionStatus =
  | "undetermined"
  | "denied"
  | "granted"
  | "restricted"
  | "limited";

/**
 * Enhanced camera capability information
 */
export interface CameraCapability {
  id: string;
  type: CameraType;
  name: string;
  isAvailable: boolean;

  // Zoom capabilities
  minZoom: number;
  maxZoom: number;
  hasOpticalZoom: boolean;

  // Resolution support
  supportedResolutions: string[];
  maxResolution: string;

  // Frame rate support
  supportedFrameRates: number[];
  maxFrameRate: number;

  // Feature support
  hasFlash: boolean;
  hasHDR: boolean;
  hasStabilization: boolean;
  hasManualFocus: boolean;
  hasNightMode: boolean;

  // Quality metrics
  sensorSize?: string;
  aperture?: string;
  focalLength?: string;
}

/**
 * Enhanced camera permissions
 */
export interface EnhancedCameraPermissions {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  storage: PermissionStatus;
  location?: PermissionStatus;
}

/**
 * Adaptive quality settings
 */
export interface AdaptiveQualitySettings {
  enabled: boolean;
  thermalManagement: boolean;
  batteryOptimization: boolean;
  performanceMode: "performance" | "balanced" | "quality";

  // Current active settings
  currentResolution: string;
  currentFrameRate: number;
  currentBitrate: number;

  // Thresholds for adjustments
  thermalThresholds: {
    fair: number;
    serious: number;
    critical: number;
  };

  // Battery thresholds
  batteryThresholds: {
    low: number;
    critical: number;
  };

  // Performance thresholds
  performanceThresholds: {
    minFps: number;
    maxMemoryUsage: number;
    maxCpuUsage: number;
  };
}

/**
 * Enhanced camera settings
 */
export interface EnhancedCameraSettings {
  // Basic settings
  cameraType: CameraType;
  zoomLevel: number;
  flashEnabled: boolean;
  gridEnabled: boolean;

  // Advanced settings
  stabilizationEnabled: boolean;
  hdrEnabled: boolean;
  nightModeEnabled: boolean;
  manualFocus: boolean;
  exposureCompensation: number;

  // Adaptive quality
  adaptiveQuality: AdaptiveQualitySettings;
}

/**
 * Recording session with enhanced metadata
 */
export interface EnhancedRecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  state: EnhancedRecordingState;

  // Recording metadata
  cameraType: CameraType;
  resolution: string;
  frameRate: number;
  bitrate: number;

  // Quality metrics
  averageFps: number;
  droppedFrames: number;
  qualityScore: number;

  // Thermal data
  thermalEvents: Array<{
    timestamp: number;
    state: ThermalState;
    action?: string;
  }>;

  // Performance data
  performanceSummary: {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCpuUsage: number;
    batteryUsed: number;
  };

  // Segments for pause/resume
  segments: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    fileSize: number;
  }>;
}

/**
 * Enhanced recording metrics
 */
export interface EnhancedRecordingMetrics {
  // Timing
  startTime: number;
  duration: number;

  // File information
  fileSize: number;
  estimatedFinalSize: number;

  // Quality metrics
  resolution: { width: number; height: number };
  actualFrameRate: number;
  actualBitrate: number;
  frameCount: number;
  qualityScore: number;

  // Performance metrics
  averageFps: number;
  droppedFrames: number;
  processingLatency: number;

  // Adaptive quality changes
  qualityAdjustments: Array<{
    timestamp: number;
    reason: string;
    from: Partial<AdaptiveQualitySettings>;
    to: Partial<AdaptiveQualitySettings>;
  }>;
}

/**
 * Camera capabilities detection result
 */
export interface CameraCapabilitiesResult {
  availableCameras: CameraCapability[];
  defaultCamera: CameraType;

  // System capabilities
  supportsMultipleCameras: boolean;
  supportsFlash: boolean;
  supportsHDR: boolean;
  supportsStabilization: boolean;
  supportsManualFocus: boolean;
  supportsNightMode: boolean;

  // Quality capabilities
  maxResolution: string;
  maxFrameRate: number;
  maxZoom: number;

  // Platform limitations
  platformLimitations: string[];
}

/**
 * Enhanced camera state
 */
export interface EnhancedCameraState {
  // Initialization
  isInitialized: boolean;
  isInitializing: boolean;

  // Current camera
  currentCamera: CameraType;

  // Recording state
  recordingState: EnhancedRecordingState;
  currentSession: EnhancedRecordingSession | null;

  // Error handling
  error: string | null;
  lastError: string | null;
  errorRecoveryAttempts: number;
}

/**
 * Enhanced camera store interface
 */
export interface EnhancedCameraStore {
  // State
  state: EnhancedCameraState;
  settings: EnhancedCameraSettings;
  permissions: EnhancedCameraPermissions;
  capabilities: CameraCapabilitiesResult;
  metrics: EnhancedRecordingMetrics;

  // UI state
  ui: {
    isSettingsModalOpen: boolean;
    showPermissionModal: boolean;
    showPerformanceMonitor: boolean;
  };

  // Actions - State Management
  initializeCamera: () => Promise<void>;
  switchCamera: (type: CameraType) => Promise<void>;

  // Actions - Recording Control
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;

  // Actions - Settings
  updateSettings: (settings: Partial<EnhancedCameraSettings>) => void;
  setZoomLevel: (level: number) => void;
  toggleFlash: () => void;
  toggleGrid: () => void;

  // Actions - Permissions
  requestPermissions: () => Promise<boolean>;
  updatePermissions: (permissions: Partial<EnhancedCameraPermissions>) => void;

  // Actions - Capabilities
  detectCapabilities: () => Promise<void>;

  // Actions - Adaptive Quality
  updateAdaptiveQuality: (settings: Partial<AdaptiveQualitySettings>) => void;
  triggerQualityAdjustment: (reason: string) => void;

  // Actions - Error Handling
  setError: (error: string | null) => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;

  // Actions - UI
  setSettingsModalOpen: (open: boolean) => void;
  setPermissionModalOpen: (open: boolean) => void;
  setPerformanceMonitorOpen: (open: boolean) => void;

  // Actions - Session Management
  createSession: () => EnhancedRecordingSession;
  updateSession: (updates: Partial<EnhancedRecordingSession>) => void;
  clearSession: () => void;

  // Actions - Metrics
  updateMetrics: (updates: Partial<EnhancedRecordingMetrics>) => void;
  resetMetrics: () => void;

  // Actions - Cleanup
  reset: () => void;
}

/**
 * Pose detection state
 */
export interface PoseDetectionState {
  isEnabled: boolean;
  isDetecting: boolean;
  confidence: number;
  lastDetectionTime: number;

  // Current pose data
  currentPose: any | null; // Pose data structure depends on ML library

  // Performance
  detectionRate: number;
  averageDetectionTime: number;

  // Settings
  confidenceThreshold: number;
  maxDetectionRate: number;
  enableSmoothing: boolean;
  smoothingFactor: number;
}

/**
 * Enhanced pose store interface
 */
export interface EnhancedPoseStore {
  // Current state
  currentPose: any | null;
  currentPoseSession: string | null;

  // Sessions
  poseSessions: Array<{
    id: string;
    startTime: number;
    endTime?: number;
    poseCount: number;
    averageConfidence: number;
  }>;

  // Real-time data
  realtimeData: {
    poses: Map<number, any>; // timestamp -> pose
    confidence: number;
    isDetecting: boolean;
    lastDetectionTime: number;
    detectionRate: number;
    bufferSize: number;
    maxBufferSize: number;
  };

  // Recording data
  recordingData: {
    isRecording: boolean;
    poses: Map<number, any>; // timestamp -> pose
    startTime: number;
    endTime: number;
    metadata: {
      totalFrames: number;
      avgConfidence: number;
      duration: number;
      frameRate: number;
    };
    bufferSize: number;
    maxBufferSize: number;
  };

  // Settings
  processingSettings: {
    enabled: boolean;
    confidenceThreshold: number;
    maxDetectionRate: number;
    enableSmoothing: boolean;
    smoothingFactor: number;
    enableFiltering: boolean;
    compressionLevel: "low" | "medium" | "high";
  };

  // Performance
  performance: {
    averageDetectionTime: number;
    peakDetectionTime: number;
    totalDetections: number;
    failedDetections: number;
    accuracyScore: number;
  };

  // Actions
  startDetection: () => void;
  stopDetection: () => void;
  updatePose: (pose: any, confidence: number) => void;
  startRecording: () => void;
  stopRecording: () => void;
  updateSettings: (settings: Partial<PoseDetectionState>) => void;
  clearData: () => void;
  exportData: () => any;
}

/**
 * State synchronization interface
 */
export interface StateSynchronization {
  // Sync status
  isSyncing: boolean;
  lastSyncTime: number;
  syncErrors: string[];

  // Cross-store dependencies
  dependencies: {
    cameraStore: EnhancedCameraStore;
    performanceStore: PerformanceMonitoringState;
    poseStore: EnhancedPoseStore;
  };

  // Sync actions
  syncStores: () => Promise<void>;
  validateConsistency: () => boolean;
  resolveConflicts: () => void;
}

/**
 * Enhanced camera recording hook return type
 */
export interface UseEnhancedCameraRecording {
  // State
  state: EnhancedCameraState;
  settings: EnhancedCameraSettings;
  permissions: EnhancedCameraPermissions;
  capabilities: CameraCapabilitiesResult;
  metrics: EnhancedRecordingMetrics;

  // Recording controls
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;

  // Camera controls
  switchCamera: (type: CameraType) => Promise<void>;
  setZoomLevel: (level: number) => void;
  toggleFlash: () => void;

  // Status checks
  canRecord: boolean;
  isRecording: boolean;
  isPaused: boolean;
  hasError: boolean;

  // Performance integration
  performanceMetrics: PerformanceMonitoringState;
  thermalState: ThermalState;

  // Adaptive behavior
  adaptiveQuality: AdaptiveQualitySettings;
  qualityRecommendations: string[];
}

/**
 * Migration compatibility interface
 */
export interface LegacyCompatibility {
  // Legacy state mapping
  mapLegacyState: (legacyState: any) => Partial<EnhancedCameraStore>;

  // Legacy action mapping
  mapLegacyActions: (legacyActions: any) => Partial<EnhancedCameraStore>;

  // Validation
  validateMigration: (migrated: any) => boolean;

  // Fallback behavior
  provideFallback: (feature: string) => any;
}
