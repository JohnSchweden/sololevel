/**
 * Web Camera Frame Processing Pipeline
 *
 * This hook manages camera frame capture and processing for pose detection
 * on web platforms. It handles video stream capture, Web Worker communication,
 * and frame throttling for optimal performance.
 *
 * @platform web
 */

import { log } from "@my/logging";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionResult,
} from "../types/pose";
import type {
  FrameData,
  WorkerMessage,
  WorkerResponse,
} from "../workers/poseDetection.web";

/**
 * Camera frame processor state
 */
interface CameraFrameProcessorState {
  isActive: boolean;
  isProcessing: boolean;
  isWorkerReady: boolean;
  lastPose: PoseDetectionResult | null;
  lastProcessedTimestamp: number;
  frameCount: number;
  metrics: PoseDetectionMetrics | null;
  error: string | null;
}

/**
 * Camera frame processor configuration
 */
interface CameraFrameProcessorConfig extends PoseDetectionConfig {
  enableFrameProcessor: boolean;
  captureInterval: number; // ms between frame captures
  maxQueueSize: number;
  processingTimeout: number; // ms
  videoConstraints: MediaTrackConstraints;
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
 * Worker message queue item
 */
interface QueuedMessage {
  message: WorkerMessage;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Hook for web camera frame processing with pose detection
 */
export function useCameraFrameProcessor(
  config: Partial<CameraFrameProcessorConfig> = {},
  onPoseDetected?: FrameProcessingCallback,
) {
  // State management
  const [state, setState] = useState<CameraFrameProcessorState>({
    isActive: false,
    isProcessing: false,
    isWorkerReady: false,
    lastPose: null,
    lastProcessedTimestamp: 0,
    frameCount: 0,
    metrics: null,
    error: null,
  });

  // Configuration with defaults
  const frameProcessorConfig: CameraFrameProcessorConfig = {
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
    captureInterval: 33, // ~30fps
    maxQueueSize: 3,
    processingTimeout: 5000,
    videoConstraints: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    },
    web: {
      backend: "webgl",
      enableWebWorker: true,
    },
    ...config,
  };

  // Refs for persistent state
  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<Map<string, QueuedMessage>>(new Map());
  const frameCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);

  /**
   * Generate unique message ID
   */
  const generateMessageId = useCallback((): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Send message to worker with promise-based response
   */
  const sendWorkerMessage = useCallback((
    type: WorkerMessage["type"],
    payload?: any,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const id = generateMessageId();
      const message: WorkerMessage = { id, type, payload };

      // Set up timeout
      const timeout = setTimeout(() => {
        messageQueueRef.current.delete(id);
        reject(new Error(`Worker message timeout: ${type}`));
      }, frameProcessorConfig.processingTimeout);

      // Store message in queue
      messageQueueRef.current.set(id, {
        message,
        resolve,
        reject,
        timeout,
      });

      // Send message to worker
      workerRef.current.postMessage(message);
    });
  }, [generateMessageId, frameProcessorConfig.processingTimeout]);

  /**
   * Handle worker messages
   */
  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerResponse>) => {
      const { id, success, data, error } = event.data;

      const queuedMessage = messageQueueRef.current.get(id);
      if (!queuedMessage) {
        // console.warn('Received response for unknown message:', id);
        return;
      }

      // Clear timeout and remove from queue
      clearTimeout(queuedMessage.timeout);
      messageQueueRef.current.delete(id);

      // Resolve or reject promise
      if (success) {
        queuedMessage.resolve(data);
      } else {
        queuedMessage.reject(new Error(error || "Unknown worker error"));
      }
    },
    [],
  );

  /**
   * Initialize Web Worker
   */
  const initializeWorker = useCallback(async () => {
    try {
      // Create worker - NOTE: import.meta.url requires ES modules
      // For now, we'll skip worker initialization until the bundler is configured properly
      log.warn('useCameraFrameProcessor', 'Web Worker initialization skipped - import.meta.url not supported by current bundler config');
      
      setState((prev) => ({
        ...prev,
        error: "Web Worker not available - pose detection disabled",
        isWorkerReady: false,
      }));
      
      // Don't throw error to prevent app crash - just disable feature
      return;
      
      /* ORIGINAL CODE - Commented out until bundler supports import.meta.url
      const workerUrl = new URL(
        "../workers/poseDetection.web.ts",
        import.meta.url,
      );
      workerRef.current = new Worker(workerUrl, { type: "module" });

      // Set up message handler
      workerRef.current.onmessage = handleWorkerMessage;

      // Set up error handler
      workerRef.current.onerror = (error) => {
        // console.error('Worker error:', error);
        setState((prev) => ({
          ...prev,
          error: "Worker initialization failed",
          isWorkerReady: false,
        }));
      };

      // Initialize pose detection in worker
      await sendWorkerMessage("INITIALIZE", frameProcessorConfig);

      setState((prev) => ({
        ...prev,
        isWorkerReady: true,
        error: null,
      }));
      */
    } catch (error) {
      // console.error('Failed to initialize worker:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error
          ? error.message
          : "Worker initialization failed",
        isWorkerReady: false,
      }));
      // Don't throw - just disable the feature gracefully
      return;
    }
  }, [frameProcessorConfig, handleWorkerMessage, sendWorkerMessage]);

  /**
   * Initialize camera stream
   */
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: frameProcessorConfig.videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      // Create video element if not exists
      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
      }

      // Create canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      videoRef.current.srcObject = stream;

      return new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error("Video element not available"));
          return;
        }

        videoRef.current.onloadedmetadata = () => {
          resolve();
        };

        videoRef.current.onerror = () => {
          reject(new Error("Failed to load video stream"));
        };
      });
    } catch (error) {
      // console.error('Failed to initialize camera:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error
          ? error.message
          : "Camera initialization failed",
      }));
      throw error;
    }
  }, [frameProcessorConfig.videoConstraints]);

  /**
   * Capture frame from video stream
   */
  const captureFrame = useCallback((): FrameData | null => {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    // Set canvas size to match input resolution
    const { width, height } = frameProcessorConfig.inputResolution;
    canvas.width = width;
    canvas.height = height;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);

    return {
      imageData,
      timestamp: Date.now(),
      width,
      height,
    };
  }, [frameProcessorConfig.inputResolution]);

  /**
   * Process captured frame
   */
  const processFrame = useCallback(async () => {
    if (!state.isWorkerReady || state.isProcessing) {
      return;
    }

    const now = Date.now();

    // Check if enough time has passed since last capture
    if (
      now - lastCaptureTimeRef.current < frameProcessorConfig.captureInterval
    ) {
      return;
    }

    const frameData = captureFrame();
    if (!frameData) {
      return;
    }

    lastCaptureTimeRef.current = now;
    frameCountRef.current++;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const result = await sendWorkerMessage("PROCESS_FRAME", frameData);

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        lastPose: result.pose,
        lastProcessedTimestamp: result.timestamp,
        frameCount: frameCountRef.current,
      }));

      // Call external callback if provided
      if (onPoseDetected) {
        onPoseDetected(result);
      }

      // Update metrics periodically
      if (frameCountRef.current % 30 === 0) { // Every 30 frames
        const metrics = await sendWorkerMessage("GET_METRICS");
        setState((prev) => ({ ...prev, metrics }));
      }
    } catch (error) {
      // console.error('Frame processing error:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error
          ? error.message
          : "Frame processing failed",
      }));
    }
  }, [
    state.isWorkerReady,
    state.isProcessing,
    frameProcessorConfig.captureInterval,
    captureFrame,
    sendWorkerMessage,
    onPoseDetected,
  ]);

  /**
   * Start frame processing loop
   */
  const startProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(
      processFrame,
      frameProcessorConfig.captureInterval,
    );
    setState((prev) => ({ ...prev, isActive: true }));
  }, [processFrame, frameProcessorConfig.captureInterval]);

  /**
   * Stop frame processing loop
   */
  const stopProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState((prev) => ({ ...prev, isActive: false, isProcessing: false }));
  }, []);

  /**
   * Initialize frame processor
   */
  const initialize = useCallback(async () => {
    try {
      await initializeWorker();
      await initializeCamera();

      setState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      // console.error('Failed to initialize frame processor:', error);
      throw new Error("Failed to initialize frame processor");
    }
  }, [initializeWorker, initializeCamera]);

  /**
   * Start frame processing
   */
  const start = useCallback(async () => {
    if (!state.isWorkerReady) {
      await initialize();
    }

    startProcessing();
  }, [state.isWorkerReady, initialize, startProcessing]);

  /**
   * Stop frame processing
   */
  const stop = useCallback(() => {
    stopProcessing();
  }, [stopProcessing]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(
    async (newConfig: Partial<CameraFrameProcessorConfig>) => {
      const updatedConfig = { ...frameProcessorConfig, ...newConfig };

      if (state.isWorkerReady) {
        try {
          await sendWorkerMessage("UPDATE_CONFIG", updatedConfig);
        } catch (error) {
          // console.error('Failed to update worker config:', error);
        }
      }
    },
    [frameProcessorConfig, state.isWorkerReady, sendWorkerMessage],
  );

  /**
   * Reset frame processor
   */
  const reset = useCallback(async () => {
    stopProcessing();

    if (state.isWorkerReady) {
      try {
        await sendWorkerMessage("RESET");
      } catch (error) {
        // console.error('Failed to reset worker:', error);
      }
    }

    frameCountRef.current = 0;
    lastCaptureTimeRef.current = 0;

    setState({
      isActive: false,
      isProcessing: false,
      isWorkerReady: state.isWorkerReady,
      lastPose: null,
      lastProcessedTimestamp: 0,
      frameCount: 0,
      metrics: null,
      error: null,
    });
  }, [stopProcessing, state.isWorkerReady, sendWorkerMessage]);

  /**
   * Get current metrics
   */
  const getMetrics = useCallback(
    async (): Promise<PoseDetectionMetrics | null> => {
      if (!state.isWorkerReady) {
        return null;
      }

      try {
        return await sendWorkerMessage("GET_METRICS");
      } catch (error) {
        // console.error('Failed to get metrics:', error);
        return null;
      }
    },
    [state.isWorkerReady, sendWorkerMessage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProcessing();

      // Clean up camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Clean up worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Clear message queue
      messageQueueRef.current.forEach(({ timeout }) => clearTimeout(timeout));
      messageQueueRef.current.clear();
    };
  }, [stopProcessing]);

  // Auto-initialize if enabled
  useEffect(() => {
    if (frameProcessorConfig.enableFrameProcessor && !state.isWorkerReady) {
      initialize().catch(console.error);
    }
  }, [
    frameProcessorConfig.enableFrameProcessor,
    state.isWorkerReady,
    initialize,
  ]);

  return {
    // State
    isActive: state.isActive,
    isProcessing: state.isProcessing,
    isWorkerReady: state.isWorkerReady,
    lastPose: state.lastPose,
    frameCount: state.frameCount,
    metrics: state.metrics,
    error: state.error,

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
    captureFrame,

    // Video elements (for debugging/preview)
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,

    // Performance info
    lastProcessedTimestamp: state.lastProcessedTimestamp,
    averageProcessingTime: state.metrics?.averageInferenceTime || 0,
    currentFps: state.metrics?.currentFps || 0,
    droppedFrames: state.metrics?.droppedFrames || 0,
  };
}

/**
 * Default export for convenience
 */
export default useCameraFrameProcessor;
