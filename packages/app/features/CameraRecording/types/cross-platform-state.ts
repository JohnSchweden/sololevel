/**
 * Cross-Platform State Synchronization Types for Phase 2 Completion
 * Ensures state management parity between native and web platforms
 * Provides shared interfaces and validation for consistent behavior
 */

import { Platform } from "react-native";

/**
 * Platform-specific capabilities and limitations
 */
export interface PlatformCapabilities {
  platform: "native" | "web";

  // Camera capabilities
  supportsMultipleCameras: boolean;
  supportsCameraSwap: boolean;
  supportsZoom: boolean;
  supportsPinchZoom: boolean;
  supportsFlash: boolean;
  supportsHDR: boolean;

  // Performance monitoring
  supportsThermalMonitoring: boolean;
  supportsBatteryMonitoring: boolean;
  supportsMemoryMonitoring: boolean;
  supportsCPUMonitoring: boolean;
  supportsGPUMonitoring: boolean;

  // Recording capabilities
  supportsBackgroundRecording: boolean;
  supportsMultipleFormats: boolean;
  supportsQualityAdjustment: boolean;
  supportsFrameProcessing: boolean;

  // Storage and persistence
  supportsLocalStorage: boolean;
  supportsFileSystem: boolean;
  supportsSecureStorage: boolean;

  // UI capabilities
  supportsNativeAnimations: boolean;
  supportsBlurEffects: boolean;
  supportsHapticFeedback: boolean;
  supportsNotifications: boolean;
}

/**
 * Normalized state interface that works across platforms
 */
export interface CrossPlatformState {
  // Camera state
  camera: {
    type: "front" | "back";
    isInitialized: boolean;
    isAvailable: boolean;
    currentZoom: number;
    maxZoom: number;
    hasFlash: boolean;
    flashEnabled: boolean;
  };

  // Recording state
  recording: {
    state:
      | "idle"
      | "initializing"
      | "ready"
      | "recording"
      | "paused"
      | "stopped"
      | "error";
    duration: number;
    fileSize: number;
    quality: {
      resolution: string;
      frameRate: number;
      bitrate: number;
    };
    segments: number;
  };

  // Performance state
  performance: {
    fps: number;
    memoryUsage: number;
    cpuUsage: number;
    batteryLevel: number;
    thermalState: "normal" | "fair" | "serious" | "critical";
    isOptimal: boolean;
  };

  // UI state
  ui: {
    isSettingsOpen: boolean;
    isPerformanceMonitorOpen: boolean;
    showThermalWarning: boolean;
    activeControls: string[];
  };

  // Platform-specific extensions
  platformExtensions: Record<string, any>;
}

/**
 * State validation schema
 */
export interface StateValidationRule {
  field: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "object" | "array";
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  platformSpecific?: ("native" | "web")[];
}

/**
 * Cross-platform state validator
 */
export class CrossPlatformStateValidator {
  private rules: StateValidationRule[] = [
    // Camera validation rules
    {
      field: "camera.type",
      required: true,
      type: "string",
      enum: ["front", "back"],
    },
    { field: "camera.isInitialized", required: true, type: "boolean" },
    {
      field: "camera.currentZoom",
      required: true,
      type: "number",
      min: 1,
      max: 20,
    },

    // Recording validation rules
    {
      field: "recording.state",
      required: true,
      type: "string",
      enum: [
        "idle",
        "initializing",
        "ready",
        "recording",
        "paused",
        "stopped",
        "error",
      ],
    },
    { field: "recording.duration", required: true, type: "number", min: 0 },
    {
      field: "recording.quality.frameRate",
      required: true,
      type: "number",
      min: 1,
      max: 120,
    },

    // Performance validation rules
    {
      field: "performance.fps",
      required: true,
      type: "number",
      min: 0,
      max: 120,
    },
    {
      field: "performance.memoryUsage",
      required: true,
      type: "number",
      min: 0,
    },
    {
      field: "performance.batteryLevel",
      required: true,
      type: "number",
      min: 0,
      max: 100,
    },
    {
      field: "performance.thermalState",
      required: true,
      type: "string",
      enum: ["normal", "fair", "serious", "critical"],
    },

    // Platform-specific rules
    {
      field: "performance.thermalState",
      required: false,
      type: "string",
      platformSpecific: ["native"],
    },
  ];

  validate(state: Partial<CrossPlatformState>, platform: "native" | "web"): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.rules) {
      // Skip platform-specific rules if not applicable
      if (rule.platformSpecific && !rule.platformSpecific.includes(platform)) {
        continue;
      }

      const value = this.getNestedValue(state, rule.field);

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Required field '${rule.field}' is missing`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (!this.validateType(value, rule.type)) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        continue;
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(
          `Field '${rule.field}' must be one of: ${rule.enum.join(", ")}`,
        );
        continue;
      }

      // Range validation
      if (rule.type === "number") {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field '${rule.field}' must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field '${rule.field}' must be <= ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && rule.type === "string" && !rule.pattern.test(value)) {
        errors.push(`Field '${rule.field}' does not match required pattern`);
      }
    }

    // Platform-specific warnings
    if (platform === "web") {
      if (
        state.performance?.thermalState &&
        state.performance.thermalState !== "normal"
      ) {
        warnings.push("Thermal monitoring may not be accurate on web platform");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !Number.isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return typeof value === "object" && value !== null &&
          !Array.isArray(value);
      case "array":
        return Array.isArray(value);
      default:
        return false;
    }
  }
}

/**
 * Platform capability detector
 */
export class PlatformCapabilityDetector {
  static detect(): PlatformCapabilities {
    const isNative = Platform.OS !== "web";

    return {
      platform: isNative ? "native" : "web",

      // Camera capabilities
      supportsMultipleCameras: isNative,
      supportsCameraSwap: isNative,
      supportsZoom: true,
      supportsPinchZoom: isNative,
      supportsFlash: isNative,
      supportsHDR: isNative,

      // Performance monitoring
      supportsThermalMonitoring: isNative,
      supportsBatteryMonitoring: isNative ||
        PlatformCapabilityDetector.hasBatteryAPI(),
      supportsMemoryMonitoring: isNative ||
        PlatformCapabilityDetector.hasMemoryAPI(),
      supportsCPUMonitoring: isNative,
      supportsGPUMonitoring: isNative,

      // Recording capabilities
      supportsBackgroundRecording: isNative,
      supportsMultipleFormats: isNative,
      supportsQualityAdjustment: true,
      supportsFrameProcessing: isNative ||
        PlatformCapabilityDetector.hasWebWorkers(),

      // Storage and persistence
      supportsLocalStorage: true,
      supportsFileSystem: isNative,
      supportsSecureStorage: isNative,

      // UI capabilities
      supportsNativeAnimations: isNative,
      supportsBlurEffects: true,
      supportsHapticFeedback: isNative,
      supportsNotifications: isNative ||
        PlatformCapabilityDetector.hasNotificationAPI(),
    };
  }

  private static hasBatteryAPI(): boolean {
    return typeof navigator !== "undefined" && "getBattery" in navigator;
  }

  private static hasMemoryAPI(): boolean {
    return typeof performance !== "undefined" && "memory" in performance;
  }

  private static hasWebWorkers(): boolean {
    return typeof Worker !== "undefined";
  }

  private static hasNotificationAPI(): boolean {
    return typeof Notification !== "undefined";
  }
}

/**
 * State synchronization utilities
 */
export class CrossPlatformStateSynchronizer {
  private validator = new CrossPlatformStateValidator();
  private capabilities = PlatformCapabilityDetector.detect();

  /**
   * Normalize state for cross-platform consistency
   */
  normalizeState(rawState: any): CrossPlatformState {
    const normalized: CrossPlatformState = {
      camera: {
        type: rawState.camera?.type || "back",
        isInitialized: rawState.camera?.isInitialized || false,
        isAvailable: rawState.camera?.isAvailable || false,
        currentZoom: rawState.camera?.currentZoom || 1,
        maxZoom: rawState.camera?.maxZoom || 1,
        hasFlash: rawState.camera?.hasFlash || false,
        flashEnabled: rawState.camera?.flashEnabled || false,
      },
      recording: {
        state: rawState.recording?.state || "idle",
        duration: rawState.recording?.duration || 0,
        fileSize: rawState.recording?.fileSize || 0,
        quality: {
          resolution: rawState.recording?.quality?.resolution || "1080p",
          frameRate: rawState.recording?.quality?.frameRate || 30,
          bitrate: rawState.recording?.quality?.bitrate || 2500000,
        },
        segments: rawState.recording?.segments || 0,
      },
      performance: {
        fps: rawState.performance?.fps || 30,
        memoryUsage: rawState.performance?.memoryUsage || 0,
        cpuUsage: rawState.performance?.cpuUsage || 0,
        batteryLevel: rawState.performance?.batteryLevel || 100,
        thermalState: rawState.performance?.thermalState || "normal",
        isOptimal: rawState.performance?.isOptimal || true,
      },
      ui: {
        isSettingsOpen: rawState.ui?.isSettingsOpen || false,
        isPerformanceMonitorOpen: rawState.ui?.isPerformanceMonitorOpen ||
          false,
        showThermalWarning: rawState.ui?.showThermalWarning || false,
        activeControls: rawState.ui?.activeControls || [],
      },
      platformExtensions: rawState.platformExtensions || {},
    };

    // Apply platform-specific adjustments
    if (!this.capabilities.supportsThermalMonitoring) {
      normalized.performance.thermalState = "normal";
    }

    if (!this.capabilities.supportsBatteryMonitoring) {
      normalized.performance.batteryLevel = 100;
    }

    if (!this.capabilities.supportsMultipleCameras) {
      normalized.camera.type = "back";
    }

    return normalized;
  }

  /**
   * Validate state for current platform
   */
  validateState(state: CrossPlatformState): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.validator.validate(state, this.capabilities.platform);
  }

  /**
   * Get platform-specific state optimizations
   */
  getOptimizedState(state: CrossPlatformState): CrossPlatformState {
    const optimized = { ...state };

    // Web-specific optimizations
    if (this.capabilities.platform === "web") {
      // Disable features not supported on web
      if (!this.capabilities.supportsThermalMonitoring) {
        optimized.performance.thermalState = "normal";
      }

      if (!this.capabilities.supportsCameraSwap) {
        optimized.camera.type = "back";
      }
    }

    // Native-specific optimizations
    if (this.capabilities.platform === "native") {
      // Enable all native features
      // No specific optimizations needed as native supports all features
    }

    return optimized;
  }

  /**
   * Create state migration for platform compatibility
   */
  migrateState(
    oldState: any,
    targetPlatform: "native" | "web",
  ): CrossPlatformState {
    const normalized = this.normalizeState(oldState);

    // Apply platform-specific migrations
    if (targetPlatform === "web") {
      // Migrate native-specific features to web equivalents
      if (normalized.performance.thermalState !== "normal") {
        normalized.ui.showThermalWarning = true;
        normalized.performance.thermalState = "normal";
      }
    }

    return normalized;
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return this.capabilities;
  }
}

/**
 * Singleton instance for global use
 */
export const crossPlatformSync = new CrossPlatformStateSynchronizer();
