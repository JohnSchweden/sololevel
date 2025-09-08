/**
 * MVP Configuration for Camera Recording and Pose Detection
 * Essential settings only - simplified for rapid MVP development
 * No complex validation or platform-specific optimizations
 */

import type { MVPPoseDetectionConfig } from '../types/MVPpose'

/**
 * MVP Application Mode
 */
export type MVPMode = 'development' | 'production'

/**
 * MVP Quality Presets (simplified)
 */
export type MVPQualityPreset = 'low' | 'medium' | 'high'

/**
 * MVP Camera Recording Configuration
 */
export interface MVPCameraConfig {
  // Camera settings
  defaultCameraType: 'front' | 'back'
  defaultZoomLevel: 1 | 2 | 3
  enableFlash: boolean
  enableGrid: boolean

  // Recording settings
  maxRecordingDuration: number // seconds
  qualityPreset: MVPQualityPreset

  // Pose detection
  enablePoseDetection: boolean
  poseConfig: MVPPoseDetectionConfig
}

/**
 * Complete MVP Configuration
 */
export interface MVPConfig {
  // Application mode
  mode: MVPMode

  // Feature flags (simple on/off)
  features: {
    poseDetection: boolean
    recordingControls: boolean
    cameraSwap: boolean
    zoom: boolean
    grid: boolean
  }

  // Camera and recording
  camera: MVPCameraConfig

  // Development settings
  development: {
    enableMockData: boolean
    showDebugInfo: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
  }
}

/**
 * Default MVP Configuration
 */
export const DEFAULT_MVP_CONFIG: MVPConfig = {
  mode: 'development',

  features: {
    poseDetection: false,
    recordingControls: true,
    cameraSwap: true,
    zoom: true,
    grid: false,
  },

  camera: {
    defaultCameraType: 'back',
    defaultZoomLevel: 1,
    enableFlash: false,
    enableGrid: false,
    maxRecordingDuration: 60, // 60 seconds
    qualityPreset: 'medium',
    enablePoseDetection: false,
    poseConfig: {
      modelType: 'lightning',
      confidenceThreshold: 0.3,
      targetFps: 30,
      inputResolution: {
        width: 256,
        height: 256,
      },
    },
  },

  development: {
    enableMockData: true, // Use mock data for pose detection
    showDebugInfo: false,
    logLevel: 'info',
  },
}

/**
 * Production MVP Configuration
 */
export const PRODUCTION_MVP_CONFIG: MVPConfig = {
  ...DEFAULT_MVP_CONFIG,
  mode: 'production',
  development: {
    enableMockData: false, // Use real implementations in production
    showDebugInfo: false,
    logLevel: 'error',
  },
  features: {
    ...DEFAULT_MVP_CONFIG.features,
    poseDetection: false, // Explicitly set to false for production
  },
  camera: {
    ...DEFAULT_MVP_CONFIG.camera,
    enablePoseDetection: false, // Explicitly set to false for production
    poseConfig: {
      ...DEFAULT_MVP_CONFIG.camera.poseConfig,
      targetFps: 24, // Lower FPS for production performance
    },
  },
}

/**
 * Quality preset configurations
 */
export const MVP_QUALITY_PRESETS: Record<MVPQualityPreset, Partial<MVPCameraConfig>> = {
  low: {
    qualityPreset: 'low',
    poseConfig: {
      modelType: 'lightning',
      confidenceThreshold: 0.4,
      targetFps: 15,
      inputResolution: { width: 192, height: 192 },
    },
  },
  medium: {
    qualityPreset: 'medium',
    poseConfig: {
      modelType: 'lightning',
      confidenceThreshold: 0.3,
      targetFps: 24,
      inputResolution: { width: 256, height: 256 },
    },
  },
  high: {
    qualityPreset: 'high',
    poseConfig: {
      modelType: 'thunder', // Higher accuracy model
      confidenceThreshold: 0.3,
      targetFps: 30,
      inputResolution: { width: 256, height: 256 },
    },
  },
}

/**
 * MVP Configuration Manager
 * Simple configuration management without complex validation
 */
export class MVPConfigManager {
  private config: MVPConfig

  constructor(initialConfig: MVPConfig = DEFAULT_MVP_CONFIG) {
    this.config = { ...initialConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): MVPConfig {
    return { ...this.config }
  }

  /**
   * Update configuration with partial updates
   */
  updateConfig(updates: Partial<MVPConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: MVPQualityPreset): void {
    const presetConfig = MVP_QUALITY_PRESETS[preset]
    this.config.camera = { ...this.config.camera, ...presetConfig }
  }

  /**
   * Enable/disable pose detection
   */
  setPoseDetectionEnabled(enabled: boolean): void {
    this.config.features.poseDetection = enabled
    this.config.camera.enablePoseDetection = enabled
  }

  /**
   * Switch between development and production modes
   */
  setMode(mode: MVPMode): void {
    if (mode === 'production') {
      this.config = { ...PRODUCTION_MVP_CONFIG }
    } else {
      this.config = { ...DEFAULT_MVP_CONFIG }
    }
  }

  /**
   * Get feature flag value
   */
  isFeatureEnabled(feature: keyof MVPConfig['features']): boolean {
    return this.config.features[feature]
  }

  /**
   * Get camera configuration
   */
  getCameraConfig(): MVPCameraConfig {
    return { ...this.config.camera }
  }

  /**
   * Get pose detection configuration
   */
  getPoseConfig(): MVPPoseDetectionConfig {
    return { ...this.config.camera.poseConfig }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_MVP_CONFIG }
  }
}

/**
 * Global MVP configuration instance
 * Single source of truth for MVP configuration
 */
export const mvpConfig = new MVPConfigManager()

/**
 * MVP Configuration Utilities
 */
export const MVPConfigUtils = {
  /**
   * Create configuration for current environment
   */
  createEnvironmentConfig: (): MVPConfig => {
    // Simple environment detection
    const isDevelopment = process.env.NODE_ENV === 'development' || __DEV__

    return isDevelopment ? DEFAULT_MVP_CONFIG : PRODUCTION_MVP_CONFIG
  },

  /**
   * Validate basic configuration requirements
   */
  isValidConfig: (config: Partial<MVPConfig>): boolean => {
    return !!(
      config.camera?.qualityPreset &&
      config.camera?.poseConfig?.modelType &&
      config.camera?.poseConfig?.targetFps > 0 &&
      config.camera?.poseConfig?.confidenceThreshold >= 0 &&
      config.camera?.poseConfig?.confidenceThreshold <= 1
    )
  },

  /**
   * Get recommended configuration for platform
   */
  getPlatformConfig: (platform: 'native' | 'web'): Partial<MVPConfig> => {
    const baseConfig = MVPConfigUtils.createEnvironmentConfig()

    if (platform === 'web') {
      return {
        ...baseConfig,
        camera: {
          ...baseConfig.camera,
          poseConfig: {
            ...baseConfig.camera.poseConfig,
            targetFps: 24, // Lower FPS for web performance
          },
        },
      }
    }

    return baseConfig // Native can handle higher performance
  },

  /**
   * Create configuration from quality preset
   */
  createConfigFromPreset: (preset: MVPQualityPreset): MVPConfig => {
    const config = { ...DEFAULT_MVP_CONFIG }
    const presetConfig = MVP_QUALITY_PRESETS[preset]

    config.camera = { ...config.camera, ...presetConfig }

    return config
  },
}
