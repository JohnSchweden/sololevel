/**
 * VisionCamera Frame Processor Integration for Pose Detection
 *
 * This hook integrates pose detection with VisionCamera's frame processor
 * system, enabling real-time pose detection on camera frames with
 * background processing via worklets.
 *
 * @platform native
 * @requires react-native-vision-camera
 * @requires react-native-worklets-core
 */

import { log } from "@my/logging";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrameProcessor } from "react-native-vision-camera";
import type { Frame } from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets-core";
import type {
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
} from "../types/pose";
import {
  type PoseProcessingWorkletManager,
  poseProcessingWorklet,
} from "../worklets/poseProcessing.native";

/**
 * Frame processor state
 */
interface FrameProcessorState {
  isActive: boolean;
  isProcessing: boolean;
  lastPose: PoseDetectionResult | null;
  lastProcessedTimestamp: number;
  frameCount: number;
  metrics: PoseDetectionMetrics | null;
}

/**
 * Frame processor configuration
 */
interface FrameProcessorConfig extends PoseDetectionConfig {
  enableFrameProcessor: boolean;
  maxQueueSize: number;
  processingTimeout: number; // ms
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
 * Hook for VisionCamera frame processor with pose detection
 */
export function useFrameProcessor(
  config: Partial<FrameProcessorConfig> = {},
  onPoseDetected?: FrameProcessingCallback,
) {
  // State management
  const [state, setState] = useState<FrameProcessorState>({
    isActive: false,
    isProcessing: false,
    lastPose: null,
    lastProcessedTimestamp: 0,
    frameCount: 0,
    metrics: null,
  });

  // Configuration with defaults
  const frameProcessorConfig: FrameProcessorConfig = {
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
    processingTimeout: 100,
    native: {
      useQuantizedModel: true,
      numThreads: 4,
      delegate: "gpu",
    },
    ...config,
  };

  // Refs for worklet access
  const workletRef = useRef<PoseProcessingWorkletManager>(
    poseProcessingWorklet,
  );
  const callbackRef = useRef<FrameProcessingCallback | undefined>(
    onPoseDetected,
  );
  const configRef = useRef<FrameProcessorConfig>(frameProcessorConfig);

  // Update refs when props change
  useEffect(() => {
    callbackRef.current = onPoseDetected;
    configRef.current = frameProcessorConfig;
  }, [onPoseDetected, frameProcessorConfig]);

  /**
   * Handle pose detection result (runs on JS thread)
   */
  const handlePoseResult = useCallback((result: {
    pose: PoseDetectionResult | null;
    processingTime: number;
    frameSkipped: boolean;
    timestamp: number;
  }) => {
    setState((prev) => ({
      ...prev,
      isProcessing: false,
      lastPose: result.pose,
      lastProcessedTimestamp: result.timestamp,
      frameCount: prev.frameCount + 1,
    }));

    // Call external callback if provided
    if (callbackRef.current) {
      callbackRef.current(result);
    }

    // Update metrics periodically
    if (result.timestamp % 1000 < 50) { // Roughly every second
      const metrics = workletRef.current.getMetrics();
      if (metrics) {
        setState((prev) => ({ ...prev, metrics }));
      }
    }
  }, []);

  /**
   * Handle processing errors (runs on JS thread)
   */
  const handleProcessingError = useCallback((error: string) => {
    // console.error('Frame processor error:', error);
    setState((prev) => ({ ...prev, isProcessing: false }));
  }, []);

  /**
   * VisionCamera frame processor
   */
  const frameProcessor = useFrameProcessor((frame: Frame) => {
    "worklet";

    // Skip if frame processor is disabled
    if (!configRef.current.enableFrameProcessor) {
      return;
    }

    // Skip if already processing (prevent queue overflow)
    if (workletRef.current.isProcessing()) {
      return;
    }

    // Check queue size
    const queueSize = workletRef.current.getQueueSize();
    if (queueSize >= configRef.current.maxQueueSize) {
      return;
    }

    try {
      // Process frame using worklet
      const result = workletRef.current.processFrame(frame);

      if (result) {
        // Run callback on JS thread
        runOnJS(handlePoseResult)(result);
      }
    } catch (error) {
      // Handle errors on JS thread
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      runOnJS(handleProcessingError)(errorMessage);
    }
  }, [handlePoseResult, handleProcessingError]);

  /**
   * Initialize frame processor
   */
  const initialize = useCallback(async () => {
    try {
      await workletRef.current.initialize();
      workletRef.current.updateConfig(frameProcessorConfig);

      setState((prev) => ({ ...prev, isActive: true }));
    } catch (error) {
      // console.error('Failed to initialize frame processor:', error);
      throw new Error("Failed to initialize frame processor");
    }
  }, [frameProcessorConfig]);

  /**
   * Start frame processing
   */
  const start = useCallback(async () => {
    if (!state.isActive) {
      await initialize();
    }

    setState((prev) => ({ ...prev, isActive: true }));
  }, [state.isActive, initialize]);

  /**
   * Stop frame processing
   */
  const stop = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isProcessing: false,
    }));
  }, []);

  /**
   * Update frame processor configuration
   */
  const updateConfig = useCallback(
    (newConfig: Partial<FrameProcessorConfig>) => {
      const updatedConfig = { ...frameProcessorConfig, ...newConfig };
      configRef.current = updatedConfig;

      if (workletRef.current) {
        workletRef.current.updateConfig(updatedConfig);
      }
    },
    [frameProcessorConfig],
  );

  /**
   * Reset frame processor state
   */
  const reset = useCallback(() => {
    workletRef.current.reset();

    setState({
      isActive: false,
      isProcessing: false,
      lastPose: null,
      lastProcessedTimestamp: 0,
      frameCount: 0,
      metrics: null,
    });
  }, []);

  /**
   * Get current processing metrics
   */
  const getMetrics = useCallback((): PoseDetectionMetrics | null => {
    return workletRef.current.getMetrics();
  }, []);

  /**
   * Check if frame processor is currently processing
   */
  const isProcessing = useCallback((): boolean => {
    return workletRef.current.isProcessing();
  }, []);

  /**
   * Get current processing queue size
   */
  const getQueueSize = useCallback((): number => {
    return workletRef.current.getQueueSize();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workletRef.current.dispose();
    };
  }, []);

  // Auto-initialize if enabled
  useEffect(() => {
    if (frameProcessorConfig.enableFrameProcessor && !state.isActive) {
      initialize().catch((error) => log.error('useFrameProcessor', 'Failed to auto-initialize frame processor', { error }));
    }
  }, [frameProcessorConfig.enableFrameProcessor, state.isActive, initialize]);

  return {
    // VisionCamera frame processor
    frameProcessor,

    // State
    isActive: state.isActive,
    isProcessing: state.isProcessing,
    lastPose: state.lastPose,
    frameCount: state.frameCount,
    metrics: state.metrics,

    // Controls
    initialize,
    start,
    stop,
    reset,

    // Configuration
    updateConfig,
    config: frameProcessorConfig,

    // Utilities
    getMetrics,
    isCurrentlyProcessing: isProcessing,
    getQueueSize,

    // Performance info
    lastProcessedTimestamp: state.lastProcessedTimestamp,
    averageProcessingTime: state.metrics?.averageInferenceTime || 0,
    currentFps: state.metrics?.currentFps || 0,
    droppedFrames: state.metrics?.droppedFrames || 0,
  };
}

/**
 * Hook for frame processor with performance monitoring
 */
export function useFrameProcessorWithPerformance(
  config: Partial<FrameProcessorConfig> = {},
  onPoseDetected?: FrameProcessingCallback,
) {
  const frameProcessor = useFrameProcessor(config, onPoseDetected);

  // Enhanced performance monitoring
  const [performanceState, setPerformanceState] = useState({
    averageFps: 0,
    targetFpsAchieved: false,
    thermalThrottling: false,
    memoryPressure: false,
  });

  // Monitor performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = frameProcessor.getMetrics();

      if (metrics) {
        const targetFpsAchieved =
          metrics.currentFps >= (metrics.targetFps * 0.9);
        const thermalThrottling = metrics.averageInferenceTime > 100; // ms
        const memoryPressure = metrics.memoryUsage > 100; // MB

        setPerformanceState({
          averageFps: metrics.currentFps,
          targetFpsAchieved,
          thermalThrottling,
          memoryPressure,
        });

        // Auto-adjust configuration based on performance
        if (thermalThrottling && config.targetFps && config.targetFps > 15) {
          frameProcessor.updateConfig({
            targetFps: Math.max(15, config.targetFps - 5),
          });
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [frameProcessor, config.targetFps]);

  return {
    ...frameProcessor,

    // Enhanced performance state
    performance: performanceState,

    // Performance utilities
    isPerformanceOptimal: performanceState.targetFpsAchieved &&
      !performanceState.thermalThrottling &&
      !performanceState.memoryPressure,

    shouldReduceQuality: performanceState.thermalThrottling ||
      performanceState.memoryPressure,
  };
}

/**
 * Default export for convenience
 */
export default useFrameProcessor;
