/**
 * Pose Detection Configuration for Phase 3 AI Integration
 * Platform-specific configurations for MoveNet Lightning integration
 */

import { Platform } from "react-native";
import type { PoseDetectionConfig } from "../types/pose";

/**
 * Model URLs and paths
 */
export const MODEL_PATHS = {
  native: {
    lightning: "movenet_lightning_int8.tflite",
    thunder: "movenet_thunder_int8.tflite",
  },
  web: {
    lightning:
      "https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4",
    thunder: "https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4",
  },
} as const;

/**
 * Platform-specific performance configurations
 */
export const PERFORMANCE_CONFIGS = {
  // High-end devices
  high: {
    targetFps: 30,
    inputResolution: { width: 256, height: 256 },
    enableGpuAcceleration: true,
    enableMultiThreading: true,
    confidenceThreshold: 0.3,
    native: {
      numThreads: 4,
      delegate: "gpu" as const,
      useQuantizedModel: true,
    },
    web: {
      backend: "webgl" as const,
      enableWebWorker: true,
    },
  },

  // Mid-range devices
  medium: {
    targetFps: 24,
    inputResolution: { width: 192, height: 192 },
    enableGpuAcceleration: true,
    enableMultiThreading: true,
    confidenceThreshold: 0.4,
    native: {
      numThreads: 2,
      delegate: "gpu" as const,
      useQuantizedModel: true,
    },
    web: {
      backend: "webgl" as const,
      enableWebWorker: true,
    },
  },

  // Low-end devices
  low: {
    targetFps: 15,
    inputResolution: { width: 128, height: 128 },
    enableGpuAcceleration: false,
    enableMultiThreading: false,
    confidenceThreshold: 0.5,
    native: {
      numThreads: 1,
      delegate: "cpu" as const,
      useQuantizedModel: true,
    },
    web: {
      backend: "cpu" as const,
      enableWebWorker: false,
    },
  },
} as const;

/**
 * Thermal management configurations
 */
export const THERMAL_CONFIGS = {
  normal: {
    targetFps: 30,
    processingInterval: 33, // ms
    enableAllFeatures: true,
  },

  fair: {
    targetFps: 24,
    processingInterval: 42, // ms
    enableAllFeatures: true,
  },

  serious: {
    targetFps: 15,
    processingInterval: 67, // ms
    enableAllFeatures: false,
  },

  critical: {
    targetFps: 0, // Disable pose detection
    processingInterval: 0,
    enableAllFeatures: false,
  },
} as const;

/**
 * Battery optimization configurations
 */
export const BATTERY_CONFIGS = {
  high: { // >50% battery
    targetFps: 30,
    fullQuality: true,
    backgroundProcessing: true,
  },

  medium: { // 20-50% battery
    targetFps: 24,
    fullQuality: true,
    backgroundProcessing: true,
  },

  low: { // 10-20% battery
    targetFps: 15,
    fullQuality: false,
    backgroundProcessing: false,
  },

  critical: { // <10% battery
    targetFps: 0, // Disable pose detection
    fullQuality: false,
    backgroundProcessing: false,
  },
} as const;

/**
 * Get optimal configuration based on device capabilities
 */
export function getOptimalPoseConfig(): PoseDetectionConfig {
  const isNative = Platform.OS !== "web";

  // Default to medium performance for now
  // In production, this would detect device capabilities
  const performanceLevel = "medium";
  const baseConfig = PERFORMANCE_CONFIGS[performanceLevel];

  return {
    modelType: "lightning",
    maxDetections: 1,
    enableSmoothing: true,
    smoothingFactor: 0.7,
    ...baseConfig,
    native: isNative ? baseConfig.native : undefined,
    web: !isNative ? baseConfig.web : undefined,
  };
}

/**
 * Adjust configuration based on thermal state
 */
export function adjustConfigForThermalState(
  config: PoseDetectionConfig,
  thermalState: "normal" | "fair" | "serious" | "critical",
): PoseDetectionConfig {
  const thermalConfig = THERMAL_CONFIGS[thermalState];

  return {
    ...config,
    targetFps: thermalConfig.targetFps,
    enableGpuAcceleration: thermalConfig.enableAllFeatures
      ? config.enableGpuAcceleration
      : false,
    enableMultiThreading: thermalConfig.enableAllFeatures
      ? config.enableMultiThreading
      : false,
  };
}

/**
 * Adjust configuration based on battery level
 */
export function adjustConfigForBatteryLevel(
  config: PoseDetectionConfig,
  batteryLevel: number,
): PoseDetectionConfig {
  let batteryConfig;

  if (batteryLevel > 50) {
    batteryConfig = BATTERY_CONFIGS.high;
  } else if (batteryLevel > 20) {
    batteryConfig = BATTERY_CONFIGS.medium;
  } else if (batteryLevel > 10) {
    batteryConfig = BATTERY_CONFIGS.low;
  } else {
    batteryConfig = BATTERY_CONFIGS.critical;
  }

  return {
    ...config,
    targetFps: batteryConfig.targetFps,
    enableGpuAcceleration: batteryConfig.fullQuality
      ? config.enableGpuAcceleration
      : false,
    enableMultiThreading: batteryConfig.backgroundProcessing
      ? config.enableMultiThreading
      : false,
  };
}

/**
 * Get model path for current platform
 */
export function getModelPath(
  modelType: "lightning" | "thunder" = "lightning",
): string {
  const isNative = Platform.OS !== "web";

  if (isNative) {
    return MODEL_PATHS.native[modelType];
  } else {
    return MODEL_PATHS.web[modelType];
  }
}

/**
 * Validate pose detection configuration
 */
export function validatePoseConfig(config: PoseDetectionConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate basic settings
  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push("Confidence threshold must be between 0 and 1");
  }

  if (config.targetFps < 0 || config.targetFps > 60) {
    errors.push("Target FPS must be between 0 and 60");
  }

  if (config.maxDetections < 1 || config.maxDetections > 10) {
    errors.push("Max detections must be between 1 and 10");
  }

  // Validate input resolution
  const { width, height } = config.inputResolution;
  if (width < 64 || width > 512 || height < 64 || height > 512) {
    errors.push("Input resolution must be between 64x64 and 512x512");
  }

  // Validate smoothing factor
  if (config.smoothingFactor < 0 || config.smoothingFactor > 1) {
    errors.push("Smoothing factor must be between 0 and 1");
  }

  // Validate platform-specific settings
  if (
    config.native &&
    (config.native.numThreads < 1 || config.native.numThreads > 8)
  ) {
    errors.push("Number of threads must be between 1 and 8");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Performance benchmarking thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Inference time thresholds (ms)
  inferenceTime: {
    excellent: 20,
    good: 35,
    fair: 50,
    poor: 100,
  },

  // FPS thresholds
  fps: {
    excellent: 28,
    good: 20,
    fair: 15,
    poor: 10,
  },

  // Memory usage thresholds (MB)
  memory: {
    excellent: 50,
    good: 100,
    fair: 150,
    poor: 200,
  },

  // Confidence thresholds
  confidence: {
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
    poor: 0.2,
  },
} as const;

/**
 * Get performance rating based on metrics
 */
export function getPerformanceRating(metrics: {
  averageInferenceTime: number;
  currentFps: number;
  memoryUsage: number;
  averageConfidence: number;
}): "excellent" | "good" | "fair" | "poor" {
  const { averageInferenceTime, currentFps, memoryUsage, averageConfidence } =
    metrics;
  const thresholds = PERFORMANCE_THRESHOLDS;

  // Calculate individual scores
  const inferenceScore =
    averageInferenceTime <= thresholds.inferenceTime.excellent
      ? 4
      : averageInferenceTime <= thresholds.inferenceTime.good
      ? 3
      : averageInferenceTime <= thresholds.inferenceTime.fair
      ? 2
      : 1;

  const fpsScore = currentFps >= thresholds.fps.excellent
    ? 4
    : currentFps >= thresholds.fps.good
    ? 3
    : currentFps >= thresholds.fps.fair
    ? 2
    : 1;

  const memoryScore = memoryUsage <= thresholds.memory.excellent
    ? 4
    : memoryUsage <= thresholds.memory.good
    ? 3
    : memoryUsage <= thresholds.memory.fair
    ? 2
    : 1;

  const confidenceScore = averageConfidence >= thresholds.confidence.excellent
    ? 4
    : averageConfidence >= thresholds.confidence.good
    ? 3
    : averageConfidence >= thresholds.confidence.fair
    ? 2
    : 1;

  // Calculate overall score
  const overallScore =
    (inferenceScore + fpsScore + memoryScore + confidenceScore) / 4;

  if (overallScore >= 3.5) {
    return "excellent";
  }
  if (overallScore >= 2.5) {
    return "good";
  }
  if (overallScore >= 1.5) {
    return "fair";
  }
  return "poor";
}
