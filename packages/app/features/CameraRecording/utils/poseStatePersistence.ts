import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import type {
  PoseData,
  PoseDetectionConfig,
  PoseDetectionMetrics,
  PoseValidationResult,
} from "../types/pose";

// Persistence configuration
interface PersistenceConfig {
  enabled: boolean;
  autoSave: boolean;
  saveInterval: number; // milliseconds
  maxHistorySize: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

// Serializable pose session data
interface PoseSessionData {
  sessionId: string;
  timestamp: number;
  version: string;

  // Configuration
  config: PoseDetectionConfig;

  // State
  isInitialized: boolean;
  isProcessing: boolean;
  isEnabled: boolean;

  // Data
  currentPose: PoseData | null;
  poseHistory: PoseData[];

  // Metrics
  metrics: PoseDetectionMetrics;
  lastValidation: PoseValidationResult | null;

  // Error tracking
  errors: string[];
  warnings: string[];

  // Recovery information
  recoveryPoints: Array<{
    timestamp: number;
    reason: string;
    data: PoseData[];
  }>;
}

// Recovery strategy options
type RecoveryStrategy = "full" | "partial" | "config-only" | "metrics-only";

interface RecoveryOptions {
  strategy: RecoveryStrategy;
  preserveCurrentSession: boolean;
  mergeWithCurrent: boolean;
  validateData: boolean;
}

// Default persistence configuration
const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  enabled: true,
  autoSave: true,
  saveInterval: 30000, // 30 seconds
  maxHistorySize: 100,
  compressionEnabled: true,
  encryptionEnabled: false,
};

// Storage keys
const STORAGE_KEYS = {
  SESSION_DATA: "pose_session_data",
  CONFIG: "pose_config",
  METRICS: "pose_metrics",
  RECOVERY_POINTS: "pose_recovery_points",
  PERSISTENCE_CONFIG: "pose_persistence_config",
} as const;

// Pose state persistence manager
export class PoseStatePersistence {
  private config: PersistenceConfig;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime = 0;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
    this.initializeCompression();
  }

  // Initialize compression worker for large datasets
  private initializeCompression() {
    if (this.config.compressionEnabled && typeof Worker !== "undefined") {
      // In a real implementation, this would create a Web Worker for compression
      // For now, we'll use synchronous compression
    }
  }

  // Start auto-save if enabled
  startAutoSave(saveCallback: () => Promise<PoseSessionData>) {
    if (!this.config.autoSave || this.autoSaveInterval) return;

    this.autoSaveInterval = setInterval(async () => {
      try {
        const sessionData = await saveCallback();
        await this.saveSession(sessionData);
      } catch (error) {
        // Silent fail for auto-save to prevent disrupting the app
        // console.warn('Auto-save failed:', error);
      }
    }, this.config.saveInterval);
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Save session data to persistent storage
  async saveSession(sessionData: PoseSessionData): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Compress data if enabled
      let dataToSave = sessionData;
      if (this.config.compressionEnabled) {
        dataToSave = await this.compressSessionData(sessionData);
      }

      // Encrypt data if enabled
      if (this.config.encryptionEnabled) {
        dataToSave = await this.encryptSessionData(dataToSave);
      }

      // Save to storage
      const serializedData = JSON.stringify(dataToSave);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_DATA, serializedData);

      this.lastSaveTime = Date.now();
    } catch (error) {
      throw new Error(
        `Failed to save session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Load session data from persistent storage
  async loadSession(sessionId?: string): Promise<PoseSessionData | null> {
    if (!this.config.enabled) return null;

    try {
      const serializedData = await AsyncStorage.getItem(
        STORAGE_KEYS.SESSION_DATA,
      );
      if (!serializedData) return null;

      let sessionData = JSON.parse(serializedData) as PoseSessionData;

      // Decrypt data if needed
      if (this.config.encryptionEnabled) {
        sessionData = await this.decryptSessionData(sessionData);
      }

      // Decompress data if needed
      if (this.config.compressionEnabled) {
        sessionData = await this.decompressSessionData(sessionData);
      }

      // Validate session data
      if (!this.validateSessionData(sessionData)) {
        throw new Error("Invalid session data format");
      }

      // Check if specific session ID is requested
      if (sessionId && sessionData.sessionId !== sessionId) {
        return null;
      }

      return sessionData;
    } catch (error) {
      throw new Error(
        `Failed to load session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Create recovery point
  async createRecoveryPoint(
    sessionData: PoseSessionData,
    reason: string,
  ): Promise<void> {
    try {
      const recoveryPoint = {
        timestamp: Date.now(),
        reason,
        data: [...sessionData.poseHistory],
      };

      // Add to session data
      const updatedSessionData = {
        ...sessionData,
        recoveryPoints: [...sessionData.recoveryPoints, recoveryPoint].slice(
          -5,
        ), // Keep last 5 recovery points
      };

      await this.saveSession(updatedSessionData);
    } catch (error) {
      throw new Error(
        `Failed to create recovery point: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Recover from failure using recovery strategy
  async recoverFromFailure(
    options: RecoveryOptions = {
      strategy: "partial",
      preserveCurrentSession: true,
      mergeWithCurrent: false,
      validateData: true,
    },
  ): Promise<Partial<PoseSessionData> | null> {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) return null;

      // Validate data if requested
      if (options.validateData && !this.validateSessionData(sessionData)) {
        throw new Error("Corrupted session data cannot be recovered");
      }

      // Apply recovery strategy
      switch (options.strategy) {
        case "full":
          return sessionData;

        case "partial":
          return {
            config: sessionData.config,
            metrics: sessionData.metrics,
            poseHistory: sessionData.poseHistory.slice(-50), // Last 50 poses
          };

        case "config-only":
          return {
            config: sessionData.config,
          };

        case "metrics-only":
          return {
            metrics: sessionData.metrics,
          };

        default:
          return null;
      }
    } catch (error) {
      throw new Error(
        `Recovery failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Get available recovery points
  async getRecoveryPoints(): Promise<
    Array<{
      timestamp: number;
      reason: string;
      dataSize: number;
    }>
  > {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) return [];

      return sessionData.recoveryPoints.map((point) => ({
        timestamp: point.timestamp,
        reason: point.reason,
        dataSize: point.data.length,
      }));
    } catch {
      return [];
    }
  }

  // Recover from specific recovery point
  async recoverFromPoint(timestamp: number): Promise<PoseData[] | null> {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) return null;

      const recoveryPoint = sessionData.recoveryPoints.find(
        (point) => point.timestamp === timestamp,
      );

      return recoveryPoint ? recoveryPoint.data : null;
    } catch {
      return null;
    }
  }

  // Export session data for backup
  async exportSession(format: "json" | "compressed" = "json"): Promise<Blob> {
    const sessionData = await this.loadSession();
    if (!sessionData) {
      throw new Error("No session data to export");
    }

    let content: string;
    let mimeType: string;

    switch (format) {
      case "json": {
        content = JSON.stringify(sessionData, null, 2);
        mimeType = "application/json";
        break;
      }
      case "compressed": {
        const compressed = await this.compressSessionData(sessionData);
        content = JSON.stringify(compressed);
        mimeType = "application/octet-stream";
        break;
      }
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return new Blob([content], { type: mimeType });
  }

  // Import session data from backup
  async importSession(
    data: Blob,
    format: "json" | "compressed" = "json",
  ): Promise<void> {
    try {
      const text = await data.text();
      let sessionData: PoseSessionData;

      switch (format) {
        case "json": {
          sessionData = JSON.parse(text);
          break;
        }
        case "compressed": {
          const compressedData = JSON.parse(text);
          sessionData = await this.decompressSessionData(compressedData);
          break;
        }
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate imported data
      if (!this.validateSessionData(sessionData)) {
        throw new Error("Invalid session data format");
      }

      // Update session ID and timestamp
      sessionData.sessionId = `imported-${Date.now()}`;
      sessionData.timestamp = Date.now();

      await this.saveSession(sessionData);
    } catch (error) {
      throw new Error(
        `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Clear all persistent data
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SESSION_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.CONFIG),
        AsyncStorage.removeItem(STORAGE_KEYS.METRICS),
        AsyncStorage.removeItem(STORAGE_KEYS.RECOVERY_POINTS),
      ]);
    } catch (error) {
      throw new Error(
        `Failed to clear data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{
    totalSize: number;
    sessionDataSize: number;
    lastSaveTime: number;
    recoveryPointsCount: number;
  }> {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      const sessionDataSize = sessionData ? new Blob([sessionData]).size : 0;

      const session = await this.loadSession();
      const recoveryPointsCount = session?.recoveryPoints.length || 0;

      return {
        totalSize: sessionDataSize,
        sessionDataSize,
        lastSaveTime: this.lastSaveTime,
        recoveryPointsCount,
      };
    } catch {
      return {
        totalSize: 0,
        sessionDataSize: 0,
        lastSaveTime: 0,
        recoveryPointsCount: 0,
      };
    }
  }

  // Validate session data structure
  private validateSessionData(data: any): data is PoseSessionData {
    return (
      data &&
      typeof data.sessionId === "string" &&
      typeof data.timestamp === "number" &&
      typeof data.version === "string" &&
      data.config &&
      typeof data.isInitialized === "boolean" &&
      Array.isArray(data.poseHistory) &&
      data.metrics &&
      Array.isArray(data.errors) &&
      Array.isArray(data.warnings) &&
      Array.isArray(data.recoveryPoints)
    );
  }

  // Compress session data (simplified implementation)
  private async compressSessionData(
    data: PoseSessionData,
  ): Promise<PoseSessionData> {
    // In a real implementation, this would use actual compression algorithms
    // For now, we'll just truncate history to reduce size
    return {
      ...data,
      poseHistory: data.poseHistory.slice(-this.config.maxHistorySize),
      recoveryPoints: data.recoveryPoints.slice(-3), // Keep only last 3 recovery points
    };
  }

  // Decompress session data
  private async decompressSessionData(
    data: PoseSessionData,
  ): Promise<PoseSessionData> {
    // In a real implementation, this would decompress the data
    return data;
  }

  // Encrypt session data (placeholder)
  private async encryptSessionData(
    data: PoseSessionData,
  ): Promise<PoseSessionData> {
    // In a real implementation, this would encrypt sensitive data
    return data;
  }

  // Decrypt session data (placeholder)
  private async decryptSessionData(
    data: PoseSessionData,
  ): Promise<PoseSessionData> {
    // In a real implementation, this would decrypt the data
    return data;
  }

  // Update persistence configuration
  updateConfig(config: Partial<PersistenceConfig>) {
    this.config = { ...this.config, ...config };

    // Restart auto-save if interval changed
    if (this.autoSaveInterval && config.saveInterval) {
      this.stopAutoSave();
      // Note: startAutoSave needs to be called externally with the save callback
    }
  }

  // Get current configuration
  getConfig(): PersistenceConfig {
    return { ...this.config };
  }
}

// React hook for pose state persistence
export const usePoseStatePersistence = () => {
  const [persistence] = React.useState(() => new PoseStatePersistence());
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);
  const [lastSaveTime, setLastSaveTime] = React.useState<number>(0);
  const [storageStats, setStorageStats] = React.useState({
    totalSize: 0,
    sessionDataSize: 0,
    lastSaveTime: 0,
    recoveryPointsCount: 0,
  });

  // Save session data
  const saveSession = React.useCallback(
    async (sessionData: PoseSessionData) => {
      try {
        await persistence.saveSession(sessionData);
        setLastSaveTime(Date.now());

        // Update storage stats
        const stats = await persistence.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        throw new Error(
          `Save operation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    },
    [persistence],
  );

  // Load session data
  const loadSession = React.useCallback(async (sessionId?: string) => {
    try {
      return await persistence.loadSession(sessionId);
    } catch (error) {
      throw new Error(
        `Load operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [persistence]);

  // Start auto-save
  const startAutoSave = React.useCallback(
    (saveCallback: () => Promise<PoseSessionData>) => {
      persistence.startAutoSave(saveCallback);
      setIsAutoSaving(true);
    },
    [persistence],
  );

  // Stop auto-save
  const stopAutoSave = React.useCallback(() => {
    persistence.stopAutoSave();
    setIsAutoSaving(false);
  }, [persistence]);

  // Create recovery point
  const createRecoveryPoint = React.useCallback(async (
    sessionData: PoseSessionData,
    reason: string,
  ) => {
    try {
      await persistence.createRecoveryPoint(sessionData, reason);
    } catch (error) {
      throw new Error(
        `Recovery point creation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [persistence]);

  // Recover from failure
  const recoverFromFailure = React.useCallback(
    async (options?: RecoveryOptions) => {
      try {
        return await persistence.recoverFromFailure(options);
      } catch (error) {
        throw new Error(
          `Recovery failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    },
    [persistence],
  );

  // Get recovery points
  const getRecoveryPoints = React.useCallback(async () => {
    try {
      return await persistence.getRecoveryPoints();
    } catch (error) {
      return [];
    }
  }, [persistence]);

  // Export/Import
  const exportSession = React.useCallback(
    async (format?: "json" | "compressed") => {
      try {
        return await persistence.exportSession(format);
      } catch (error) {
        throw new Error(
          `Export failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    },
    [persistence],
  );

  const importSession = React.useCallback(
    async (data: Blob, format?: "json" | "compressed") => {
      try {
        await persistence.importSession(data, format);

        // Update storage stats after import
        const stats = await persistence.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        throw new Error(
          `Import failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    },
    [persistence],
  );

  // Clear all data
  const clearAllData = React.useCallback(async () => {
    try {
      await persistence.clearAllData();
      setStorageStats({
        totalSize: 0,
        sessionDataSize: 0,
        lastSaveTime: 0,
        recoveryPointsCount: 0,
      });
    } catch (error) {
      throw new Error(
        `Clear data failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [persistence]);

  // Update storage stats periodically
  React.useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await persistence.getStorageStats();
        setStorageStats(stats);
      } catch {
        // Ignore errors in stats update
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [persistence]);

  return {
    // Core operations
    saveSession,
    loadSession,

    // Auto-save
    startAutoSave,
    stopAutoSave,
    isAutoSaving,

    // Recovery
    createRecoveryPoint,
    recoverFromFailure,
    getRecoveryPoints,
    recoverFromPoint: persistence.recoverFromPoint.bind(persistence),

    // Export/Import
    exportSession,
    importSession,

    // Management
    clearAllData,
    updateConfig: persistence.updateConfig.bind(persistence),
    getConfig: persistence.getConfig.bind(persistence),

    // Status
    lastSaveTime,
    storageStats,

    // Computed values
    isConfigured: persistence.getConfig().enabled,
    hasStoredData: storageStats.sessionDataSize > 0,
  };
};

export default PoseStatePersistence;
