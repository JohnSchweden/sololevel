import React from "react";
import { usePoseStore } from "../../../stores/poseStore";
import { useThermalStore } from "../../../stores/thermal";
import type { PoseDetectionConfig, ProcessingQuality } from "../types/pose";
import type { ThermalLevel, ThermalState } from "../types/thermal";

// Thermal throttling configuration
interface ThermalThrottlingConfig {
  enabled: boolean;
  aggressiveness: "conservative" | "balanced" | "aggressive";

  // Temperature thresholds for different actions
  thresholds: {
    warning: number; // Start reducing quality
    critical: number; // Aggressive throttling
    emergency: number; // Stop processing
  };

  // Quality adjustments per thermal level
  qualityAdjustments: Record<ThermalLevel, {
    maxQuality: ProcessingQuality;
    frameSkipping: number; // Multiplier for frame skipping
    batchDelay: number; // Additional delay between batches (ms)
    enableSmoothing: boolean;
    maxHistorySize: number;
  }>;

  // Recovery settings
  recovery: {
    cooldownPeriod: number; // Time to wait before upgrading quality (ms)
    temperatureHysteresis: number; // Temperature difference for recovery
    gradualRecovery: boolean; // Gradually increase quality vs immediate
  };
}

// Default thermal throttling configuration
const DEFAULT_THERMAL_CONFIG: ThermalThrottlingConfig = {
  enabled: true,
  aggressiveness: "balanced",

  thresholds: {
    warning: 70, // 70°C
    critical: 80, // 80°C
    emergency: 90, // 90°C
  },

  qualityAdjustments: {
    nominal: {
      maxQuality: "high",
      frameSkipping: 1,
      batchDelay: 0,
      enableSmoothing: true,
      maxHistorySize: 200,
    },
    fair: {
      maxQuality: "medium",
      frameSkipping: 1.5,
      batchDelay: 50,
      enableSmoothing: true,
      maxHistorySize: 150,
    },
    serious: {
      maxQuality: "low",
      frameSkipping: 2,
      batchDelay: 100,
      enableSmoothing: false,
      maxHistorySize: 100,
    },
    critical: {
      maxQuality: "low",
      frameSkipping: 3,
      batchDelay: 200,
      enableSmoothing: false,
      maxHistorySize: 50,
    },
  },

  recovery: {
    cooldownPeriod: 10000, // 10 seconds
    temperatureHysteresis: 5, // 5°C difference
    gradualRecovery: true,
  },
};

// Thermal integration manager
export class PoseThermalManager {
  private config: ThermalThrottlingConfig;
  private lastThrottleTime = 0;
  private lastRecoveryTime = 0;
  private currentThrottleLevel: ThermalLevel = "nominal";
  private isThrottling = false;
  private originalConfig: PoseDetectionConfig | null = null;

  constructor(config: Partial<ThermalThrottlingConfig> = {}) {
    this.config = { ...DEFAULT_THERMAL_CONFIG, ...config };
  }

  // Update thermal throttling configuration
  updateConfig(config: Partial<ThermalThrottlingConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Process thermal state change and adjust pose detection accordingly
  processThermalState(
    thermalState: ThermalState,
    currentPoseConfig: PoseDetectionConfig,
    poseStore: ReturnType<typeof usePoseStore.getState>,
  ): {
    shouldAdjust: boolean;
    newConfig?: Partial<PoseDetectionConfig>;
    throttleLevel: ThermalLevel;
    reason: string;
  } {
    if (!this.config.enabled) {
      return {
        shouldAdjust: false,
        throttleLevel: "nominal",
        reason: "Thermal throttling disabled",
      };
    }

    const now = Date.now();
    const temperature = thermalState.temperature || 0;
    const thermalLevel = thermalState.state;

    // Store original config if this is the first throttling event
    if (!this.originalConfig && !this.isThrottling) {
      this.originalConfig = { ...currentPoseConfig };
    }

    // Determine if we need to throttle or recover
    const shouldThrottle = this.shouldThrottle(temperature, thermalLevel);
    const canRecover = this.canRecover(temperature, thermalLevel, now);

    if (
      shouldThrottle &&
      (!this.isThrottling || thermalLevel !== this.currentThrottleLevel)
    ) {
      // Apply or increase throttling
      return this.applyThrottling(thermalLevel, currentPoseConfig, now);
    }

    if (canRecover && this.isThrottling) {
      // Recover from throttling
      return this.recoverFromThrottling(thermalLevel, currentPoseConfig, now);
    }

    return {
      shouldAdjust: false,
      throttleLevel: this.currentThrottleLevel,
      reason: this.isThrottling
        ? "Maintaining current throttle level"
        : "No thermal action needed",
    };
  }

  // Determine if throttling should be applied
  private shouldThrottle(
    temperature: number,
    thermalLevel: ThermalLevel,
  ): boolean {
    // Check temperature thresholds
    if (temperature >= this.config.thresholds.emergency) return true;
    if (temperature >= this.config.thresholds.critical) return true;
    if (temperature >= this.config.thresholds.warning) return true;

    // Check thermal level
    if (thermalLevel === "critical" || thermalLevel === "serious") return true;

    // Apply aggressiveness setting
    switch (this.config.aggressiveness) {
      case "aggressive":
        return thermalLevel !== "nominal";
      case "balanced":
        return thermalLevel === "serious" || thermalLevel === "critical";
      case "conservative":
        return thermalLevel === "critical";
      default:
        return false;
    }
  }

  // Determine if recovery from throttling is possible
  private canRecover(
    temperature: number,
    thermalLevel: ThermalLevel,
    now: number,
  ): boolean {
    if (!this.isThrottling) return false;

    // Check cooldown period
    const timeSinceLastThrottle = now - this.lastThrottleTime;
    if (timeSinceLastThrottle < this.config.recovery.cooldownPeriod) {
      return false;
    }

    // Check temperature hysteresis
    const targetTemp = this.getTargetTemperature(this.currentThrottleLevel);
    if (temperature > targetTemp - this.config.recovery.temperatureHysteresis) {
      return false;
    }

    // Check thermal level improvement
    const levelImproved = this.getThermalLevelPriority(thermalLevel) <
      this.getThermalLevelPriority(this.currentThrottleLevel);

    return levelImproved;
  }

  // Apply thermal throttling
  private applyThrottling(
    thermalLevel: ThermalLevel,
    currentConfig: PoseDetectionConfig,
    now: number,
  ): {
    shouldAdjust: boolean;
    newConfig: Partial<PoseDetectionConfig>;
    throttleLevel: ThermalLevel;
    reason: string;
  } {
    this.isThrottling = true;
    this.currentThrottleLevel = thermalLevel;
    this.lastThrottleTime = now;

    const adjustments = this.config.qualityAdjustments[thermalLevel];

    // Calculate new configuration
    const newConfig: Partial<PoseDetectionConfig> = {
      processingQuality: adjustments.maxQuality,
      enableSmoothing: adjustments.enableSmoothing,
      maxHistorySize: adjustments.maxHistorySize,
    };

    // Adjust frame skipping if current strategy allows
    if (
      currentConfig.frameSkipping === "adaptive" ||
      currentConfig.frameSkipping === "aggressive"
    ) {
      if (adjustments.frameSkipping >= 2) {
        newConfig.frameSkipping = "aggressive";
      } else if (adjustments.frameSkipping >= 1.5) {
        newConfig.frameSkipping = "adaptive";
      }
    }

    // Reduce confidence threshold slightly to maintain detection with lower quality
    if (adjustments.maxQuality === "low") {
      newConfig.confidenceThreshold = Math.max(
        0.1,
        currentConfig.confidenceThreshold - 0.1,
      );
    }

    return {
      shouldAdjust: true,
      newConfig,
      throttleLevel: thermalLevel,
      reason: `Thermal throttling applied: ${thermalLevel} level detected`,
    };
  }

  // Recover from thermal throttling
  private recoverFromThrottling(
    thermalLevel: ThermalLevel,
    currentConfig: PoseDetectionConfig,
    now: number,
  ): {
    shouldAdjust: boolean;
    newConfig?: Partial<PoseDetectionConfig>;
    throttleLevel: ThermalLevel;
    reason: string;
  } {
    this.lastRecoveryTime = now;

    if (thermalLevel === "nominal" && this.originalConfig) {
      // Full recovery to original configuration
      this.isThrottling = false;
      this.currentThrottleLevel = "nominal";

      const recoveryConfig = { ...this.originalConfig };
      this.originalConfig = null;

      return {
        shouldAdjust: true,
        newConfig: recoveryConfig,
        throttleLevel: "nominal",
        reason: "Full recovery from thermal throttling",
      };
    }

    if (this.config.recovery.gradualRecovery) {
      // Gradual recovery - move to next better level
      const betterLevel = this.getNextBetterThermalLevel(
        this.currentThrottleLevel,
      );
      if (betterLevel !== this.currentThrottleLevel) {
        this.currentThrottleLevel = betterLevel;

        const adjustments = this.config.qualityAdjustments[betterLevel];
        const newConfig: Partial<PoseDetectionConfig> = {
          processingQuality: adjustments.maxQuality,
          enableSmoothing: adjustments.enableSmoothing,
          maxHistorySize: adjustments.maxHistorySize,
        };

        return {
          shouldAdjust: true,
          newConfig,
          throttleLevel: betterLevel,
          reason: `Gradual recovery to ${betterLevel} level`,
        };
      }
    }

    return {
      shouldAdjust: false,
      throttleLevel: this.currentThrottleLevel,
      reason: "No recovery action taken",
    };
  }

  // Get target temperature for a thermal level
  private getTargetTemperature(level: ThermalLevel): number {
    switch (level) {
      case "critical":
        return this.config.thresholds.critical;
      case "serious":
        return this.config.thresholds.warning;
      case "fair":
        return this.config.thresholds.warning - 10;
      case "nominal":
        return this.config.thresholds.warning - 20;
      default:
        return 0;
    }
  }

  // Get thermal level priority (higher = worse)
  private getThermalLevelPriority(level: ThermalLevel): number {
    switch (level) {
      case "nominal":
        return 0;
      case "fair":
        return 1;
      case "serious":
        return 2;
      case "critical":
        return 3;
      default:
        return 0;
    }
  }

  // Get next better thermal level for gradual recovery
  private getNextBetterThermalLevel(currentLevel: ThermalLevel): ThermalLevel {
    switch (currentLevel) {
      case "critical":
        return "serious";
      case "serious":
        return "fair";
      case "fair":
        return "nominal";
      case "nominal":
        return "nominal";
      default:
        return "nominal";
    }
  }

  // Get current throttling status
  getThrottlingStatus() {
    return {
      isThrottling: this.isThrottling,
      currentLevel: this.currentThrottleLevel,
      lastThrottleTime: this.lastThrottleTime,
      lastRecoveryTime: this.lastRecoveryTime,
      hasOriginalConfig: !!this.originalConfig,
    };
  }

  // Force recovery (for manual override)
  forceRecovery(): Partial<PoseDetectionConfig> | null {
    if (!this.isThrottling || !this.originalConfig) return null;

    const recoveryConfig = { ...this.originalConfig };

    this.isThrottling = false;
    this.currentThrottleLevel = "nominal";
    this.originalConfig = null;
    this.lastRecoveryTime = Date.now();

    return recoveryConfig;
  }

  // Emergency stop (for critical thermal conditions)
  emergencyStop(): boolean {
    if (this.isThrottling && this.currentThrottleLevel === "critical") {
      return true; // Signal to stop pose processing entirely
    }
    return false;
  }
}

// React hook for thermal integration
export const usePoseThermalIntegration = () => {
  const poseStore = usePoseStore();
  const thermalStore = useThermalStore();
  const [thermalManager] = React.useState(() => new PoseThermalManager());
  const [lastAdjustment, setLastAdjustment] = React.useState<
    {
      timestamp: number;
      reason: string;
      level: ThermalLevel;
    } | null
  >(null);

  // Process thermal state changes
  const processThermalChange = React.useCallback(
    (thermalState: ThermalState) => {
      const currentConfig = poseStore.getState().config;
      const result = thermalManager.processThermalState(
        thermalState,
        currentConfig,
        poseStore.getState(),
      );

      if (result.shouldAdjust && result.newConfig) {
        poseStore.getState().updateConfig(result.newConfig);

        setLastAdjustment({
          timestamp: Date.now(),
          reason: result.reason,
          level: result.throttleLevel,
        });

        // Add warning to pose store
        poseStore.getState().addWarning(`Thermal adjustment: ${result.reason}`);
      }

      return result;
    },
    [poseStore, thermalManager],
  );

  // Subscribe to thermal state changes
  React.useEffect(() => {
    const unsubscribe = thermalStore.subscribe((state) => {
      if (state.currentState) {
        processThermalChange(state.currentState);
      }
    });

    return unsubscribe;
  }, [thermalStore, processThermalChange]);

  // Manual thermal management controls
  const forceRecovery = React.useCallback(() => {
    const recoveryConfig = thermalManager.forceRecovery();
    if (recoveryConfig) {
      poseStore.getState().updateConfig(recoveryConfig);
      poseStore.getState().addWarning(
        "Manual recovery from thermal throttling",
      );

      setLastAdjustment({
        timestamp: Date.now(),
        reason: "Manual recovery",
        level: "nominal",
      });
    }
  }, [thermalManager, poseStore]);

  const updateThermalConfig = React.useCallback(
    (config: Partial<ThermalThrottlingConfig>) => {
      thermalManager.updateConfig(config);
    },
    [thermalManager],
  );

  return {
    // Status
    throttlingStatus: thermalManager.getThrottlingStatus(),
    lastAdjustment,

    // Controls
    forceRecovery,
    updateThermalConfig,

    // Configuration
    thermalConfig: DEFAULT_THERMAL_CONFIG,

    // Computed values
    isThrottling: thermalManager.getThrottlingStatus().isThrottling,
    currentThermalLevel: thermalManager.getThrottlingStatus().currentLevel,

    // Emergency controls
    emergencyStop: () => thermalManager.emergencyStop(),
  };
};

// Utility functions for thermal management
export const getThermalRecommendations = (
  thermalState: ThermalState,
  currentConfig: PoseDetectionConfig,
): Array<{
  type: "warning" | "suggestion" | "critical";
  message: string;
  action?: string;
}> => {
  const recommendations: Array<{
    type: "warning" | "suggestion" | "critical";
    message: string;
    action?: string;
  }> = [];

  const temperature = thermalState.temperature || 0;

  // Critical temperature warnings
  if (temperature >= 90) {
    recommendations.push({
      type: "critical",
      message:
        "Critical temperature detected! Pose detection should be stopped immediately.",
      action: "Stop pose processing",
    });
  } else if (temperature >= 80) {
    recommendations.push({
      type: "warning",
      message: "High temperature detected. Aggressive throttling recommended.",
      action: "Reduce to low quality",
    });
  } else if (temperature >= 70) {
    recommendations.push({
      type: "warning",
      message: "Elevated temperature. Consider reducing processing quality.",
      action: "Enable thermal throttling",
    });
  }

  // Thermal level recommendations
  switch (thermalState.state) {
    case "critical":
      recommendations.push({
        type: "critical",
        message: "Critical thermal state. Immediate action required.",
        action: "Stop or minimize pose processing",
      });
      break;
    case "serious":
      recommendations.push({
        type: "warning",
        message: "Serious thermal state. Reduce processing load.",
        action: "Switch to low quality mode",
      });
      break;
    case "fair":
      recommendations.push({
        type: "suggestion",
        message: "Fair thermal state. Consider enabling adaptive quality.",
        action: "Enable thermal throttling",
      });
      break;
  }

  // Configuration-specific recommendations
  if (
    currentConfig.processingQuality === "high" &&
    thermalState.state !== "nominal"
  ) {
    recommendations.push({
      type: "suggestion",
      message: "High quality processing with elevated thermal state.",
      action: "Reduce to medium or low quality",
    });
  }

  if (
    !currentConfig.enableThermalThrottling && thermalState.state !== "nominal"
  ) {
    recommendations.push({
      type: "suggestion",
      message: "Thermal throttling is disabled but thermal issues detected.",
      action: "Enable thermal throttling",
    });
  }

  return recommendations;
};

export default PoseThermalManager;
