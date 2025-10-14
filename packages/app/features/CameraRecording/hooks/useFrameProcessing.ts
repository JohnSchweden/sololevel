/**
 * Unified Frame Processing Hook
 *
 * This hook provides a unified interface for frame processing across
 * native and web platforms, handling pose detection with intelligent
 * throttling and performance optimization.
 *
 * @platform both
 */

import { log } from "@my/logging";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import type {
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
} from "../types/pose";

/**
 * Frame processing configuration
 */
interface FrameProcessingConfig extends PoseDetectionConfig {
  enableFrameProcessor: boolean;
  maxQueueSize: number;
  processingTimeout: number;
  adaptiveThrottling: boolean;
  thermalManagement: boolean;
  batteryOptimization: boolean;
}

/**
 * Frame processing state
 */
interface FrameProcessingState {
  isActive: boolean;
  isProcessing: boolean;
  isInitialized: boolean;
  lastPose: PoseDetectionResult | null;
  frameCount: number;
  metrics: PoseDetectionMetrics | null;
  error: string | null;
  performanceLevel: "excellent" | "good" | "fair" | "poor";
}

/**
 * Frame processing result callback
 */
type FrameProcessingCallback = (result: {
  pose: PoseDetectionResult | null;
  processingTime: number;
  frameSkipped: boolean;
  timestamp: number;
}) => void;

/**
 * Performance thresholds for adaptive behavior
 */
const PERFORMANCE_THRESHOLDS = {
  excellent: { maxInferenceTime: 30, minFps: 28, maxMemory: 50 },
  good: { maxInferenceTime: 50, minFps: 24, maxMemory: 75 },
  fair: { maxInferenceTime: 80, minFps: 18, maxMemory: 100 },
  poor: { maxInferenceTime: 120, minFps: 12, maxMemory: 150 },
};

/**
 * Unified frame processing hook
 */
export function useFrameProcessing(
  config: Partial<FrameProcessingConfig> = {},
  onPoseDetected?: FrameProcessingCallback,
) {
  const isNative = Platform.OS !== "web";

  // State management
  const [state, setState] = useState<FrameProcessingState>({
    isActive: false,
    isProcessing: false,
    isInitialized: false,
    lastPose: null,
    frameCount: 0,
    metrics: null,
    error: null,
    performanceLevel: "good",
  });

  // Configuration with defaults
  const frameProcessingConfig: FrameProcessingConfig = {
    modelType: "lightning",
    confidenceThreshold: 0.3,
    maxDetections: 1,
    targetFps: 30,
    enableGpuAcceleration: true,
    enableMultiThreading: true,
    inputResolution: { width: 256, height: 256 },
    enableSmoothing: true,
    smoothingFactor: 0.7,
    enableFrameProcessor: true,
    maxQueueSize: 3,
    processingTimeout: 5000,
    adaptiveThrottling: true,
    thermalManagement: true,
    batteryOptimization: true,
    ...config,
  };

  // Platform-specific hooks (lazy loaded)
  const [platformHook, setPlatformHook] = useState<any>(null);

  /**
   * Initialize platform-specific hook
   */
  const initializePlatformHook = useCallback(async () => {
    try {
      if (isNative) {
        // Dynamic import for native frame processor
        const { useFrameProcessor } = await import(
          "./useFrameProcessor.native"
        );
        const hook = useFrameProcessor(frameProcessingConfig, onPoseDetected);
        setPlatformHook(hook);
      } else {
        // Dynamic import for web frame processor
        const { useCameraFrameProcessor } = await import(
          "./useCameraFrameProcessor.web"
        );
        const hook = useCameraFrameProcessor(
          frameProcessingConfig,
          onPoseDetected,
        );
        setPlatformHook(hook);
      }
    } catch (error) {
      // console.error('Failed to initialize platform hook:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error
          ? error.message
          : "Platform initialization failed",
      }));
    }
  }, [isNative, frameProcessingConfig, onPoseDetected]);

  /**
   * Evaluate current performance level
   */
  const evaluatePerformance = useCallback(
    (metrics: PoseDetectionMetrics): "excellent" | "good" | "fair" | "poor" => {
      const { averageInferenceTime, currentFps, memoryUsage } = metrics;

      if (
        averageInferenceTime <=
          PERFORMANCE_THRESHOLDS.excellent.maxInferenceTime &&
        currentFps >= PERFORMANCE_THRESHOLDS.excellent.minFps &&
        memoryUsage <= PERFORMANCE_THRESHOLDS.excellent.maxMemory
      ) {
        return "excellent";
      }

      if (
        averageInferenceTime <= PERFORMANCE_THRESHOLDS.good.maxInferenceTime &&
        currentFps >= PERFORMANCE_THRESHOLDS.good.minFps &&
        memoryUsage <= PERFORMANCE_THRESHOLDS.good.maxMemory
      ) {
        return "good";
      }

      if (
        averageInferenceTime <= PERFORMANCE_THRESHOLDS.fair.maxInferenceTime &&
        currentFps >= PERFORMANCE_THRESHOLDS.fair.minFps &&
        memoryUsage <= PERFORMANCE_THRESHOLDS.fair.maxMemory
      ) {
        return "fair";
      }

      return "poor";
    },
    [],
  );

  /**
   * Apply adaptive throttling based on performance
   */
  const applyAdaptiveThrottling = useCallback((performanceLevel: string) => {
    if (!frameProcessingConfig.adaptiveThrottling || !platformHook) {
      return;
    }

    let adjustedConfig: Partial<FrameProcessingConfig> = {};

    switch (performanceLevel) {
      case "excellent":
        adjustedConfig = {
          targetFps: Math.min(30, frameProcessingConfig.targetFps + 2),
          enableGpuAcceleration: true,
          enableMultiThreading: true,
        };
        break;

      case "good":
        adjustedConfig = {
          targetFps: frameProcessingConfig.targetFps,
          enableGpuAcceleration: true,
          enableMultiThreading: true,
        };
        break;

      case "fair":
        adjustedConfig = {
          targetFps: Math.max(15, frameProcessingConfig.targetFps - 5),
          enableGpuAcceleration: true,
          enableMultiThreading: false,
        };
        break;

      case "poor":
        adjustedConfig = {
          targetFps: Math.max(10, frameProcessingConfig.targetFps - 10),
          enableGpuAcceleration: false,
          enableMultiThreading: false,
        };
        break;
    }

    if (platformHook.updateConfig) {
      platformHook.updateConfig(adjustedConfig);
    }
  }, [frameProcessingConfig, platformHook]);

  /**
   * Handle thermal state changes
   */
  const handleThermalState = useCallback(
    (thermalState: "normal" | "fair" | "serious" | "critical") => {
      if (!frameProcessingConfig.thermalManagement || !platformHook) {
        return;
      }

      let thermalConfig: Partial<FrameProcessingConfig> = {};

      switch (thermalState) {
        case "normal":
          thermalConfig = {
            targetFps: frameProcessingConfig.targetFps,
            enableGpuAcceleration: true,
          };
          break;

        case "fair":
          thermalConfig = {
            targetFps: Math.max(20, frameProcessingConfig.targetFps - 5),
            enableGpuAcceleration: true,
          };
          break;

        case "serious":
          thermalConfig = {
            targetFps: Math.max(15, frameProcessingConfig.targetFps - 10),
            enableGpuAcceleration: false,
          };
          break;

        case "critical":
          // Stop processing entirely
          if (platformHook.stop) {
            platformHook.stop();
          }
          return;
      }

      if (platformHook.updateConfig) {
        platformHook.updateConfig(thermalConfig);
      }
    },
    [frameProcessingConfig, platformHook],
  );

  /**
   * Handle battery level changes
   */
  const handleBatteryLevel = useCallback((batteryLevel: number) => {
    if (!frameProcessingConfig.batteryOptimization || !platformHook) {
      return;
    }

    let batteryConfig: Partial<FrameProcessingConfig> = {};

    if (batteryLevel > 50) {
      batteryConfig = {
        targetFps: frameProcessingConfig.targetFps,
        enableGpuAcceleration: true,
        enableMultiThreading: true,
      };
    } else if (batteryLevel > 20) {
      batteryConfig = {
        targetFps: Math.max(20, frameProcessingConfig.targetFps - 5),
        enableGpuAcceleration: true,
        enableMultiThreading: false,
      };
    } else if (batteryLevel > 10) {
      batteryConfig = {
        targetFps: Math.max(15, frameProcessingConfig.targetFps - 10),
        enableGpuAcceleration: false,
        enableMultiThreading: false,
      };
    } else {
      // Very low battery - stop processing
      if (platformHook.stop) {
        platformHook.stop();
      }
      return;
    }

    if (platformHook.updateConfig) {
      platformHook.updateConfig(batteryConfig);
    }
  }, [frameProcessingConfig, platformHook]);

  /**
   * Initialize frame processing
   */
  const initialize = useCallback(async () => {
    try {
      await initializePlatformHook();
      setState((prev) => ({ ...prev, isInitialized: true, error: null }));
    } catch (error) {
      // console.error('Failed to initialize frame processing:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Initialization failed",
        isInitialized: false,
      }));
      throw error;
    }
  }, [initializePlatformHook]);

  /**
   * Start frame processing
   */
  const start = useCallback(async () => {
    if (!state.isInitialized) {
      await initialize();
    }

    if (platformHook && platformHook.start) {
      await platformHook.start();
      setState((prev) => ({ ...prev, isActive: true }));
    }
  }, [state.isInitialized, initialize, platformHook]);

  /**
   * Stop frame processing
   */
  const stop = useCallback(() => {
    if (platformHook && platformHook.stop) {
      platformHook.stop();
    }
    setState((prev) => ({ ...prev, isActive: false, isProcessing: false }));
  }, [platformHook]);

  /**
   * Reset frame processing
   */
  const reset = useCallback(async () => {
    if (platformHook && platformHook.reset) {
      await platformHook.reset();
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      isProcessing: false,
      lastPose: null,
      frameCount: 0,
      metrics: null,
      error: null,
      performanceLevel: "good",
    }));
  }, [platformHook]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(
    async (newConfig: Partial<FrameProcessingConfig>) => {
      if (platformHook && platformHook.updateConfig) {
        await platformHook.updateConfig(newConfig);
      }
    },
    [platformHook],
  );

  /**
   * Get current metrics
   */
  const getMetrics = useCallback(
    async (): Promise<PoseDetectionMetrics | null> => {
      if (platformHook && platformHook.getMetrics) {
        return await platformHook.getMetrics();
      }
      return null;
    },
    [platformHook],
  );

  // Sync state with platform hook
  useEffect(() => {
    if (platformHook) {
      setState((prev) => ({
        ...prev,
        isActive: platformHook.isActive || false,
        isProcessing: platformHook.isProcessing || false,
        lastPose: platformHook.lastPose || null,
        frameCount: platformHook.frameCount || 0,
        metrics: platformHook.metrics || null,
        error: platformHook.error || null,
      }));
    }
  }, [platformHook]);

  // Monitor performance and apply adaptive throttling
  useEffect(() => {
    if (!state.metrics || !frameProcessingConfig.adaptiveThrottling) {
      return;
    }

    const performanceLevel = evaluatePerformance(state.metrics);

    if (performanceLevel !== state.performanceLevel) {
      setState((prev) => ({ ...prev, performanceLevel }));
      applyAdaptiveThrottling(performanceLevel);
    }
  }, [
    state.metrics,
    state.performanceLevel,
    frameProcessingConfig.adaptiveThrottling,
    evaluatePerformance,
    applyAdaptiveThrottling,
  ]);

  // Auto-initialize if enabled
  // DISABLED: Auto-initialization causes app crash on web due to import.meta.url issue
  // TODO: Re-enable once bundler configuration supports ES modules properly
  useEffect(() => {
    // Skip auto-initialization to prevent app crash
    log.info('useFrameProcessing', 'Auto-initialization disabled to prevent import.meta.url error');
    // if (frameProcessingConfig.enableFrameProcessor && !state.isInitialized) {
    //   initialize().catch(log.error);
    // }
  }, [
    frameProcessingConfig.enableFrameProcessor,
    state.isInitialized,
    initialize,
  ]);

  return {
    // State
    isActive: state.isActive,
    isProcessing: state.isProcessing,
    isInitialized: state.isInitialized,
    lastPose: state.lastPose,
    frameCount: state.frameCount,
    metrics: state.metrics,
    error: state.error,
    performanceLevel: state.performanceLevel,

    // Platform info
    platform: isNative ? "native" : "web",

    // Controls
    initialize,
    start,
    stop,
    reset,

    // Configuration
    updateConfig,
    config: frameProcessingConfig,

    // Utilities
    getMetrics,

    // Adaptive behavior
    handleThermalState,
    handleBatteryLevel,

    // Performance info
    isPerformanceOptimal: state.performanceLevel === "excellent" ||
      state.performanceLevel === "good",
    shouldReduceQuality: state.performanceLevel === "fair" ||
      state.performanceLevel === "poor",

    // Platform-specific access (for advanced usage)
    platformHook,
  };
}

/**
 * Hook with enhanced performance monitoring and auto-optimization
 */
export function useFrameProcessingWithAutoOptimization(
  config: Partial<FrameProcessingConfig> = {},
  onPoseDetected?: FrameProcessingCallback,
) {
  const frameProcessing = useFrameProcessing({
    ...config,
    adaptiveThrottling: true,
    thermalManagement: true,
    batteryOptimization: true,
  }, onPoseDetected);

  // Enhanced monitoring state
  const [optimizationState, setOptimizationState] = useState({
    autoOptimizationEnabled: true,
    lastOptimizationTime: 0,
    optimizationCount: 0,
  });

  // Auto-optimization logic
  useEffect(() => {
    if (
      !optimizationState.autoOptimizationEnabled || !frameProcessing.metrics
    ) {
      return;
    }

    const now = Date.now();
    const timeSinceLastOptimization = now -
      optimizationState.lastOptimizationTime;

    // Only optimize every 5 seconds to avoid thrashing
    if (timeSinceLastOptimization < 5000) {
      return;
    }

    const { performanceLevel } = frameProcessing;

    // Apply optimizations based on performance
    if (performanceLevel === "poor" || performanceLevel === "fair") {
      setOptimizationState((prev) => ({
        ...prev,
        lastOptimizationTime: now,
        optimizationCount: prev.optimizationCount + 1,
      }));

      // Implement progressive quality reduction
      const currentFps = frameProcessing.config.targetFps;
      const newFps = Math.max(10, currentFps - 5);

      frameProcessing.updateConfig({
        targetFps: newFps,
        enableGpuAcceleration: performanceLevel !== "poor",
        inputResolution: performanceLevel === "poor"
          ? { width: 192, height: 192 }
          : { width: 224, height: 224 },
      });
    }
  }, [frameProcessing, optimizationState]);

  return {
    ...frameProcessing,

    // Enhanced optimization state
    optimization: optimizationState,

    // Optimization controls
    enableAutoOptimization: () =>
      setOptimizationState((prev) => ({
        ...prev,
        autoOptimizationEnabled: true,
      })),

    disableAutoOptimization: () =>
      setOptimizationState((prev) => ({
        ...prev,
        autoOptimizationEnabled: false,
      })),

    resetOptimization: () =>
      setOptimizationState({
        autoOptimizationEnabled: true,
        lastOptimizationTime: 0,
        optimizationCount: 0,
      }),
  };
}

/**
 * Default export for convenience
 */
export default useFrameProcessing;
