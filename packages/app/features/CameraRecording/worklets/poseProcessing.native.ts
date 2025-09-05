/**
 * Native Worklet for Pose Processing Background Thread
 *
 * This worklet runs on a separate native thread to handle pose detection
 * without blocking the UI thread. It integrates with VisionCamera frame
 * processors and the TensorFlow Lite pose detection system.
 *
 * @platform native
 * @requires react-native-worklets-core
 * @requires react-native-vision-camera
 */

import type { Frame } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import type {
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
  PoseKeypoint,
} from "../types/pose";

/**
 * Worklet context for pose processing
 */
interface PoseProcessingContext {
  isProcessing: boolean;
  lastProcessedTimestamp: number;
  frameSkipCount: number;
  processingQueue: Frame[];
  metrics: PoseDetectionMetrics;
  config: PoseDetectionConfig;
}

/**
 * Frame processing result
 */
interface FrameProcessingResult {
  pose: PoseDetectionResult | null;
  processingTime: number;
  frameSkipped: boolean;
  queueSize: number;
  timestamp: number;
}

/**
 * Worklet for processing camera frames in background thread
 */
export const createPoseProcessingWorklet = Worklets.createRunOnJS(() => {
  "worklet";

  // Worklet-scoped variables (persist across calls)
  let context: PoseProcessingContext = {
    isProcessing: false,
    lastProcessedTimestamp: 0,
    frameSkipCount: 0,
    processingQueue: [],
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
      native: {
        useQuantizedModel: true,
        numThreads: 4,
        delegate: "gpu",
      },
    },
  };

  /**
   * Main frame processing function (runs on worklet thread)
   */
  const processFrame = (frame: Frame): FrameProcessingResult => {
    "worklet";

    const startTime = performance.now();
    const currentTimestamp = frame.timestamp;

    // Check if we should skip this frame based on performance
    const shouldSkipFrame = shouldSkipCurrentFrame(currentTimestamp);

    if (shouldSkipFrame) {
      context.frameSkipCount++;
      context.metrics.droppedFrames++;

      return {
        pose: null,
        processingTime: 0,
        frameSkipped: true,
        queueSize: context.processingQueue.length,
        timestamp: currentTimestamp,
      };
    }

    // Mark as processing
    context.isProcessing = true;
    context.lastProcessedTimestamp = currentTimestamp;

    try {
      // Extract frame data for pose detection
      const frameData = extractFrameData(frame);

      // Process pose detection (this would call TensorFlow Lite)
      const pose = processPoseDetection(frameData, frame.width, frame.height);

      // Update metrics
      const processingTime = performance.now() - startTime;
      updateProcessingMetrics(processingTime, pose);

      context.isProcessing = false;

      return {
        pose,
        processingTime,
        frameSkipped: false,
        queueSize: context.processingQueue.length,
        timestamp: currentTimestamp,
      };
    } catch (error) {
      context.isProcessing = false;
      context.metrics.failedDetections++;

      // Log error (worklet-safe logging)
      // console.error('Pose processing worklet error:', error);

      return {
        pose: null,
        processingTime: performance.now() - startTime,
        frameSkipped: false,
        queueSize: context.processingQueue.length,
        timestamp: currentTimestamp,
      };
    }
  };

  /**
   * Determine if current frame should be skipped based on performance
   */
  const shouldSkipCurrentFrame = (timestamp: number): boolean => {
    "worklet";

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

    // Skip if queue is too full (performance protection)
    if (context.processingQueue.length > 3) {
      return true;
    }

    // Skip based on thermal/battery state (would integrate with performance store)
    // This is a placeholder - in production, this would check actual thermal state
    const shouldThrottle = context.metrics.averageInferenceTime > 100; // ms
    if (shouldThrottle && context.frameSkipCount % 2 === 0) {
      return true;
    }

    return false;
  };

  /**
   * Extract frame data for pose detection processing
   */
  const extractFrameData = (frame: Frame): Uint8Array => {
    "worklet";

    // This is a placeholder implementation
    // In production, this would extract actual pixel data from the VisionCamera frame
    // The frame would need to be converted to the format expected by TensorFlow Lite

    const { width, height } = frame;
    const expectedSize = width * height * 3; // RGB

    // Mock frame data for development
    return new Uint8Array(expectedSize);
  };

  /**
   * Process pose detection using TensorFlow Lite
   */
  const processPoseDetection = (
    frameData: Uint8Array,
    width: number,
    height: number,
  ): PoseDetectionResult | null => {
    "worklet";

    // This is a placeholder implementation
    // In production, this would call the actual TensorFlow Lite model
    // The model inference would happen on this background thread

    try {
      // Mock pose detection result for development
      const mockKeypoints: PoseKeypoint[] = [
        { name: "nose", x: 0.5, y: 0.3, confidence: 0.8 },
        { name: "left_eye", x: 0.45, y: 0.28, confidence: 0.7 },
        { name: "right_eye", x: 0.55, y: 0.28, confidence: 0.7 },
        // ... other keypoints would be generated based on actual detection
      ];

      const averageConfidence = mockKeypoints.reduce((sum, kp) =>
        sum + kp.confidence, 0) / mockKeypoints.length;

      // Only return result if confidence is above threshold
      if (averageConfidence >= context.config.confidenceThreshold) {
        return {
          keypoints: mockKeypoints,
          confidence: averageConfidence,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      // console.error('TensorFlow Lite inference error:', error);
      return null;
    }
  };

  /**
   * Update processing metrics
   */
  const updateProcessingMetrics = (
    processingTime: number,
    pose: PoseDetectionResult | null,
  ): void => {
    "worklet";

    // Update inference time metrics
    context.metrics.averageInferenceTime =
      (context.metrics.averageInferenceTime * 0.9) + (processingTime * 0.1);

    context.metrics.peakInferenceTime = Math.max(
      context.metrics.peakInferenceTime,
      processingTime,
    );

    // Update detection metrics
    context.metrics.totalDetections++;

    if (pose) {
      context.metrics.averageConfidence =
        (context.metrics.averageConfidence * 0.9) + (pose.confidence * 0.1);
    } else {
      context.metrics.failedDetections++;
    }

    // Calculate detection and error rates
    context.metrics.detectionRate =
      (context.metrics.totalDetections - context.metrics.failedDetections) /
      context.metrics.totalDetections;

    context.metrics.errorRate = context.metrics.failedDetections /
      context.metrics.totalDetections;
  };

  /**
   * Update worklet configuration
   */
  const updateConfig = (newConfig: Partial<PoseDetectionConfig>): void => {
    "worklet";

    context.config = { ...context.config, ...newConfig };

    // Reset metrics when config changes significantly
    if (
      newConfig.targetFps && newConfig.targetFps !== context.config.targetFps
    ) {
      context.metrics.currentFps = 0;
      context.frameSkipCount = 0;
    }
  };

  /**
   * Get current processing metrics
   */
  const getMetrics = (): PoseDetectionMetrics => {
    "worklet";

    return { ...context.metrics };
  };

  /**
   * Reset processing state
   */
  const reset = (): void => {
    "worklet";

    context.isProcessing = false;
    context.lastProcessedTimestamp = 0;
    context.frameSkipCount = 0;
    context.processingQueue = [];

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
  };

  // Return worklet interface
  return {
    processFrame,
    updateConfig,
    getMetrics,
    reset,

    // Worklet state accessors
    isProcessing: () => context.isProcessing,
    getQueueSize: () => context.processingQueue.length,
    getFrameSkipCount: () => context.frameSkipCount,
  };
});

/**
 * Worklet-based pose processing manager
 */
export class PoseProcessingWorkletManager {
  private worklet: ReturnType<typeof createPoseProcessingWorklet> | null = null;
  private isInitialized = false;

  /**
   * Initialize the pose processing worklet
   */
  async initialize(): Promise<void> {
    try {
      this.worklet = createPoseProcessingWorklet();
      this.isInitialized = true;
    } catch (error) {
      // console.error('Failed to initialize pose processing worklet:', error);
      throw new Error("Failed to initialize pose processing worklet");
    }
  }

  /**
   * Process a camera frame using the worklet
   */
  processFrame(frame: Frame): FrameProcessingResult | null {
    if (!this.isInitialized || !this.worklet) {
      // console.warn('Pose processing worklet not initialized');
      return null;
    }

    try {
      return this.worklet.processFrame(frame);
    } catch (error) {
      // console.error('Worklet frame processing error:', error);
      return null;
    }
  }

  /**
   * Update worklet configuration
   */
  updateConfig(config: Partial<PoseDetectionConfig>): void {
    if (this.worklet) {
      this.worklet.updateConfig(config);
    }
  }

  /**
   * Get processing metrics
   */
  getMetrics(): PoseDetectionMetrics | null {
    return this.worklet ? this.worklet.getMetrics() : null;
  }

  /**
   * Reset worklet state
   */
  reset(): void {
    if (this.worklet) {
      this.worklet.reset();
    }
  }

  /**
   * Check if worklet is currently processing
   */
  isProcessing(): boolean {
    return this.worklet ? this.worklet.isProcessing() : false;
  }

  /**
   * Get current processing queue size
   */
  getQueueSize(): number {
    return this.worklet ? this.worklet.getQueueSize() : 0;
  }

  /**
   * Cleanup worklet resources
   */
  dispose(): void {
    if (this.worklet) {
      this.worklet.reset();
      this.worklet = null;
    }
    this.isInitialized = false;
  }
}

/**
 * Singleton instance for pose processing worklet
 */
export const poseProcessingWorklet = new PoseProcessingWorkletManager();

/**
 * Hook for using pose processing worklet
 */
export function usePoseProcessingWorklet() {
  return {
    worklet: poseProcessingWorklet,

    // Convenience methods
    processFrame: (frame: Frame) => poseProcessingWorklet.processFrame(frame),
    updateConfig: (config: Partial<PoseDetectionConfig>) =>
      poseProcessingWorklet.updateConfig(config),
    getMetrics: () => poseProcessingWorklet.getMetrics(),
    reset: () => poseProcessingWorklet.reset(),
    isProcessing: () => poseProcessingWorklet.isProcessing(),
    getQueueSize: () => poseProcessingWorklet.getQueueSize(),
  };
}
