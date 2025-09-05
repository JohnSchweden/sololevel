import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePerformanceStore } from "../../../stores/performance";
import { usePoseStore } from "../../../stores/poseStore";
import { useThermalStore } from "../../../stores/thermal";
import type { PerformanceMetrics } from "../types/performance";
import type {
  AdaptiveQualitySettings,
  PoseData,
  PoseDetectionMetrics,
  ProcessingQuality,
} from "../types/pose";
import type { ThermalState } from "../types/thermal";

interface PosePerformanceMetrics extends PoseDetectionMetrics {
  // Enhanced metrics
  processingEfficiency: number;
  qualityScore: number;
  adaptiveScore: number;
  thermalImpact: number;
  batteryEfficiency: number;

  // Trend analysis
  fpsTrend: "improving" | "stable" | "declining";
  accuracyTrend: "improving" | "stable" | "declining";
  performanceTrend: "improving" | "stable" | "declining";

  // Recommendations
  recommendedQuality: ProcessingQuality;
  shouldThrottle: boolean;
  canUpgrade: boolean;
}

interface AdaptiveQualityManager {
  currentQuality: ProcessingQuality;
  targetQuality: ProcessingQuality;
  isAdjusting: boolean;
  lastAdjustment: number;
  adjustmentReason: string;

  // Quality thresholds
  thresholds: {
    cpu: { low: number; medium: number; high: number };
    memory: { low: number; medium: number; high: number };
    thermal: { low: number; medium: number; high: number };
    fps: { low: number; medium: number; high: number };
    battery: { low: number; medium: number; high: number };
  };
}

/**
 * Enhanced pose metrics hook with adaptive quality management
 */
export const usePoseMetrics = () => {
  const poseStore = usePoseStore();
  const performanceStore = usePerformanceStore();
  const thermalStore = useThermalStore();

  const [enhancedMetrics, setEnhancedMetrics] = useState<
    PosePerformanceMetrics | null
  >(null);
  const [adaptiveManager, setAdaptiveManager] = useState<
    AdaptiveQualityManager
  >({
    currentQuality: "medium",
    targetQuality: "medium",
    isAdjusting: false,
    lastAdjustment: 0,
    adjustmentReason: "",
    thresholds: {
      cpu: { low: 80, medium: 60, high: 40 },
      memory: { low: 85, medium: 70, high: 50 },
      thermal: { low: 85, medium: 70, high: 50 },
      fps: { low: 15, medium: 25, high: 30 },
      battery: { low: 20, medium: 50, high: 80 },
    },
  });

  const metricsHistoryRef = useRef<PoseDetectionMetrics[]>([]);
  const performanceHistoryRef = useRef<PerformanceMetrics[]>([]);
  const thermalHistoryRef = useRef<ThermalState[]>([]);
  const lastQualityAdjustmentRef = useRef(0);

  // Calculate enhanced metrics
  const calculateEnhancedMetrics = useCallback((
    poseMetrics: PoseDetectionMetrics,
    performanceMetrics: PerformanceMetrics | null,
    thermalState: ThermalState | null,
  ): PosePerformanceMetrics => {
    const history = metricsHistoryRef.current;

    // Processing efficiency (frames processed vs dropped)
    const processingEfficiency = poseMetrics.totalFramesProcessed > 0
      ? ((poseMetrics.totalFramesProcessed - poseMetrics.droppedFrames) /
        poseMetrics.totalFramesProcessed) * 100
      : 0;

    // Quality score based on confidence and accuracy
    const qualityScore =
      (poseMetrics.confidence * 0.6 + poseMetrics.accuracy * 0.4) * 100;

    // Adaptive score (how well the system is adapting to conditions)
    let adaptiveScore = 100;

    // Reduce score if FPS is too low for current quality
    const expectedFps = adaptiveManager.currentQuality === "high"
      ? 30
      : adaptiveManager.currentQuality === "medium"
      ? 25
      : 15;
    if (poseMetrics.fps < expectedFps * 0.8) {
      adaptiveScore -= 20;
    }

    // Thermal impact assessment
    let thermalImpact = 0;
    if (thermalState) {
      switch (thermalState.state) {
        case "critical":
          thermalImpact = 100;
          break;
        case "serious":
          thermalImpact = 75;
          break;
        case "fair":
          thermalImpact = 50;
          break;
        case "nominal":
          thermalImpact = 25;
          break;
        default:
          thermalImpact = 0;
      }
    }

    // Battery efficiency (inverse of CPU usage and thermal impact)
    const cpuUsage = performanceMetrics?.cpu?.usage || 0;
    const batteryEfficiency = Math.max(
      0,
      100 - (cpuUsage * 0.7 + thermalImpact * 0.3),
    );

    // Trend analysis
    const fpsTrend = calculateTrend(history.map((m) => m.fps));
    const accuracyTrend = calculateTrend(history.map((m) => m.accuracy));
    const performanceTrend = calculateTrend(
      history.map((m) => m.averageInferenceTime),
      true,
    ); // Lower is better

    // Quality recommendations
    const recommendedQuality = calculateRecommendedQuality(
      poseMetrics,
      performanceMetrics,
      thermalState,
      adaptiveManager.thresholds,
    );

    const shouldThrottle = thermalImpact > 75 || cpuUsage > 85 ||
      poseMetrics.fps < 10;
    const canUpgrade = !shouldThrottle &&
      poseMetrics.fps > expectedFps * 1.2 &&
      thermalImpact < 50 &&
      cpuUsage < 60;

    return {
      ...poseMetrics,
      processingEfficiency,
      qualityScore,
      adaptiveScore,
      thermalImpact,
      batteryEfficiency,
      fpsTrend,
      accuracyTrend,
      performanceTrend,
      recommendedQuality,
      shouldThrottle,
      canUpgrade,
    };
  }, [adaptiveManager]);

  // Calculate trend from historical data
  const calculateTrend = useCallback(
    (
      values: number[],
      lowerIsBetter = false,
    ): "improving" | "stable" | "declining" => {
      if (values.length < 3) return "stable";

      const recent = values.slice(-5); // Last 5 values
      const older = values.slice(-10, -5); // Previous 5 values

      if (recent.length === 0 || older.length === 0) return "stable";

      const recentAvg = recent.reduce((sum, val) => sum + val, 0) /
        recent.length;
      const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

      const threshold = Math.abs(recentAvg - olderAvg) / olderAvg;

      if (threshold < 0.05) return "stable"; // Less than 5% change

      const isImproving = lowerIsBetter
        ? recentAvg < olderAvg
        : recentAvg > olderAvg;
      return isImproving ? "improving" : "declining";
    },
    [],
  );

  // Calculate recommended quality based on system conditions
  const calculateRecommendedQuality = useCallback((
    poseMetrics: PoseDetectionMetrics,
    performanceMetrics: PerformanceMetrics | null,
    thermalState: ThermalState | null,
    thresholds: AdaptiveQualityManager["thresholds"],
  ): ProcessingQuality => {
    let score = 100;

    // CPU usage impact
    const cpuUsage = performanceMetrics?.cpu?.usage || 0;
    if (cpuUsage > thresholds.cpu.low) score -= 30;
    else if (cpuUsage > thresholds.cpu.medium) score -= 15;

    // Memory usage impact
    const memoryUsage = performanceMetrics?.memory
      ? (performanceMetrics.memory.used / performanceMetrics.memory.total) * 100
      : 0;
    if (memoryUsage > thresholds.memory.low) score -= 25;
    else if (memoryUsage > thresholds.memory.medium) score -= 10;

    // Thermal impact
    if (thermalState) {
      switch (thermalState.state) {
        case "critical":
          score -= 50;
          break;
        case "serious":
          score -= 35;
          break;
        case "fair":
          score -= 20;
          break;
      }
    }

    // FPS impact
    if (poseMetrics.fps < thresholds.fps.low) score -= 30;
    else if (poseMetrics.fps < thresholds.fps.medium) score -= 15;

    // Battery level impact (if available)
    const batteryLevel = performanceMetrics?.battery?.level || 100;
    if (batteryLevel < thresholds.battery.low) score -= 40;
    else if (batteryLevel < thresholds.battery.medium) score -= 20;

    // Determine quality based on score
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }, []);

  // Adaptive quality adjustment
  const adjustQualityAdaptively = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAdjustment = now - lastQualityAdjustmentRef.current;

    // Don't adjust too frequently (minimum 5 seconds between adjustments)
    if (timeSinceLastAdjustment < 5000) return;

    const currentMetrics = poseStore.getState().metrics;
    const performanceMetrics = performanceStore.getState().currentMetrics;
    const thermalState = thermalStore.getState().currentState;

    if (!enhancedMetrics) return;

    const recommendedQuality = calculateRecommendedQuality(
      currentMetrics,
      performanceMetrics,
      thermalState,
      adaptiveManager.thresholds,
    );

    if (recommendedQuality !== adaptiveManager.currentQuality) {
      let adjustmentReason = "";

      // Determine reason for adjustment
      if (enhancedMetrics.shouldThrottle) {
        adjustmentReason = "Performance throttling required";
      } else if (enhancedMetrics.canUpgrade) {
        adjustmentReason = "Performance headroom available";
      } else if (enhancedMetrics.thermalImpact > 75) {
        adjustmentReason = "Thermal management";
      } else if (currentMetrics.fps < 15) {
        adjustmentReason = "Low frame rate detected";
      } else {
        adjustmentReason = "Adaptive optimization";
      }

      setAdaptiveManager((prev) => ({
        ...prev,
        targetQuality: recommendedQuality,
        isAdjusting: true,
        lastAdjustment: now,
        adjustmentReason,
      }));

      // Apply the quality change
      poseStore.getState().adjustQuality(recommendedQuality);
      lastQualityAdjustmentRef.current = now;

      // Update current quality after a brief delay
      setTimeout(() => {
        setAdaptiveManager((prev) => ({
          ...prev,
          currentQuality: recommendedQuality,
          isAdjusting: false,
        }));
      }, 1000);
    }
  }, [
    poseStore,
    performanceStore,
    thermalStore,
    enhancedMetrics,
    adaptiveManager,
    calculateRecommendedQuality,
  ]);

  // Update metrics history
  const updateMetricsHistory = useCallback((metrics: PoseDetectionMetrics) => {
    metricsHistoryRef.current.push(metrics);

    // Keep only last 20 entries
    if (metricsHistoryRef.current.length > 20) {
      metricsHistoryRef.current.shift();
    }
  }, []);

  // Update performance history
  const updatePerformanceHistory = useCallback(
    (metrics: PerformanceMetrics) => {
      performanceHistoryRef.current.push(metrics);

      // Keep only last 20 entries
      if (performanceHistoryRef.current.length > 20) {
        performanceHistoryRef.current.shift();
      }
    },
    [],
  );

  // Update thermal history
  const updateThermalHistory = useCallback((state: ThermalState) => {
    thermalHistoryRef.current.push(state);

    // Keep only last 20 entries
    if (thermalHistoryRef.current.length > 20) {
      thermalHistoryRef.current.shift();
    }
  }, []);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    if (!enhancedMetrics) return [];

    const insights: string[] = [];

    if (enhancedMetrics.processingEfficiency < 80) {
      insights.push(
        `Processing efficiency is low (${
          enhancedMetrics.processingEfficiency.toFixed(1)
        }%). Consider reducing quality or frame rate.`,
      );
    }

    if (enhancedMetrics.fpsTrend === "declining") {
      insights.push("Frame rate is declining. System may be under stress.");
    }

    if (enhancedMetrics.thermalImpact > 75) {
      insights.push(
        "High thermal impact detected. Consider enabling thermal throttling.",
      );
    }

    if (enhancedMetrics.batteryEfficiency < 50) {
      insights.push(
        "Battery efficiency is low. Pose detection may be consuming significant power.",
      );
    }

    if (enhancedMetrics.canUpgrade) {
      insights.push("System has headroom for higher quality processing.");
    }

    if (enhancedMetrics.qualityScore < 60) {
      insights.push(
        "Pose detection quality is below optimal. Check lighting and camera positioning.",
      );
    }

    return insights;
  }, [enhancedMetrics]);

  // Subscribe to pose store changes
  useEffect(() => {
    const unsubscribe = poseStore.subscribe((state) => {
      updateMetricsHistory(state.metrics);

      const performanceMetrics = performanceStore.getState().currentMetrics;
      const thermalState = thermalStore.getState().currentState;

      const enhanced = calculateEnhancedMetrics(
        state.metrics,
        performanceMetrics,
        thermalState,
      );

      setEnhancedMetrics(enhanced);
    });

    return unsubscribe;
  }, [
    poseStore,
    performanceStore,
    thermalStore,
    calculateEnhancedMetrics,
    updateMetricsHistory,
  ]);

  // Subscribe to performance store changes
  useEffect(() => {
    const unsubscribe = performanceStore.subscribe((state) => {
      if (state.currentMetrics) {
        updatePerformanceHistory(state.currentMetrics);
      }
    });

    return unsubscribe;
  }, [performanceStore, updatePerformanceHistory]);

  // Subscribe to thermal store changes
  useEffect(() => {
    const unsubscribe = thermalStore.subscribe((state) => {
      if (state.currentState) {
        updateThermalHistory(state.currentState);
      }
    });

    return unsubscribe;
  }, [thermalStore, updateThermalHistory]);

  // Adaptive quality management loop
  useEffect(() => {
    if (!poseStore.getState().config.enableAdaptiveQuality) return;

    const interval = setInterval(() => {
      adjustQualityAdaptively();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [adjustQualityAdaptively, poseStore]);

  return {
    // Enhanced metrics
    metrics: enhancedMetrics,

    // Adaptive quality manager
    adaptiveManager,

    // Historical data
    metricsHistory: metricsHistoryRef.current,
    performanceHistory: performanceHistoryRef.current,
    thermalHistory: thermalHistoryRef.current,

    // Insights and recommendations
    insights: getPerformanceInsights(),

    // Actions
    adjustQualityAdaptively,

    // Computed values
    isPerformingWell: enhancedMetrics
      ? enhancedMetrics.processingEfficiency > 80 &&
        enhancedMetrics.qualityScore > 70 &&
        enhancedMetrics.fps > 20
      : false,

    needsOptimization: enhancedMetrics
      ? enhancedMetrics.shouldThrottle ||
        enhancedMetrics.processingEfficiency < 60
      : false,

    canImproveQuality: enhancedMetrics?.canUpgrade || false,
  };
};

/**
 * Hook for pose detection performance monitoring with alerts
 */
export const usePosePerformanceMonitor = () => {
  const { metrics, insights, isPerformingWell, needsOptimization } =
    usePoseMetrics();
  const [alerts, setAlerts] = useState<
    Array<
      {
        id: string;
        type: "warning" | "error" | "info";
        message: string;
        timestamp: number;
      }
    >
  >([]);

  // Monitor for performance issues
  useEffect(() => {
    if (!metrics) return;

    const newAlerts: typeof alerts = [];

    // Critical performance issues
    if (metrics.fps < 10) {
      newAlerts.push({
        id: "low-fps",
        type: "error",
        message: `Critical: Frame rate dropped to ${
          metrics.fps.toFixed(1)
        } FPS`,
        timestamp: Date.now(),
      });
    }

    if (metrics.processingEfficiency < 50) {
      newAlerts.push({
        id: "low-efficiency",
        type: "error",
        message: `Critical: Processing efficiency at ${
          metrics.processingEfficiency.toFixed(1)
        }%`,
        timestamp: Date.now(),
      });
    }

    // Warning conditions
    if (metrics.thermalImpact > 80) {
      newAlerts.push({
        id: "thermal-warning",
        type: "warning",
        message: "High thermal impact detected - consider reducing quality",
        timestamp: Date.now(),
      });
    }

    if (metrics.batteryEfficiency < 30) {
      newAlerts.push({
        id: "battery-warning",
        type: "warning",
        message:
          "Low battery efficiency - pose detection consuming significant power",
        timestamp: Date.now(),
      });
    }

    // Optimization opportunities
    if (metrics.canUpgrade) {
      newAlerts.push({
        id: "upgrade-opportunity",
        type: "info",
        message: "System has headroom for higher quality processing",
        timestamp: Date.now(),
      });
    }

    setAlerts(newAlerts);
  }, [metrics]);

  const clearAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    clearAlert,
    clearAllAlerts,
    isPerformingWell,
    needsOptimization,
    insights,

    // Summary status
    status: isPerformingWell ? "good" : needsOptimization ? "poor" : "fair",
  };
};
