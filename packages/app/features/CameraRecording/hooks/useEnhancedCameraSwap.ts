import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useEnhancedCameraStore } from "../../../stores/enhancedCameraStore";
import { usePerformanceStore } from "../../../stores/performanceStore";
import { useEnhancedZoom } from "./useEnhancedZoom";

/**
 * Enhanced Camera Swap Hook for Phase 2 Completion
 * Provides smooth camera transitions, capability detection, and state validation
 * Integrates with thermal management and performance monitoring
 */

export type CameraType = "front" | "back";

export interface CameraCapability {
  id: string;
  type: CameraType;
  name: string;
  isAvailable: boolean;
  hasFlash: boolean;
  minZoom: number;
  maxZoom: number;
  supportedResolutions: string[];
  supportedFrameRates: number[];
}

export interface CameraSwapTransition {
  duration: number;
  fadeOutDuration: number;
  fadeInDuration: number;
  enableBlur: boolean;
  showLoadingIndicator: boolean;
}

export interface CameraSwapConfig {
  enableTransitions: boolean;
  enableCapabilityDetection: boolean;
  enableZoomPreservation: boolean;
  enableThermalValidation: boolean;
  enableStateValidation: boolean;
  transitionSettings: CameraSwapTransition;
  retryAttempts: number;
  retryDelay: number;
}

export interface CameraSwapMetrics {
  swapCount: number;
  averageSwapTime: number;
  lastSwapTime: number;
  failureCount: number;
  thermalBlocks: number;
  stateBlocks: number;
}

const defaultTransition: CameraSwapTransition = {
  duration: 800,
  fadeOutDuration: 200,
  fadeInDuration: 400,
  enableBlur: true,
  showLoadingIndicator: true,
};

const defaultConfig: CameraSwapConfig = {
  enableTransitions: true,
  enableCapabilityDetection: true,
  enableZoomPreservation: true,
  enableThermalValidation: true,
  enableStateValidation: true,
  transitionSettings: defaultTransition,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Enhanced Camera Swap Hook
 */
export const useEnhancedCameraSwap = (
  config: Partial<CameraSwapConfig> = {},
) => {
  const [currentConfig, setCurrentConfig] = useState<CameraSwapConfig>({
    ...defaultConfig,
    ...config,
  });

  const [availableCameras, setAvailableCameras] = useState<CameraCapability[]>(
    [],
  );
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CameraSwapMetrics>({
    swapCount: 0,
    averageSwapTime: 0,
    lastSwapTime: 0,
    failureCount: 0,
    thermalBlocks: 0,
    stateBlocks: 0,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Store references
  const cameraStore = useEnhancedCameraStore();
  const performanceStore = usePerformanceStore();
  const { resetZoom, setZoom, metrics: zoomMetrics } = useEnhancedZoom();

  // Refs for cleanup and retry logic
  const swapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Detect available camera capabilities
   */
  const detectCameraCapabilities = useCallback(
    async (): Promise<CameraCapability[]> => {
      try {
        // Mock capability detection - in real implementation, this would use VisionCamera API
        const mockCapabilities: CameraCapability[] = [
          {
            id: "back-camera",
            type: "back",
            name: "Back Camera",
            isAvailable: true,
            hasFlash: true,
            minZoom: 1,
            maxZoom: 10,
            supportedResolutions: ["480p", "720p", "1080p", "4k"],
            supportedFrameRates: [15, 24, 30, 60],
          },
          {
            id: "front-camera",
            type: "front",
            name: "Front Camera",
            isAvailable: true,
            hasFlash: false,
            minZoom: 1,
            maxZoom: 3,
            supportedResolutions: ["480p", "720p", "1080p"],
            supportedFrameRates: [15, 24, 30],
          },
        ];

        // Simulate capability detection delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        setAvailableCameras(mockCapabilities);
        return mockCapabilities;
      } catch (error) {
        // console.error("Failed to detect camera capabilities:", error);
        return [];
      }
    },
    [],
  );

  /**
   * Validate if camera swap is allowed in current state
   */
  const validateCameraSwap = useCallback((targetCamera: CameraType): {
    allowed: boolean;
    reason?: string;
  } => {
    // Check recording state validation
    if (currentConfig.enableStateValidation) {
      const { recordingState } = cameraStore.state;

      if (recordingState === "recording") {
        setMetrics((prev) => ({ ...prev, stateBlocks: prev.stateBlocks + 1 }));
        return {
          allowed: false,
          reason: "Cannot swap camera while recording",
        };
      }

      if (recordingState === "initializing") {
        return {
          allowed: false,
          reason: "Camera is initializing",
        };
      }
    }

    // Check thermal state validation
    if (currentConfig.enableThermalValidation) {
      const { thermalState } = performanceStore.system;

      if (thermalState === "critical") {
        setMetrics((prev) => ({
          ...prev,
          thermalBlocks: prev.thermalBlocks + 1,
        }));
        return {
          allowed: false,
          reason: "Device overheating - camera swap disabled",
        };
      }
    }

    // Check camera availability
    const targetCameraCapability = availableCameras.find((cam) =>
      cam.type === targetCamera
    );
    if (!targetCameraCapability?.isAvailable) {
      return {
        allowed: false,
        reason: `${targetCamera} camera not available`,
      };
    }

    return { allowed: true };
  }, [
    currentConfig.enableStateValidation,
    currentConfig.enableThermalValidation,
    cameraStore.state.recordingState,
    performanceStore.system.thermalState,
    availableCameras,
  ]);

  /**
   * Animate camera swap transition
   */
  const animateSwapTransition = useCallback(async (): Promise<void> => {
    if (!currentConfig.enableTransitions) return;

    const { transitionSettings } = currentConfig;

    return new Promise((resolve) => {
      // Phase 1: Fade out and blur
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: transitionSettings.fadeOutDuration,
          useNativeDriver: Platform.OS !== "web",
        }),
        transitionSettings.enableBlur
          ? Animated.timing(blurAnim, {
            toValue: 10,
            duration: transitionSettings.fadeOutDuration,
            useNativeDriver: false,
          })
          : Animated.timing(new Animated.Value(0), {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: transitionSettings.fadeOutDuration,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        // Phase 2: Camera switch happens here (in the middle of transition)

        // Phase 3: Fade in and remove blur
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: transitionSettings.fadeInDuration,
              useNativeDriver: Platform.OS !== "web",
            }),
            transitionSettings.enableBlur
              ? Animated.timing(blurAnim, {
                toValue: 0,
                duration: transitionSettings.fadeInDuration,
                useNativeDriver: false,
              })
              : Animated.timing(new Animated.Value(0), {
                toValue: 0,
                duration: 0,
                useNativeDriver: false,
              }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: transitionSettings.fadeInDuration,
              useNativeDriver: Platform.OS !== "web",
            }),
          ]).start(() => {
            resolve();
          });
        }, 100); // Brief pause in the middle
      });
    });
  }, [currentConfig, fadeAnim, blurAnim, scaleAnim]);

  /**
   * Preserve zoom level when switching cameras
   */
  const preserveZoomLevel = useCallback(async (
    fromCamera: CameraType,
    toCamera: CameraType,
  ): Promise<void> => {
    if (!currentConfig.enableZoomPreservation) return;

    const currentZoom = zoomMetrics.currentZoom;
    const fromCameraCapability = availableCameras.find((cam) =>
      cam.type === fromCamera
    );
    const toCameraCapability = availableCameras.find((cam) =>
      cam.type === toCamera
    );

    if (!fromCameraCapability || !toCameraCapability) return;

    // Calculate appropriate zoom level for target camera
    const maxZoomRatio = toCameraCapability.maxZoom /
      fromCameraCapability.maxZoom;
    const preservedZoom = Math.min(
      currentZoom * maxZoomRatio,
      toCameraCapability.maxZoom,
    );

    // Apply preserved zoom with a slight delay to ensure camera is ready
    setTimeout(() => {
      setZoom(preservedZoom, false); // No animation for immediate application
    }, 200);
  }, [
    currentConfig.enableZoomPreservation,
    zoomMetrics.currentZoom,
    availableCameras,
    setZoom,
  ]);

  /**
   * Handle camera swap with retry logic
   */
  const performCameraSwap = useCallback(async (
    targetCamera: CameraType,
    attempt = 1,
  ): Promise<boolean> => {
    try {
      const currentCamera = cameraStore.settings.cameraType;

      // Start transition animation
      const animationPromise = animateSwapTransition();

      // Perform actual camera switch
      await cameraStore.switchCamera(targetCamera);

      // Preserve zoom level
      await preserveZoomLevel(currentCamera, targetCamera);

      // Wait for animation to complete
      await animationPromise;

      return true;
    } catch (error) {
      // console.error(`Camera swap attempt ${attempt} failed:`, error);

      if (attempt < currentConfig.retryAttempts) {
        // Retry after delay
        await new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(
            resolve,
            currentConfig.retryDelay,
          );
        });

        return performCameraSwap(targetCamera, attempt + 1);
      }

      throw error;
    }
  }, [
    cameraStore,
    animateSwapTransition,
    preserveZoomLevel,
    currentConfig.retryAttempts,
    currentConfig.retryDelay,
  ]);

  /**
   * Main camera swap function
   */
  const swapCamera = useCallback(
    async (targetCamera?: CameraType): Promise<boolean> => {
      const startTime = Date.now();
      setSwapError(null);

      try {
        // Determine target camera
        const currentCamera = cameraStore.settings.cameraType;
        const finalTargetCamera = targetCamera ||
          (currentCamera === "front" ? "back" : "front");

        // Skip if already on target camera
        if (currentCamera === finalTargetCamera) {
          return true;
        }

        // Validate swap is allowed
        const validation = validateCameraSwap(finalTargetCamera);
        if (!validation.allowed) {
          setSwapError(validation.reason || "Camera swap not allowed");
          return false;
        }

        setIsSwapping(true);

        // Set timeout for swap operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          swapTimeoutRef.current = setTimeout(() => {
            reject(new Error("Camera swap timeout"));
          }, currentConfig.transitionSettings.duration + 5000);
        });

        // Perform swap with timeout
        await Promise.race([
          performCameraSwap(finalTargetCamera),
          timeoutPromise,
        ]);

        // Update metrics
        const swapTime = Date.now() - startTime;
        setMetrics((prev) => ({
          ...prev,
          swapCount: prev.swapCount + 1,
          lastSwapTime: swapTime,
          averageSwapTime: prev.swapCount === 0
            ? swapTime
            : (prev.averageSwapTime + swapTime) / 2,
        }));

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Camera swap failed";
        setSwapError(errorMessage);

        setMetrics((prev) => ({
          ...prev,
          failureCount: prev.failureCount + 1,
        }));

        return false;
      } finally {
        setIsSwapping(false);

        // Clear timeout
        if (swapTimeoutRef.current) {
          clearTimeout(swapTimeoutRef.current);
          swapTimeoutRef.current = null;
        }
      }
    },
    [
      cameraStore.settings.cameraType,
      validateCameraSwap,
      performCameraSwap,
      currentConfig.transitionSettings.duration,
    ],
  );

  /**
   * Get current camera capability
   */
  const getCurrentCameraCapability = useCallback(
    (): CameraCapability | null => {
      return availableCameras.find((cam) =>
        cam.type === cameraStore.settings.cameraType
      ) || null;
    },
    [availableCameras, cameraStore.settings.cameraType],
  );

  /**
   * Get available camera types
   */
  const getAvailableCameraTypes = useCallback((): CameraType[] => {
    return availableCameras
      .filter((cam) => cam.isAvailable)
      .map((cam) => cam.type);
  }, [availableCameras]);

  /**
   * Check if camera swap is currently possible
   */
  const canSwapCamera = useCallback((targetCamera?: CameraType): boolean => {
    if (isSwapping) return false;

    const currentCamera = cameraStore.settings.cameraType;
    const finalTargetCamera = targetCamera ||
      (currentCamera === "front" ? "back" : "front");

    return validateCameraSwap(finalTargetCamera).allowed;
  }, [isSwapping, cameraStore.settings.cameraType, validateCameraSwap]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<CameraSwapConfig>) => {
    setCurrentConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    setMetrics({
      swapCount: 0,
      averageSwapTime: 0,
      lastSwapTime: 0,
      failureCount: 0,
      thermalBlocks: 0,
      stateBlocks: 0,
    });
  }, []);

  // Initialize camera capabilities on mount
  useEffect(() => {
    if (currentConfig.enableCapabilityDetection) {
      detectCameraCapabilities();
    }
  }, [currentConfig.enableCapabilityDetection, detectCameraCapabilities]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Current state
    availableCameras,
    currentCamera: cameraStore.settings.cameraType,
    isSwapping,
    swapError,
    metrics,
    config: currentConfig,

    // Camera capabilities
    getCurrentCameraCapability,
    getAvailableCameraTypes,
    canSwapCamera,

    // Main actions
    swapCamera,
    swapToFront: () => swapCamera("front"),
    swapToBack: () => swapCamera("back"),
    toggleCamera: () => swapCamera(),

    // Animation values for UI integration
    fadeAnim,
    blurAnim,
    scaleAnim,

    // Configuration and utilities
    updateConfig,
    resetMetrics,
    detectCameraCapabilities,

    // Validation helpers
    validateCameraSwap,

    // Status checks
    hasMultipleCameras:
      availableCameras.filter((cam) => cam.isAvailable).length > 1,
    hasFrontCamera: availableCameras.some((cam) =>
      cam.type === "front" && cam.isAvailable
    ),
    hasBackCamera: availableCameras.some((cam) =>
      cam.type === "back" && cam.isAvailable
    ),
  };
};

/**
 * Simplified camera swap hook for basic usage
 */
export const useSimpleCameraSwap = () => {
  const enhancedSwap = useEnhancedCameraSwap({
    enableTransitions: true,
    enableCapabilityDetection: true,
    enableZoomPreservation: true,
  });

  return {
    currentCamera: enhancedSwap.currentCamera,
    isSwapping: enhancedSwap.isSwapping,
    canSwap: enhancedSwap.hasMultipleCameras && !enhancedSwap.isSwapping,
    swapCamera: enhancedSwap.toggleCamera,
    swapError: enhancedSwap.swapError,
  };
};
