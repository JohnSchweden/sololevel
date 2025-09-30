/**
 * Enhanced Camera Recording Store - Phase 2 Migration
 * Migrated version of the legacy cameraRecording store with enhanced architecture
 * Integrates with performance monitoring, thermal management, and pose detection
 */

import type {
  CameraCapabilitiesResult,
  CameraType,
  EnhancedCameraPermissions,
  EnhancedCameraSettings,
  EnhancedCameraState,
  EnhancedCameraStore,
  EnhancedRecordingMetrics,
  EnhancedRecordingSession,
} from "@app/features/CameraRecording/types/enhanced-state";
import React from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// React Native compatible UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for React Native environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
import { useEnhancedCameraStore as useThermalStore } from "./enhancedCameraStore";
import { usePerformanceStore } from "./performanceStore";

/**
 * Initial enhanced camera state
 */
const initialState: EnhancedCameraState = {
  isInitialized: false,
  isInitializing: false,
  currentCamera: "back",
  recordingState: "idle",
  currentSession: null,
  error: null,
  lastError: null,
  errorRecoveryAttempts: 0,
};

/**
 * Initial enhanced camera settings
 */
const initialSettings: EnhancedCameraSettings = {
  cameraType: "back",
  zoomLevel: 1,
  flashEnabled: false,
  gridEnabled: false,
  stabilizationEnabled: true,
  hdrEnabled: false,
  nightModeEnabled: false,
  manualFocus: false,
  exposureCompensation: 0,
  adaptiveQuality: {
    enabled: true,
    thermalManagement: true,
    batteryOptimization: true,
    performanceMode: "balanced",
    currentResolution: "1080p",
    currentFrameRate: 30,
    currentBitrate: 2500000,
    thermalThresholds: {
      fair: 40,
      serious: 60,
      critical: 80,
    },
    batteryThresholds: {
      low: 20,
      critical: 10,
    },
    performanceThresholds: {
      minFps: 20,
      maxMemoryUsage: 150,
      maxCpuUsage: 80,
    },
  },
};

/**
 * Initial enhanced permissions
 */
const initialPermissions: EnhancedCameraPermissions = {
  camera: "undetermined",
  microphone: "undetermined",
  storage: "undetermined",
  location: "undetermined",
};

/**
 * Initial camera capabilities
 */
const initialCapabilities: CameraCapabilitiesResult = {
  availableCameras: [],
  defaultCamera: "back",
  supportsMultipleCameras: false,
  supportsFlash: false,
  supportsHDR: false,
  supportsStabilization: false,
  supportsManualFocus: false,
  supportsNightMode: false,
  maxResolution: "1080p",
  maxFrameRate: 30,
  maxZoom: 1,
  platformLimitations: [],
};

/**
 * Initial recording metrics
 */
const initialMetrics: EnhancedRecordingMetrics = {
  startTime: 0,
  duration: 0,
  fileSize: 0,
  estimatedFinalSize: 0,
  resolution: { width: 1920, height: 1080 },
  actualFrameRate: 30,
  actualBitrate: 2500000,
  frameCount: 0,
  qualityScore: 85,
  averageFps: 30,
  droppedFrames: 0,
  processingLatency: 0,
  qualityAdjustments: [],
};

/**
 * Enhanced Camera Recording Store Implementation
 */
export const useEnhancedCameraRecordingStore = create<EnhancedCameraStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      state: initialState,
      settings: initialSettings,
      permissions: initialPermissions,
      capabilities: initialCapabilities,
      metrics: initialMetrics,
      ui: {
        isSettingsModalOpen: false,
        showPermissionModal: false,
        showPerformanceMonitor: false,
      },

      // State Management Actions
      initializeCamera: async () => {
        set((draft) => {
          draft.state.isInitializing = true;
          draft.state.error = null;
        });

        try {
          // Detect capabilities
          await get().detectCapabilities();

          // Request permissions if needed
          const hasPermissions = await get().requestPermissions();

          if (!hasPermissions) {
            throw new Error("Camera permissions not granted");
          }

          set((draft) => {
            draft.state.isInitialized = true;
            draft.state.isInitializing = false;
            draft.state.recordingState = "ready";
          });
        } catch (error) {
          set((draft) => {
            draft.state.isInitializing = false;
            draft.state.error = error instanceof Error
              ? error.message
              : "Initialization failed";
            draft.state.errorRecoveryAttempts += 1;
          });
          throw error;
        }
      },

      switchCamera: async (type: CameraType) => {
        const currentState = get().state;

        // Validate camera switch is allowed
        if (currentState.recordingState === "recording") {
          throw new Error("Cannot switch camera while recording");
        }

        // Check thermal state
        const thermalStore = useThermalStore.getState();
        if (thermalStore.settings?.adaptiveQuality?.thermalThresholds) {
          // Thermal check would be implemented here
          // For now, just a placeholder
        }

        try {
          set((draft) => {
            draft.state.currentCamera = type;
            draft.settings.cameraType = type;
            // Reset zoom when switching cameras
            draft.settings.zoomLevel = 1;
          });

          // Update current session if active
          const session = get().state.currentSession;
          if (session) {
            get().updateSession({ cameraType: type });
          }
        } catch (error) {
          set((draft) => {
            draft.state.error = error instanceof Error
              ? error.message
              : "Camera switch failed";
          });
          throw error;
        }
      },

      // Recording Control Actions
      startRecording: async () => {
        const currentState = get().state;

        if (currentState.recordingState === "recording") {
          return; // Already recording
        }

        // Validate permissions
        const permissions = get().permissions;
        if (
          permissions.camera !== "granted" ||
          permissions.microphone !== "granted"
        ) {
          throw new Error("Missing required permissions");
        }

        // Check thermal state
        const thermalStore = useThermalStore.getState();
        if (thermalStore.settings?.adaptiveQuality?.thermalThresholds) {
          // Thermal check would be implemented here
          // For now, just a placeholder
        }

        try {
          const now = Date.now();

          // Create new session if none exists
          if (!currentState.currentSession) {
            get().createSession();
          }

          set((draft) => {
            draft.state.recordingState = "recording";
            draft.metrics.startTime = now;
            draft.metrics.duration = 0;
            draft.state.error = null;

            if (draft.state.currentSession) {
              draft.state.currentSession.state = "recording";
              draft.state.currentSession.startTime = now;
            }
          });

          // Start performance monitoring
          const performanceStore = usePerformanceStore.getState();
          performanceStore.startMonitoring();
        } catch (error) {
          set((draft) => {
            draft.state.error = error instanceof Error
              ? error.message
              : "Failed to start recording";
          });
          throw error;
        }
      },

      pauseRecording: () => {
        set((draft) => {
          if (draft.state.recordingState === "recording") {
            draft.state.recordingState = "paused";

            if (draft.state.currentSession) {
              draft.state.currentSession.state = "paused";
            }
          }
        });
      },

      resumeRecording: () => {
        set((draft) => {
          if (draft.state.recordingState === "paused") {
            draft.state.recordingState = "recording";

            if (draft.state.currentSession) {
              draft.state.currentSession.state = "recording";
            }
          }
        });
      },

      stopRecording: async () => {
        try {
          set((draft) => {
            draft.state.recordingState = "stopping";
          });

          // Simulate stop processing time
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((draft) => {
            draft.state.recordingState = "stopped";

            if (draft.state.currentSession) {
              draft.state.currentSession.state = "stopped";
              draft.state.currentSession.endTime = Date.now();
              draft.state.currentSession.duration = draft.metrics.duration;
            }
          });

          // Stop performance monitoring
          const performanceStore = usePerformanceStore.getState();
          performanceStore.stopMonitoring();
        } catch (error) {
          set((draft) => {
            draft.state.error = error instanceof Error
              ? error.message
              : "Failed to stop recording";
            draft.state.recordingState = "error";
          });
          throw error;
        }
      },

      // Settings Actions
      updateSettings: (settings) => {
        set((draft) => {
          Object.assign(draft.settings, settings);
        });
      },

      setZoomLevel: (level) => {
        const maxZoom = get().capabilities.maxZoom;
        const clampedLevel = Math.max(1, Math.min(level, maxZoom));

        set((draft) => {
          draft.settings.zoomLevel = clampedLevel;
        });
      },

      toggleFlash: () => {
        set((draft) => {
          draft.settings.flashEnabled = !draft.settings.flashEnabled;
        });
      },

      toggleGrid: () => {
        set((draft) => {
          draft.settings.gridEnabled = !draft.settings.gridEnabled;
        });
      },

      // Permission Actions
      requestPermissions: async () => {
        try {
          set((draft) => {
            draft.state.isInitializing = true;
          });

          // Mock permission request - replace with actual implementation
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set((draft) => {
            draft.permissions.camera = "granted";
            draft.permissions.microphone = "granted";
            draft.permissions.storage = "granted";
            draft.state.isInitializing = false;
            draft.ui.showPermissionModal = false;
          });

          return true;
        } catch (error) {
          set((draft) => {
            draft.permissions.camera = "denied";
            draft.permissions.microphone = "denied";
            draft.state.isInitializing = false;
            draft.state.error = "Permission request failed";
          });

          return false;
        }
      },

      updatePermissions: (permissions) => {
        set((draft) => {
          Object.assign(draft.permissions, permissions);
        });
      },

      // Capability Detection
      detectCapabilities: async () => {
        try {
          // Mock capability detection - replace with actual VisionCamera API calls
          const mockCapabilities: CameraCapabilitiesResult = {
            availableCameras: [
              {
                id: "back-camera",
                type: "back",
                name: "Back Camera",
                isAvailable: true,
                minZoom: 1,
                maxZoom: 10,
                hasOpticalZoom: true,
                supportedResolutions: ["480p", "720p", "1080p", "4k"],
                maxResolution: "4k",
                supportedFrameRates: [15, 24, 30, 60],
                maxFrameRate: 60,
                hasFlash: true,
                hasHDR: true,
                hasStabilization: true,
                hasManualFocus: true,
                hasNightMode: true,
              },
              {
                id: "front-camera",
                type: "front",
                name: "Front Camera",
                isAvailable: true,
                minZoom: 1,
                maxZoom: 3,
                hasOpticalZoom: false,
                supportedResolutions: ["480p", "720p", "1080p"],
                maxResolution: "1080p",
                supportedFrameRates: [15, 24, 30],
                maxFrameRate: 30,
                hasFlash: false,
                hasHDR: true,
                hasStabilization: false,
                hasManualFocus: false,
                hasNightMode: false,
              },
            ],
            defaultCamera: "back",
            supportsMultipleCameras: true,
            supportsFlash: true,
            supportsHDR: true,
            supportsStabilization: true,
            supportsManualFocus: true,
            supportsNightMode: true,
            maxResolution: "4k",
            maxFrameRate: 60,
            maxZoom: 10,
            platformLimitations: [],
          };

          await new Promise((resolve) => setTimeout(resolve, 100));

          set((draft) => {
            draft.capabilities = mockCapabilities;
          });
        } catch (error) {
          set((draft) => {
            draft.state.error = "Failed to detect camera capabilities";
          });
          throw error;
        }
      },

      // Adaptive Quality Actions
      updateAdaptiveQuality: (settings) => {
        set((draft) => {
          Object.assign(draft.settings.adaptiveQuality, settings);
        });
      },

      triggerQualityAdjustment: (reason) => {
        const currentSettings = get().settings.adaptiveQuality;
        const performanceStore = usePerformanceStore.getState();
        const thermalState = performanceStore.system.thermalState;

        let newSettings = { ...currentSettings };

        // Adjust based on thermal state
        if (thermalState === "serious" || thermalState === "critical") {
          newSettings.currentResolution = "720p";
          newSettings.currentFrameRate = 24;
          newSettings.currentBitrate = 1500000;
        } else if (thermalState === "fair") {
          newSettings.currentResolution = "1080p";
          newSettings.currentFrameRate = 30;
          newSettings.currentBitrate = 2000000;
        }

        // Record the adjustment
        const adjustment = {
          timestamp: Date.now(),
          reason,
          from: currentSettings,
          to: newSettings,
        };

        set((draft) => {
          draft.settings.adaptiveQuality = newSettings;
          draft.metrics.qualityAdjustments.push(adjustment);
        });
      },

      // Error Handling Actions
      setError: (error) => {
        set((draft) => {
          draft.state.error = error;
          if (error) {
            draft.state.lastError = error;
          }
        });
      },

      clearError: () => {
        set((draft) => {
          draft.state.error = null;
        });
      },

      retryLastOperation: async () => {
        const state = get().state;

        if (state.errorRecoveryAttempts >= 3) {
          throw new Error("Maximum retry attempts exceeded");
        }

        try {
          // Retry initialization if not initialized
          if (!state.isInitialized) {
            await get().initializeCamera();
          }
        } catch (error) {
          set((draft) => {
            draft.state.errorRecoveryAttempts += 1;
          });
          throw error;
        }
      },

      // UI Actions
      setSettingsModalOpen: (open) => {
        set((draft) => {
          draft.ui.isSettingsModalOpen = open;
        });
      },

      setPermissionModalOpen: (open) => {
        set((draft) => {
          draft.ui.showPermissionModal = open;
        });
      },

      setPerformanceMonitorOpen: (open) => {
        set((draft) => {
          draft.ui.showPerformanceMonitor = open;
        });
      },

      // Session Management Actions
      createSession: () => {
        const settings = get().settings;
        const session: EnhancedRecordingSession = {
          id: generateUUID(),
          startTime: Date.now(),
          duration: 0,
          state: "idle",
          cameraType: settings.cameraType,
          resolution: settings.adaptiveQuality.currentResolution,
          frameRate: settings.adaptiveQuality.currentFrameRate,
          bitrate: settings.adaptiveQuality.currentBitrate,
          averageFps: 30,
          droppedFrames: 0,
          qualityScore: 85,
          thermalEvents: [],
          performanceSummary: {
            averageMemoryUsage: 0,
            peakMemoryUsage: 0,
            averageCpuUsage: 0,
            batteryUsed: 0,
          },
          segments: [],
        };

        set((draft) => {
          draft.state.currentSession = session;
        });

        return session;
      },

      updateSession: (updates) => {
        set((draft) => {
          if (draft.state.currentSession) {
            Object.assign(draft.state.currentSession, updates);
          }
        });
      },

      clearSession: () => {
        set((draft) => {
          draft.state.currentSession = null;
          draft.state.recordingState = "idle";
        });
      },

      // Metrics Actions
      updateMetrics: (updates) => {
        set((draft) => {
          Object.assign(draft.metrics, updates);

          // Update session metrics if active
          if (draft.state.currentSession) {
            draft.state.currentSession.duration = draft.metrics.duration;
            draft.state.currentSession.averageFps = draft.metrics.averageFps;
            draft.state.currentSession.droppedFrames =
              draft.metrics.droppedFrames;
            draft.state.currentSession.qualityScore =
              draft.metrics.qualityScore;
          }
        });
      },

      resetMetrics: () => {
        set((draft) => {
          draft.metrics = { ...initialMetrics };
        });
      },

      // Cleanup Action
      reset: () => {
        set((draft) => {
          draft.state = { ...initialState };
          draft.settings = { ...initialSettings };
          draft.permissions = { ...initialPermissions };
          draft.capabilities = { ...initialCapabilities };
          draft.metrics = { ...initialMetrics };
          draft.ui = {
            isSettingsModalOpen: false,
            showPermissionModal: false,
            showPerformanceMonitor: false,
          };
        });
      },
    })),
  ),
);

/**
 * Enhanced selectors for common state combinations
 */
export const useEnhancedCameraRecordingSelectors = () => {
  const store = useEnhancedCameraRecordingStore();

  return {
    // Recording state selectors
    isRecording: store.state.recordingState === "recording",
    isPaused: store.state.recordingState === "paused",
    isStopped: store.state.recordingState === "stopped",
    isIdle: store.state.recordingState === "idle",
    isReady: store.state.recordingState === "ready",
    hasError: !!store.state.error,

    // Permission selectors
    hasAllPermissions: store.permissions.camera === "granted" &&
      store.permissions.microphone === "granted" &&
      store.permissions.storage === "granted",
    hasCameraPermission: store.permissions.camera === "granted",
    hasMicrophonePermission: store.permissions.microphone === "granted",
    hasStoragePermission: store.permissions.storage === "granted",

    // Capability selectors
    canRecord: store.state.isInitialized &&
      store.permissions.camera === "granted" &&
      store.permissions.microphone === "granted" &&
      !store.state.isInitializing,
    canSwapCamera: store.state.recordingState !== "recording" &&
      store.capabilities.supportsMultipleCameras,
    canZoom: store.capabilities.maxZoom > 1,
    canUseFlash: store.capabilities.supportsFlash,

    // Session selectors
    hasActiveSession: !!store.state.currentSession,
    sessionDuration: store.state.currentSession?.duration || 0,
    sessionQualityScore: store.state.currentSession?.qualityScore || 0,

    // Adaptive quality selectors
    isAdaptiveQualityEnabled: store.settings.adaptiveQuality.enabled,
    currentResolution: store.settings.adaptiveQuality.currentResolution,
    currentFrameRate: store.settings.adaptiveQuality.currentFrameRate,
  };
};

/**
 * Enhanced recording timer hook with thermal and performance integration
 */
export const useEnhancedRecordingTimer = () => {
  const { metrics, updateMetrics } = useEnhancedCameraRecordingStore();
  const { isRecording } = useEnhancedCameraRecordingSelectors();
  const performanceStore = usePerformanceStore();

  // Update duration and check thermal state
  React.useEffect(() => {
    if (!isRecording || !metrics.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const duration = Math.floor((now - metrics.startTime) / 1000);

      // Check thermal state for automatic stopping
      if (performanceStore.system.thermalState === "critical") {
        useEnhancedCameraRecordingStore.getState().stopRecording();
        return;
      }

      // Stop at 60 seconds or if thermal issues
      if (duration >= 60) {
        useEnhancedCameraRecordingStore.getState().stopRecording();
        return;
      }

      updateMetrics({ duration });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isRecording,
    metrics.startTime,
    updateMetrics,
    performanceStore.system.thermalState,
  ]);

  return {
    duration: metrics.duration,
    formattedDuration: formatDuration(metrics.duration),
    remainingTime: Math.max(0, 60 - metrics.duration),
    thermalState: performanceStore.system.thermalState,
    qualityScore: metrics.qualityScore,
  };
};

// Helper function to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${
    secs.toString().padStart(2, "0")
  }`;
}
