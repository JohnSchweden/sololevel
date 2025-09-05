/**
 * Store Migration Utilities for Phase 2 Completion
 * Migrates existing cameraRecording store to new enhanced architecture
 * Provides backward compatibility and data preservation
 */

import { crossPlatformSync } from "../types/cross-platform-state";

/**
 * Legacy store state interface (old cameraRecording store)
 */
export interface LegacyCameraRecordingState {
  // Basic recording state
  isRecording: boolean;
  isPaused: boolean;
  duration: number;

  // Basic camera settings
  cameraType: "front" | "back";
  zoomLevel: number;
  flashEnabled: boolean;

  // Basic performance metrics (if any)
  performance?: {
    fps?: number;
    processingTime?: number;
    averageProcessingTime?: number;
    droppedFrames?: number;
    memoryUsage?: number;
    batteryLevel?: number;
    thermalState?: string;
    frameWidth?: number;
    frameHeight?: number;
    timestamp?: number;
  };

  // Basic settings
  settings?: {
    quality?: string;
    enableAudio?: boolean;
    maxDuration?: number;
  };

  // Any other legacy fields
  [key: string]: any;
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  migratedData: {
    enhancedCameraStore: any;
    performanceStore: any;
    poseStore: any;
  };
  warnings: string[];
  errors: string[];
  backupData: LegacyCameraRecordingState;
}

/**
 * Store migration class
 */
export class StoreMigration {
  private version = "2.0.0";

  /**
   * Migrate legacy store to enhanced architecture
   */
  async migrateLegacyStore(
    legacyState: LegacyCameraRecordingState,
  ): Promise<MigrationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Create backup of original data
      const backupData = JSON.parse(JSON.stringify(legacyState));

      // Migrate to enhanced camera store
      const enhancedCameraStore = this.migrateToEnhancedCameraStore(
        legacyState,
        warnings,
      );

      // Migrate to performance store
      const performanceStore = this.migrateToPerformanceStore(
        legacyState,
        warnings,
      );

      // Initialize pose store (new functionality)
      const poseStore = this.initializePoseStore(warnings);

      // Validate migrated data
      const validation = crossPlatformSync.validateState(
        crossPlatformSync.normalizeState({
          camera: enhancedCameraStore.settings,
          recording: enhancedCameraStore.state,
          performance: performanceStore.system,
          ui: enhancedCameraStore.ui,
        }),
      );

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);

      return {
        success: errors.length === 0,
        migratedData: {
          enhancedCameraStore,
          performanceStore,
          poseStore,
        },
        warnings,
        errors,
        backupData,
      };
    } catch (error) {
      errors.push(
        `Migration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );

      return {
        success: false,
        migratedData: {
          enhancedCameraStore: {},
          performanceStore: {},
          poseStore: {},
        },
        warnings,
        errors,
        backupData: legacyState,
      };
    }
  }

  /**
   * Migrate to enhanced camera store structure
   */
  private migrateToEnhancedCameraStore(
    legacy: LegacyCameraRecordingState,
    warnings: string[],
  ): any {
    // Map legacy recording state to new state machine
    let recordingState = "idle";
    if (legacy.isRecording) {
      recordingState = "recording";
    } else if (legacy.isPaused) {
      recordingState = "paused";
    } else if (legacy.duration > 0) {
      recordingState = "stopped";
    }

    // Map legacy settings to new structure
    const adaptiveQuality = {
      enabled: true,
      thermalManagement: true,
      batteryOptimization: true,
      performanceMode: "balanced" as const,
      currentResolution: this.mapLegacyQuality(legacy.settings?.quality) ||
        "1080p",
      currentFrameRate: 30,
      currentBitrate: 2500000,
      thermalThresholds: {
        fair: 40,
        serious: 60,
        critical: 80,
      },
    };

    // Create enhanced camera store structure
    return {
      state: {
        isInitialized: true,
        isInitializing: false,
        currentCamera: legacy.cameraType || "back",
        recordingState,
        currentSession: legacy.duration > 0
          ? {
            id: `migrated-${Date.now()}`,
            startTime: Date.now() - (legacy.duration * 1000),
            duration: legacy.duration,
            state: recordingState,
          }
          : null,
        error: null,
        lastError: null,
      },

      settings: {
        cameraType: legacy.cameraType || "back",
        zoomLevel: legacy.zoomLevel || 1,
        flashEnabled: legacy.flashEnabled || false,
        gridEnabled: false,
        stabilizationEnabled: true,
        hdrEnabled: false,
        nightModeEnabled: false,
        adaptiveQuality,
        manualFocus: false,
        exposureCompensation: 0,
      },

      permissions: {
        camera: "granted" as const,
        microphone: legacy.settings?.enableAudio !== false
          ? "granted" as const
          : "denied" as const,
        storage: "granted" as const,
      },

      capabilities: {
        availableCameras: [
          {
            id: "back-camera",
            type: "back" as const,
            name: "Back Camera",
            minZoom: 1,
            maxZoom: 10,
            supportedResolutions: ["480p", "720p", "1080p", "4k"],
            supportedFrameRates: [15, 24, 30, 60],
          },
          {
            id: "front-camera",
            type: "front" as const,
            name: "Front Camera",
            minZoom: 1,
            maxZoom: 3,
            supportedResolutions: ["480p", "720p", "1080p"],
            supportedFrameRates: [15, 24, 30],
          },
        ],
        supportsFlash: true,
        supportsHDR: true,
        supportsStabilization: true,
        supportsManualFocus: true,
        supportsNightMode: true,
        maxResolution: "4k",
        maxFrameRate: 60,
        maxZoom: 10,
      },

      metrics: {
        startTime: legacy.duration > 0
          ? Date.now() - (legacy.duration * 1000)
          : 0,
        duration: legacy.duration || 0,
        fileSize: 0,
        resolution: { width: 1920, height: 1080 },
        actualBitrate: 2500000,
        frameCount: Math.floor((legacy.duration || 0) * 30),
        qualityScore: 85,
      },

      ui: {
        isSettingsModalOpen: false,
        showPermissionModal: false,
        showPerformanceMonitor: false,
      },
    };
  }

  /**
   * Migrate to performance store structure
   */
  private migrateToPerformanceStore(
    legacy: LegacyCameraRecordingState,
    warnings: string[],
  ): any {
    const legacyPerf = legacy.performance || {};

    // Map legacy performance data
    const system = {
      fps: legacyPerf.fps || 30,
      targetFps: 30,
      memoryUsage: legacyPerf.memoryUsage || 50,
      cpuUsage: 0, // Not available in legacy
      batteryLevel: legacyPerf.batteryLevel || 100,
      thermalState: this.mapLegacyThermalState(legacyPerf.thermalState) ||
        "normal",
      thermalThrottling: false,
      batteryOptimizationEnabled: false,
      chargingState: "unknown" as const,
      droppedFrames: legacyPerf.droppedFrames || 0,
      averageFps: legacyPerf.fps || 30,
      peakMemoryUsage: legacyPerf.memoryUsage || 50,
      peakCpuUsage: 0,
      averageCpuUsage: 0,
      thermalHistory: [],
    };

    const processing = {
      poseDetectionTime: legacyPerf.processingTime || 0,
      averagePoseDetectionTime: legacyPerf.averageProcessingTime || 0,
      peakPoseDetectionTime: legacyPerf.processingTime || 0,
      frameProcessingRate: 30,
      networkLatency: 0,
      networkQuality: "good" as const,
      compressionRatio: 0.8,
      dataTransferRate: 0,
    };

    const adaptiveQuality = {
      enabled: true,
      currentPreset: "balanced" as const,
      thermalManagement: true,
      batteryOptimization: true,
      performanceMode: "balanced" as const,
      currentResolution: "1080p",
      currentFrameRate: 30,
      currentBitrate: 2500000,
      thermalThresholds: {
        fair: 40,
        serious: 60,
        critical: 80,
      },
    };

    if (!legacyPerf.fps) {
      warnings.push("Legacy FPS data not available, using default value");
    }
    if (!legacyPerf.thermalState) {
      warnings.push("Legacy thermal state not available, using normal state");
    }

    return {
      system,
      processing,
      adaptiveQuality,
      settings: {
        lowFpsThreshold: 20,
        highMemoryThreshold: 150,
        lowBatteryThreshold: 20,
        highCpuThreshold: 80,
        thermalThreshold: 60,
        batteryOptimizationEnabled: true,
        metricsRetentionTime: 300000, // 5 minutes
      },
      alerts: {
        lowFps: false,
        highMemoryUsage: false,
        thermalThrottling: false,
        lowBattery: false,
        highCpuUsage: false,
        networkIssues: false,
      },
      history: {
        fps: [],
        memory: [],
        cpu: [],
        maxHistorySize: 100,
      },
      isMonitoring: false,
      monitoringStartTime: 0,
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * Initialize pose store (new functionality)
   */
  private initializePoseStore(warnings: string[]): any {
    warnings.push(
      "Pose detection is new functionality - no legacy data to migrate",
    );

    return {
      currentPose: null,
      currentPoseSession: null,
      poseSessions: [],
      realtimeData: {
        poses: new Map(),
        confidence: 0,
        isDetecting: false,
        lastDetectionTime: 0,
        detectionRate: 0,
        bufferSize: 0,
        maxBufferSize: 1000,
      },
      recordingData: {
        isRecording: false,
        poses: new Map(),
        startTime: 0,
        endTime: 0,
        metadata: {
          totalFrames: 0,
          avgConfidence: 0,
          duration: 0,
          frameRate: 0,
        },
        bufferSize: 0,
        maxBufferSize: 10000,
      },
      processingSettings: {
        enabled: true,
        confidenceThreshold: 0.5,
        maxDetectionRate: 30,
        enableSmoothing: true,
        smoothingFactor: 0.8,
        enableFiltering: true,
        compressionLevel: "medium" as const,
      },
      performance: {
        averageDetectionTime: 0,
        peakDetectionTime: 0,
        totalDetections: 0,
        failedDetections: 0,
        accuracyScore: 0,
      },
    };
  }

  /**
   * Map legacy quality setting to new resolution
   */
  private mapLegacyQuality(quality?: string): string {
    switch (quality?.toLowerCase()) {
      case "low":
      case "480p":
        return "480p";
      case "medium":
      case "720p":
        return "720p";
      case "high":
      case "1080p":
        return "1080p";
      case "ultra":
      case "4k":
        return "4k";
      default:
        return "1080p";
    }
  }

  /**
   * Map legacy thermal state to new enum
   */
  private mapLegacyThermalState(
    thermalState?: string,
  ): "normal" | "fair" | "serious" | "critical" {
    switch (thermalState?.toLowerCase()) {
      case "normal":
      case "nominal":
        return "normal";
      case "fair":
      case "light":
        return "fair";
      case "serious":
      case "moderate":
        return "serious";
      case "critical":
      case "severe":
        return "critical";
      default:
        return "normal";
    }
  }

  /**
   * Create migration report
   */
  createMigrationReport(result: MigrationResult): string {
    const report = [
      `=== Store Migration Report ===`,
      `Version: ${this.version}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Success: ${result.success}`,
      ``,
      `Warnings (${result.warnings.length}):`,
      ...result.warnings.map((w) => `  - ${w}`),
      ``,
      `Errors (${result.errors.length}):`,
      ...result.errors.map((e) => `  - ${e}`),
      ``,
      `Migrated Stores:`,
      `  - Enhanced Camera Store: ${
        Object.keys(result.migratedData.enhancedCameraStore).length
      } properties`,
      `  - Performance Store: ${
        Object.keys(result.migratedData.performanceStore).length
      } properties`,
      `  - Pose Store: ${
        Object.keys(result.migratedData.poseStore).length
      } properties`,
      ``,
      `Backup Data Size: ${JSON.stringify(result.backupData).length} bytes`,
      ``,
      `=== End Report ===`,
    ];

    return report.join("\n");
  }

  /**
   * Validate migration result
   */
  validateMigration(result: MigrationResult): boolean {
    if (!result.success) {
      return false;
    }

    // Check required properties exist
    const required = [
      "migratedData.enhancedCameraStore.state",
      "migratedData.enhancedCameraStore.settings",
      "migratedData.performanceStore.system",
      "migratedData.poseStore.currentPose",
    ];

    for (const path of required) {
      if (!this.hasNestedProperty(result, path)) {
        return false;
      }
    }

    return true;
  }

  private hasNestedProperty(obj: any, path: string): boolean {
    return path.split(".").reduce((current, key) => current?.[key], obj) !==
      undefined;
  }
}

/**
 * Migration utilities
 */
export const storeMigration = new StoreMigration();

/**
 * Quick migration function for common use cases
 */
export async function migrateLegacyCameraStore(
  legacyState: LegacyCameraRecordingState,
): Promise<MigrationResult> {
  return storeMigration.migrateLegacyStore(legacyState);
}

/**
 * Check if migration is needed
 */
export function needsMigration(state: any): boolean {
  // Check for legacy store structure
  return (
    state &&
    typeof state.isRecording === "boolean" &&
    !state.state?.recordingState && // New structure has nested state
    !state.system?.fps // New structure has performance system
  );
}
