import React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  FrameSkippingStrategy,
  ModelType,
  PoseDetectionConfig,
  ProcessingQuality,
} from "../types/pose";

// Configuration presets for different use cases
export const POSE_CONFIG_PRESETS = {
  // High performance for powerful devices
  performance: {
    modelType: "movenet-lightning" as ModelType,
    confidenceThreshold: 0.3,
    maxPoses: 1,
    enableSmoothing: true,
    smoothingFactor: 0.7,
    enableValidation: true,
    processingQuality: "high" as ProcessingQuality,
    frameSkipping: "none" as FrameSkippingStrategy,
    batchSize: 1,
    maxHistorySize: 200,
    enableMetrics: true,
    enableThermalThrottling: false,
    enableAdaptiveQuality: false,
  },

  // Balanced for most devices
  balanced: {
    modelType: "movenet-lightning" as ModelType,
    confidenceThreshold: 0.3,
    maxPoses: 1,
    enableSmoothing: true,
    smoothingFactor: 0.8,
    enableValidation: true,
    processingQuality: "medium" as ProcessingQuality,
    frameSkipping: "adaptive" as FrameSkippingStrategy,
    batchSize: 1,
    maxHistorySize: 100,
    enableMetrics: true,
    enableThermalThrottling: true,
    enableAdaptiveQuality: true,
  },

  // Battery saver for extended use
  batterySaver: {
    modelType: "movenet-lightning" as ModelType,
    confidenceThreshold: 0.4,
    maxPoses: 1,
    enableSmoothing: true,
    smoothingFactor: 0.9,
    enableValidation: false,
    processingQuality: "low" as ProcessingQuality,
    frameSkipping: "aggressive" as FrameSkippingStrategy,
    batchSize: 1,
    maxHistorySize: 50,
    enableMetrics: false,
    enableThermalThrottling: true,
    enableAdaptiveQuality: true,
  },

  // High accuracy for analysis
  accuracy: {
    modelType: "movenet-lightning" as ModelType,
    confidenceThreshold: 0.2,
    maxPoses: 1,
    enableSmoothing: true,
    smoothingFactor: 0.6,
    enableValidation: true,
    processingQuality: "high" as ProcessingQuality,
    frameSkipping: "minimal" as FrameSkippingStrategy,
    batchSize: 1,
    maxHistorySize: 300,
    enableMetrics: true,
    enableThermalThrottling: false,
    enableAdaptiveQuality: false,
  },

  // Development and debugging
  development: {
    modelType: "movenet-lightning" as ModelType,
    confidenceThreshold: 0.1,
    maxPoses: 1,
    enableSmoothing: false,
    smoothingFactor: 0.5,
    enableValidation: true,
    processingQuality: "medium" as ProcessingQuality,
    frameSkipping: "none" as FrameSkippingStrategy,
    batchSize: 1,
    maxHistorySize: 500,
    enableMetrics: true,
    enableThermalThrottling: false,
    enableAdaptiveQuality: false,
  },
} as const;

export type ConfigPresetName = keyof typeof POSE_CONFIG_PRESETS;

// Configuration validation rules
interface ConfigValidationRule {
  field: keyof PoseDetectionConfig;
  validate: (value: any, config: PoseDetectionConfig) => string | null;
}

const VALIDATION_RULES: ConfigValidationRule[] = [
  {
    field: "confidenceThreshold",
    validate: (value: number) => {
      if (value < 0 || value > 1) {
        return "Confidence threshold must be between 0 and 1";
      }
      return null;
    },
  },
  {
    field: "maxPoses",
    validate: (value: number) => {
      if (value < 1 || value > 10) {
        return "Max poses must be between 1 and 10";
      }
      return null;
    },
  },
  {
    field: "smoothingFactor",
    validate: (value: number, config: PoseDetectionConfig) => {
      if (!config.enableSmoothing) return null;
      if (value < 0 || value > 1) {
        return "Smoothing factor must be between 0 and 1";
      }
      return null;
    },
  },
  {
    field: "batchSize",
    validate: (value: number) => {
      if (value < 1 || value > 10) {
        return "Batch size must be between 1 and 10";
      }
      return null;
    },
  },
  {
    field: "maxHistorySize",
    validate: (value: number) => {
      if (value < 0 || value > 1000) {
        return "Max history size must be between 0 and 1000";
      }
      return null;
    },
  },
];

// Configuration compatibility matrix
const COMPATIBILITY_MATRIX = {
  web: {
    supportedModels: ["movenet-lightning"],
    maxQuality: "high" as ProcessingQuality,
    supportsGPU: true,
    supportsBatching: true,
  },
  native: {
    supportedModels: ["movenet-lightning"],
    maxQuality: "high" as ProcessingQuality,
    supportsGPU: true,
    supportsBatching: true,
  },
} as const;

// Configuration manager state
interface ConfigManagerState {
  currentConfig: PoseDetectionConfig;
  savedConfigs: Record<string, PoseDetectionConfig>;
  activePreset: ConfigPresetName | "custom";
  validationErrors: Record<string, string>;
  isValid: boolean;
  lastModified: number;
  platform: "web" | "native";
}

// Configuration manager actions
interface ConfigManagerActions {
  // Configuration management
  setConfig: (config: Partial<PoseDetectionConfig>) => void;
  resetConfig: () => void;
  loadPreset: (preset: ConfigPresetName) => void;

  // Validation
  validateConfig: (config?: PoseDetectionConfig) => Record<string, string>;
  isConfigValid: (config?: PoseDetectionConfig) => boolean;

  // Persistence
  saveConfig: (name: string, config?: PoseDetectionConfig) => void;
  loadConfig: (name: string) => boolean;
  deleteConfig: (name: string) => void;
  listSavedConfigs: () => string[];

  // Platform compatibility
  setPlatform: (platform: "web" | "native") => void;
  getCompatibleConfig: (config: PoseDetectionConfig) => PoseDetectionConfig;

  // Optimization
  optimizeForDevice: (deviceInfo: {
    cpu: string;
    memory: number;
    gpu?: string;
    batteryLevel?: number;
  }) => void;

  // Export/Import
  exportConfig: (name?: string) => string;
  importConfig: (configJson: string, name?: string) => boolean;
}

// Combined interface
interface ConfigManager extends ConfigManagerState, ConfigManagerActions {}

// Create the configuration manager store
export const useConfigManager = create<ConfigManager>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentConfig: POSE_CONFIG_PRESETS.balanced,
      savedConfigs: {},
      activePreset: "balanced",
      validationErrors: {},
      isValid: true,
      lastModified: Date.now(),
      platform: "native",

      // Actions
      setConfig: (config) => {
        set((draft) => {
          Object.assign(draft.currentConfig, config);
          draft.activePreset = "custom";
          draft.lastModified = Date.now();

          // Validate the new configuration
          const errors = get().validateConfig(draft.currentConfig);
          draft.validationErrors = errors;
          draft.isValid = Object.keys(errors).length === 0;
        });
      },

      resetConfig: () => {
        set((draft) => {
          draft.currentConfig = { ...POSE_CONFIG_PRESETS.balanced };
          draft.activePreset = "balanced";
          draft.validationErrors = {};
          draft.isValid = true;
          draft.lastModified = Date.now();
        });
      },

      loadPreset: (preset) => {
        set((draft) => {
          draft.currentConfig = { ...POSE_CONFIG_PRESETS[preset] };
          draft.activePreset = preset;
          draft.validationErrors = {};
          draft.isValid = true;
          draft.lastModified = Date.now();
        });
      },

      validateConfig: (config) => {
        const configToValidate = config || get().currentConfig;
        const errors: Record<string, string> = {};

        for (const rule of VALIDATION_RULES) {
          const value = configToValidate[rule.field];
          const error = rule.validate(value, configToValidate);
          if (error) {
            errors[rule.field] = error;
          }
        }

        // Platform-specific validation
        const platform = get().platform;
        const compatibility = COMPATIBILITY_MATRIX[platform];

        if (
          !compatibility.supportedModels.includes(configToValidate.modelType)
        ) {
          errors.modelType =
            `Model ${configToValidate.modelType} is not supported on ${platform}`;
        }

        // Quality validation based on platform capabilities
        const qualityLevels: ProcessingQuality[] = ["low", "medium", "high"];
        const maxQualityIndex = qualityLevels.indexOf(compatibility.maxQuality);
        const currentQualityIndex = qualityLevels.indexOf(
          configToValidate.processingQuality,
        );

        if (currentQualityIndex > maxQualityIndex) {
          errors.processingQuality =
            `Quality ${configToValidate.processingQuality} exceeds platform maximum of ${compatibility.maxQuality}`;
        }

        return errors;
      },

      isConfigValid: (config) => {
        const errors = get().validateConfig(config);
        return Object.keys(errors).length === 0;
      },

      saveConfig: (name, config) => {
        const configToSave = config || get().currentConfig;

        if (!get().isConfigValid(configToSave)) {
          throw new Error("Cannot save invalid configuration");
        }

        set((draft) => {
          draft.savedConfigs[name] = { ...configToSave };
        });
      },

      loadConfig: (name) => {
        const state = get();
        const config = state.savedConfigs[name];

        if (!config) {
          return false;
        }

        if (!state.isConfigValid(config)) {
          return false;
        }

        set((draft) => {
          draft.currentConfig = { ...config };
          draft.activePreset = "custom";
          draft.validationErrors = {};
          draft.isValid = true;
          draft.lastModified = Date.now();
        });

        return true;
      },

      deleteConfig: (name) => {
        set((draft) => {
          delete draft.savedConfigs[name];
        });
      },

      listSavedConfigs: () => {
        return Object.keys(get().savedConfigs);
      },

      setPlatform: (platform) => {
        set((draft) => {
          draft.platform = platform;

          // Ensure current config is compatible with new platform
          const compatibleConfig = get().getCompatibleConfig(
            draft.currentConfig,
          );
          draft.currentConfig = compatibleConfig;

          // Re-validate
          const errors = get().validateConfig(draft.currentConfig);
          draft.validationErrors = errors;
          draft.isValid = Object.keys(errors).length === 0;
        });
      },

      getCompatibleConfig: (config) => {
        const platform = get().platform;
        const compatibility = COMPATIBILITY_MATRIX[platform];
        const compatibleConfig = { ...config };

        // Ensure model compatibility
        if (!compatibility.supportedModels.includes(config.modelType)) {
          compatibleConfig.modelType = compatibility.supportedModels[0];
        }

        // Ensure quality compatibility
        const qualityLevels: ProcessingQuality[] = ["low", "medium", "high"];
        const maxQualityIndex = qualityLevels.indexOf(compatibility.maxQuality);
        const currentQualityIndex = qualityLevels.indexOf(
          config.processingQuality,
        );

        if (currentQualityIndex > maxQualityIndex) {
          compatibleConfig.processingQuality = compatibility.maxQuality;
        }

        return compatibleConfig;
      },

      optimizeForDevice: (deviceInfo) => {
        let optimizedConfig: PoseDetectionConfig;

        // Determine optimal preset based on device capabilities
        if (deviceInfo.memory < 2048) { // Less than 2GB RAM
          optimizedConfig = { ...POSE_CONFIG_PRESETS.batterySaver };
        } else if (deviceInfo.memory < 4096) { // Less than 4GB RAM
          optimizedConfig = { ...POSE_CONFIG_PRESETS.balanced };
        } else { // 4GB+ RAM
          optimizedConfig = { ...POSE_CONFIG_PRESETS.performance };
        }

        // Adjust for battery level
        if (deviceInfo.batteryLevel && deviceInfo.batteryLevel < 30) {
          optimizedConfig.processingQuality = "low";
          optimizedConfig.enableThermalThrottling = true;
          optimizedConfig.frameSkipping = "aggressive";
        }

        // Adjust for CPU
        if (
          deviceInfo.cpu.includes("low-power") ||
          deviceInfo.cpu.includes("efficiency")
        ) {
          optimizedConfig.processingQuality = "medium";
          optimizedConfig.enableAdaptiveQuality = true;
        }

        set((draft) => {
          draft.currentConfig = optimizedConfig;
          draft.activePreset = "custom";
          draft.lastModified = Date.now();

          // Validate optimized config
          const errors = get().validateConfig(draft.currentConfig);
          draft.validationErrors = errors;
          draft.isValid = Object.keys(errors).length === 0;
        });
      },

      exportConfig: (name) => {
        const config = name ? get().savedConfigs[name] : get().currentConfig;
        if (!config) {
          throw new Error(`Configuration '${name}' not found`);
        }

        const exportData = {
          name: name || "current",
          config,
          platform: get().platform,
          timestamp: Date.now(),
          version: "1.0",
        };

        return JSON.stringify(exportData, null, 2);
      },

      importConfig: (configJson, name) => {
        try {
          const importData = JSON.parse(configJson);

          // Validate import data structure
          if (!importData.config || !importData.version) {
            return false;
          }

          const config = importData.config as PoseDetectionConfig;

          // Ensure compatibility with current platform
          const compatibleConfig = get().getCompatibleConfig(config);

          // Validate the configuration
          if (!get().isConfigValid(compatibleConfig)) {
            return false;
          }

          if (name) {
            // Save as named configuration
            get().saveConfig(name, compatibleConfig);
          } else {
            // Load as current configuration
            set((draft) => {
              draft.currentConfig = compatibleConfig;
              draft.activePreset = "custom";
              draft.validationErrors = {};
              draft.isValid = true;
              draft.lastModified = Date.now();
            });
          }

          return true;
        } catch {
          return false;
        }
      },
    })),
    {
      name: "pose-config-manager",
      partialize: (state) => ({
        savedConfigs: state.savedConfigs,
        platform: state.platform,
      }),
    },
  ),
);

// Utility hooks for specific use cases
export const usePoseConfigPresets = () => {
  const configManager = useConfigManager();

  return {
    presets: POSE_CONFIG_PRESETS,
    activePreset: configManager.activePreset,
    loadPreset: configManager.loadPreset,

    // Preset comparison
    compareWithCurrent: (preset: ConfigPresetName) => {
      const presetConfig = POSE_CONFIG_PRESETS[preset];
      const currentConfig = configManager.currentConfig;

      const differences: Array<{
        field: keyof PoseDetectionConfig;
        current: any;
        preset: any;
      }> = [];

      for (const key in presetConfig) {
        const field = key as keyof PoseDetectionConfig;
        if (currentConfig[field] !== presetConfig[field]) {
          differences.push({
            field,
            current: currentConfig[field],
            preset: presetConfig[field],
          });
        }
      }

      return differences;
    },
  };
};

export const usePoseConfigValidation = () => {
  const configManager = useConfigManager();

  return {
    errors: configManager.validationErrors,
    isValid: configManager.isValid,
    validate: configManager.validateConfig,

    // Field-specific validation
    validateField: (field: keyof PoseDetectionConfig, value: any) => {
      const rule = VALIDATION_RULES.find((r) => r.field === field);
      if (!rule) return null;

      return rule.validate(value, configManager.currentConfig);
    },

    // Get validation summary
    getValidationSummary: () => {
      const errors = Object.keys(configManager.validationErrors);
      return {
        isValid: configManager.isValid,
        errorCount: errors.length,
        errors: errors.map((field) => ({
          field,
          message: configManager.validationErrors[field],
        })),
      };
    },
  };
};

export const usePoseConfigPersistence = () => {
  const configManager = useConfigManager();

  return {
    savedConfigs: configManager.listSavedConfigs(),
    saveConfig: configManager.saveConfig,
    loadConfig: configManager.loadConfig,
    deleteConfig: configManager.deleteConfig,
    exportConfig: configManager.exportConfig,
    importConfig: configManager.importConfig,

    // Bulk operations
    exportAllConfigs: () => {
      const configs = configManager.listSavedConfigs();
      const exportData = {
        configs: configs.reduce((acc, name) => {
          acc[name] = configManager.savedConfigs[name];
          return acc;
        }, {} as Record<string, PoseDetectionConfig>),
        platform: configManager.platform,
        timestamp: Date.now(),
        version: "1.0",
      };

      return JSON.stringify(exportData, null, 2);
    },

    importAllConfigs: (configsJson: string) => {
      try {
        const importData = JSON.parse(configsJson);

        if (!importData.configs || !importData.version) {
          return false;
        }

        let importedCount = 0;
        for (const [name, config] of Object.entries(importData.configs)) {
          if (
            configManager.importConfig(
              JSON.stringify({ config, version: importData.version }),
              name,
            )
          ) {
            importedCount++;
          }
        }

        return importedCount;
      } catch {
        return false;
      }
    },
  };
};
