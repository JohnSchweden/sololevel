/**
 * Thermal Management Types for Phase 2 Enhanced Architecture
 * Comprehensive type definitions for thermal monitoring and management
 */

/**
 * Thermal state enumeration
 */
export type ThermalState = "normal" | "fair" | "serious" | "critical";

/**
 * Thermal monitoring data
 */
export interface ThermalMonitoringData {
  // Current state
  currentState: ThermalState;
  temperature?: number; // °C if available from native APIs

  // State timing
  stateStartTime: number;
  stateDuration: number;

  // Trend analysis
  trend: "stable" | "rising" | "falling";
  trendConfidence: number; // 0-1

  // Predictions
  predictedPeakTime?: number; // ms until predicted peak
  predictedPeakState?: ThermalState;
}

/**
 * Thermal thresholds configuration
 */
export interface ThermalThresholds {
  // Temperature thresholds (°C)
  fair: number;
  serious: number;
  critical: number;

  // Time-based thresholds
  maxSeriousTime: number; // ms - max time in serious state
  maxCriticalTime: number; // ms - max time in critical state

  // Recovery thresholds
  recoveryBuffer: number; // °C - buffer before state recovery
  minRecoveryTime: number; // ms - minimum time before recovery
}

/**
 * Thermal management actions
 */
export interface ThermalManagementActions {
  // Quality reduction
  reduceResolution: boolean;
  reduceFrameRate: boolean;
  reduceBitrate: boolean;

  // Feature disabling
  disablePoseDetection: boolean;
  disableFrameProcessing: boolean;
  disableRecording: boolean;

  // UI notifications
  showWarning: boolean;
  showCriticalAlert: boolean;

  // Automatic actions
  pauseRecording: boolean;
  stopRecording: boolean;
  coolDownMode: boolean;
}

/**
 * Thermal event for history tracking
 */
export interface ThermalEvent {
  id: string;
  timestamp: number;
  fromState: ThermalState;
  toState: ThermalState;
  temperature?: number;
  duration: number; // ms in previous state
  trigger: "temperature" | "time" | "manual" | "recovery";
  actionsTriggered: string[];
}

/**
 * Thermal management configuration
 */
export interface ThermalManagementConfig {
  enabled: boolean;

  // Monitoring settings
  monitoringInterval: number; // ms
  temperatureSource: "native" | "estimated" | "disabled";

  // Thresholds
  thresholds: ThermalThresholds;

  // Actions configuration
  actions: {
    [K in ThermalState]: ThermalManagementActions;
  };

  // Learning settings
  enableLearning: boolean;
  adaptiveThresholds: boolean;
  deviceSpecificOptimization: boolean;
}

/**
 * Thermal learning data
 */
export interface ThermalLearningData {
  // Device characteristics
  deviceModel: string;
  averageHeatupRate: number; // °C/min
  averageCooldownRate: number; // °C/min
  thermalCapacity: number; // relative scale

  // Usage patterns
  typicalSessionLength: number; // ms
  averageAmbientTemp: number; // °C
  commonThermalTriggers: string[];

  // Optimization history
  successfulOptimizations: Array<{
    trigger: ThermalState;
    action: string;
    effectiveness: number; // 0-1
    timestamp: number;
  }>;

  // Adaptive thresholds
  learnedThresholds: Partial<ThermalThresholds>;
  confidenceLevel: number; // 0-1
}

/**
 * Thermal monitoring state
 */
export interface ThermalMonitoringState {
  // Current monitoring
  isMonitoring: boolean;
  monitoringStartTime: number;
  lastUpdateTime: number;

  // Current data
  current: ThermalMonitoringData;

  // Configuration
  config: ThermalManagementConfig;

  // History
  events: ThermalEvent[];
  maxHistorySize: number;

  // Learning
  learning: ThermalLearningData;

  // Active management
  activeActions: ThermalManagementActions;
  lastActionTime: number;

  // Statistics
  statistics: {
    totalEvents: number;
    timeInEachState: Record<ThermalState, number>;
    averageSessionTemp: number;
    thermalEfficiency: number; // 0-1
  };
}

/**
 * Thermal monitoring actions interface
 */
export interface ThermalMonitoringActions {
  // Monitoring control
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // State updates
  updateThermalState: (state: ThermalState, temperature?: number) => void;
  updateTemperature: (temperature: number) => void;

  // Configuration
  updateConfig: (config: Partial<ThermalManagementConfig>) => void;
  updateThresholds: (thresholds: Partial<ThermalThresholds>) => void;

  // Actions
  triggerAction: (action: keyof ThermalManagementActions) => void;
  clearActions: () => void;

  // Events
  addEvent: (event: Omit<ThermalEvent, "id">) => void;
  clearEvents: () => void;

  // Learning
  updateLearning: (data: Partial<ThermalLearningData>) => void;
  resetLearning: () => void;

  // Manual overrides
  forceState: (state: ThermalState) => void;
  pauseThermalManagement: (duration: number) => void;
}

/**
 * Complete thermal store interface
 */
export interface ThermalStore
  extends ThermalMonitoringState, ThermalMonitoringActions {}

/**
 * Thermal monitoring hook return type
 */
export interface UseThermalMonitoring {
  // Current state
  thermalState: ThermalState;
  temperature?: number;
  isMonitoring: boolean;

  // Actions available
  activeActions: ThermalManagementActions;

  // Trend information
  trend: "stable" | "rising" | "falling";
  prediction?: {
    peakTime: number;
    peakState: ThermalState;
  };

  // Control functions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateConfig: (config: Partial<ThermalManagementConfig>) => void;

  // Status checks
  canRecord: boolean;
  shouldShowWarning: boolean;
  shouldShowCriticalAlert: boolean;
  recommendedActions: string[];
}

/**
 * Thermal notification data
 */
export interface ThermalNotification {
  type: "warning" | "critical" | "recovery" | "info";
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
    style: "default" | "destructive" | "cancel";
  }>;
  duration?: number; // ms, undefined for persistent
  priority: "low" | "medium" | "high" | "critical";
}

/**
 * Thermal optimization suggestion
 */
export interface ThermalOptimizationSuggestion {
  id: string;
  type: "immediate" | "preventive" | "recovery";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;

  // Specific actions
  actions: Array<{
    type:
      | "reduce_resolution"
      | "reduce_framerate"
      | "pause_recording"
      | "enable_cooling"
      | "change_environment";
    parameters?: Record<string, any>;
    estimatedCooling: number; // °C reduction
    estimatedTime: number; // ms to take effect
  }>;

  // Learning data
  basedOnLearning: boolean;
  confidence: number; // 0-1
  previousSuccess: number; // 0-1
}

/**
 * Thermal performance impact analysis
 */
export interface ThermalPerformanceImpact {
  // Performance metrics affected
  fpsReduction: number; // percentage
  qualityReduction: number; // percentage
  featureDisabling: string[];

  // Estimated recovery
  estimatedRecoveryTime: number; // ms
  recoveryActions: string[];

  // User experience impact
  userExperienceScore: number; // 0-100
  impactDescription: string;
}

/**
 * Thermal session summary
 */
export interface ThermalSessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;

  // Thermal statistics
  peakState: ThermalState;
  peakTemperature?: number;
  averageState: ThermalState;
  averageTemperature?: number;

  // Time distribution
  timeInStates: Record<ThermalState, number>;

  // Events summary
  totalStateChanges: number;
  thermalEvents: ThermalEvent[];

  // Actions taken
  actionsTaken: Array<{
    timestamp: number;
    action: string;
    effectiveness: number; // 0-1
  }>;

  // Performance impact
  performanceImpact: ThermalPerformanceImpact;

  // Learning outcomes
  learningUpdates: Array<{
    parameter: string;
    oldValue: any;
    newValue: any;
    confidence: number;
  }>;
}

/**
 * Thermal management strategy
 */
export interface ThermalManagementStrategy {
  name: string;
  description: string;

  // Conditions for activation
  triggers: Array<{
    condition: "temperature" | "state" | "time" | "trend";
    threshold: any;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
  }>;

  // Actions to take
  actions: ThermalManagementActions;

  // Strategy metadata
  priority: number;
  effectiveness: number; // 0-1 based on historical data
  userImpact: number; // 0-1, lower is better

  // Learning parameters
  adaptable: boolean;
  learningWeight: number; // 0-1
}
