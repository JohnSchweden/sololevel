import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Platform,
} from "react-native";
import { useEnhancedCameraStore } from "../../../stores/enhancedCameraStore";
import { usePerformanceStore } from "../../../stores/performanceStore";

/**
 * Native Thermal Monitoring Hook for Phase 2
 * Monitors device thermal state and triggers adaptive quality adjustments
 * Based on native pipeline architecture with iOS/Android specific implementations
 */

export type ThermalState = "normal" | "fair" | "serious" | "critical";

export interface ThermalMonitoringConfig {
  enabled: boolean;
  monitoringInterval: number; // ms
  enableAutoAdjustment: boolean;
  enableNotifications: boolean;
  thermalThresholds: {
    fair: number; // CPU temperature threshold for fair state
    serious: number; // CPU temperature threshold for serious state
    critical: number; // CPU temperature threshold for critical state
  };
}

export interface ThermalMetrics {
  currentState: ThermalState;
  temperature: number; // Celsius
  cpuUsage: number; // percentage
  batteryTemperature: number; // Celsius
  timestamp: number;
  stateChanges: number;
  timeInCritical: number; // ms spent in critical state
}

export interface UseThermalMonitoringResult {
  // Current state
  thermalState: ThermalState;
  metrics: ThermalMetrics;
  isMonitoring: boolean;

  // Controls
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateConfig: (config: Partial<ThermalMonitoringConfig>) => void;

  // Utilities
  getThermalHistory: () => Array<{ timestamp: number; state: ThermalState }>;
  exportThermalData: () => string;
  resetMetrics: () => void;
}

const defaultConfig: ThermalMonitoringConfig = {
  enabled: true,
  monitoringInterval: 2000, // 2 seconds
  enableAutoAdjustment: true,
  enableNotifications: true,
  thermalThresholds: {
    fair: 45, // 45°C
    serious: 55, // 55°C
    critical: 65, // 65°C
  },
};

const initialMetrics: ThermalMetrics = {
  currentState: "normal",
  temperature: 25,
  cpuUsage: 0,
  batteryTemperature: 25,
  timestamp: 0,
  stateChanges: 0,
  timeInCritical: 0,
};

/**
 * Native thermal monitoring implementation
 * Uses platform-specific APIs to monitor device thermal state
 */
export const useThermalMonitoring = (
  config: Partial<ThermalMonitoringConfig> = {},
): UseThermalMonitoringResult => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [thermalState, setThermalState] = useState<ThermalState>("normal");
  const [metrics, setMetrics] = useState<ThermalMetrics>(initialMetrics);
  const [currentConfig, setCurrentConfig] = useState<ThermalMonitoringConfig>({
    ...defaultConfig,
    ...config,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const criticalStateStartTime = useRef<number | null>(null);
  const thermalHistory = useRef<
    Array<{ timestamp: number; state: ThermalState }>
  >([]);

  // Store references
  const performanceStore = usePerformanceStore();
  const cameraStore = useEnhancedCameraStore();

  /**
   * Get thermal state from native modules
   * iOS: Uses ProcessInfo.thermalState
   * Android: Uses custom thermal monitoring
   */
  const getNativeThermalState = useCallback(async (): Promise<{
    state: ThermalState;
    temperature: number;
    cpuUsage: number;
    batteryTemperature: number;
  }> => {
    try {
      if (Platform.OS === "ios") {
        // iOS thermal state monitoring
        const thermalInfo = await NativeModules.ThermalMonitor
          ?.getThermalState();
        if (thermalInfo) {
          return {
            state: mapIOSThermalState(thermalInfo.thermalState),
            temperature: thermalInfo.temperature || 25,
            cpuUsage: thermalInfo.cpuUsage || 0,
            batteryTemperature: thermalInfo.batteryTemperature || 25,
          };
        }
      } else if (Platform.OS === "android") {
        // Android thermal state monitoring
        const thermalInfo = await NativeModules.ThermalMonitor
          ?.getThermalState();
        if (thermalInfo) {
          return {
            state: mapAndroidThermalState(
              thermalInfo.thermalState,
              thermalInfo.temperature,
            ),
            temperature: thermalInfo.temperature || 25,
            cpuUsage: thermalInfo.cpuUsage || 0,
            batteryTemperature: thermalInfo.batteryTemperature || 25,
          };
        }
      }
    } catch (error) {
      // console.warn("Failed to get native thermal state:", error);
    }

    // Fallback: estimate thermal state based on performance metrics
    return estimateThermalState();
  }, []);

  /**
   * Map iOS thermal state to our enum
   */
  const mapIOSThermalState = (iosState: number): ThermalState => {
    switch (iosState) {
      case 0:
        return "normal"; // NSProcessInfoThermalStateNominal
      case 1:
        return "fair"; // NSProcessInfoThermalStateFair
      case 2:
        return "serious"; // NSProcessInfoThermalStateSerious
      case 3:
        return "critical"; // NSProcessInfoThermalStateCritical
      default:
        return "normal";
    }
  };

  /**
   * Map Android thermal state to our enum
   */
  const mapAndroidThermalState = (
    androidState: number,
    temperature: number,
  ): ThermalState => {
    // Android THERMAL_STATUS_* constants
    switch (androidState) {
      case 0:
        return "normal"; // THERMAL_STATUS_NONE
      case 1:
        return "fair"; // THERMAL_STATUS_LIGHT
      case 2:
        return "serious"; // THERMAL_STATUS_MODERATE
      case 3:
      case 4:
      case 5:
      case 6:
        return "critical"; // THERMAL_STATUS_SEVERE and above
      default:
        // Fallback to temperature-based estimation
        if (temperature >= currentConfig.thermalThresholds.critical) {
          return "critical";
        }
        if (temperature >= currentConfig.thermalThresholds.serious) {
          return "serious";
        }
        if (temperature >= currentConfig.thermalThresholds.fair) return "fair";
        return "normal";
    }
  };

  /**
   * Estimate thermal state when native APIs are unavailable
   */
  const estimateThermalState = (): {
    state: ThermalState;
    temperature: number;
    cpuUsage: number;
    batteryTemperature: number;
  } => {
    // Get current performance metrics
    const performanceStore = usePerformanceStore.getState();
    const { cpuUsage, fps, memoryUsage } = performanceStore.system;

    // Estimate temperature based on performance indicators
    let estimatedTemp = 25; // Base temperature

    // High CPU usage increases temperature
    if (cpuUsage > 80) estimatedTemp += 15;
    else if (cpuUsage > 60) estimatedTemp += 10;
    else if (cpuUsage > 40) estimatedTemp += 5;

    // Low FPS indicates thermal throttling
    if (fps < 15) estimatedTemp += 10;
    else if (fps < 20) estimatedTemp += 5;

    // High memory usage can indicate thermal stress
    if (memoryUsage > 200) estimatedTemp += 5;

    // Determine state based on estimated temperature
    let state: ThermalState = "normal";
    if (estimatedTemp >= currentConfig.thermalThresholds.critical) {
      state = "critical";
    } else if (estimatedTemp >= currentConfig.thermalThresholds.serious) {
      state = "serious";
    } else if (estimatedTemp >= currentConfig.thermalThresholds.fair) {
      state = "fair";
    }

    return {
      state,
      temperature: estimatedTemp,
      cpuUsage,
      batteryTemperature: estimatedTemp - 5, // Battery typically cooler than CPU
    };
  };

  /**
   * Monitor thermal state at regular intervals
   */
  const monitorThermalState = useCallback(async () => {
    if (!currentConfig.enabled) return;

    try {
      const thermalInfo = await getNativeThermalState();
      const now = Date.now();

      // Update metrics
      setMetrics((prev) => {
        const newMetrics = {
          ...prev,
          currentState: thermalInfo.state,
          temperature: thermalInfo.temperature,
          cpuUsage: thermalInfo.cpuUsage,
          batteryTemperature: thermalInfo.batteryTemperature,
          timestamp: now,
        };

        // Track state changes
        if (prev.currentState !== thermalInfo.state) {
          newMetrics.stateChanges = prev.stateChanges + 1;

          // Add to history
          thermalHistory.current.push({
            timestamp: now,
            state: thermalInfo.state,
          });

          // Limit history size
          if (thermalHistory.current.length > 100) {
            thermalHistory.current = thermalHistory.current.slice(-100);
          }
        }

        // Track time in critical state
        if (thermalInfo.state === "critical") {
          if (criticalStateStartTime.current === null) {
            criticalStateStartTime.current = now;
          }
        } else {
          if (criticalStateStartTime.current !== null) {
            newMetrics.timeInCritical = prev.timeInCritical +
              (now - criticalStateStartTime.current);
            criticalStateStartTime.current = null;
          }
        }

        return newMetrics;
      });

      // Update thermal state if changed
      if (thermalState !== thermalInfo.state) {
        setThermalState(thermalInfo.state);

        // Update performance store
        performanceStore.updateThermalState(thermalInfo.state);

        // Trigger camera store thermal change handler
        cameraStore.onThermalStateChange(thermalInfo.state);

        // Show notification for critical states
        if (
          currentConfig.enableNotifications &&
          (thermalInfo.state === "serious" || thermalInfo.state === "critical")
        ) {
          // TODO: Show thermal warning notification
          // console.warn(`Device thermal state: ${thermalInfo.state}`);
        }
      }

      // Update performance metrics
      performanceStore.updateSystemMetrics({
        cpuUsage: thermalInfo.cpuUsage,
      });
    } catch (error) {
      // console.error("Thermal monitoring error:", error);
    }
  }, [
    currentConfig.enabled,
    currentConfig.enableNotifications,
    getNativeThermalState,
    thermalState,
    performanceStore,
    cameraStore,
  ]);

  /**
   * Start thermal monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    // Initial check
    monitorThermalState();

    // Set up interval
    intervalRef.current = setInterval(
      monitorThermalState,
      currentConfig.monitoringInterval,
    );

    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background") {
        // Reduce monitoring frequency in background
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(
            monitorThermalState,
            currentConfig.monitoringInterval * 2,
          );
        }
      } else if (nextAppState === "active") {
        // Resume normal monitoring frequency
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(
            monitorThermalState,
            currentConfig.monitoringInterval,
          );
        }
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // Listen for native thermal events (if available)
    const thermalEventSubscription = DeviceEventEmitter.addListener(
      "ThermalStateChanged",
      (event) => {
        if (event.thermalState) {
          const mappedState = Platform.OS === "ios"
            ? mapIOSThermalState(event.thermalState)
            : mapAndroidThermalState(
              event.thermalState,
              event.temperature || 25,
            );

          setThermalState(mappedState);
          performanceStore.updateThermalState(mappedState);
          cameraStore.onThermalStateChange(mappedState);
        }
      },
    );

    // Cleanup function
    return () => {
      appStateSubscription?.remove();
      thermalEventSubscription?.remove();
    };
  }, [
    isMonitoring,
    currentConfig.monitoringInterval,
    monitorThermalState,
    performanceStore,
    cameraStore,
  ]);

  /**
   * Stop thermal monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset critical state timer
    if (criticalStateStartTime.current !== null) {
      setMetrics((prev) => ({
        ...prev,
        timeInCritical: prev.timeInCritical +
          (Date.now() - criticalStateStartTime.current!),
      }));
      criticalStateStartTime.current = null;
    }
  }, [isMonitoring]);

  /**
   * Update monitoring configuration
   */
  const updateConfig = useCallback(
    (newConfig: Partial<ThermalMonitoringConfig>) => {
      setCurrentConfig((prev) => ({ ...prev, ...newConfig }));

      // Restart monitoring with new config if currently monitoring
      if (isMonitoring) {
        stopMonitoring();
        setTimeout(startMonitoring, 100);
      }
    },
    [isMonitoring, startMonitoring, stopMonitoring],
  );

  /**
   * Get thermal history
   */
  const getThermalHistory = useCallback(() => {
    return [...thermalHistory.current];
  }, []);

  /**
   * Export thermal data
   */
  const exportThermalData = useCallback(() => {
    return JSON.stringify({
      metrics,
      history: thermalHistory.current,
      config: currentConfig,
      exportedAt: Date.now(),
      version: "2.0",
    });
  }, [metrics, currentConfig]);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    setMetrics(initialMetrics);
    thermalHistory.current = [];
    criticalStateStartTime.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (currentConfig.enabled && !isMonitoring) {
      startMonitoring();
    }
  }, [currentConfig.enabled, isMonitoring, startMonitoring]);

  return {
    thermalState,
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    getThermalHistory,
    exportThermalData,
    resetMetrics,
  };
};
