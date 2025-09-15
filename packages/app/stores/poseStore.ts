import React from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware/persist";
import type { PerformanceMetrics } from "../features/CameraRecording/types/performance";
import type {
  ModelLoadingState,
  PoseConnection,
  PoseData,
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseDetectionState,
  PoseKeypoint,
  PoseValidationResult,
  ProcessingQuality,
} from "../features/CameraRecording/types/pose";
import type { ThermalState } from "../features/CameraRecording/types/thermal";

// Enhanced pose detection state interface
interface EnhancedPoseState {
  // Core pose detection state
  isInitialized: boolean;
  isProcessing: boolean;
  isEnabled: boolean;
  currentPose: PoseData | null;
  poseHistory: PoseData[];

  // Model and configuration
  modelState: ModelLoadingState;
  config: PoseDetectionConfig;

  // Performance and quality
  metrics: PoseDetectionMetrics;
  processingQuality: ProcessingQuality;
  adaptiveQuality: boolean;

  // Validation and error handling
  lastValidation: PoseValidationResult | null;
  errors: string[];
  warnings: string[];

  // Integration with other systems
  performanceMetrics: PerformanceMetrics | null;
  thermalState: ThermalState | null;

  // Persistence and recovery
  sessionId: string;
  lastSaved: number;
  recoveryData: PoseData[] | null;
}

// Enhanced pose detection actions
interface EnhancedPoseActions {
  // Initialization and lifecycle
  initialize: (config?: Partial<PoseDetectionConfig>) => Promise<void>;
  shutdown: () => Promise<void>;
  reset: () => void;

  // Pose processing
  startProcessing: () => void;
  stopProcessing: () => void;
  processPose: (poseData: PoseData) => void;
  updatePose: (poseData: PoseData) => void;

  // Configuration management
  updateConfig: (config: Partial<PoseDetectionConfig>) => void;
  resetConfig: () => void;

  // Quality and performance management
  updateMetrics: (metrics: Partial<PoseDetectionMetrics>) => void;
  adjustQuality: (quality: ProcessingQuality) => void;
  enableAdaptiveQuality: (enabled: boolean) => void;

  // Validation and error handling
  validatePose: (poseData: PoseData) => PoseValidationResult;
  addError: (error: string) => void;
  addWarning: (warning: string) => void;
  clearErrors: () => void;
  clearWarnings: () => void;

  // Integration with other systems
  updatePerformanceMetrics: (metrics: PerformanceMetrics) => void;
  updateThermalState: (thermalState: ThermalState) => void;

  // Persistence and recovery
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createRecoveryPoint: () => void;
  recoverFromFailure: () => boolean;

  // Data management
  addPoseToHistory: (poseData: PoseData) => void;
  clearHistory: () => void;
  exportPoseData: (format: "json" | "csv" | "binary") => Promise<Blob>;
  importPoseData: (
    data: Blob,
    format: "json" | "csv" | "binary",
  ) => Promise<void>;
}

// Combined store interface
export interface PoseStore extends EnhancedPoseState, EnhancedPoseActions {}

// Default configuration
const defaultConfig: PoseDetectionConfig = {
  modelType: "movenet-lightning",
  confidenceThreshold: 0.3,
  maxPoses: 1,
  enableSmoothing: true,
  smoothingFactor: 0.8,
  enableValidation: true,
  processingQuality: "medium",
  frameSkipping: "adaptive",
  batchSize: 1,
  maxHistorySize: 100,
  enableMetrics: true,
  enableThermalThrottling: true,
  enableAdaptiveQuality: true,
};

// Default metrics
const defaultMetrics: PoseDetectionMetrics = {
  fps: 0,
  averageInferenceTime: 0,
  totalFramesProcessed: 0,
  droppedFrames: 0,
  accuracy: 0,
  confidence: 0,
  memoryUsage: 0,
  cpuUsage: 0,
  thermalState: "nominal",
  batteryImpact: "low",
  lastUpdated: Date.now(),
};

// Create the enhanced pose store
export const usePoseStore = create<PoseStore>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          // Initial state
          isInitialized: false,
          isProcessing: false,
          isEnabled: true,
          currentPose: null,
          poseHistory: [],

          modelState: {
            isLoading: false,
            isLoaded: false,
            loadingProgress: 0,
            error: null,
            modelSize: 0,
            loadTime: 0,
          },

          config: defaultConfig,
          metrics: defaultMetrics,
          processingQuality: "medium",
          adaptiveQuality: true,

          lastValidation: null,
          errors: [],
          warnings: [],

          performanceMetrics: null,
          thermalState: null,

          sessionId: `pose-session-${Date.now()}`,
          lastSaved: Date.now(),
          recoveryData: null,

          // Actions
          initialize: async (config) => {
            set((draft) => {
              draft.modelState.isLoading = true;
              draft.modelState.error = null;
              if (config) {
                Object.assign(draft.config, config);
              }
            });

            try {
              // Simulate model loading (actual implementation would load TensorFlow models)
              await new Promise((resolve) => setTimeout(resolve, 1000));

              set((draft) => {
                draft.isInitialized = true;
                draft.modelState.isLoading = false;
                draft.modelState.isLoaded = true;
                draft.modelState.loadingProgress = 100;
                draft.sessionId = `pose-session-${Date.now()}`;
              });
            } catch (error) {
              set((draft) => {
                draft.modelState.isLoading = false;
                draft.modelState.error = error instanceof Error
                  ? error.message
                  : "Failed to initialize pose detection";
                draft.errors.push(
                  `Initialization failed: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                );
              });
              throw error;
            }
          },

          shutdown: async () => {
            const state = get();
            if (state.isProcessing) {
              state.stopProcessing();
            }

            // Save session before shutdown
            await state.saveSession();

            set((draft) => {
              draft.isInitialized = false;
              draft.isProcessing = false;
              draft.modelState.isLoaded = false;
              draft.currentPose = null;
            });
          },

          reset: () => {
            set((draft) => {
              draft.isInitialized = false;
              draft.isProcessing = false;
              draft.isEnabled = true;
              draft.currentPose = null;
              draft.poseHistory = [];
              draft.config = { ...defaultConfig };
              draft.metrics = { ...defaultMetrics };
              draft.processingQuality = "medium";
              draft.adaptiveQuality = true;
              draft.lastValidation = null;
              draft.errors = [];
              draft.warnings = [];
              draft.sessionId = `pose-session-${Date.now()}`;
              draft.lastSaved = Date.now();
              draft.recoveryData = null;
            });
          },

          startProcessing: () => {
            set((draft) => {
              if (draft.isInitialized && !draft.isProcessing) {
                draft.isProcessing = true;
                draft.metrics.lastUpdated = Date.now();
              }
            });
          },

          stopProcessing: () => {
            set((draft) => {
              draft.isProcessing = false;
            });
          },

          processPose: (poseData) => {
            const state = get();
            if (!state.isProcessing || !state.isEnabled) return;

            // Validate pose data if enabled
            let validationResult: PoseValidationResult | null = null;
            if (state.config.enableValidation) {
              validationResult = state.validatePose(poseData);
              if (!validationResult.isValid) {
                state.addWarning(
                  `Pose validation failed: ${
                    validationResult.errors.join(", ")
                  }`,
                );
                return;
              }
            }

            set((draft) => {
              draft.currentPose = poseData;
              draft.lastValidation = validationResult;

              // Update metrics
              draft.metrics.totalFramesProcessed += 1;
              draft.metrics.lastUpdated = Date.now();

              // Add to history if enabled
              if (draft.config.maxHistorySize > 0) {
                draft.poseHistory.push(poseData);
                if (draft.poseHistory.length > draft.config.maxHistorySize) {
                  draft.poseHistory.shift();
                }
              }
            });
          },

          updatePose: (poseData) => {
            set((draft) => {
              draft.currentPose = poseData;
            });
          },

          updateConfig: (config) => {
            set((draft) => {
              Object.assign(draft.config, config);
            });
          },

          resetConfig: () => {
            set((draft) => {
              draft.config = { ...defaultConfig };
            });
          },

          updateMetrics: (metrics) => {
            set((draft) => {
              Object.assign(draft.metrics, metrics);
              draft.metrics.lastUpdated = Date.now();
            });
          },

          adjustQuality: (quality) => {
            set((draft) => {
              draft.processingQuality = quality;
              draft.config.processingQuality = quality;
            });
          },

          enableAdaptiveQuality: (enabled) => {
            set((draft) => {
              draft.adaptiveQuality = enabled;
              draft.config.enableAdaptiveQuality = enabled;
            });
          },

          validatePose: (poseData) => {
            const result: PoseValidationResult = {
              isValid: true,
              errors: [],
              warnings: [],
              confidence: 0,
              qualityScore: 0,
            };

            // Basic validation
            if (!poseData.keypoints || poseData.keypoints.length === 0) {
              result.isValid = false;
              result.errors.push("No keypoints detected");
              return result;
            }

            // Calculate average confidence
            const totalConfidence = poseData.keypoints.reduce(
              (sum, kp) => sum + kp.confidence,
              0,
            );
            result.confidence = totalConfidence / poseData.keypoints.length;

            // Check confidence threshold
            const state = get();
            if (result.confidence < state.config.confidenceThreshold) {
              result.isValid = false;
              result.errors.push(
                `Confidence ${
                  result.confidence.toFixed(2)
                } below threshold ${state.config.confidenceThreshold}`,
              );
            }

            // Calculate quality score (simplified)
            result.qualityScore = Math.min(result.confidence * 100, 100);

            return result;
          },

          addError: (error) => {
            set((draft) => {
              draft.errors.push(error);
              // Keep only last 10 errors
              if (draft.errors.length > 10) {
                draft.errors.shift();
              }
            });
          },

          addWarning: (warning) => {
            set((draft) => {
              draft.warnings.push(warning);
              // Keep only last 10 warnings
              if (draft.warnings.length > 10) {
                draft.warnings.shift();
              }
            });
          },

          clearErrors: () => {
            set((draft) => {
              draft.errors = [];
            });
          },

          clearWarnings: () => {
            set((draft) => {
              draft.warnings = [];
            });
          },

          updatePerformanceMetrics: (metrics) => {
            set((draft) => {
              draft.performanceMetrics = metrics;

              // Update pose metrics based on performance
              if (metrics.cpu && metrics.cpu.usage) {
                draft.metrics.cpuUsage = metrics.cpu.usage;
              }
              if (metrics.memory && metrics.memory.used) {
                draft.metrics.memoryUsage = metrics.memory.used;
              }
            });
          },

          updateThermalState: (thermalState) => {
            set((draft) => {
              draft.thermalState = thermalState;
              draft.metrics.thermalState = thermalState.state;

              // Adjust quality based on thermal state
              if (
                draft.adaptiveQuality && draft.config.enableThermalThrottling
              ) {
                if (
                  thermalState.state === "critical" ||
                  thermalState.state === "serious"
                ) {
                  draft.processingQuality = "low";
                } else if (thermalState.state === "fair") {
                  draft.processingQuality = "medium";
                } else {
                  draft.processingQuality = "high";
                }
              }
            });
          },

          saveSession: async () => {
            const state = get();
            try {
              // In a real implementation, this would save to persistent storage
              const sessionData = {
                sessionId: state.sessionId,
                config: state.config,
                metrics: state.metrics,
                poseHistory: state.poseHistory.slice(-50), // Save last 50 poses
                timestamp: Date.now(),
              };

              // Simulate async save
              await new Promise((resolve) => setTimeout(resolve, 100));

              set((draft) => {
                draft.lastSaved = Date.now();
              });
            } catch (error) {
              get().addError(
                `Failed to save session: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              );
            }
          },

          loadSession: async (sessionId) => {
            try {
              // In a real implementation, this would load from persistent storage
              await new Promise((resolve) => setTimeout(resolve, 100));

              set((draft) => {
                draft.sessionId = sessionId;
                // Load session data...
              });
            } catch (error) {
              get().addError(
                `Failed to load session: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              );
            }
          },

          createRecoveryPoint: () => {
            const state = get();
            set((draft) => {
              draft.recoveryData = [...state.poseHistory];
            });
          },

          recoverFromFailure: () => {
            const state = get();
            if (!state.recoveryData) return false;

            set((draft) => {
              draft.poseHistory = [...state.recoveryData!];
              draft.errors = [];
              draft.warnings = [];
              draft.isProcessing = false;
            });

            return true;
          },

          addPoseToHistory: (poseData) => {
            set((draft) => {
              draft.poseHistory.push(poseData);
              if (draft.poseHistory.length > draft.config.maxHistorySize) {
                draft.poseHistory.shift();
              }
            });
          },

          clearHistory: () => {
            set((draft) => {
              draft.poseHistory = [];
            });
          },

          exportPoseData: async (format) => {
            const state = get();
            const data = {
              sessionId: state.sessionId,
              config: state.config,
              metrics: state.metrics,
              poses: state.poseHistory,
              timestamp: Date.now(),
            };

            let content: string;
            let mimeType: string;

            switch (format) {
              case "json": {
                content = JSON.stringify(data, null, 2);
                mimeType = "application/json";
                break;
              }
              case "csv": {
                // Simplified CSV export
                const headers = ["timestamp", "confidence", "keypoints_count"];
                const rows = state.poseHistory.map((pose) => [
                  pose.timestamp,
                  pose.confidence,
                  pose.keypoints.length,
                ]);
                content = [
                  headers.join(","),
                  ...rows.map((row) => row.join(",")),
                ].join("\n");
                mimeType = "text/csv";
                break;
              }
              case "binary": {
                // Simplified binary format (would use actual binary encoding in real implementation)
                content = JSON.stringify(data);
                mimeType = "application/octet-stream";
                break;
              }
              default:
                throw new Error(`Unsupported export format: ${format}`);
            }

            return new Blob([content], { type: mimeType });
          },

          importPoseData: async (data, format) => {
            try {
              const text = await data.text();
              let parsedData: any;

              switch (format) {
                case "json":
                case "binary": {
                  parsedData = JSON.parse(text);
                  break;
                }
                case "csv": {
                  // Simplified CSV parsing
                  const lines = text.split("\n");
                  const headers = lines[0].split(",");
                  parsedData = { poses: [] };
                  break;
                }
                default:
                  throw new Error(`Unsupported import format: ${format}`);
              }

              set((draft) => {
                if (parsedData.poses) {
                  draft.poseHistory = parsedData.poses;
                }
                if (parsedData.config) {
                  Object.assign(draft.config, parsedData.config);
                }
              });
            } catch (error) {
              get().addError(
                `Failed to import pose data: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              );
              throw error;
            }
          },
        }),
        {
          name: "pose-store",
          partialize: (state) => ({
            config: state.config,
            sessionId: state.sessionId,
            lastSaved: state.lastSaved,
          }),
        },
      ),
    ),
  ),
);// Selector hooks for optimized subscriptions
export const usePoseDetectionState = () =>
  usePoseStore((state) => ({
    isInitialized: state.isInitialized,
    isProcessing: state.isProcessing,
    isEnabled: state.isEnabled,
    currentPose: state.currentPose,
  }));

export const usePoseMetrics = () => usePoseStore((state) => state.metrics);

export const usePoseConfig = () => usePoseStore((state) => state.config);

export const usePoseErrors = () =>
  usePoseStore((state) => ({
    errors: state.errors,
    warnings: state.warnings,
  }));

export const usePoseHistory = () => usePoseStore((state) => state.poseHistory);

// Performance-optimized selectors
export const usePoseQuality = () =>
  usePoseStore((state) => ({
    processingQuality: state.processingQuality,
    adaptiveQuality: state.adaptiveQuality,
    lastValidation: state.lastValidation,
  }));

export const usePoseIntegration = () =>
  usePoseStore((state) => ({
    performanceMetrics: state.performanceMetrics,
    thermalState: state.thermalState,
  }));


