import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useEnhancedCameraStore } from "../../../stores/enhancedCameraStore";
import { usePerformanceStore } from "../../../stores/performanceStore";
import { usePoseStore } from "../../../stores/poseStore";

/**
 * Enhanced Adaptive Quality Management Hook for Phase 2
 * Integrates thermal monitoring, performance metrics, and battery optimization
 * Provides intelligent quality adjustments based on device capabilities and state
 */

export interface QualitySettings {
  // Camera settings
  cameraFps: number;
  cameraResolution: "480p" | "720p" | "1080p" | "4k";
  cameraBitrate: number; // bps

  // Pose detection settings
  poseDetectionRate: number; // Process every Nth frame
  poseConfidenceThreshold: number;
  poseSmoothing: boolean;

  // Rendering settings
  overlayQuality: "low" | "medium" | "high";
  overlayFps: number;
  enableBlur: boolean;

  // Processing settings
  enableBackgroundProcessing: boolean;
  maxBufferSize: number; // MB
  compressionLevel: "low" | "medium" | "high";
}

export interface AdaptiveQualityConfig {
  enabled: boolean;
  aggressiveOptimization: boolean;
  batteryOptimization: boolean;
  thermalManagement: boolean;
  performanceMode: "quality" | "balanced" | "performance";

  // Thresholds for adjustments
  fpsThresholds: {
    critical: number;
    warning: number;
    target: number;
  };
  memoryThresholds: {
    critical: number; // MB
    warning: number; // MB
  };
  batteryThresholds: {
    critical: number; // %
    low: number; // %
  };
}

export interface QualityMetrics {
  currentScore: number; // 0-100 quality score
  adjustmentCount: number;
  lastAdjustmentTime: number;
  thermalAdjustments: number;
  batteryAdjustments: number;
  performanceAdjustments: number;

  // Performance impact
  fpsImprovement: number;
  memoryReduction: number;
  batteryImpact: number;
}

const defaultConfig: AdaptiveQualityConfig = {
  enabled: true,
  aggressiveOptimization: false,
  batteryOptimization: true,
  thermalManagement: true,
  performanceMode: "balanced",
  fpsThresholds: {
    critical: 15,
    warning: 20,
    target: 30,
  },
  memoryThresholds: {
    critical: 200, // 200MB
    warning: 150, // 150MB
  },
  batteryThresholds: {
    critical: 10, // 10%
    low: 20, // 20%
  },
};

const initialQualitySettings: QualitySettings = {
  cameraFps: 30,
  cameraResolution: "1080p",
  cameraBitrate: 2500000, // 2.5 Mbps
  poseDetectionRate: 1,
  poseConfidenceThreshold: 0.5,
  poseSmoothing: true,
  overlayQuality: "high",
  overlayFps: 30,
  enableBlur: true,
  enableBackgroundProcessing: true,
  maxBufferSize: 50, // 50MB
  compressionLevel: "medium",
};

const initialMetrics: QualityMetrics = {
  currentScore: 100,
  adjustmentCount: 0,
  lastAdjustmentTime: 0,
  thermalAdjustments: 0,
  batteryAdjustments: 0,
  performanceAdjustments: 0,
  fpsImprovement: 0,
  memoryReduction: 0,
  batteryImpact: 0,
};

/**
 * Enhanced Adaptive Quality Hook
 */
export const useAdaptiveQuality = (
  config: Partial<AdaptiveQualityConfig> = {},
) => {
  const [currentConfig, setCurrentConfig] = useState<AdaptiveQualityConfig>({
    ...defaultConfig,
    ...config,
  });
  const [qualitySettings, setQualitySettings] = useState<QualitySettings>(
    initialQualitySettings,
  );
  const [metrics, setMetrics] = useState<QualityMetrics>(initialMetrics);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Store selectors
  const performanceStore = usePerformanceStore();
  const cameraStore = useEnhancedCameraStore();
  const poseStore = usePoseStore();

  /**
   * Calculate quality score based on current settings and performance
   */
  const calculateQualityScore = useCallback(
    (settings: QualitySettings): number => {
      let score = 100;

      // Resolution impact
      switch (settings.cameraResolution) {
        case "4k":
          score *= 1.0;
          break;
        case "1080p":
          score *= 0.9;
          break;
        case "720p":
          score *= 0.7;
          break;
        case "480p":
          score *= 0.5;
          break;
      }

      // FPS impact
      score *= Math.min(settings.cameraFps / 30, 1.0);

      // Pose detection rate impact
      score *= Math.max(1.0 - (settings.poseDetectionRate - 1) * 0.1, 0.5);

      // Overlay quality impact
      switch (settings.overlayQuality) {
        case "high":
          score *= 1.0;
          break;
        case "medium":
          score *= 0.8;
          break;
        case "low":
          score *= 0.6;
          break;
      }

      return Math.round(Math.max(score, 0));
    },
    [],
  );

  /**
   * Get optimal settings for current device state
   */
  const getOptimalSettings = useCallback((): QualitySettings => {
    if (!currentConfig.enabled) return qualitySettings;

    const { system } = performanceStore;
    const { thermalState, batteryLevel, fps, memoryUsage, cpuUsage } = system;

    let newSettings: QualitySettings = { ...qualitySettings };
    let adjustmentReason = "";

    // Thermal state adjustments
    if (currentConfig.thermalManagement) {
      switch (thermalState) {
        case "critical":
          newSettings = {
            ...newSettings,
            cameraFps: 15,
            cameraResolution: "720p",
            cameraBitrate: 1000000, // 1 Mbps
            poseDetectionRate: 4,
            poseSmoothing: false,
            overlayQuality: "low",
            overlayFps: 15,
            enableBlur: false,
            enableBackgroundProcessing: false,
            maxBufferSize: 20,
            compressionLevel: "high",
          };
          adjustmentReason = "thermal-critical";
          break;

        case "serious":
          newSettings = {
            ...newSettings,
            cameraFps: 24,
            cameraResolution: "720p",
            cameraBitrate: 1500000, // 1.5 Mbps
            poseDetectionRate: 2,
            overlayQuality: "medium",
            overlayFps: 24,
            enableBlur: false,
            maxBufferSize: 30,
            compressionLevel: "high",
          };
          adjustmentReason = "thermal-serious";
          break;

        case "fair":
          newSettings = {
            ...newSettings,
            cameraFps: 30,
            cameraResolution: "1080p",
            cameraBitrate: 2000000, // 2 Mbps
            poseDetectionRate: 1,
            overlayQuality: "medium",
            maxBufferSize: 40,
          };
          adjustmentReason = "thermal-fair";
          break;
      }
    }

    // Battery optimization
    if (currentConfig.batteryOptimization) {
      if (batteryLevel <= currentConfig.batteryThresholds.critical) {
        newSettings = {
          ...newSettings,
          cameraFps: Math.min(newSettings.cameraFps, 15),
          cameraResolution: "720p",
          poseDetectionRate: Math.max(newSettings.poseDetectionRate, 3),
          overlayQuality: "low",
          enableBackgroundProcessing: false,
        };
        adjustmentReason = adjustmentReason || "battery-critical";
      } else if (batteryLevel <= currentConfig.batteryThresholds.low) {
        newSettings = {
          ...newSettings,
          cameraFps: Math.min(newSettings.cameraFps, 24),
          poseDetectionRate: Math.max(newSettings.poseDetectionRate, 2),
          overlayQuality: newSettings.overlayQuality === "high"
            ? "medium"
            : newSettings.overlayQuality,
        };
        adjustmentReason = adjustmentReason || "battery-low";
      }
    }

    // Performance-based adjustments
    if (fps < currentConfig.fpsThresholds.critical) {
      newSettings = {
        ...newSettings,
        cameraFps: Math.min(newSettings.cameraFps, 15),
        poseDetectionRate: Math.max(newSettings.poseDetectionRate, 3),
        overlayFps: Math.min(newSettings.overlayFps, 15),
        enableBlur: false,
      };
      adjustmentReason = adjustmentReason || "fps-critical";
    } else if (fps < currentConfig.fpsThresholds.warning) {
      newSettings = {
        ...newSettings,
        cameraFps: Math.min(newSettings.cameraFps, 24),
        poseDetectionRate: Math.max(newSettings.poseDetectionRate, 2),
      };
      adjustmentReason = adjustmentReason || "fps-warning";
    }

    // Memory-based adjustments
    if (memoryUsage > currentConfig.memoryThresholds.critical) {
      newSettings = {
        ...newSettings,
        maxBufferSize: Math.min(newSettings.maxBufferSize, 20),
        compressionLevel: "high",
        enableBackgroundProcessing: false,
      };
      adjustmentReason = adjustmentReason || "memory-critical";
    } else if (memoryUsage > currentConfig.memoryThresholds.warning) {
      newSettings = {
        ...newSettings,
        maxBufferSize: Math.min(newSettings.maxBufferSize, 30),
        compressionLevel: "high",
      };
      adjustmentReason = adjustmentReason || "memory-warning";
    }

    // Performance mode adjustments
    switch (currentConfig.performanceMode) {
      case "performance":
        newSettings = {
          ...newSettings,
          cameraFps: Math.min(newSettings.cameraFps, 24),
          cameraResolution: newSettings.cameraResolution === "4k"
            ? "1080p"
            : newSettings.cameraResolution,
          overlayQuality: "medium",
          enableBlur: false,
        };
        break;

      case "quality":
        // Prioritize quality over performance
        if (thermalState === "normal" && batteryLevel > 30 && fps > 25) {
          newSettings = {
            ...newSettings,
            cameraFps: 30,
            cameraResolution: "1080p",
            overlayQuality: "high",
            enableBlur: true,
          };
        }
        break;

      case "balanced":
        // Default balanced approach (already handled above)
        break;
    }

    // Platform-specific optimizations
    if (Platform.OS === "android") {
      // Android-specific optimizations
      if (cpuUsage > 80) {
        newSettings.enableBackgroundProcessing = false;
        newSettings.poseDetectionRate = Math.max(
          newSettings.poseDetectionRate,
          2,
        );
      }
    } else if (Platform.OS === "ios") {
      // iOS-specific optimizations
      if (thermalState === "serious" || thermalState === "critical") {
        newSettings.enableBackgroundProcessing = false;
      }
    }

    return newSettings;
  }, [currentConfig, qualitySettings, performanceStore]);

  /**
   * Apply quality adjustments
   */
  const applyQualityAdjustments = useCallback(async () => {
    if (isAdjusting || !currentConfig.enabled) return;

    setIsAdjusting(true);

    try {
      const optimalSettings = getOptimalSettings();
      const hasChanges =
        JSON.stringify(optimalSettings) !== JSON.stringify(qualitySettings);

      if (hasChanges) {
        const now = Date.now();
        const newScore = calculateQualityScore(optimalSettings);

        setQualitySettings(optimalSettings);
        setMetrics((prev) => ({
          ...prev,
          currentScore: newScore,
          adjustmentCount: prev.adjustmentCount + 1,
          lastAdjustmentTime: now,
        }));

        // Update camera store settings
        cameraStore.updateSettings({
          adaptiveQuality: {
            ...cameraStore.settings.adaptiveQuality,
            currentResolution: optimalSettings.cameraResolution,
            currentFrameRate: optimalSettings.cameraFps,
            currentBitrate: optimalSettings.cameraBitrate,
          },
        });

        // Update pose store settings
        poseStore.updateProcessingSettings({
          maxDetectionRate: optimalSettings.cameraFps /
            optimalSettings.poseDetectionRate,
          confidenceThreshold: optimalSettings.poseConfidenceThreshold,
          enableSmoothing: optimalSettings.poseSmoothing,
          compressionLevel: optimalSettings.compressionLevel,
        });

        // Log adaptive quality adjustment for debugging
        // console.log('Adaptive quality adjustment applied:', {
        //   score: newScore,
        //   settings: optimalSettings,
        // })
      }
    } catch (error) {
      // console.error('Failed to apply quality adjustments:', error)
    } finally {
      setIsAdjusting(false);
    }
  }, [
    isAdjusting,
    currentConfig.enabled,
    getOptimalSettings,
    qualitySettings,
    calculateQualityScore,
    cameraStore,
    poseStore,
  ]);

  /**
   * Check if frame should be skipped for processing
   */
  const shouldSkipFrame = useCallback((frameIndex: number): boolean => {
    return frameIndex % qualitySettings.poseDetectionRate !== 0;
  }, [qualitySettings.poseDetectionRate]);

  /**
   * Get current quality recommendations
   */
  const getQualityRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    const { system } = performanceStore;

    if (system.fps < currentConfig.fpsThresholds.warning) {
      recommendations.push("Consider reducing camera resolution or frame rate");
    }

    if (system.memoryUsage > currentConfig.memoryThresholds.warning) {
      recommendations.push("Reduce pose detection rate or buffer size");
    }

    if (system.batteryLevel < currentConfig.batteryThresholds.low) {
      recommendations.push("Enable battery optimization mode");
    }

    if (
      system.thermalState === "serious" || system.thermalState === "critical"
    ) {
      recommendations.push(
        "Device is overheating - quality will be automatically reduced",
      );
    }

    return recommendations;
  }, [performanceStore, currentConfig]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(
    (newConfig: Partial<AdaptiveQualityConfig>) => {
      setCurrentConfig((prev) => ({ ...prev, ...newConfig }));
    },
    [],
  );

  /**
   * Reset to default settings
   */
  const resetToDefaults = useCallback(() => {
    setQualitySettings(initialQualitySettings);
    setMetrics(initialMetrics);
  }, []);

  // Auto-adjustment effect
  useEffect(() => {
    if (!currentConfig.enabled) return;

    const interval = setInterval(applyQualityAdjustments, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [currentConfig.enabled, applyQualityAdjustments]);

  // Performance monitoring effect - simplified without zustand subscription
  useEffect(() => {
    const { thermalState, batteryLevel, fps } = performanceStore.system;

    // Trigger adjustment when performance metrics change significantly
    const checkInterval = setInterval(() => {
      const currentSystem = performanceStore.system;
      if (
        currentSystem.thermalState !== thermalState ||
        Math.abs(currentSystem.batteryLevel - batteryLevel) > 5 ||
        Math.abs(currentSystem.fps - fps) > 5
      ) {
        applyQualityAdjustments();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [
    performanceStore.system.thermalState,
    performanceStore.system.batteryLevel,
    performanceStore.system.fps,
    applyQualityAdjustments,
  ]);

  return {
    // Current state
    qualitySettings,
    metrics,
    config: currentConfig,
    isAdjusting,

    // Actions
    applyQualityAdjustments,
    updateConfig,
    resetToDefaults,

    // Utilities
    shouldSkipFrame,
    getOptimalSettings,
    getQualityRecommendations,
    calculateQualityScore: (settings?: QualitySettings) =>
      calculateQualityScore(settings || qualitySettings),

    // Status checks
    isOptimizationNeeded: metrics.currentScore < 80,
    hasRecentAdjustments: Date.now() - metrics.lastAdjustmentTime < 30000, // 30 seconds
  };
};

/**
 * Legacy compatibility hooks for existing code
 */
export const usePerformanceMonitoring = () => {
  const performanceStore = usePerformanceStore();

  return {
    recordFrameProcessingTime: (processingTime: number) => {
      performanceStore.updateProcessingMetrics({
        poseDetectionTime: processingTime,
      });
    },
    recordFrameDropped: () => {
      performanceStore.updateSystemMetrics({
        droppedFrames: performanceStore.system.droppedFrames + 1,
      });
    },
    updateFPS: (fps: number) => {
      performanceStore.updateSystemMetrics({ fps });
    },
    updateMemoryUsage: (memoryUsage: number) => {
      performanceStore.updateSystemMetrics({ memoryUsage });
    },
    shouldSkipFrame: (targetFps = 30): boolean => {
      return performanceStore.system.fps < targetFps * 0.8;
    },
    performance: performanceStore.system,
  };
};

export const useBatteryAwareQuality = () => {
  const performanceStore = usePerformanceStore();
  return {
    batteryOptimizationEnabled:
      performanceStore.system.batteryOptimizationEnabled,
    batteryLevel: performanceStore.system.batteryLevel,
    getBatteryOptimizedSettings: () => {
      if (performanceStore.system.batteryLevel < 20) {
        return {
          cameraFps: 15,
          cameraResolution: "720p" as const,
          poseDetectionRate: 5,
          overlayQuality: "low" as const,
        };
      }
      return {};
    },
  };
};
