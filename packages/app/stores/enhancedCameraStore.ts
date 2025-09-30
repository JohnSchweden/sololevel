import type {
  CameraRecordingState,
  CameraType,
  PermissionStatus,
  RecordingSession,
  ZoomLevel,
} from "@api/src/validation/cameraRecordingSchemas";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { usePerformanceStore } from "./performanceStore";
import { usePoseStore } from "./poseStore";

// React Native compatible UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for React Native environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Enhanced Camera Store for Phase 2
 * Integrates with performance monitoring and adaptive quality management
 * Provides thermal-aware camera controls and advanced state management
 */

export interface CameraPermissions {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  storage: PermissionStatus;
}

export interface AdaptiveQualitySettings {
  enabled: boolean;
  thermalManagement: boolean;
  batteryOptimization: boolean;
  performanceMode: "quality" | "balanced" | "performance";

  // Dynamic quality parameters
  currentResolution: "480p" | "720p" | "1080p" | "4k";
  currentFrameRate: number;
  currentBitrate: number;

  // Adaptive thresholds
  thermalThresholds: {
    normal: { fps: number; resolution: string };
    fair: { fps: number; resolution: string };
    serious: { fps: number; resolution: string };
    critical: { fps: number; resolution: string };
  };
}

export interface EnhancedCameraSettings {
  // Basic camera settings
  cameraType: CameraType;
  zoomLevel: ZoomLevel;
  flashEnabled: boolean;
  gridEnabled: boolean;

  // Enhanced settings
  stabilizationEnabled: boolean;
  hdrEnabled: boolean;
  nightModeEnabled: boolean;

  // Adaptive quality settings
  adaptiveQuality: AdaptiveQualitySettings;

  // Advanced controls
  manualFocus: boolean;
  exposureCompensation: number;
  whiteBalance: "auto" | "daylight" | "cloudy" | "tungsten" | "fluorescent";
}

export interface CameraCapabilities {
  // Device capabilities
  availableCameras: Array<{
    id: string;
    type: "front" | "back";
    name: string;
    minZoom: number;
    maxZoom: number;
    supportedResolutions: string[];
    supportedFrameRates: number[];
  }>;

  // Feature support
  supportsFlash: boolean;
  supportsHDR: boolean;
  supportsStabilization: boolean;
  supportsManualFocus: boolean;
  supportsNightMode: boolean;

  // Performance capabilities
  maxResolution: string;
  maxFrameRate: number;
  recommendedSettings: AdaptiveQualitySettings;
}

export interface RecordingMetrics {
  startTime: number | null;
  duration: number;
  frameRate: number;
  resolution: { width: number; height: number } | null;
  fileSize: number;

  // Enhanced metrics
  actualBitrate: number;
  droppedFrames: number;
  qualityScore: number; // 0-100
  thermalEvents: number;
  adaptiveAdjustments: number;
}

export interface CameraState {
  // Core state
  isInitialized: boolean;
  isInitializing: boolean;
  currentCamera: string | null;

  // Recording state
  recordingState: CameraRecordingState;
  currentSession: RecordingSession | null;

  // Error handling
  error: string | null;
  lastError: { timestamp: number; message: string } | null;

  // UI state
  isSettingsModalOpen: boolean;
  showPermissionModal: boolean;
  showPerformanceMonitor: boolean;
}

export interface EnhancedCameraStore {
  // State
  state: CameraState;
  settings: EnhancedCameraSettings;
  permissions: CameraPermissions;
  capabilities: CameraCapabilities;
  metrics: RecordingMetrics;

  // Core camera actions
  initializeCamera: (cameraType?: CameraType) => Promise<void>;
  switchCamera: (cameraType: CameraType) => Promise<void>;
  setZoomLevel: (level: ZoomLevel) => void;

  // Recording actions
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;

  // Permission management
  requestPermissions: () => Promise<boolean>;
  setPermissions: (permissions: Partial<CameraPermissions>) => void;

  // Settings management
  updateSettings: (settings: Partial<EnhancedCameraSettings>) => void;
  resetSettings: () => void;
  applyAdaptiveQuality: () => void;

  // Capabilities management
  detectCapabilities: () => Promise<void>;
  updateCapabilities: (capabilities: Partial<CameraCapabilities>) => void;

  // Performance integration
  onPerformanceChange: (metrics: any) => void;
  onThermalStateChange: (state: string) => void;
  onBatteryLevelChange: (level: number) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // UI actions
  setSettingsModalOpen: (open: boolean) => void;
  setPermissionModalOpen: (open: boolean) => void;
  setPerformanceMonitorOpen: (open: boolean) => void;

  // Metrics
  updateMetrics: (updates: Partial<RecordingMetrics>) => void;
  resetMetrics: () => void;

  // Cleanup
  reset: () => void;
}

const initialAdaptiveQuality: AdaptiveQualitySettings = {
  enabled: true,
  thermalManagement: true,
  batteryOptimization: true,
  performanceMode: "balanced",
  currentResolution: "1080p",
  currentFrameRate: 30,
  currentBitrate: 2500000, // 2.5 Mbps
  thermalThresholds: {
    normal: { fps: 30, resolution: "1080p" },
    fair: { fps: 30, resolution: "1080p" },
    serious: { fps: 24, resolution: "720p" },
    critical: { fps: 15, resolution: "720p" },
  },
};

const initialSettings: EnhancedCameraSettings = {
  cameraType: "back",
  zoomLevel: 1,
  flashEnabled: false,
  gridEnabled: false,
  stabilizationEnabled: true,
  hdrEnabled: false,
  nightModeEnabled: false,
  adaptiveQuality: initialAdaptiveQuality,
  manualFocus: false,
  exposureCompensation: 0,
  whiteBalance: "auto",
};

const initialPermissions: CameraPermissions = {
  camera: "undetermined",
  microphone: "undetermined",
  storage: "undetermined",
};

const initialCapabilities: CameraCapabilities = {
  availableCameras: [],
  supportsFlash: false,
  supportsHDR: false,
  supportsStabilization: false,
  supportsManualFocus: false,
  supportsNightMode: false,
  maxResolution: "1080p",
  maxFrameRate: 30,
  recommendedSettings: initialAdaptiveQuality,
};

const initialMetrics: RecordingMetrics = {
  startTime: null,
  duration: 0,
  frameRate: 30,
  resolution: null,
  fileSize: 0,
  actualBitrate: 0,
  droppedFrames: 0,
  qualityScore: 100,
  thermalEvents: 0,
  adaptiveAdjustments: 0,
};

const initialState: CameraState = {
  isInitialized: false,
  isInitializing: false,
  currentCamera: null,
  recordingState: "idle",
  currentSession: null,
  error: null,
  lastError: null,
  isSettingsModalOpen: false,
  showPermissionModal: false,
  showPerformanceMonitor: false,
};

export const useEnhancedCameraStore = create<EnhancedCameraStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      state: { ...initialState },
      settings: { ...initialSettings },
      permissions: { ...initialPermissions },
      capabilities: { ...initialCapabilities },
      metrics: { ...initialMetrics },

      // Core camera actions
      initializeCamera: async (cameraType = "back") => {
        set((draft) => {
          draft.state.isInitializing = true;
          draft.state.error = null;
        });

        try {
          // Simulate camera initialization
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set((draft) => {
            draft.state.isInitialized = true;
            draft.state.isInitializing = false;
            draft.state.currentCamera = cameraType;
            draft.settings.cameraType = cameraType;
          });

          // Detect capabilities after initialization
          await get().detectCapabilities();
        } catch (error) {
          set((draft) => {
            draft.state.isInitializing = false;
            draft.state.error = error instanceof Error
              ? error.message
              : "Camera initialization failed";
            draft.state.lastError = {
              timestamp: Date.now(),
              message: draft.state.error!,
            };
          });
        }
      },

      switchCamera: async (cameraType) => {
        if (get().state.recordingState === "recording") {
          throw new Error("Cannot switch camera while recording");
        }

        set((draft) => {
          draft.state.isInitializing = true;
          draft.state.error = null;
        });

        try {
          // Simulate camera switch
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((draft) => {
            draft.state.currentCamera = cameraType;
            draft.settings.cameraType = cameraType;
            draft.state.isInitializing = false;

            // Reset zoom when switching cameras
            draft.settings.zoomLevel = 1;
          });
        } catch (error) {
          set((draft) => {
            draft.state.isInitializing = false;
            draft.state.error = error instanceof Error
              ? error.message
              : "Camera switch failed";
          });
        }
      },

      setZoomLevel: (level) =>
        set((draft) => {
          draft.settings.zoomLevel = level;
        }),

      // Recording actions
      startRecording: async () => {
        const { state, permissions } = get();

        if (!permissions.camera || permissions.camera !== "granted") {
          throw new Error("Camera permission required");
        }

        if (!state.isInitialized) {
          throw new Error("Camera not initialized");
        }

        set((draft) => {
          const now = Date.now();
          draft.state.recordingState = "recording";
          draft.metrics.startTime = now;
          draft.metrics.duration = 0;
          draft.state.error = null;

          // Create recording session
          if (!draft.state.currentSession) {
            draft.state.currentSession = {
              id: generateUUID(),
              state: "recording",
              startTime: now,
              duration: 0,
              cameraType: draft.settings.cameraType,
              zoomLevel: draft.settings.zoomLevel,
              isRecording: true,
              isPaused: false,
            };
          }
        });

        // Start pose recording if enabled
        const poseStore = usePoseStore.getState();
        if (poseStore.processingSettings.enabled) {
          poseStore.startPoseRecording();
        }

        // Start performance monitoring
        const performanceStore = usePerformanceStore.getState();
        if (!performanceStore.isMonitoring) {
          performanceStore.startMonitoring();
        }
      },

      pauseRecording: async () => {
        set((draft) => {
          draft.state.recordingState = "paused";
          if (draft.state.currentSession) {
            draft.state.currentSession.state = "paused";
            draft.state.currentSession.isRecording = false;
            draft.state.currentSession.isPaused = true;
          }
        });
      },

      resumeRecording: async () => {
        set((draft) => {
          draft.state.recordingState = "recording";
          if (draft.state.currentSession) {
            draft.state.currentSession.state = "recording";
            draft.state.currentSession.isRecording = true;
            draft.state.currentSession.isPaused = false;
          }
        });
      },

      stopRecording: async () => {
        set((draft) => {
          draft.state.recordingState = "stopped";
          if (draft.state.currentSession) {
            draft.state.currentSession.state = "stopped";
            draft.state.currentSession.isRecording = false;
            draft.state.currentSession.isPaused = false;
            draft.state.currentSession.duration = draft.metrics.duration;
          }
        });

        // Stop pose recording
        const poseStore = usePoseStore.getState();
        if (poseStore.recordingData.isRecording) {
          poseStore.stopPoseRecording();
        }
      },

      // Permission management
      requestPermissions: async () => {
        try {
          // Simulate permission request
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set((draft) => {
            draft.permissions.camera = "granted";
            draft.permissions.microphone = "granted";
            draft.permissions.storage = "granted";
            draft.state.showPermissionModal = false;
          });

          return true;
        } catch (error) {
          set((draft) => {
            draft.permissions.camera = "denied";
            draft.permissions.microphone = "denied";
            draft.permissions.storage = "denied";
            draft.state.error = "Permission request failed";
          });
          return false;
        }
      },

      setPermissions: (permissions) =>
        set((draft) => {
          Object.assign(draft.permissions, permissions);
        }),

      // Settings management
      updateSettings: (settings) =>
        set((draft) => {
          Object.assign(draft.settings, settings);
        }),

      resetSettings: () =>
        set((draft) => {
          draft.settings = { ...initialSettings };
        }),

      applyAdaptiveQuality: () => {
        const { settings } = get();
        const performanceStore = usePerformanceStore.getState();

        if (!settings.adaptiveQuality.enabled) return;

        const { thermalState, batteryLevel, fps } = performanceStore.system;
        const { thermalThresholds } = settings.adaptiveQuality;

        let newSettings: Partial<AdaptiveQualitySettings> = {};

        // Apply thermal-based adjustments
        if (settings.adaptiveQuality.thermalManagement) {
          const threshold = thermalThresholds[thermalState];
          if (threshold) {
            newSettings.currentFrameRate = threshold.fps;
            newSettings.currentResolution = threshold.resolution as any;
          }
        }

        // Apply battery-based adjustments
        if (settings.adaptiveQuality.batteryOptimization && batteryLevel < 20) {
          newSettings.currentFrameRate = Math.min(
            newSettings.currentFrameRate || 30,
            15,
          );
          newSettings.currentResolution = "720p";
        }

        // Apply performance-based adjustments
        if (fps < 20) {
          newSettings.currentFrameRate = Math.min(
            newSettings.currentFrameRate || 30,
            24,
          );
        }

        if (Object.keys(newSettings).length > 0) {
          set((draft) => {
            Object.assign(draft.settings.adaptiveQuality, newSettings);
            draft.metrics.adaptiveAdjustments += 1;
          });
        }
      },

      // Capabilities management
      detectCapabilities: async () => {
        // Simulate capability detection
        await new Promise((resolve) => setTimeout(resolve, 500));

        set((draft) => {
          draft.capabilities = {
            availableCameras: [
              {
                id: "back",
                type: "back",
                name: "Back Camera",
                minZoom: 1,
                maxZoom: 10,
                supportedResolutions: ["480p", "720p", "1080p", "4k"],
                supportedFrameRates: [15, 24, 30, 60],
              },
              {
                id: "front",
                type: "front",
                name: "Front Camera",
                minZoom: 1,
                maxZoom: 5,
                supportedResolutions: ["480p", "720p", "1080p"],
                supportedFrameRates: [15, 24, 30],
              },
            ],
            supportsFlash: draft.settings.cameraType === "back",
            supportsHDR: true,
            supportsStabilization: true,
            supportsManualFocus: true,
            supportsNightMode: true,
            maxResolution: "4k",
            maxFrameRate: 60,
            recommendedSettings: draft.settings.adaptiveQuality,
          };
        });
      },

      updateCapabilities: (capabilities) =>
        set((draft) => {
          Object.assign(draft.capabilities, capabilities);
        }),

      // Performance integration
      onPerformanceChange: (metrics) => {
        const { settings } = get();
        if (settings.adaptiveQuality.enabled) {
          get().applyAdaptiveQuality();
        }
      },

      onThermalStateChange: (state) => {
        set((draft) => {
          if (state === "serious" || state === "critical") {
            draft.metrics.thermalEvents += 1;
          }
        });

        const { settings } = get();
        if (settings.adaptiveQuality.thermalManagement) {
          get().applyAdaptiveQuality();
        }
      },

      onBatteryLevelChange: (level) => {
        const { settings } = get();
        if (settings.adaptiveQuality.batteryOptimization && level < 20) {
          get().applyAdaptiveQuality();
        }
      },

      // Error handling
      setError: (error) =>
        set((draft) => {
          draft.state.error = error;
          if (error) {
            draft.state.lastError = {
              timestamp: Date.now(),
              message: error,
            };
          }
        }),

      clearError: () =>
        set((draft) => {
          draft.state.error = null;
        }),

      // UI actions
      setSettingsModalOpen: (open) =>
        set((draft) => {
          draft.state.isSettingsModalOpen = open;
        }),

      setPermissionModalOpen: (open) =>
        set((draft) => {
          draft.state.showPermissionModal = open;
        }),

      setPerformanceMonitorOpen: (open) =>
        set((draft) => {
          draft.state.showPerformanceMonitor = open;
        }),

      // Metrics
      updateMetrics: (updates) =>
        set((draft) => {
          Object.assign(draft.metrics, updates);

          // Update session duration if recording
          if (draft.state.currentSession && draft.metrics.startTime) {
            draft.state.currentSession.duration = draft.metrics.duration;
          }
        }),

      resetMetrics: () =>
        set((draft) => {
          draft.metrics = { ...initialMetrics };
        }),

      // Cleanup
      reset: () =>
        set((draft) => {
          draft.state = { ...initialState };
          draft.settings = { ...initialSettings };
          draft.permissions = { ...initialPermissions };
          draft.capabilities = { ...initialCapabilities };
          draft.metrics = { ...initialMetrics };
        }),
    })),
  ),
);

// Selectors for optimized component updates
export const useEnhancedCameraSelectors = () => {
  const store = useEnhancedCameraStore();

  return {
    // State selectors
    isInitialized: store.state.isInitialized,
    isInitializing: store.state.isInitializing,
    isRecording: store.state.recordingState === "recording",
    isPaused: store.state.recordingState === "paused",
    isStopped: store.state.recordingState === "stopped",
    hasError: !!store.state.error,

    // Permission selectors
    hasAllPermissions: store.permissions.camera === "granted" &&
      store.permissions.microphone === "granted" &&
      store.permissions.storage === "granted",

    // Settings selectors
    currentCamera: store.settings.cameraType,
    currentZoom: store.settings.zoomLevel,
    adaptiveQualityEnabled: store.settings.adaptiveQuality.enabled,
    currentResolution: store.settings.adaptiveQuality.currentResolution,
    currentFrameRate: store.settings.adaptiveQuality.currentFrameRate,

    // Capability selectors
    canSwitchCamera: store.capabilities.availableCameras.length > 1,
    supportsFlash: store.capabilities.supportsFlash,
    maxZoom:
      store.capabilities.availableCameras.find((c) =>
        c.type === store.settings.cameraType
      )?.maxZoom || 1,

    // Metrics selectors
    recordingDuration: store.metrics.duration,
    qualityScore: store.metrics.qualityScore,
    adaptiveAdjustments: store.metrics.adaptiveAdjustments,
    thermalEvents: store.metrics.thermalEvents,
  };
};
