/**
 * Web Worker for Pose Detection Processing
 *
 * This Web Worker runs pose detection in a background thread to avoid
 * blocking the main UI thread. It handles TensorFlow.js model inference
 * and frame processing for web browsers.
 *
 * @platform web
 * @requires @tensorflow/tfjs
 * @requires @tensorflow-models/pose-detection
 */

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import type {
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
  PoseKeypoint,
} from "../types/pose";

/**
 * Worker message types
 */
type WorkerMessageType =
  | "INITIALIZE"
  | "PROCESS_FRAME"
  | "UPDATE_CONFIG"
  | "GET_METRICS"
  | "RESET"
  | "DISPOSE";

/**
 * Worker message interface
 */
interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload?: any;
}

/**
 * Worker response interface
 */
interface WorkerResponse {
  id: string;
  type: WorkerMessageType;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Frame processing data
 */
interface FrameData {
  imageData: ImageData;
  timestamp: number;
  width: number;
  height: number;
}

/**
 * Worker context for pose processing
 */
interface PoseProcessingContext {
  detector: poseDetection.PoseDetector | null;
  isInitialized: boolean;
  isProcessing: boolean;
  lastProcessedTimestamp: number;
  frameSkipCount: number;
  metrics: PoseDetectionMetrics;
  config: PoseDetectionConfig;
  performanceHistory: number[];
}

// Worker-scoped context
let context: PoseProcessingContext = {
  detector: null,
  isInitialized: false,
  isProcessing: false,
  lastProcessedTimestamp: 0,
  frameSkipCount: 0,
  performanceHistory: [],
  metrics: {
    averageInferenceTime: 0,
    peakInferenceTime: 0,
    currentFps: 0,
    targetFps: 30,
    averageConfidence: 0,
    detectionRate: 0,
    droppedFrames: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    totalDetections: 0,
    failedDetections: 0,
    errorRate: 0,
  },
  config: {
    modelType: "lightning",
    confidenceThreshold: 0.3,
    maxDetections: 1,
    targetFps: 30,
    enableGpuAcceleration: true,
    enableMultiThreading: true,
    inputResolution: { width: 256, height: 256 },
    enableSmoothing: true,
    smoothingFactor: 0.7,
    web: {
      backend: "webgl",
      enableWebWorker: true,
    },
  },
};

/**
 * Initialize TensorFlow.js and pose detection model
 */
async function initializePoseDetection(
  config: PoseDetectionConfig,
): Promise<void> {
  try {
    // Set TensorFlow.js backend
    const backend = config.web?.backend || "webgl";

    if (backend === "webgl") {
      await tf.setBackend("webgl");
    } else if (backend === "cpu") {
      await tf.setBackend("cpu");
    } else if (backend === "webgpu") {
      try {
        await tf.setBackend("webgpu");
      } catch {
        // Fallback to WebGL if WebGPU not supported
        await tf.setBackend("webgl");
      }
    }

    await tf.ready();

    // Create MoveNet detector
    const model = poseDetection.SupportedModels.MoveNet;
    const detectorConfig: poseDetection.MoveNetModelConfig = {
      modelType: config.modelType === "lightning"
        ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        : poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      enableSmoothing: config.enableSmoothing,
    };

    context.detector = await poseDetection.createDetector(
      model,
      detectorConfig,
    );
    context.config = config;
    context.isInitialized = true;
  } catch (error) {
    // console.error('Failed to initialize pose detection in worker:', error);
    throw new Error("Failed to initialize pose detection in worker");
  }
}

/**
 * Process a single frame for pose detection
 */
async function processFrame(frameData: FrameData): Promise<{
  pose: PoseDetectionResult | null;
  processingTime: number;
  frameSkipped: boolean;
  timestamp: number;
}> {
  const startTime = performance.now();

  // Check if we should skip this frame
  const shouldSkip = shouldSkipFrame(frameData.timestamp);

  if (shouldSkip) {
    context.frameSkipCount++;
    context.metrics.droppedFrames++;

    return {
      pose: null,
      processingTime: 0,
      frameSkipped: true,
      timestamp: frameData.timestamp,
    };
  }

  if (!context.detector || !context.isInitialized) {
    throw new Error("Pose detector not initialized");
  }

  context.isProcessing = true;
  context.lastProcessedTimestamp = frameData.timestamp;

  try {
    // Create canvas from ImageData for TensorFlow.js
    const canvas = new OffscreenCanvas(frameData.width, frameData.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.putImageData(frameData.imageData, 0, 0);

    // Run pose detection
    const poses = await context.detector.estimatePoses(canvas);

    const processingTime = performance.now() - startTime;

    // Convert TensorFlow.js pose to our format
    let pose: PoseDetectionResult | null = null;

    if (poses.length > 0) {
      pose = convertTensorFlowPose(poses[0], frameData.timestamp);

      // Apply confidence filtering
      if (pose.confidence < context.config.confidenceThreshold) {
        pose = null;
      }
    }

    // Update metrics
    updateProcessingMetrics(processingTime, pose);

    context.isProcessing = false;

    return {
      pose,
      processingTime,
      frameSkipped: false,
      timestamp: frameData.timestamp,
    };
  } catch (error) {
    context.isProcessing = false;
    context.metrics.failedDetections++;

    // console.error('Pose detection processing error:', error);

    return {
      pose: null,
      processingTime: performance.now() - startTime,
      frameSkipped: false,
      timestamp: frameData.timestamp,
    };
  }
}

/**
 * Determine if current frame should be skipped
 */
function shouldSkipFrame(timestamp: number): boolean {
  // Skip if already processing
  if (context.isProcessing) {
    return true;
  }

  // Calculate time since last processed frame
  const timeSinceLastFrame = timestamp - context.lastProcessedTimestamp;
  const targetFrameInterval = 1000 / context.config.targetFps; // ms

  // Skip if not enough time has passed
  if (timeSinceLastFrame < targetFrameInterval) {
    return true;
  }

  // Skip based on performance (adaptive throttling)
  const shouldThrottle = context.metrics.averageInferenceTime > 100; // ms
  if (shouldThrottle && context.frameSkipCount % 2 === 0) {
    return true;
  }

  return false;
}

/**
 * Convert TensorFlow.js pose to our format
 */
function convertTensorFlowPose(
  tfPose: poseDetection.Pose,
  timestamp: number,
): PoseDetectionResult {
  const keypoints: PoseKeypoint[] = tfPose.keypoints.map((kp) => ({
    name: kp.name as any, // TensorFlow.js uses same keypoint names
    x: kp.x,
    y: kp.y,
    confidence: kp.score || 0,
  }));

  // Calculate overall confidence as average of keypoint confidences
  const totalConfidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0);
  const averageConfidence = totalConfidence / keypoints.length;

  return {
    keypoints,
    confidence: averageConfidence,
    timestamp,
  };
}

/**
 * Update processing metrics
 */
function updateProcessingMetrics(
  processingTime: number,
  pose: PoseDetectionResult | null,
): void {
  // Update performance history
  context.performanceHistory.push(processingTime);
  if (context.performanceHistory.length > 100) {
    context.performanceHistory.shift();
  }

  // Update inference time metrics
  context.metrics.averageInferenceTime =
    context.performanceHistory.reduce((a, b) => a + b, 0) /
    context.performanceHistory.length;

  context.metrics.peakInferenceTime = Math.max(...context.performanceHistory);

  // Update detection metrics
  context.metrics.totalDetections++;

  if (pose) {
    context.metrics.averageConfidence =
      (context.metrics.averageConfidence * 0.9) + (pose.confidence * 0.1);
  } else {
    context.metrics.failedDetections++;
  }

  // Calculate rates
  context.metrics.detectionRate =
    (context.metrics.totalDetections - context.metrics.failedDetections) /
    context.metrics.totalDetections;

  context.metrics.errorRate = context.metrics.failedDetections /
    context.metrics.totalDetections;

  // Estimate memory usage (rough approximation)
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory;
    context.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
  }
}

/**
 * Update worker configuration
 */
function updateConfig(newConfig: Partial<PoseDetectionConfig>): void {
  context.config = { ...context.config, ...newConfig };

  // Reset metrics when config changes significantly
  if (newConfig.targetFps && newConfig.targetFps !== context.config.targetFps) {
    context.metrics.currentFps = 0;
    context.frameSkipCount = 0;
  }
}

/**
 * Reset worker state
 */
function reset(): void {
  context.isProcessing = false;
  context.lastProcessedTimestamp = 0;
  context.frameSkipCount = 0;
  context.performanceHistory = [];

  // Reset metrics
  context.metrics = {
    ...context.metrics,
    averageInferenceTime: 0,
    peakInferenceTime: 0,
    currentFps: 0,
    averageConfidence: 0,
    detectionRate: 0,
    droppedFrames: 0,
    totalDetections: 0,
    failedDetections: 0,
    errorRate: 0,
  };
}

/**
 * Dispose worker resources
 */
function dispose(): void {
  if (context.detector) {
    context.detector.dispose();
    context.detector = null;
  }

  context.isInitialized = false;
  reset();
}

/**
 * Handle worker messages
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    let responseData: any = null;

    switch (type) {
      case "INITIALIZE":
        await initializePoseDetection(payload);
        responseData = { initialized: true };
        break;

      case "PROCESS_FRAME":
        responseData = await processFrame(payload);
        break;

      case "UPDATE_CONFIG":
        updateConfig(payload);
        responseData = { updated: true };
        break;

      case "GET_METRICS":
        responseData = context.metrics;
        break;

      case "RESET":
        reset();
        responseData = { reset: true };
        break;

      case "DISPOSE":
        dispose();
        responseData = { disposed: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Send success response
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      data: responseData,
    };

    self.postMessage(response);
  } catch (error) {
    // Send error response
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    self.postMessage(response);
  }
};

/**
 * Handle worker errors
 */
self.onerror = (error) => {
  // console.error('Pose detection worker error:', error);
};

/**
 * Handle unhandled promise rejections
 */
self.onunhandledrejection = (event) => {
  // console.error('Pose detection worker unhandled rejection:', event.reason);
};

// Export types for main thread usage
export type { FrameData, WorkerMessage, WorkerResponse };
