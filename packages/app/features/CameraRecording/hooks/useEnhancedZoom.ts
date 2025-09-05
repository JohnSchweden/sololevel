import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useEnhancedCameraStore } from "../../../stores/enhancedCameraStore";
import { usePerformanceStore } from "../../../stores/performanceStore";

/**
 * Enhanced Zoom Controls Hook for Phase 2b
 * Provides smooth zoom transitions, gesture support, and performance-aware zoom management
 * Based on native pipeline architecture with thermal-aware zoom limitations
 */

export interface ZoomLevel {
  value: number;
  label: string;
  isOptimal: boolean;
  thermalSafe: boolean;
}

export interface ZoomCapabilities {
  minZoom: number;
  maxZoom: number;
  optimalZoom: number;
  supportedLevels: ZoomLevel[];
  supportsSmooth: boolean;
  supportsPinchGesture: boolean;
}

export interface ZoomTransition {
  duration: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  enabled: boolean;
}

export interface ZoomConfig {
  enableSmoothing: boolean;
  enableGestures: boolean;
  thermalManagement: boolean;
  performanceOptimization: boolean;
  transitionSettings: ZoomTransition;
  customLevels?: number[];
}

export interface ZoomMetrics {
  currentZoom: number;
  targetZoom: number;
  isTransitioning: boolean;
  transitionProgress: number;
  gestureActive: boolean;
  lastChangeTime: number;
  changeCount: number;
  thermalLimitations: boolean;
}

const defaultConfig: ZoomConfig = {
  enableSmoothing: true,
  enableGestures: Platform.OS !== "web",
  thermalManagement: true,
  performanceOptimization: true,
  transitionSettings: {
    duration: 300,
    easing: "ease-out",
    enabled: true,
  },
};

const defaultZoomLevels = [0.5, 1, 2, 3, 5, 8, 10];

/**
 * Enhanced Zoom Hook
 */
export const useEnhancedZoom = (config: Partial<ZoomConfig> = {}) => {
  const [currentConfig, setCurrentConfig] = useState<ZoomConfig>({
    ...defaultConfig,
    ...config,
  });

  const [capabilities, setCapabilities] = useState<ZoomCapabilities>({
    minZoom: 1,
    maxZoom: 10,
    optimalZoom: 1,
    supportedLevels: [],
    supportsSmooth: true,
    supportsPinchGesture: Platform.OS !== "web",
  });

  const [metrics, setMetrics] = useState<ZoomMetrics>({
    currentZoom: 1,
    targetZoom: 1,
    isTransitioning: false,
    transitionProgress: 0,
    gestureActive: false,
    lastChangeTime: 0,
    changeCount: 0,
    thermalLimitations: false,
  });

  // Animation and refs
  const zoomAnimation = useRef(new Animated.Value(1)).current;
  const gestureRef = useRef<any>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store references
  const cameraStore = useEnhancedCameraStore();
  const performanceStore = usePerformanceStore();

  /**
   * Calculate zoom capabilities based on device and thermal state
   */
  const calculateCapabilities = useCallback(() => {
    const { system } = performanceStore;
    const { thermalState, batteryLevel } = system;
    const { availableCameras, maxZoom: deviceMaxZoom } =
      cameraStore.capabilities;

    // Get current camera capabilities
    const currentCamera = availableCameras.find(
      (cam) => cam.type === cameraStore.settings.cameraType,
    );

    const baseMinZoom = currentCamera?.minZoom || 1;
    const baseMaxZoom = Math.min(currentCamera?.maxZoom || 10, 10);

    // Apply thermal limitations
    let effectiveMaxZoom = baseMaxZoom;
    let thermalLimited = false;

    if (currentConfig.thermalManagement) {
      switch (thermalState) {
        case "critical":
          effectiveMaxZoom = Math.min(baseMaxZoom, 3);
          thermalLimited = true;
          break;
        case "serious":
          effectiveMaxZoom = Math.min(baseMaxZoom, 5);
          thermalLimited = true;
          break;
        case "fair":
          effectiveMaxZoom = Math.min(baseMaxZoom, 8);
          break;
      }
    }

    // Apply battery limitations
    if (currentConfig.performanceOptimization && batteryLevel < 20) {
      effectiveMaxZoom = Math.min(effectiveMaxZoom, 5);
    }

    // Generate supported zoom levels
    const customLevels = currentConfig.customLevels || defaultZoomLevels;
    const supportedLevels: ZoomLevel[] = customLevels
      .filter((level) => level >= baseMinZoom && level <= effectiveMaxZoom)
      .map((level) => ({
        value: level,
        label: `${level}x`,
        isOptimal: level <= 3, // Levels 1-3x are generally optimal
        thermalSafe: level <= (thermalLimited ? 3 : effectiveMaxZoom),
      }));

    // Ensure we always have 1x
    if (!supportedLevels.find((level) => level.value === 1)) {
      supportedLevels.unshift({
        value: 1,
        label: "1x",
        isOptimal: true,
        thermalSafe: true,
      });
    }

    // Sort by zoom value
    supportedLevels.sort((a, b) => a.value - b.value);

    const newCapabilities: ZoomCapabilities = {
      minZoom: baseMinZoom,
      maxZoom: effectiveMaxZoom,
      optimalZoom: Math.min(3, effectiveMaxZoom),
      supportedLevels,
      supportsSmooth: currentConfig.enableSmoothing,
      supportsPinchGesture: currentConfig.enableGestures &&
        Platform.OS !== "web",
    };

    setCapabilities(newCapabilities);
    setMetrics((prev) => ({
      ...prev,
      thermalLimitations: thermalLimited,
    }));

    return newCapabilities;
  }, [
    currentConfig.thermalManagement,
    currentConfig.performanceOptimization,
    currentConfig.enableSmoothing,
    currentConfig.enableGestures,
    currentConfig.customLevels,
    performanceStore.system,
    cameraStore.capabilities,
    cameraStore.settings.cameraType,
  ]);

  /**
   * Smooth zoom transition with animation
   */
  const animateZoomTransition = useCallback(
    (targetZoom: number, duration?: number) => {
      if (!currentConfig.transitionSettings.enabled) {
        setMetrics((prev) => ({ ...prev, currentZoom: targetZoom }));
        return Promise.resolve();
      }

      const animationDuration = duration ||
        currentConfig.transitionSettings.duration;

      setMetrics((prev) => ({
        ...prev,
        targetZoom,
        isTransitioning: true,
        transitionProgress: 0,
      }));

      return new Promise<void>((resolve) => {
        // Clear any existing transition
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        // Configure animation easing
        let easingFunction = Animated.timing;
        switch (currentConfig.transitionSettings.easing) {
          case "ease-in": {
            easingFunction = Animated.timing;
            break;
          }
          case "ease-out": {
            easingFunction = Animated.timing;
            break;
          }
          case "ease-in-out": {
            easingFunction = Animated.timing;
            break;
          }
          default: {
            easingFunction = Animated.timing;
          }
        }

        // Start animation
        easingFunction(zoomAnimation, {
          toValue: targetZoom,
          duration: animationDuration,
          useNativeDriver: false,
        }).start(() => {
          setMetrics((prev) => ({
            ...prev,
            currentZoom: targetZoom,
            isTransitioning: false,
            transitionProgress: 1,
            lastChangeTime: Date.now(),
            changeCount: prev.changeCount + 1,
          }));
          resolve();
        });

        // Update progress during animation
        const progressInterval = setInterval(() => {
          setMetrics((prev) => {
            if (!prev.isTransitioning) {
              clearInterval(progressInterval);
              return prev;
            }
            return {
              ...prev,
              transitionProgress: Math.min(
                (Date.now() - prev.lastChangeTime) / animationDuration,
                1,
              ),
            };
          });
        }, 16); // ~60fps updates
      });
    },
    [currentConfig.transitionSettings, zoomAnimation],
  );

  /**
   * Set zoom to specific level
   */
  const setZoom = useCallback(
    async (zoomLevel: number, animated = true) => {
      const clampedZoom = Math.max(
        capabilities.minZoom,
        Math.min(capabilities.maxZoom, zoomLevel),
      );

      // Update camera store
      cameraStore.setZoomLevel(clampedZoom as any);

      if (animated && currentConfig.transitionSettings.enabled) {
        await animateZoomTransition(clampedZoom);
      } else {
        setMetrics((prev) => ({
          ...prev,
          currentZoom: clampedZoom,
          targetZoom: clampedZoom,
          lastChangeTime: Date.now(),
          changeCount: prev.changeCount + 1,
        }));
      }
    },
    [
      capabilities,
      cameraStore,
      currentConfig.transitionSettings.enabled,
      animateZoomTransition,
    ],
  );

  /**
   * Zoom to next available level
   */
  const zoomIn = useCallback(
    async (animated = true) => {
      const currentZoom = metrics.currentZoom;
      const nextLevel = capabilities.supportedLevels.find(
        (level) => level.value > currentZoom,
      );

      if (nextLevel) {
        await setZoom(nextLevel.value, animated);
      }
    },
    [metrics.currentZoom, capabilities.supportedLevels, setZoom],
  );

  /**
   * Zoom to previous available level
   */
  const zoomOut = useCallback(
    async (animated = true) => {
      const currentZoom = metrics.currentZoom;
      const prevLevel = capabilities.supportedLevels
        .slice()
        .reverse()
        .find((level) => level.value < currentZoom);

      if (prevLevel) {
        await setZoom(prevLevel.value, animated);
      }
    },
    [metrics.currentZoom, capabilities.supportedLevels, setZoom],
  );

  /**
   * Reset zoom to optimal level (usually 1x)
   */
  const resetZoom = useCallback(
    async (animated = true) => {
      await setZoom(capabilities.optimalZoom, animated);
    },
    [capabilities.optimalZoom, setZoom],
  );

  /**
   * Zoom by relative amount (e.g., 1.5 for 50% increase)
   */
  const zoomBy = useCallback(
    async (factor: number, animated = true) => {
      const newZoom = metrics.currentZoom * factor;
      await setZoom(newZoom, animated);
    },
    [metrics.currentZoom, setZoom],
  );

  /**
   * Handle pinch gesture (for native platforms)
   */
  const handlePinchGesture = useCallback(
    (scale: number, state: "began" | "changed" | "ended") => {
      if (!capabilities.supportsPinchGesture) return;

      switch (state) {
        case "began":
          setMetrics((prev) => ({ ...prev, gestureActive: true }));
          break;

        case "changed":
          const newZoom = Math.max(
            capabilities.minZoom,
            Math.min(capabilities.maxZoom, metrics.currentZoom * scale),
          );
          setMetrics((prev) => ({ ...prev, currentZoom: newZoom }));
          // Update camera store immediately for responsive gesture
          cameraStore.setZoomLevel(newZoom as any);
          break;

        case "ended":
          setMetrics((prev) => ({
            ...prev,
            gestureActive: false,
            targetZoom: prev.currentZoom,
            lastChangeTime: Date.now(),
            changeCount: prev.changeCount + 1,
          }));
          break;
      }
    },
    [capabilities, metrics.currentZoom, cameraStore],
  );

  /**
   * Get zoom level info
   */
  const getZoomInfo = useCallback(() => {
    const currentLevel = capabilities.supportedLevels.find(
      (level) => Math.abs(level.value - metrics.currentZoom) < 0.1,
    );

    return {
      current: metrics.currentZoom,
      target: metrics.targetZoom,
      level: currentLevel,
      canZoomIn: metrics.currentZoom < capabilities.maxZoom,
      canZoomOut: metrics.currentZoom > capabilities.minZoom,
      isOptimal: currentLevel?.isOptimal || false,
      isThermalSafe: currentLevel?.thermalSafe || false,
      progress: metrics.transitionProgress,
    };
  }, [capabilities, metrics]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<ZoomConfig>) => {
    setCurrentConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  // Initialize capabilities when dependencies change
  useEffect(() => {
    calculateCapabilities();
  }, [calculateCapabilities]);

  // Monitor thermal state changes
  useEffect(() => {
    const { thermalState } = performanceStore.system;
    if (currentConfig.thermalManagement) {
      calculateCapabilities();

      // Auto-reduce zoom if thermal state is critical
      if (thermalState === "critical" && metrics.currentZoom > 3) {
        setZoom(3, true);
      }
    }
  }, [
    performanceStore.system.thermalState,
    currentConfig.thermalManagement,
    calculateCapabilities,
    metrics.currentZoom,
    setZoom,
  ]);

  // Monitor camera changes
  useEffect(() => {
    calculateCapabilities();
    // Reset zoom when camera changes
    if (cameraStore.settings.cameraType) {
      resetZoom(false);
    }
  }, [cameraStore.settings.cameraType, calculateCapabilities, resetZoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Current state
    capabilities,
    metrics,
    config: currentConfig,
    zoomInfo: getZoomInfo(),

    // Actions
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomBy,

    // Gesture handling
    handlePinchGesture,
    gestureRef,

    // Animation
    zoomAnimation,
    animateZoomTransition,

    // Configuration
    updateConfig,
    calculateCapabilities,

    // Utilities
    isZoomAvailable: (zoom: number) =>
      zoom >= capabilities.minZoom && zoom <= capabilities.maxZoom,
    getClosestZoomLevel: (zoom: number) =>
      capabilities.supportedLevels.reduce((closest, level) =>
        Math.abs(level.value - zoom) < Math.abs(closest.value - zoom)
          ? level
          : closest
      ),
  };
};

/**
 * Simplified zoom hook for basic usage
 */
export const useSimpleZoom = () => {
  const enhancedZoom = useEnhancedZoom();

  return {
    currentZoom: enhancedZoom.metrics.currentZoom,
    canZoomIn: enhancedZoom.zoomInfo.canZoomIn,
    canZoomOut: enhancedZoom.zoomInfo.canZoomOut,
    zoomIn: enhancedZoom.zoomIn,
    zoomOut: enhancedZoom.zoomOut,
    resetZoom: enhancedZoom.resetZoom,
    supportedLevels: enhancedZoom.capabilities.supportedLevels,
  };
};
