import React, { useCallback, useEffect, useRef } from "react";
import { usePerformanceStore } from "../../../stores/performance";
import {
  usePoseConfig,
  usePoseDetectionState,
  usePoseMetrics,
  usePoseStore,
} from "../../../stores/poseStore";
import { useThermalStore } from "../../../stores/thermal";
import type {
  PoseData,
  PoseDetectionConfig,
  ProcessingQuality,
} from "../types/pose";

/**
 * Enhanced pose state management hook that provides a unified interface
 * for pose detection state, metrics, and integration with performance systems
 */
export const usePoseState = () => {
  const poseStore = usePoseStore();
  const poseState = usePoseDetectionState();
  const poseMetrics = usePoseMetrics();
  const poseConfig = usePoseConfig();

  // Integration with performance and thermal stores
  const performanceStore = usePerformanceStore();
  const thermalStore = useThermalStore();

  const initializationRef = useRef(false);
  const processingRef = useRef(false);

  // Initialize pose detection with performance integration
  const initialize = useCallback(
    async (config?: Partial<PoseDetectionConfig>) => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        await poseStore.initialize(config);

        // Connect with performance monitoring
        if (performanceStore.isMonitoring) {
          const metrics = performanceStore.getCurrentMetrics();
          if (metrics) {
            poseStore.updatePerformanceMetrics(metrics);
          }
        }

        // Connect with thermal monitoring
        if (thermalStore.isMonitoring) {
          const thermalState = thermalStore.getCurrentState();
          if (thermalState) {
            poseStore.updateThermalState(thermalState);
          }
        }
      } catch (error) {
        initializationRef.current = false;
        throw error;
      }
    },
    [poseStore, performanceStore, thermalStore],
  );

  // Start pose processing with performance monitoring
  const startProcessing = useCallback(() => {
    if (processingRef.current || !poseState.isInitialized) return;
    processingRef.current = true;

    poseStore.startProcessing();

    // Start performance monitoring if not already running
    if (!performanceStore.isMonitoring) {
      performanceStore.startMonitoring();
    }

    // Start thermal monitoring if not already running
    if (!thermalStore.isMonitoring) {
      thermalStore.startMonitoring();
    }
  }, [poseStore, performanceStore, thermalStore, poseState.isInitialized]);

  // Stop pose processing
  const stopProcessing = useCallback(() => {
    if (!processingRef.current) return;
    processingRef.current = false;

    poseStore.stopProcessing();
  }, [poseStore]);

  // Process pose data with validation and metrics
  const processPose = useCallback((poseData: PoseData) => {
    if (!poseState.isProcessing) return;

    const startTime = performance.now();

    try {
      poseStore.processPose(poseData);

      // Update processing metrics
      const processingTime = performance.now() - startTime;
      poseStore.updateMetrics({
        averageInferenceTime:
          (poseMetrics.averageInferenceTime + processingTime) / 2,
        fps: 1000 / processingTime,
      });
    } catch (error) {
      poseStore.addError(
        `Pose processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [poseStore, poseState.isProcessing, poseMetrics.averageInferenceTime]);

  // Adjust processing quality based on performance
  const adjustQualityBasedOnPerformance = useCallback(() => {
    if (!poseConfig.enableAdaptiveQuality) return;

    const performance = performanceStore.getCurrentMetrics();
    const thermal = thermalStore.getCurrentState();

    let targetQuality: ProcessingQuality = "medium";

    // Adjust based on thermal state
    if (thermal) {
      switch (thermal.state) {
        case "critical":
        case "serious":
          targetQuality = "low";
          break;
        case "fair":
          targetQuality = "medium";
          break;
        case "nominal":
          targetQuality = "high";
          break;
      }
    }

    // Adjust based on CPU usage
    if (performance?.cpu?.usage) {
      if (performance.cpu.usage > 80) {
        targetQuality = "low";
      } else if (performance.cpu.usage > 60) {
        targetQuality = targetQuality === "high" ? "medium" : targetQuality;
      }
    }

    // Adjust based on memory usage
    if (performance?.memory?.used && performance?.memory?.total) {
      const memoryUsage = (performance.memory.used / performance.memory.total) *
        100;
      if (memoryUsage > 85) {
        targetQuality = "low";
      }
    }

    // Adjust based on FPS
    if (poseMetrics.fps < 15) {
      targetQuality = "low";
    } else if (poseMetrics.fps < 25) {
      targetQuality = targetQuality === "high" ? "medium" : targetQuality;
    }

    if (targetQuality !== poseConfig.processingQuality) {
      poseStore.adjustQuality(targetQuality);
    }
  }, [poseStore, poseConfig, poseMetrics.fps, performanceStore, thermalStore]);

  // Update configuration with validation
  const updateConfig = useCallback((config: Partial<PoseDetectionConfig>) => {
    // Validate configuration changes
    const newConfig = { ...poseConfig, ...config };

    // Ensure valid ranges
    if (
      newConfig.confidenceThreshold < 0 || newConfig.confidenceThreshold > 1
    ) {
      poseStore.addWarning("Confidence threshold must be between 0 and 1");
      return;
    }

    if (newConfig.maxHistorySize < 0) {
      poseStore.addWarning("Max history size must be non-negative");
      return;
    }

    poseStore.updateConfig(config);
  }, [poseStore, poseConfig]);

  // Create recovery point for error handling
  const createRecoveryPoint = useCallback(() => {
    poseStore.createRecoveryPoint();
  }, [poseStore]);

  // Recover from processing failure
  const recoverFromFailure = useCallback(() => {
    const recovered = poseStore.recoverFromFailure();
    if (recovered) {
      // Restart processing if it was running
      if (processingRef.current) {
        setTimeout(() => {
          startProcessing();
        }, 1000);
      }
    }
    return recovered;
  }, [poseStore, startProcessing]);

  // Save current session
  const saveSession = useCallback(async () => {
    try {
      await poseStore.saveSession();
    } catch (error) {
      poseStore.addError(
        `Failed to save session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [poseStore]);

  // Export pose data
  const exportData = useCallback(async (format: "json" | "csv" | "binary") => {
    try {
      return await poseStore.exportPoseData(format);
    } catch (error) {
      poseStore.addError(
        `Failed to export data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }, [poseStore]);

  // Import pose data
  const importData = useCallback(
    async (data: Blob, format: "json" | "csv" | "binary") => {
      try {
        await poseStore.importPoseData(data, format);
      } catch (error) {
        poseStore.addError(
          `Failed to import data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
        throw error;
      }
    },
    [poseStore],
  );

  // Subscribe to performance changes for adaptive quality
  useEffect(() => {
    if (!poseConfig.enableAdaptiveQuality) return;

    const interval = setInterval(() => {
      adjustQualityBasedOnPerformance();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [adjustQualityBasedOnPerformance, poseConfig.enableAdaptiveQuality]);

  // Subscribe to performance store changes
  useEffect(() => {
    const unsubscribe = performanceStore.subscribe((state) => {
      if (state.currentMetrics) {
        poseStore.updatePerformanceMetrics(state.currentMetrics);
      }
    });

    return unsubscribe;
  }, [performanceStore, poseStore]);

  // Subscribe to thermal store changes
  useEffect(() => {
    const unsubscribe = thermalStore.subscribe((state) => {
      if (state.currentState) {
        poseStore.updateThermalState(state.currentState);
      }
    });

    return unsubscribe;
  }, [thermalStore, poseStore]);

  // Auto-save session periodically
  useEffect(() => {
    if (!poseState.isInitialized) return;

    const interval = setInterval(() => {
      saveSession();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [poseState.isInitialized, saveSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingRef.current) {
        stopProcessing();
      }
    };
  }, [stopProcessing]);

  return {
    // State
    ...poseState,
    metrics: poseMetrics,
    config: poseConfig,
    errors: poseStore.errors,
    warnings: poseStore.warnings,

    // Actions
    initialize,
    shutdown: poseStore.shutdown,
    reset: poseStore.reset,

    // Processing
    startProcessing,
    stopProcessing,
    processPose,

    // Configuration
    updateConfig,
    resetConfig: poseStore.resetConfig,

    // Quality management
    adjustQuality: poseStore.adjustQuality,
    enableAdaptiveQuality: poseStore.enableAdaptiveQuality,

    // Error handling
    addError: poseStore.addError,
    addWarning: poseStore.addWarning,
    clearErrors: poseStore.clearErrors,
    clearWarnings: poseStore.clearWarnings,

    // Recovery
    createRecoveryPoint,
    recoverFromFailure,

    // Data management
    saveSession,
    exportData,
    importData,
    clearHistory: poseStore.clearHistory,

    // Computed values
    isHealthy: poseStore.errors.length === 0 && poseState.isInitialized,
    processingRate: poseMetrics.fps,
    qualityScore: poseStore.lastValidation?.qualityScore || 0,

    // Integration status
    isPerformanceIntegrated: !!poseStore.performanceMetrics,
    isThermalIntegrated: !!poseStore.thermalState,
  };
};

/**
 * Hook for pose metrics with performance integration
 */
export const usePoseMetrics = () => {
  const metrics = usePoseStore((state) => state.metrics);
  const performanceMetrics = usePoseStore((state) => state.performanceMetrics);
  const thermalState = usePoseStore((state) => state.thermalState);

  return {
    ...metrics,
    performanceMetrics,
    thermalState,

    // Computed metrics
    efficiency: metrics.totalFramesProcessed > 0
      ? ((metrics.totalFramesProcessed - metrics.droppedFrames) /
        metrics.totalFramesProcessed) * 100
      : 0,

    healthScore: (() => {
      let score = 100;

      // Reduce score based on dropped frames
      if (metrics.totalFramesProcessed > 0) {
        const dropRate =
          (metrics.droppedFrames / metrics.totalFramesProcessed) * 100;
        score -= dropRate * 2; // 2 points per percent dropped
      }

      // Reduce score based on low FPS
      if (metrics.fps < 15) {
        score -= (15 - metrics.fps) * 3; // 3 points per FPS below 15
      }

      // Reduce score based on thermal state
      if (thermalState) {
        switch (thermalState.state) {
          case "critical":
            score -= 50;
            break;
          case "serious":
            score -= 30;
            break;
          case "fair":
            score -= 15;
            break;
        }
      }

      return Math.max(0, Math.min(100, score));
    })(),
  };
};

/**
 * Hook for pose configuration with validation
 */
export const usePoseConfiguration = () => {
  const config = usePoseConfig();
  const updateConfig = usePoseStore((state) => state.updateConfig);
  const resetConfig = usePoseStore((state) => state.resetConfig);

  const updateConfigSafely = useCallback(
    (newConfig: Partial<PoseDetectionConfig>) => {
      // Validate configuration
      const errors: string[] = [];

      if (newConfig.confidenceThreshold !== undefined) {
        if (
          newConfig.confidenceThreshold < 0 || newConfig.confidenceThreshold > 1
        ) {
          errors.push("Confidence threshold must be between 0 and 1");
        }
      }

      if (newConfig.maxHistorySize !== undefined) {
        if (newConfig.maxHistorySize < 0) {
          errors.push("Max history size must be non-negative");
        }
      }

      if (newConfig.smoothingFactor !== undefined) {
        if (newConfig.smoothingFactor < 0 || newConfig.smoothingFactor > 1) {
          errors.push("Smoothing factor must be between 0 and 1");
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Configuration validation failed: ${errors.join(", ")}`,
        );
      }

      updateConfig(newConfig);
    },
    [updateConfig],
  );

  return {
    config,
    updateConfig: updateConfigSafely,
    resetConfig,

    // Validation helpers
    isValidConfig: (testConfig: Partial<PoseDetectionConfig>) => {
      try {
        updateConfigSafely(testConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
};
