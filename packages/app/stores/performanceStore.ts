import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Enhanced Performance Store for Phase 2
 * Comprehensive performance monitoring for camera, pose detection, and system metrics
 * Based on native pipeline architecture with thermal management
 */

export interface SystemMetrics {
  // Core performance metrics
  fps: number;
  targetFps: number;
  frameTime: number; // ms per frame
  droppedFrames: number;
  totalFrames: number;

  // Memory metrics
  memoryUsage: number; // MB
  peakMemoryUsage: number; // MB
  memoryPressure: "low" | "medium" | "high" | "critical";

  // CPU metrics
  cpuUsage: number; // percentage
  averageCpuUsage: number;
  peakCpuUsage: number;

  // Battery metrics (when available)
  batteryLevel: number; // percentage
  batteryOptimizationEnabled: boolean;
  chargingState: "charging" | "discharging" | "full" | "unknown";

  // Thermal metrics
  thermalState: "normal" | "fair" | "serious" | "critical";
  thermalHistory: Array<{ timestamp: number; state: string }>;
  thermalThrottling: boolean;
}

export interface ProcessingMetrics {
  // Camera processing
  cameraInitTime: number;
  cameraFrameRate: number;
  cameraResolution: { width: number; height: number };

  // Pose detection processing
  poseDetectionTime: number;
  averagePoseDetectionTime: number;
  peakPoseDetectionTime: number;
  poseDetectionRate: number;

  // Rendering metrics
  renderTime: number;
  averageRenderTime: number;
  overlayRenderTime: number;

  // Network metrics (for uploads)
  uploadSpeed: number; // Mbps
  networkLatency: number; // ms
  networkQuality: "excellent" | "good" | "fair" | "poor";
}

export interface PerformanceAlerts {
  lowFps: boolean;
  highMemoryUsage: boolean;
  thermalThrottling: boolean;
  lowBattery: boolean;
  highCpuUsage: boolean;
  networkIssues: boolean;
}

export interface PerformanceSettings {
  // Monitoring settings
  monitoringEnabled: boolean;
  monitoringInterval: number; // ms
  metricsRetentionTime: number; // ms

  // Alert thresholds
  lowFpsThreshold: number;
  highMemoryThreshold: number; // MB
  highCpuThreshold: number; // percentage
  lowBatteryThreshold: number; // percentage

  // Optimization settings
  autoOptimizationEnabled: boolean;
  thermalManagementEnabled: boolean;
  batteryOptimizationEnabled: boolean;
}

export interface PerformanceStore {
  // Current metrics
  system: SystemMetrics;
  processing: ProcessingMetrics;
  alerts: PerformanceAlerts;
  settings: PerformanceSettings;

  // Historical data (limited retention)
  history: {
    fps: Array<{ timestamp: number; value: number }>;
    memory: Array<{ timestamp: number; value: number }>;
    cpu: Array<{ timestamp: number; value: number }>;
    thermal: Array<{ timestamp: number; state: string }>;
    maxHistorySize: number;
  };

  // Monitoring state
  isMonitoring: boolean;
  monitoringStartTime: number;
  lastUpdateTime: number;

  // Actions for system metrics
  updateSystemMetrics: (metrics: Partial<SystemMetrics>) => void;
  updateProcessingMetrics: (metrics: Partial<ProcessingMetrics>) => void;
  updateThermalState: (state: SystemMetrics["thermalState"]) => void;
  updateBatteryLevel: (level: number, charging?: boolean) => void;

  // Actions for performance monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;
  clearHistory: () => void;

  // Actions for alerts
  checkAlerts: () => void;
  clearAlert: (alertType: keyof PerformanceAlerts) => void;
  clearAllAlerts: () => void;

  // Actions for settings
  updateSettings: (settings: Partial<PerformanceSettings>) => void;
  resetSettings: () => void;

  // Utility actions
  addHistoryPoint: (metric: "fps" | "memory" | "cpu", value: number) => void;
  addThermalHistoryPoint: (state: string) => void;
  getAverageMetric: (
    metric: "fps" | "memory" | "cpu",
    timeWindow?: number,
  ) => number;
  exportMetrics: () => string;

  // Cleanup
  reset: () => void;
}

const initialSystemMetrics: SystemMetrics = {
  fps: 30,
  targetFps: 30,
  frameTime: 33.33,
  droppedFrames: 0,
  totalFrames: 0,
  memoryUsage: 0,
  peakMemoryUsage: 0,
  memoryPressure: "low",
  cpuUsage: 0,
  averageCpuUsage: 0,
  peakCpuUsage: 0,
  batteryLevel: 100,
  batteryOptimizationEnabled: false,
  chargingState: "unknown",
  thermalState: "normal",
  thermalHistory: [],
  thermalThrottling: false,
};

const initialProcessingMetrics: ProcessingMetrics = {
  cameraInitTime: 0,
  cameraFrameRate: 30,
  cameraResolution: { width: 1920, height: 1080 },
  poseDetectionTime: 0,
  averagePoseDetectionTime: 0,
  peakPoseDetectionTime: 0,
  poseDetectionRate: 0,
  renderTime: 0,
  averageRenderTime: 0,
  overlayRenderTime: 0,
  uploadSpeed: 0,
  networkLatency: 0,
  networkQuality: "excellent",
};

const initialAlerts: PerformanceAlerts = {
  lowFps: false,
  highMemoryUsage: false,
  thermalThrottling: false,
  lowBattery: false,
  highCpuUsage: false,
  networkIssues: false,
};

const initialSettings: PerformanceSettings = {
  monitoringEnabled: true,
  monitoringInterval: 1000, // 1 second
  metricsRetentionTime: 300000, // 5 minutes
  lowFpsThreshold: 20,
  highMemoryThreshold: 100, // 100MB
  highCpuThreshold: 80, // 80%
  lowBatteryThreshold: 20, // 20%
  autoOptimizationEnabled: true,
  thermalManagementEnabled: true,
  batteryOptimizationEnabled: true,
};

export const usePerformanceStore = create<PerformanceStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      system: { ...initialSystemMetrics },
      processing: { ...initialProcessingMetrics },
      alerts: { ...initialAlerts },
      settings: { ...initialSettings },

      history: {
        fps: [],
        memory: [],
        cpu: [],
        thermal: [],
        maxHistorySize: 300, // 5 minutes at 1 second intervals
      },

      isMonitoring: false,
      monitoringStartTime: 0,
      lastUpdateTime: 0,

      // System metrics actions
      updateSystemMetrics: (metrics) =>
        set((draft) => {
          Object.assign(draft.system, metrics);
          draft.lastUpdateTime = Date.now();

          // Update peaks
          if (
            metrics.memoryUsage &&
            metrics.memoryUsage > draft.system.peakMemoryUsage
          ) {
            draft.system.peakMemoryUsage = metrics.memoryUsage;
          }
          if (
            metrics.cpuUsage && metrics.cpuUsage > draft.system.peakCpuUsage
          ) {
            draft.system.peakCpuUsage = metrics.cpuUsage;
          }

          // Update averages (simple moving average)
          if (metrics.cpuUsage) {
            draft.system.averageCpuUsage = draft.system.averageCpuUsage === 0
              ? metrics.cpuUsage
              : (draft.system.averageCpuUsage + metrics.cpuUsage) / 2;
          }

          // Add to history
          if (metrics.fps !== undefined) {
            get().addHistoryPoint("fps", metrics.fps);
          }
          if (metrics.memoryUsage !== undefined) {
            get().addHistoryPoint("memory", metrics.memoryUsage);
          }
          if (metrics.cpuUsage !== undefined) {
            get().addHistoryPoint("cpu", metrics.cpuUsage);
          }
        }),

      updateProcessingMetrics: (metrics) =>
        set((draft) => {
          Object.assign(draft.processing, metrics);

          // Update peaks and averages
          if (metrics.poseDetectionTime) {
            if (
              metrics.poseDetectionTime > draft.processing.peakPoseDetectionTime
            ) {
              draft.processing.peakPoseDetectionTime =
                metrics.poseDetectionTime;
            }
            draft.processing.averagePoseDetectionTime =
              draft.processing.averagePoseDetectionTime === 0
                ? metrics.poseDetectionTime
                : (draft.processing.averagePoseDetectionTime +
                  metrics.poseDetectionTime) / 2;
          }

          if (metrics.renderTime) {
            draft.processing.averageRenderTime =
              draft.processing.averageRenderTime === 0
                ? metrics.renderTime
                : (draft.processing.averageRenderTime + metrics.renderTime) / 2;
          }
        }),

      updateThermalState: (state) =>
        set((draft) => {
          if (draft.system.thermalState !== state) {
            draft.system.thermalState = state;
            draft.system.thermalThrottling = state === "serious" ||
              state === "critical";
            get().addThermalHistoryPoint(state);
          }
        }),

      updateBatteryLevel: (level, charging) =>
        set((draft) => {
          draft.system.batteryLevel = level;
          if (charging !== undefined) {
            draft.system.chargingState = charging ? "charging" : "discharging";
          }

          // Enable battery optimization if level is low
          if (
            level < draft.settings.lowBatteryThreshold &&
            draft.settings.batteryOptimizationEnabled
          ) {
            draft.system.batteryOptimizationEnabled = true;
          } else if (level > draft.settings.lowBatteryThreshold + 10) {
            draft.system.batteryOptimizationEnabled = false;
          }
        }),

      // Monitoring actions
      startMonitoring: () =>
        set((draft) => {
          draft.isMonitoring = true;
          draft.monitoringStartTime = Date.now();
        }),

      stopMonitoring: () =>
        set((draft) => {
          draft.isMonitoring = false;
        }),

      resetMetrics: () =>
        set((draft) => {
          draft.system = { ...initialSystemMetrics };
          draft.processing = { ...initialProcessingMetrics };
          draft.alerts = { ...initialAlerts };
        }),

      clearHistory: () =>
        set((draft) => {
          draft.history.fps = [];
          draft.history.memory = [];
          draft.history.cpu = [];
          draft.history.thermal = [];
        }),

      // Alert actions
      checkAlerts: () =>
        set((draft) => {
          const { system, processing, settings } = draft;

          // Check FPS alert
          draft.alerts.lowFps = system.fps < settings.lowFpsThreshold;

          // Check memory alert
          draft.alerts.highMemoryUsage =
            system.memoryUsage > settings.highMemoryThreshold;

          // Check thermal alert
          draft.alerts.thermalThrottling = system.thermalThrottling;

          // Check battery alert
          draft.alerts.lowBattery =
            system.batteryLevel < settings.lowBatteryThreshold;

          // Check CPU alert
          draft.alerts.highCpuUsage =
            system.cpuUsage > settings.highCpuThreshold;

          // Check network alert
          draft.alerts.networkIssues = processing.networkQuality === "poor" ||
            processing.networkLatency > 1000;
        }),

      clearAlert: (alertType) =>
        set((draft) => {
          draft.alerts[alertType] = false;
        }),

      clearAllAlerts: () =>
        set((draft) => {
          draft.alerts = { ...initialAlerts };
        }),

      // Settings actions
      updateSettings: (settings) =>
        set((draft) => {
          Object.assign(draft.settings, settings);
        }),

      resetSettings: () =>
        set((draft) => {
          draft.settings = { ...initialSettings };
        }),

      // Utility actions
      addHistoryPoint: (metric, value) =>
        set((draft) => {
          const now = Date.now();
          const historyArray = draft.history[metric];

          historyArray.push({ timestamp: now, value });

          // Trim history to max size
          if (historyArray.length > draft.history.maxHistorySize) {
            historyArray.splice(
              0,
              historyArray.length - draft.history.maxHistorySize,
            );
          }

          // Remove old entries based on retention time
          const cutoffTime = now - draft.settings.metricsRetentionTime;
          const validEntries = historyArray.filter((entry) =>
            entry.timestamp > cutoffTime
          );
          draft.history[metric] = validEntries;
        }),

      addThermalHistoryPoint: (state) =>
        set((draft) => {
          const now = Date.now();
          draft.system.thermalHistory.push({ timestamp: now, state });

          // Trim thermal history
          if (draft.system.thermalHistory.length > 100) {
            draft.system.thermalHistory.splice(
              0,
              draft.system.thermalHistory.length - 100,
            );
          }
        }),

      getAverageMetric: (metric, timeWindow = 60000) => {
        const { history } = get();
        const now = Date.now();
        const cutoffTime = now - timeWindow;

        const recentEntries = history[metric].filter((entry) =>
          entry.timestamp > cutoffTime
        );
        if (recentEntries.length === 0) return 0;

        const sum = recentEntries.reduce((acc, entry) => acc + entry.value, 0);
        return sum / recentEntries.length;
      },

      exportMetrics: () => {
        const state = get();
        return JSON.stringify({
          system: state.system,
          processing: state.processing,
          alerts: state.alerts,
          history: state.history,
          monitoringDuration: state.isMonitoring
            ? Date.now() - state.monitoringStartTime
            : 0,
          exportedAt: Date.now(),
          version: "2.0",
        });
      },

      // Cleanup
      reset: () =>
        set((draft) => {
          draft.system = { ...initialSystemMetrics };
          draft.processing = { ...initialProcessingMetrics };
          draft.alerts = { ...initialAlerts };
          draft.settings = { ...initialSettings };
          draft.history = {
            fps: [],
            memory: [],
            cpu: [],
            thermal: [],
            maxHistorySize: 300,
          };
          draft.isMonitoring = false;
          draft.monitoringStartTime = 0;
          draft.lastUpdateTime = 0;
        }),
    })),
  ),
);

// Selectors for optimized component updates
export const usePerformanceSelectors = () => {
  const store = usePerformanceStore();

  return {
    // System selectors
    currentFps: store.system.fps,
    memoryUsage: store.system.memoryUsage,
    cpuUsage: store.system.cpuUsage,
    batteryLevel: store.system.batteryLevel,
    thermalState: store.system.thermalState,

    // Performance indicators
    isPerformanceGood: store.system.fps >= store.settings.lowFpsThreshold &&
      store.system.memoryUsage < store.settings.highMemoryThreshold &&
      store.system.cpuUsage < store.settings.highCpuThreshold,

    // Alert selectors
    hasAlerts: Object.values(store.alerts).some((alert) => alert),
    criticalAlerts: store.alerts.thermalThrottling || store.alerts.lowBattery,

    // Monitoring selectors
    isMonitoring: store.isMonitoring,
    monitoringDuration: store.isMonitoring
      ? Date.now() - store.monitoringStartTime
      : 0,

    // Processing selectors
    averagePoseDetectionTime: store.processing.averagePoseDetectionTime,
    poseDetectionRate: store.processing.poseDetectionRate,
    cameraFrameRate: store.processing.cameraFrameRate,
  };
};

// Hook for performance optimization
export const usePerformanceOptimization = () => {
  const { system, settings, updateSettings } = usePerformanceStore();

  const getOptimizationRecommendations = () => {
    const recommendations: string[] = [];

    if (system.fps < settings.lowFpsThreshold) {
      recommendations.push("Reduce camera resolution or frame rate");
    }
    if (system.memoryUsage > settings.highMemoryThreshold) {
      recommendations.push("Clear pose data buffer or reduce detection rate");
    }
    if (system.thermalThrottling) {
      recommendations.push(
        "Enable thermal management and reduce processing load",
      );
    }
    if (system.batteryLevel < settings.lowBatteryThreshold) {
      recommendations.push("Enable battery optimization mode");
    }

    return recommendations;
  };

  const applyAutoOptimizations = () => {
    if (!settings.autoOptimizationEnabled) return;

    const updates: Partial<PerformanceSettings> = {};

    // Auto-enable optimizations based on current state
    if (system.thermalThrottling && settings.thermalManagementEnabled) {
      // Thermal optimizations will be handled by adaptive quality system
    }

    if (
      system.batteryLevel < settings.lowBatteryThreshold &&
      settings.batteryOptimizationEnabled
    ) {
      // Battery optimizations will be handled by adaptive quality system
    }

    if (Object.keys(updates).length > 0) {
      updateSettings(updates);
    }
  };

  return {
    getOptimizationRecommendations,
    applyAutoOptimizations,
    isOptimizationNeeded: system.fps < settings.lowFpsThreshold ||
      system.memoryUsage > settings.highMemoryThreshold ||
      system.thermalThrottling ||
      system.batteryLevel < settings.lowBatteryThreshold,
  };
};
