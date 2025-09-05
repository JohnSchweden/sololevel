/**
 * Web Pose Detection Hook for Phase 3 AI Integration
 * TensorFlow.js implementation with MoveNet Lightning
 * Integrates with Web Workers for background processing
 */

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getModelPath,
  validatePoseConfig,
} from "../config/poseDetectionConfig";
import type {
  PoseDataBuffer,
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
  PoseDetectionState,
  PoseKeypoint,
  UsePoseDetection,
  WebPoseDetection,
} from "../types/pose";
import { DEFAULT_POSE_CONFIG } from "../types/pose";

/**
 * Web pose detection implementation using TensorFlow.js
 */
export function usePoseDetectionWeb(
  initialConfig: PoseDetectionConfig = DEFAULT_POSE_CONFIG,
): WebPoseDetection {
  // State management
  const [state, setState] = useState<PoseDetectionState>({
    isInitialized: false,
    isDetecting: false,
    isModelLoading: false,
    currentPose: null,
    lastDetectionTime: 0,
    config: initialConfig,
    metrics: {
      averageInferenceTime: 0,
      peakInferenceTime: 0,
      currentFps: 0,
      targetFps: initialConfig.targetFps,
      averageConfidence: 0,
      detectionRate: 0,
      droppedFrames: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      totalDetections: 0,
      failedDetections: 0,
      errorRate: 0,
    },
    error: null,
    lastError: null,
  });

  // Refs for TensorFlow.js and performance tracking
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const webWorkerRef = useRef<Worker | null>(null);
  const performanceHistoryRef = useRef<number[]>([]);
  const poseHistoryRef = useRef<PoseDetectionResult[]>([]);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const detectionIntervalRef = useRef<number | null>(null);

  /**
   * Initialize TensorFlow.js backend
   */
  const initializeTensorFlow = useCallback(async () => {
    try {
      // Set backend based on configuration
      const backend = state.config.web?.backend || "webgl";

      if (backend === "webgl") {
        await tf.setBackend("webgl");
      } else if (backend === "cpu") {
        await tf.setBackend("cpu");
      } else if (backend === "webgpu") {
        // WebGPU is experimental
        try {
          await tf.setBackend("webgpu");
        } catch {
          // console.warn('WebGPU not supported, falling back to WebGL');
          await tf.setBackend("webgl");
        }
      }

      await tf.ready();
      // console.log('TensorFlow.js backend initialized:', tf.getBackend());
    } catch (error) {
      // console.error('Failed to initialize TensorFlow.js backend:', error);
      throw new Error("Failed to initialize TensorFlow.js backend");
    }
  }, [state.config.web?.backend]);

  /**
   * Load TensorFlow.js pose detection model
   */
  const loadTensorFlowModel = useCallback(
    async (modelUrl?: string): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, isModelLoading: true, error: null }));

        // Initialize TensorFlow.js backend first
        await initializeTensorFlow();

        const url = modelUrl || getModelPath(state.config.modelType);

        // Create MoveNet detector
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig: poseDetection.MoveNetModelConfig = {
          modelType: state.config.modelType === "lightning"
            ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            : poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          enableSmoothing: state.config.enableSmoothing,
          modelUrl: url !== getModelPath(state.config.modelType)
            ? url
            : undefined,
        };

        const detector = await poseDetection.createDetector(
          model,
          detectorConfig,
        );
        detectorRef.current = detector;

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isModelLoading: false,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Failed to load TensorFlow.js model";
        setState((prev) => ({
          ...prev,
          isModelLoading: false,
          error: errorMessage,
          lastError: errorMessage,
        }));
        throw error;
      }
    },
    [
      state.config.modelType,
      state.config.enableSmoothing,
      initializeTensorFlow,
    ],
  );

  /**
   * Set TensorFlow.js backend
   */
  const setBackend = useCallback(
    async (backend: "webgl" | "cpu" | "webgpu"): Promise<void> => {
      try {
        await tf.setBackend(backend);
        await tf.ready();

        setState((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            web: {
              ...prev.config.web!,
              backend,
            },
          },
        }));
      } catch (error) {
        // console.error(`Failed to set backend to ${backend}:`, error);
        throw new Error(`Failed to set backend to ${backend}`);
      }
    },
    [],
  );

  /**
   * Enable/disable Web Worker for background processing
   */
  const enableWebWorker = useCallback((enable: boolean) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        web: {
          ...prev.config.web!,
          enableWebWorker: enable,
        },
      },
    }));

    if (enable && !webWorkerRef.current) {
      // Create Web Worker for pose detection
      // Note: In a real implementation, you'd create a separate worker file
      // console.log('Web Worker pose detection would be initialized here');
    } else if (!enable && webWorkerRef.current) {
      webWorkerRef.current.terminate();
      webWorkerRef.current = null;
    }
  }, []);

  /**
   * Process video frame for pose detection
   */
  const processVideoFrame = useCallback(async (
    videoElement: HTMLVideoElement | HTMLCanvasElement | ImageData,
  ): Promise<PoseDetectionResult | null> => {
    if (!detectorRef.current || !state.isDetecting) {
      return null;
    }

    const startTime = performance.now();

    try {
      // Detect poses using TensorFlow.js
      const poses = await detectorRef.current.estimatePoses(videoElement, {
        maxPoses: state.config.maxDetections,
        flipHorizontal: false,
      });

      const inferenceTime = performance.now() - startTime;

      if (poses.length > 0) {
        // Convert TensorFlow.js pose format to our format
        const pose = convertTensorFlowPose(poses[0], Date.now());

        // Update performance metrics
        updatePerformanceMetrics(inferenceTime, pose);

        // Apply confidence filtering
        if (pose.confidence >= state.config.confidenceThreshold) {
          // Add to pose history for smoothing
          poseHistoryRef.current.push(pose);
          if (poseHistoryRef.current.length > 5) {
            poseHistoryRef.current.shift();
          }

          // Apply temporal smoothing if enabled
          const smoothedPose = state.config.enableSmoothing
            ? applySmoothingToCurrentPose(pose)
            : pose;

          setState((prev) => ({
            ...prev,
            currentPose: smoothedPose,
            lastDetectionTime: Date.now(),
          }));

          return smoothedPose;
        }
      }

      // Update metrics even for failed detections
      updatePerformanceMetrics(inferenceTime, null);
      return null;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          failedDetections: prev.metrics.failedDetections + 1,
        },
      }));

      // console.error('Pose detection inference failed:', error);
      return null;
    }
  }, [state.isDetecting, state.config]);

  /**
   * Convert TensorFlow.js pose format to our standardized format
   */
  const convertTensorFlowPose = (
    tfPose: poseDetection.Pose,
    timestamp: number,
  ): PoseDetectionResult => {
    const keypoints: PoseKeypoint[] = tfPose.keypoints.map((kp) => ({
      name: kp.name as any, // TensorFlow.js uses same keypoint names
      x: kp.x,
      y: kp.y,
      confidence: kp.score || 0,
    }));

    // Calculate overall confidence as average of keypoint confidences
    const totalConfidence = keypoints.reduce(
      (sum, kp) => sum + kp.confidence,
      0,
    );
    const averageConfidence = totalConfidence / keypoints.length;

    return {
      keypoints,
      confidence: averageConfidence,
      timestamp,
    };
  };

  /**
   * Apply temporal smoothing to current pose
   */
  const applySmoothingToCurrentPose = (
    currentPose: PoseDetectionResult,
  ): PoseDetectionResult => {
    if (poseHistoryRef.current.length < 2) {
      return currentPose;
    }

    const previousPose =
      poseHistoryRef.current[poseHistoryRef.current.length - 2];
    const smoothingFactor = state.config.smoothingFactor;

    const smoothedKeypoints = currentPose.keypoints.map((keypoint, idx) => {
      const prevKeypoint = previousPose.keypoints[idx];

      return {
        ...keypoint,
        x: prevKeypoint.x * smoothingFactor +
          keypoint.x * (1 - smoothingFactor),
        y: prevKeypoint.y * smoothingFactor +
          keypoint.y * (1 - smoothingFactor),
      };
    });

    return {
      ...currentPose,
      keypoints: smoothedKeypoints,
    };
  };

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = (
    inferenceTime: number,
    pose: PoseDetectionResult | null,
  ) => {
    performanceHistoryRef.current.push(inferenceTime);
    if (performanceHistoryRef.current.length > 100) {
      performanceHistoryRef.current.shift();
    }

    frameCountRef.current++;

    // Update FPS every second
    const now = Date.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      const fps = frameCountRef.current;
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;

      setState((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          currentFps: fps,
          averageInferenceTime: performanceHistoryRef.current.reduce((a, b) =>
            a + b, 0) / performanceHistoryRef.current.length,
          peakInferenceTime: Math.max(...performanceHistoryRef.current),
          totalDetections: prev.metrics.totalDetections + (pose ? 1 : 0),
          averageConfidence: pose
            ? (prev.metrics.averageConfidence * 0.9 + pose.confidence * 0.1)
            : prev.metrics.averageConfidence,
          detectionRate: prev.metrics.totalDetections > 0
            ? (prev.metrics.totalDetections - prev.metrics.failedDetections) /
              prev.metrics.totalDetections
            : 0,
          errorRate: prev.metrics.totalDetections > 0
            ? prev.metrics.failedDetections / prev.metrics.totalDetections
            : 0,
        },
      }));
    }
  };

  /**
   * Start pose detection
   */
  const startDetection = useCallback(async (): Promise<void> => {
    if (!state.isInitialized) {
      await loadTensorFlowModel();
    }

    setState((prev) => ({ ...prev, isDetecting: true, error: null }));

    // Reset performance tracking
    frameCountRef.current = 0;
    lastFpsUpdateRef.current = Date.now();
    performanceHistoryRef.current = [];

    // Note: Actual video frame processing would be integrated with
    // camera stream in a real implementation
  }, [state.isInitialized, loadTensorFlowModel]);

  /**
   * Stop pose detection
   */
  const stopDetection = useCallback(() => {
    setState((prev) => ({ ...prev, isDetecting: false }));

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  /**
   * Pause pose detection
   */
  const pauseDetection = useCallback(() => {
    setState((prev) => ({ ...prev, isDetecting: false }));
  }, []);

  /**
   * Resume pose detection
   */
  const resumeDetection = useCallback(() => {
    setState((prev) => ({ ...prev, isDetecting: true }));
  }, []);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(
    (newConfig: Partial<PoseDetectionConfig>) => {
      const updatedConfig = { ...state.config, ...newConfig };
      const validation = validatePoseConfig(updatedConfig);

      if (!validation.isValid) {
        setState((prev) => ({
          ...prev,
          error: `Invalid configuration: ${validation.errors.join(", ")}`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        config: updatedConfig,
        metrics: {
          ...prev.metrics,
          targetFps: updatedConfig.targetFps,
        },
      }));
    },
    [state.config],
  );

  /**
   * Reset configuration to defaults
   */
  const resetConfig = useCallback(() => {
    setState((prev) => ({
      ...prev,
      config: DEFAULT_POSE_CONFIG,
    }));
  }, []);

  /**
   * Export pose data
   */
  const exportPoseData = useCallback((): PoseDataBuffer => {
    const poses = poseHistoryRef.current;
    const now = Date.now();

    return {
      id: `pose-buffer-${now}`,
      startTime: poses.length > 0 ? poses[0].timestamp : now,
      endTime: poses.length > 0 ? poses[poses.length - 1].timestamp : now,
      duration: poses.length > 0
        ? poses[poses.length - 1].timestamp - poses[0].timestamp
        : 0,
      poses: [...poses],
      frameCount: poses.length,
      compressionRatio: 1.0, // No compression in this basic implementation
      originalSize: poses.length * 1000, // Rough estimate
      compressedSize: poses.length * 1000,
    };
  }, []);

  /**
   * Clear pose data
   */
  const clearPoseData = useCallback(() => {
    poseHistoryRef.current = [];
    setState((prev) => ({
      ...prev,
      currentPose: null,
      lastDetectionTime: 0,
    }));
  }, []);

  /**
   * Get current metrics
   */
  const getMetrics = useCallback((): PoseDetectionMetrics => {
    return state.metrics;
  }, [state.metrics]);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    setState((prev) => ({
      ...prev,
      metrics: {
        averageInferenceTime: 0,
        peakInferenceTime: 0,
        currentFps: 0,
        targetFps: prev.config.targetFps,
        averageConfidence: 0,
        detectionRate: 0,
        droppedFrames: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        totalDetections: 0,
        failedDetections: 0,
        errorRate: 0,
      },
    }));

    performanceHistoryRef.current = [];
    frameCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (webWorkerRef.current) {
        webWorkerRef.current.terminate();
      }
      if (detectorRef.current) {
        // Cleanup TensorFlow.js detector if needed
        detectorRef.current = null;
      }
    };
  }, []);

  return {
    // State
    state,
    currentPose: state.currentPose,
    isDetecting: state.isDetecting,
    isInitialized: state.isInitialized,

    // Controls
    startDetection,
    stopDetection,
    pauseDetection,
    resumeDetection,

    // Configuration
    updateConfig,
    resetConfig,

    // Data management
    exportPoseData,
    clearPoseData,

    // Performance
    getMetrics,
    resetMetrics,

    // Web-specific methods
    loadTensorFlowModel,
    setBackend,
    enableWebWorker,

    // Internal method for video processing (used by camera integration)
    processVideoFrame,
  };
}
