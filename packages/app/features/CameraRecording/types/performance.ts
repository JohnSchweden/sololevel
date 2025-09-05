/**
 * Performance Monitoring Types for Phase 2 Enhanced Architecture
 * Comprehensive type definitions for performance tracking and optimization
 */

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  // Frame rate metrics
  fps: number;
  targetFps: number;
  averageFps: number;
  droppedFrames: number;

  // Memory metrics
  memoryUsage: number; // MB
  peakMemoryUsage: number; // MB

  // CPU metrics
  cpuUsage: number; // Percentage 0-100
  averageCpuUsage: number; // Percentage 0-100
  peakCpuUsage: number; // Percentage 0-100

  // Battery metrics
  batteryLevel: number; // Percentage 0-100
  chargingState: "unknown" | "unplugged" | "charging" | "full";
  batteryOptimizationEnabled: boolean;

  // Thermal metrics
  thermalState: "normal" | "fair" | "serious" | "critical";
  thermalThrottling: boolean;
  thermalHistory: ThermalHistoryEntry[];
}

/**
 * Processing performance metrics
 */
export interface ProcessingPerformanceMetrics {
  // Pose detection timing
  poseDetectionTime: number; // ms
  averagePoseDetectionTime: number; // ms
  peakPoseDetectionTime: number; // ms

  // Frame processing
  frameProcessingRate: number; // fps

  // Network performance
  networkLatency: number; // ms
  networkQuality: "poor" | "fair" | "good" | "excellent";

  // Compression metrics
  compressionRatio: number; // 0-1
  dataTransferRate: number; // bytes/sec
}

/**
 * Adaptive quality configuration
 */
export interface AdaptiveQualityConfig {
  enabled: boolean;
  currentPreset: "performance" | "balanced" | "quality";
  thermalManagement: boolean;
  batteryOptimization: boolean;
  performanceMode: "performance" | "balanced" | "quality";

  // Current settings
  currentResolution: string;
  currentFrameRate: number;
  currentBitrate: number;

  // Thresholds
  thermalThresholds: {
    fair: number; // °C
    serious: number; // °C
    critical: number; // °C
  };
}

/**
 * Performance monitoring settings
 */
export interface PerformanceMonitoringSettings {
  // Thresholds for alerts
  lowFpsThreshold: number;
  highMemoryThreshold: number; // MB
  lowBatteryThreshold: number; // Percentage
  highCpuThreshold: number; // Percentage
  thermalThreshold: number; // °C

  // Optimization settings
  batteryOptimizationEnabled: boolean;

  // Data retention
  metricsRetentionTime: number; // ms
}

/**
 * Performance alerts
 */
export interface PerformanceAlerts {
  lowFps: boolean;
  highMemoryUsage: boolean;
  thermalThrottling: boolean;
  lowBattery: boolean;
  highCpuUsage: boolean;
  networkIssues: boolean;
}

/**
 * Performance history for trending
 */
export interface PerformanceHistory {
  fps: PerformanceDataPoint[];
  memory: PerformanceDataPoint[];
  cpu: PerformanceDataPoint[];
  maxHistorySize: number;
}

/**
 * Individual performance data point
 */
export interface PerformanceDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Thermal history entry
 */
export interface ThermalHistoryEntry {
  timestamp: number;
  state: "normal" | "fair" | "serious" | "critical";
  temperature?: number; // °C if available
}

/**
 * Performance optimization recommendation
 */
export interface PerformanceRecommendation {
  type: "resolution" | "frameRate" | "quality" | "thermal" | "battery";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  action:
    | "reduce_resolution"
    | "reduce_framerate"
    | "reduce_quality"
    | "pause_recording"
    | "cool_down";
  estimatedImpact: number; // 0-100 percentage improvement
}

/**
 * Performance monitoring state
 */
export interface PerformanceMonitoringState {
  isMonitoring: boolean;
  monitoringStartTime: number;
  lastUpdateTime: number;

  // Current metrics
  system: SystemPerformanceMetrics;
  processing: ProcessingPerformanceMetrics;
  adaptiveQuality: AdaptiveQualityConfig;

  // Configuration
  settings: PerformanceMonitoringSettings;
  alerts: PerformanceAlerts;
  history: PerformanceHistory;

  // Recommendations
  recommendations: PerformanceRecommendation[];
}

/**
 * Performance monitoring actions
 */
export interface PerformanceMonitoringActions {
  // Monitoring control
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;

  // Metrics updates
  updateSystemMetrics: (metrics: Partial<SystemPerformanceMetrics>) => void;
  updateProcessingMetrics: (
    metrics: Partial<ProcessingPerformanceMetrics>,
  ) => void;
  updateAdaptiveQuality: (config: Partial<AdaptiveQualityConfig>) => void;

  // Settings
  updateSettings: (settings: Partial<PerformanceMonitoringSettings>) => void;

  // Alerts
  setAlert: (alert: keyof PerformanceAlerts, active: boolean) => void;
  clearAllAlerts: () => void;

  // History management
  addHistoryPoint: (metric: keyof PerformanceHistory, value: number) => void;
  clearHistory: () => void;

  // Recommendations
  addRecommendation: (recommendation: PerformanceRecommendation) => void;
  removeRecommendation: (index: number) => void;
  clearRecommendations: () => void;
}

/**
 * Complete performance store interface
 */
export interface PerformanceStore
  extends PerformanceMonitoringState, PerformanceMonitoringActions {}

/**
 * Performance monitoring hook return type
 */
export interface UsePerformanceMonitoring {
  // State
  isMonitoring: boolean;
  metrics: {
    system: SystemPerformanceMetrics;
    processing: ProcessingPerformanceMetrics;
    adaptiveQuality: AdaptiveQualityConfig;
  };
  alerts: PerformanceAlerts;
  recommendations: PerformanceRecommendation[];

  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateMetrics: (
    metrics: Partial<SystemPerformanceMetrics | ProcessingPerformanceMetrics>,
  ) => void;

  // Computed values
  overallScore: number; // 0-100
  isOptimal: boolean;
  criticalIssues: PerformanceRecommendation[];
}

/**
 * Performance export data format
 */
export interface PerformanceExportData {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;

  // Aggregated metrics
  averageMetrics: {
    fps: number;
    memoryUsage: number;
    cpuUsage: number;
    batteryLevel: number;
    poseDetectionTime: number;
  };

  // Peak values
  peakMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    poseDetectionTime: number;
  };

  // Issues encountered
  thermalEvents: ThermalHistoryEntry[];
  alertsTriggered: Array<{
    type: keyof PerformanceAlerts;
    timestamp: number;
    duration: number;
  }>;

  // Quality adjustments made
  qualityAdjustments: Array<{
    timestamp: number;
    from: Partial<AdaptiveQualityConfig>;
    to: Partial<AdaptiveQualityConfig>;
    reason: string;
  }>;

  // Raw data points
  history: PerformanceHistory;
}

/**
 * Performance analysis result
 */
export interface PerformanceAnalysis {
  overallScore: number; // 0-100
  categories: {
    frameRate: { score: number; issues: string[] };
    memory: { score: number; issues: string[] };
    thermal: { score: number; issues: string[] };
    battery: { score: number; issues: string[] };
    processing: { score: number; issues: string[] };
  };
  recommendations: PerformanceRecommendation[];
  summary: string;
}
