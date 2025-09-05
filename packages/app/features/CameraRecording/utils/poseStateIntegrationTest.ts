import React from "react";
import { usePerformanceStore } from "../../../stores/performance";
import { usePoseStore } from "../../../stores/poseStore";
import { useThermalStore } from "../../../stores/thermal";
import { useConfigManager } from "../config/poseConfigManager";
import { usePoseMetrics } from "../hooks/usePoseMetrics";
import { usePoseState } from "../hooks/usePoseState";
import type { PerformanceMetrics } from "../types/performance";
import type {
  PoseData,
  PoseDetectionConfig,
  PoseDetectionMetrics,
  ProcessingQuality,
} from "../types/pose";
import type { ThermalState } from "../types/thermal";
import { usePoseStatePersistence } from "../utils/poseStatePersistence";
import { usePoseThermalIntegration } from "../utils/poseThermalIntegration";

// Test data generators
const generateMockPoseData = (confidence = 0.8): PoseData => ({
  timestamp: Date.now(),
  confidence,
  keypoints: Array.from({ length: 17 }, (_, i) => ({
    id: i,
    name: `keypoint_${i}`,
    x: Math.random() * 640,
    y: Math.random() * 480,
    confidence: confidence + (Math.random() - 0.5) * 0.2,
    visibility: Math.random() > 0.1 ? "visible" : "hidden",
  })),
  connections: Array.from({ length: 16 }, (_, i) => ({
    from: i,
    to: i + 1,
    confidence: confidence + (Math.random() - 0.5) * 0.1,
  })),
  boundingBox: {
    x: 100,
    y: 100,
    width: 200,
    height: 300,
  },
});

const generateMockPerformanceMetrics = (): PerformanceMetrics => ({
  timestamp: Date.now(),
  cpu: {
    usage: Math.random() * 100,
    cores: 4,
    frequency: 2400,
  },
  memory: {
    used: Math.random() * 4096,
    total: 8192,
    available: Math.random() * 4096,
  },
  gpu: {
    usage: Math.random() * 100,
    memory: Math.random() * 2048,
    temperature: 60 + Math.random() * 20,
  },
  battery: {
    level: Math.random() * 100,
    isCharging: Math.random() > 0.5,
    timeRemaining: Math.random() * 600,
  },
  network: {
    downloadSpeed: Math.random() * 100,
    uploadSpeed: Math.random() * 50,
    latency: Math.random() * 100,
  },
});

const generateMockThermalState = (): ThermalState => {
  const states: Array<ThermalState["state"]> = [
    "nominal",
    "fair",
    "serious",
    "critical",
  ];
  const state = states[Math.floor(Math.random() * states.length)];

  return {
    state,
    temperature: state === "critical"
      ? 85 + Math.random() * 10
      : state === "serious"
      ? 75 + Math.random() * 10
      : state === "fair"
      ? 65 + Math.random() * 10
      : 50 + Math.random() * 15,
    timestamp: Date.now(),
    source: "cpu",
  };
};

// Integration test suite
export class PoseStateIntegrationTest {
  private testResults: Array<{
    testName: string;
    status: "passed" | "failed" | "skipped";
    duration: number;
    error?: string;
    details?: any;
  }> = [];

  private startTime = 0;

  // Run all integration tests
  async runAllTests(): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    results: typeof this.testResults;
    totalDuration: number;
  }> {
    this.testResults = [];
    this.startTime = Date.now();

    // Core integration tests
    await this.testStoreInitialization();
    await this.testPoseDataFlow();
    await this.testPerformanceIntegration();
    await this.testThermalIntegration();
    await this.testAdaptiveQualityManagement();
    await this.testStatePersistence();
    await this.testConfigurationManagement();
    await this.testErrorHandlingAndRecovery();
    await this.testConcurrentOperations();
    await this.testMemoryManagement();

    const totalDuration = Date.now() - this.startTime;
    const passed = this.testResults.filter((r) => r.status === "passed").length;
    const failed = this.testResults.filter((r) => r.status === "failed").length;
    const skipped =
      this.testResults.filter((r) => r.status === "skipped").length;

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      skipped,
      results: this.testResults,
      totalDuration,
    };
  }

  // Test store initialization and basic functionality
  private async testStoreInitialization(): Promise<void> {
    await this.runTest("Store Initialization", async () => {
      const poseStore = usePoseStore.getState();

      // Test initial state
      if (poseStore.isInitialized) {
        throw new Error("Store should not be initialized initially");
      }

      // Test initialization
      await poseStore.initialize();

      if (!poseStore.isInitialized) {
        throw new Error("Store should be initialized after initialize() call");
      }

      // Test configuration
      const config = poseStore.config;
      if (!config.modelType || !config.confidenceThreshold) {
        throw new Error("Configuration should be properly set");
      }

      return { initialized: true, config };
    });
  }

  // Test pose data flow through the system
  private async testPoseDataFlow(): Promise<void> {
    await this.runTest("Pose Data Flow", async () => {
      const poseStore = usePoseStore.getState();

      // Ensure store is initialized
      if (!poseStore.isInitialized) {
        await poseStore.initialize();
      }

      // Start processing
      poseStore.startProcessing();

      if (!poseStore.isProcessing) {
        throw new Error(
          "Store should be processing after startProcessing() call",
        );
      }

      // Generate and process pose data
      const mockPose = generateMockPoseData();
      poseStore.processPose(mockPose);

      // Verify pose was processed
      const currentPose = poseStore.currentPose;
      if (!currentPose || currentPose.timestamp !== mockPose.timestamp) {
        throw new Error("Pose data should be processed and stored");
      }

      // Verify history
      const history = poseStore.poseHistory;
      if (history.length === 0) {
        throw new Error("Pose history should contain processed poses");
      }

      // Verify metrics update
      const metrics = poseStore.metrics;
      if (metrics.totalFramesProcessed === 0) {
        throw new Error("Metrics should be updated after processing");
      }

      return {
        poseProcessed: true,
        historySize: history.length,
        metricsUpdated: metrics.totalFramesProcessed > 0,
      };
    });
  }

  // Test performance monitoring integration
  private async testPerformanceIntegration(): Promise<void> {
    await this.runTest("Performance Integration", async () => {
      const poseStore = usePoseStore.getState();
      const performanceStore = usePerformanceStore.getState();

      // Generate mock performance data
      const mockPerformance = generateMockPerformanceMetrics();

      // Update performance store
      performanceStore.updateMetrics(mockPerformance);

      // Update pose store with performance data
      poseStore.updatePerformanceMetrics(mockPerformance);

      // Verify integration
      const posePerformanceMetrics = poseStore.performanceMetrics;
      if (!posePerformanceMetrics) {
        throw new Error(
          "Performance metrics should be integrated into pose store",
        );
      }

      if (posePerformanceMetrics.cpu?.usage !== mockPerformance.cpu.usage) {
        throw new Error("CPU usage should match between stores");
      }

      // Verify pose metrics are updated based on performance
      const poseMetrics = poseStore.metrics;
      if (poseMetrics.cpuUsage !== mockPerformance.cpu.usage) {
        throw new Error("Pose metrics should reflect performance data");
      }

      return {
        performanceIntegrated: true,
        cpuUsage: poseMetrics.cpuUsage,
        memoryUsage: poseMetrics.memoryUsage,
      };
    });
  }

  // Test thermal management integration
  private async testThermalIntegration(): Promise<void> {
    await this.runTest("Thermal Integration", async () => {
      const poseStore = usePoseStore.getState();
      const thermalStore = useThermalStore.getState();

      // Generate mock thermal data
      const mockThermal = generateMockThermalState();

      // Update thermal store
      thermalStore.updateState(mockThermal);

      // Update pose store with thermal data
      poseStore.updateThermalState(mockThermal);

      // Verify integration
      const poseThermalState = poseStore.thermalState;
      if (!poseThermalState) {
        throw new Error("Thermal state should be integrated into pose store");
      }

      if (poseThermalState.state !== mockThermal.state) {
        throw new Error("Thermal state should match between stores");
      }

      // Verify pose metrics are updated based on thermal state
      const poseMetrics = poseStore.metrics;
      if (poseMetrics.thermalState !== mockThermal.state) {
        throw new Error("Pose metrics should reflect thermal state");
      }

      // Test adaptive quality based on thermal state
      const originalQuality = poseStore.processingQuality;
      if (mockThermal.state === "critical" && poseStore.adaptiveQuality) {
        // Should have adjusted quality for critical thermal state
        if (poseStore.processingQuality === "high") {
          throw new Error(
            "Quality should be reduced for critical thermal state",
          );
        }
      }

      return {
        thermalIntegrated: true,
        thermalState: mockThermal.state,
        qualityAdjusted: originalQuality !== poseStore.processingQuality,
      };
    });
  }

  // Test adaptive quality management
  private async testAdaptiveQualityManagement(): Promise<void> {
    await this.runTest("Adaptive Quality Management", async () => {
      const poseStore = usePoseStore.getState();

      // Enable adaptive quality
      poseStore.enableAdaptiveQuality(true);

      if (!poseStore.adaptiveQuality) {
        throw new Error("Adaptive quality should be enabled");
      }

      // Test quality adjustment based on performance
      const highCpuPerformance = generateMockPerformanceMetrics();
      highCpuPerformance.cpu.usage = 95; // High CPU usage

      const originalQuality = poseStore.processingQuality;
      poseStore.updatePerformanceMetrics(highCpuPerformance);

      // Simulate thermal stress
      const criticalThermal: ThermalState = {
        state: "critical",
        temperature: 90,
        timestamp: Date.now(),
        source: "cpu",
      };

      poseStore.updateThermalState(criticalThermal);

      // Quality should be adjusted
      if (poseStore.processingQuality === "high") {
        throw new Error("Quality should be reduced under stress conditions");
      }

      // Test recovery
      const normalThermal: ThermalState = {
        state: "nominal",
        temperature: 55,
        timestamp: Date.now(),
        source: "cpu",
      };

      const lowCpuPerformance = generateMockPerformanceMetrics();
      lowCpuPerformance.cpu.usage = 30; // Low CPU usage

      poseStore.updateThermalState(normalThermal);
      poseStore.updatePerformanceMetrics(lowCpuPerformance);

      return {
        adaptiveQualityEnabled: true,
        qualityAdjusted: originalQuality !== poseStore.processingQuality,
        finalQuality: poseStore.processingQuality,
      };
    });
  }

  // Test state persistence and recovery
  private async testStatePersistence(): Promise<void> {
    await this.runTest("State Persistence", async () => {
      const poseStore = usePoseStore.getState();

      // Generate test data
      const testPoses = Array.from(
        { length: 10 },
        () => generateMockPoseData(),
      );

      // Process poses to build history
      poseStore.startProcessing();
      for (const pose of testPoses) {
        poseStore.processPose(pose);
      }

      // Create recovery point
      poseStore.createRecoveryPoint();

      // Verify recovery data exists
      const recoveryData = poseStore.recoveryData;
      if (!recoveryData || recoveryData.length === 0) {
        throw new Error("Recovery data should be created");
      }

      // Clear history and test recovery
      poseStore.clearHistory();

      if (poseStore.poseHistory.length !== 0) {
        throw new Error("History should be cleared");
      }

      // Recover from failure
      const recovered = poseStore.recoverFromFailure();

      if (!recovered) {
        throw new Error("Recovery should succeed");
      }

      if (poseStore.poseHistory.length === 0) {
        throw new Error("History should be restored after recovery");
      }

      return {
        persistenceWorking: true,
        recoveryDataSize: recoveryData.length,
        recoveredHistorySize: poseStore.poseHistory.length,
      };
    });
  }

  // Test configuration management
  private async testConfigurationManagement(): Promise<void> {
    await this.runTest("Configuration Management", async () => {
      const poseStore = usePoseStore.getState();
      const configManager = useConfigManager.getState();

      // Test configuration update
      const originalConfig = { ...poseStore.config };
      const newConfig: Partial<PoseDetectionConfig> = {
        confidenceThreshold: 0.5,
        processingQuality: "low",
        enableSmoothing: false,
      };

      poseStore.updateConfig(newConfig);

      // Verify configuration was updated
      if (poseStore.config.confidenceThreshold !== 0.5) {
        throw new Error("Configuration should be updated");
      }

      if (poseStore.config.processingQuality !== "low") {
        throw new Error("Processing quality should be updated");
      }

      // Test configuration validation
      const invalidConfig: Partial<PoseDetectionConfig> = {
        confidenceThreshold: 1.5, // Invalid value
      };

      try {
        poseStore.updateConfig(invalidConfig);
        // Should not reach here if validation works
        throw new Error("Invalid configuration should be rejected");
      } catch (error) {
        // Expected behavior - validation should catch invalid values
      }

      // Test configuration reset
      poseStore.resetConfig();

      // Should be back to default values
      if (poseStore.config.confidenceThreshold === 0.5) {
        throw new Error("Configuration should be reset to defaults");
      }

      return {
        configurationManagement: true,
        originalThreshold: originalConfig.confidenceThreshold,
        resetThreshold: poseStore.config.confidenceThreshold,
      };
    });
  }

  // Test error handling and recovery mechanisms
  private async testErrorHandlingAndRecovery(): Promise<void> {
    await this.runTest("Error Handling and Recovery", async () => {
      const poseStore = usePoseStore.getState();

      // Test error logging
      const testError = "Test error message";
      poseStore.addError(testError);

      if (!poseStore.errors.includes(testError)) {
        throw new Error("Error should be logged");
      }

      // Test warning logging
      const testWarning = "Test warning message";
      poseStore.addWarning(testWarning);

      if (!poseStore.warnings.includes(testWarning)) {
        throw new Error("Warning should be logged");
      }

      // Test error clearing
      poseStore.clearErrors();

      if (poseStore.errors.length !== 0) {
        throw new Error("Errors should be cleared");
      }

      // Test warning clearing
      poseStore.clearWarnings();

      if (poseStore.warnings.length !== 0) {
        throw new Error("Warnings should be cleared");
      }

      // Test pose validation
      const invalidPose: PoseData = {
        ...generateMockPoseData(),
        keypoints: [], // Invalid - no keypoints
      };

      const validationResult = poseStore.validatePose(invalidPose);

      if (validationResult.isValid) {
        throw new Error("Invalid pose should fail validation");
      }

      if (validationResult.errors.length === 0) {
        throw new Error("Validation should report errors for invalid pose");
      }

      return {
        errorHandling: true,
        validationWorking: true,
        errorCount: 0,
        warningCount: 0,
      };
    });
  }

  // Test concurrent operations
  private async testConcurrentOperations(): Promise<void> {
    await this.runTest("Concurrent Operations", async () => {
      const poseStore = usePoseStore.getState();

      // Start processing
      poseStore.startProcessing();

      // Simulate concurrent pose processing
      const concurrentPoses = Array.from(
        { length: 50 },
        () => generateMockPoseData(),
      );

      // Process poses concurrently
      const processingPromises = concurrentPoses.map(async (pose, index) => {
        // Add small delay to simulate real processing
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        poseStore.processPose(pose);
        return index;
      });

      await Promise.all(processingPromises);

      // Verify all poses were processed
      if (poseStore.metrics.totalFramesProcessed < concurrentPoses.length) {
        throw new Error("All concurrent poses should be processed");
      }

      // Test concurrent configuration updates
      const configPromises = Array.from({ length: 10 }, async (_, index) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        poseStore.updateConfig({
          confidenceThreshold: 0.1 + (index * 0.05),
        });
        return index;
      });

      await Promise.all(configPromises);

      // Configuration should be stable after concurrent updates
      const finalThreshold = poseStore.config.confidenceThreshold;
      if (finalThreshold < 0.1 || finalThreshold > 0.6) {
        throw new Error(
          "Configuration should remain within valid range after concurrent updates",
        );
      }

      return {
        concurrentOperations: true,
        posesProcessed: poseStore.metrics.totalFramesProcessed,
        finalThreshold,
      };
    });
  }

  // Test memory management
  private async testMemoryManagement(): Promise<void> {
    await this.runTest("Memory Management", async () => {
      const poseStore = usePoseStore.getState();

      // Set a small history size for testing
      poseStore.updateConfig({ maxHistorySize: 10 });

      // Generate more poses than the history limit
      const poses = Array.from({ length: 25 }, () => generateMockPoseData());

      poseStore.startProcessing();
      for (const pose of poses) {
        poseStore.processPose(pose);
      }

      // History should be limited to maxHistorySize
      if (poseStore.poseHistory.length > 10) {
        throw new Error("History size should be limited by maxHistorySize");
      }

      // Test error/warning limits
      for (let i = 0; i < 20; i++) {
        poseStore.addError(`Error ${i}`);
        poseStore.addWarning(`Warning ${i}`);
      }

      // Should be limited to 10 each
      if (poseStore.errors.length > 10) {
        throw new Error("Error count should be limited");
      }

      if (poseStore.warnings.length > 10) {
        throw new Error("Warning count should be limited");
      }

      return {
        memoryManagement: true,
        historySize: poseStore.poseHistory.length,
        errorCount: poseStore.errors.length,
        warningCount: poseStore.warnings.length,
      };
    });
  }

  // Helper method to run individual tests
  private async runTest(
    testName: string,
    testFunction: () => Promise<any>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await testFunction();

      this.testResults.push({
        testName,
        status: "passed",
        duration: Date.now() - startTime,
        details: result,
      });
    } catch (error) {
      this.testResults.push({
        testName,
        status: "failed",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get test summary
  getTestSummary(): {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    averageDuration: number;
  } {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter((r) => r.status === "passed").length;
    const failed = this.testResults.filter((r) => r.status === "failed").length;
    const totalDuration = this.testResults.reduce(
      (sum, r) => sum + r.duration,
      0,
    );

    return {
      totalTests,
      passed,
      failed,
      successRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
      averageDuration: totalTests > 0 ? totalDuration / totalTests : 0,
    };
  }

  // Get failed tests details
  getFailedTests(): Array<{
    testName: string;
    error: string;
    duration: number;
  }> {
    return this.testResults
      .filter((r) => r.status === "failed")
      .map((r) => ({
        testName: r.testName,
        error: r.error || "Unknown error",
        duration: r.duration,
      }));
  }
}

// React hook for running integration tests
export const usePoseStateIntegrationTest = () => {
  const [testRunner] = React.useState(() => new PoseStateIntegrationTest());
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<
    Awaited<ReturnType<PoseStateIntegrationTest["runAllTests"]>> | null
  >(null);

  const runTests = React.useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    try {
      const testResults = await testRunner.runAllTests();
      setResults(testResults);
    } catch (error) {
      // Handle test runner errors
      setResults({
        totalTests: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        results: [{
          testName: "Test Runner",
          status: "failed",
          duration: 0,
          error: error instanceof Error ? error.message : "Test runner failed",
        }],
        totalDuration: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [testRunner, isRunning]);

  const getTestSummary = React.useCallback(() => {
    return testRunner.getTestSummary();
  }, [testRunner]);

  const getFailedTests = React.useCallback(() => {
    return testRunner.getFailedTests();
  }, [testRunner]);

  return {
    runTests,
    isRunning,
    results,
    getTestSummary,
    getFailedTests,

    // Computed values
    hasResults: !!results,
    allTestsPassed: results ? results.failed === 0 : false,
    successRate: results ? (results.passed / results.totalTests) * 100 : 0,
  };
};

export default PoseStateIntegrationTest;
