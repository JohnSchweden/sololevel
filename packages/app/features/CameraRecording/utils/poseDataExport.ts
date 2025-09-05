/**
 * Pose Data Export and Import Functionality
 *
 * This module provides comprehensive export and import capabilities for pose
 * detection data, supporting multiple formats and compression options for
 * analysis, sharing, and persistence.
 *
 * @platform both
 */

import type {
  PoseDataBuffer,
  PoseDetectionResult,
  PoseKeypoint,
} from "../types/pose";

/**
 * Export format types
 */
export type ExportFormat = "json" | "csv" | "binary" | "compressed";

/**
 * Export configuration
 */
interface ExportConfig {
  format: ExportFormat;
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeConfidence: boolean;
  precision: number; // Decimal places for coordinates
  compression: boolean;
  filterLowConfidence: boolean;
  confidenceThreshold: number;
}

/**
 * Import result
 */
interface ImportResult {
  success: boolean;
  data: PoseDataBuffer | null;
  errors: string[];
  warnings: string[];
  metadata: {
    originalFormat: string;
    poseCount: number;
    duration: number;
    fileSize: number;
  };
}

/**
 * Export result
 */
interface ExportResult {
  success: boolean;
  data: string | Uint8Array;
  filename: string;
  mimeType: string;
  size: number;
  compressionRatio?: number;
}

/**
 * CSV export options
 */
interface CSVExportOptions {
  delimiter: string;
  includeHeaders: boolean;
  flattenKeypoints: boolean;
  timestampFormat: "unix" | "iso" | "relative";
}

/**
 * Binary format header
 */
interface BinaryHeader {
  version: number;
  poseCount: number;
  keypointCount: number;
  startTime: number;
  endTime: number;
  compressionType: number;
  reserved: number[];
}

/**
 * Default export configuration
 */
const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: "json",
  includeMetadata: true,
  includeTimestamps: true,
  includeConfidence: true,
  precision: 4,
  compression: false,
  filterLowConfidence: false,
  confidenceThreshold: 0.3,
};

/**
 * Pose data exporter class
 */
export class PoseDataExporter {
  private config: ExportConfig;

  constructor(config: Partial<ExportConfig> = {}) {
    this.config = { ...DEFAULT_EXPORT_CONFIG, ...config };
  }

  /**
   * Export pose data buffer to specified format
   */
  async exportData(buffer: PoseDataBuffer): Promise<ExportResult> {
    try {
      switch (this.config.format) {
        case "json":
          return await this.exportToJSON(buffer);
        case "csv":
          return await this.exportToCSV(buffer);
        case "binary":
          return await this.exportToBinary(buffer);
        case "compressed":
          return await this.exportToCompressed(buffer);
        default:
          throw new Error(`Unsupported export format: ${this.config.format}`);
      }
    } catch (error) {
      return {
        success: false,
        data: "",
        filename: "",
        mimeType: "",
        size: 0,
        compressionRatio: 0,
      };
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(buffer: PoseDataBuffer): Promise<ExportResult> {
    const filteredPoses = this.config.filterLowConfidence
      ? buffer.poses.filter((pose) =>
        pose.confidence >= this.config.confidenceThreshold
      )
      : buffer.poses;

    const exportData = {
      metadata: this.config.includeMetadata
        ? {
          id: buffer.id,
          startTime: buffer.startTime,
          endTime: buffer.endTime,
          duration: buffer.duration,
          frameCount: buffer.frameCount,
          compressionRatio: buffer.compressionRatio,
          exportedAt: Date.now(),
          exportConfig: this.config,
        }
        : undefined,
      poses: filteredPoses.map((pose) => this.processPoseForExport(pose)),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const data = this.config.compression
      ? await this.compressString(jsonString)
      : jsonString;

    return {
      success: true,
      data,
      filename: `pose-data-${buffer.id}.json${
        this.config.compression ? ".gz" : ""
      }`,
      mimeType: this.config.compression
        ? "application/gzip"
        : "application/json",
      size: typeof data === "string" ? data.length : data.length,
      compressionRatio: this.config.compression
        ? jsonString.length /
          (typeof data === "string" ? data.length : data.length)
        : 1,
    };
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    buffer: PoseDataBuffer,
    options: Partial<CSVExportOptions> = {},
  ): Promise<ExportResult> {
    const csvOptions: CSVExportOptions = {
      delimiter: ",",
      includeHeaders: true,
      flattenKeypoints: true,
      timestampFormat: "unix",
      ...options,
    };

    const filteredPoses = this.config.filterLowConfidence
      ? buffer.poses.filter((pose) =>
        pose.confidence >= this.config.confidenceThreshold
      )
      : buffer.poses;

    let csvContent = "";

    // Add headers
    if (csvOptions.includeHeaders) {
      const headers = this.generateCSVHeaders(filteredPoses[0], csvOptions);
      csvContent += headers.join(csvOptions.delimiter) + "\n";
    }

    // Add data rows
    filteredPoses.forEach((pose) => {
      const row = this.poseToCSVRow(pose, csvOptions);
      csvContent += row.join(csvOptions.delimiter) + "\n";
    });

    const data = this.config.compression
      ? await this.compressString(csvContent)
      : csvContent;

    return {
      success: true,
      data,
      filename: `pose-data-${buffer.id}.csv${
        this.config.compression ? ".gz" : ""
      }`,
      mimeType: this.config.compression ? "application/gzip" : "text/csv",
      size: typeof data === "string" ? data.length : data.length,
      compressionRatio: this.config.compression
        ? csvContent.length /
          (typeof data === "string" ? data.length : data.length)
        : 1,
    };
  }

  /**
   * Export to binary format
   */
  private async exportToBinary(buffer: PoseDataBuffer): Promise<ExportResult> {
    const filteredPoses = this.config.filterLowConfidence
      ? buffer.poses.filter((pose) =>
        pose.confidence >= this.config.confidenceThreshold
      )
      : buffer.poses;

    // Calculate sizes
    const headerSize = 64; // Fixed header size
    const keypointCount = filteredPoses[0]?.keypoints.length || 17;
    const poseSize = 8 + (keypointCount * 16); // timestamp + keypoints (x, y, confidence, name_id)
    const totalSize = headerSize + (filteredPoses.length * poseSize);

    // Create binary buffer
    const arrayBuffer = new ArrayBuffer(totalSize);
    const dataView = new DataView(arrayBuffer);
    let offset = 0;

    // Write header
    const header: BinaryHeader = {
      version: 1,
      poseCount: filteredPoses.length,
      keypointCount,
      startTime: buffer.startTime,
      endTime: buffer.endTime,
      compressionType: 0,
      reserved: [0, 0, 0, 0],
    };

    dataView.setUint32(offset, header.version, true);
    offset += 4;
    dataView.setUint32(offset, header.poseCount, true);
    offset += 4;
    dataView.setUint32(offset, header.keypointCount, true);
    offset += 4;
    dataView.setFloat64(offset, header.startTime, true);
    offset += 8;
    dataView.setFloat64(offset, header.endTime, true);
    offset += 8;
    dataView.setUint32(offset, header.compressionType, true);
    offset += 4;

    // Reserved space
    for (let i = 0; i < 8; i++) {
      dataView.setUint32(offset, 0, true);
      offset += 4;
    }

    // Write pose data
    filteredPoses.forEach((pose) => {
      // Write timestamp
      dataView.setFloat64(offset, pose.timestamp, true);
      offset += 8;

      // Write keypoints
      pose.keypoints.forEach((keypoint) => {
        dataView.setFloat32(offset, keypoint.x, true);
        offset += 4;
        dataView.setFloat32(offset, keypoint.y, true);
        offset += 4;
        dataView.setFloat32(offset, keypoint.confidence, true);
        offset += 4;
        dataView.setUint32(offset, this.keypointNameToId(keypoint.name), true);
        offset += 4;
      });
    });

    const data = new Uint8Array(arrayBuffer);
    const compressedData = this.config.compression
      ? await this.compressBytes(data)
      : data;

    return {
      success: true,
      data: compressedData,
      filename: `pose-data-${buffer.id}.bin${
        this.config.compression ? ".gz" : ""
      }`,
      mimeType: this.config.compression
        ? "application/gzip"
        : "application/octet-stream",
      size: compressedData.length,
      compressionRatio: this.config.compression
        ? data.length / compressedData.length
        : 1,
    };
  }

  /**
   * Export to compressed format (custom compression)
   */
  private async exportToCompressed(
    buffer: PoseDataBuffer,
  ): Promise<ExportResult> {
    // Use JSON as base format but with aggressive compression
    const originalConfig = this.config;
    this.config = { ...this.config, compression: true, precision: 2 };

    const result = await this.exportToJSON(buffer);
    this.config = originalConfig;

    return {
      ...result,
      filename: result.filename.replace(".json.gz", ".cpz"), // Custom compressed pose format
      mimeType: "application/x-compressed-pose",
    };
  }

  /**
   * Process pose for export based on configuration
   */
  private processPoseForExport(pose: PoseDetectionResult): any {
    const processedPose: any = {};

    if (this.config.includeTimestamps) {
      processedPose.timestamp = pose.timestamp;
    }

    if (this.config.includeConfidence) {
      processedPose.confidence = Number(
        pose.confidence.toFixed(this.config.precision),
      );
    }

    processedPose.keypoints = pose.keypoints.map((keypoint) => ({
      name: keypoint.name,
      x: Number(keypoint.x.toFixed(this.config.precision)),
      y: Number(keypoint.y.toFixed(this.config.precision)),
      ...(this.config.includeConfidence && {
        confidence: Number(keypoint.confidence.toFixed(this.config.precision)),
      }),
    }));

    return processedPose;
  }

  /**
   * Generate CSV headers
   */
  private generateCSVHeaders(
    samplePose: PoseDetectionResult,
    options: CSVExportOptions,
  ): string[] {
    const headers: string[] = [];

    if (this.config.includeTimestamps) {
      headers.push("timestamp");
    }

    if (this.config.includeConfidence) {
      headers.push("pose_confidence");
    }

    if (options.flattenKeypoints) {
      samplePose.keypoints.forEach((keypoint) => {
        headers.push(`${keypoint.name}_x`);
        headers.push(`${keypoint.name}_y`);
        if (this.config.includeConfidence) {
          headers.push(`${keypoint.name}_confidence`);
        }
      });
    } else {
      headers.push("keypoints");
    }

    return headers;
  }

  /**
   * Convert pose to CSV row
   */
  private poseToCSVRow(
    pose: PoseDetectionResult,
    options: CSVExportOptions,
  ): string[] {
    const row: string[] = [];

    if (this.config.includeTimestamps) {
      const timestamp = options.timestampFormat === "iso"
        ? new Date(pose.timestamp).toISOString()
        : pose.timestamp.toString();
      row.push(timestamp);
    }

    if (this.config.includeConfidence) {
      row.push(pose.confidence.toFixed(this.config.precision));
    }

    if (options.flattenKeypoints) {
      pose.keypoints.forEach((keypoint) => {
        row.push(keypoint.x.toFixed(this.config.precision));
        row.push(keypoint.y.toFixed(this.config.precision));
        if (this.config.includeConfidence) {
          row.push(keypoint.confidence.toFixed(this.config.precision));
        }
      });
    } else {
      const keypointsJson = JSON.stringify(pose.keypoints);
      row.push(`"${keypointsJson.replace(/"/g, '""')}"`); // Escape quotes for CSV
    }

    return row;
  }

  /**
   * Convert keypoint name to numeric ID for binary format
   */
  private keypointNameToId(name: string): number {
    const keypointMap: { [key: string]: number } = {
      "nose": 0,
      "left_eye": 1,
      "right_eye": 2,
      "left_ear": 3,
      "right_ear": 4,
      "left_shoulder": 5,
      "right_shoulder": 6,
      "left_elbow": 7,
      "right_elbow": 8,
      "left_wrist": 9,
      "right_wrist": 10,
      "left_hip": 11,
      "right_hip": 12,
      "left_knee": 13,
      "right_knee": 14,
      "left_ankle": 15,
      "right_ankle": 16,
    };

    return keypointMap[name] || 0;
  }

  /**
   * Compress string data
   */
  private async compressString(data: string): Promise<Uint8Array> {
    // Simple compression using TextEncoder and basic compression
    // In production, you'd use a proper compression library like pako
    const encoder = new TextEncoder();
    return encoder.encode(data);
  }

  /**
   * Compress byte data
   */
  private async compressBytes(data: Uint8Array): Promise<Uint8Array> {
    // Simple compression placeholder
    // In production, you'd use a proper compression library
    return data;
  }

  /**
   * Update export configuration
   */
  updateConfig(newConfig: Partial<ExportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Pose data importer class
 */
export class PoseDataImporter {
  /**
   * Import pose data from various formats
   */
  async importData(
    data: string | Uint8Array,
    format?: ExportFormat,
  ): Promise<ImportResult> {
    try {
      const detectedFormat = format || this.detectFormat(data);

      switch (detectedFormat) {
        case "json":
          return await this.importFromJSON(data as string);
        case "csv":
          return await this.importFromCSV(data as string);
        case "binary":
          return await this.importFromBinary(data as Uint8Array);
        case "compressed":
          return await this.importFromCompressed(data as Uint8Array);
        default:
          throw new Error(`Unsupported import format: ${detectedFormat}`);
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [
          error instanceof Error ? error.message : "Unknown import error",
        ],
        warnings: [],
        metadata: {
          originalFormat: "unknown",
          poseCount: 0,
          duration: 0,
          fileSize: typeof data === "string" ? data.length : data.length,
        },
      };
    }
  }

  /**
   * Detect data format
   */
  private detectFormat(data: string | Uint8Array): ExportFormat {
    if (typeof data === "string") {
      const trimmed = data.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return "json";
      }
      if (
        trimmed.includes(",") &&
        (trimmed.includes("timestamp") || trimmed.includes("pose"))
      ) {
        return "csv";
      }
    } else {
      // Check binary format header
      const dataView = new DataView(data.buffer);
      const version = dataView.getUint32(0, true);
      if (version === 1) {
        return "binary";
      }
    }

    return "json"; // Default fallback
  }

  /**
   * Import from JSON format
   */
  private async importFromJSON(data: string): Promise<ImportResult> {
    const parsed = JSON.parse(data);
    const poses: PoseDetectionResult[] = parsed.poses || parsed;

    // Validate pose structure
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(poses)) {
      errors.push("Invalid pose data structure");
    }

    const validPoses = poses.filter((pose) => {
      if (!pose.keypoints || !Array.isArray(pose.keypoints)) {
        warnings.push("Pose missing keypoints array");
        return false;
      }
      return true;
    });

    const startTime = Math.min(...validPoses.map((p) => p.timestamp));
    const endTime = Math.max(...validPoses.map((p) => p.timestamp));

    const buffer: PoseDataBuffer = {
      id: parsed.metadata?.id || `imported-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      poses: validPoses,
      frameCount: validPoses.length,
      compressionRatio: parsed.metadata?.compressionRatio || 1,
      originalSize: data.length,
      compressedSize: data.length,
      videoTimestamp: startTime,
    };

    return {
      success: errors.length === 0,
      data: buffer,
      errors,
      warnings,
      metadata: {
        originalFormat: "json",
        poseCount: validPoses.length,
        duration: buffer.duration,
        fileSize: data.length,
      },
    };
  }

  /**
   * Import from CSV format
   */
  private async importFromCSV(data: string): Promise<ImportResult> {
    const lines = data.trim().split("\n");
    const headers = lines[0].split(",");
    const dataLines = lines.slice(1);

    const poses: PoseDetectionResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    dataLines.forEach((line, index) => {
      try {
        const values = line.split(",");
        const pose = this.parseCSVRow(headers, values);
        if (pose) {
          poses.push(pose);
        }
      } catch (error) {
        warnings.push(`Error parsing line ${index + 2}: ${error}`);
      }
    });

    const startTime = Math.min(...poses.map((p) => p.timestamp));
    const endTime = Math.max(...poses.map((p) => p.timestamp));

    const buffer: PoseDataBuffer = {
      id: `csv-import-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      poses,
      frameCount: poses.length,
      compressionRatio: 1,
      originalSize: data.length,
      compressedSize: data.length,
      videoTimestamp: startTime,
    };

    return {
      success: errors.length === 0,
      data: buffer,
      errors,
      warnings,
      metadata: {
        originalFormat: "csv",
        poseCount: poses.length,
        duration: buffer.duration,
        fileSize: data.length,
      },
    };
  }

  /**
   * Import from binary format
   */
  private async importFromBinary(data: Uint8Array): Promise<ImportResult> {
    const dataView = new DataView(data.buffer);
    let offset = 0;

    // Read header
    const version = dataView.getUint32(offset, true);
    offset += 4;
    const poseCount = dataView.getUint32(offset, true);
    offset += 4;
    const keypointCount = dataView.getUint32(offset, true);
    offset += 4;
    const startTime = dataView.getFloat64(offset, true);
    offset += 8;
    const endTime = dataView.getFloat64(offset, true);
    offset += 8;

    // Skip compression type and reserved space
    offset += 36;

    const poses: PoseDetectionResult[] = [];
    const errors: string[] = [];

    // Read pose data
    for (let i = 0; i < poseCount; i++) {
      try {
        const timestamp = dataView.getFloat64(offset, true);
        offset += 8;
        const keypoints: PoseKeypoint[] = [];

        for (let j = 0; j < keypointCount; j++) {
          const x = dataView.getFloat32(offset, true);
          offset += 4;
          const y = dataView.getFloat32(offset, true);
          offset += 4;
          const confidence = dataView.getFloat32(offset, true);
          offset += 4;
          const nameId = dataView.getUint32(offset, true);
          offset += 4;

          keypoints.push({
            name: this.idToKeypointName(nameId),
            x,
            y,
            confidence,
          });
        }

        const averageConfidence = keypoints.reduce((sum, kp) =>
          sum + kp.confidence, 0) / keypoints.length;

        poses.push({
          keypoints,
          confidence: averageConfidence,
          timestamp,
        });
      } catch (error) {
        errors.push(`Error reading pose ${i}: ${error}`);
      }
    }

    const buffer: PoseDataBuffer = {
      id: `binary-import-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      poses,
      frameCount: poses.length,
      compressionRatio: 1,
      originalSize: data.length,
      compressedSize: data.length,
      videoTimestamp: startTime,
    };

    return {
      success: errors.length === 0,
      data: buffer,
      errors,
      warnings: [],
      metadata: {
        originalFormat: "binary",
        poseCount: poses.length,
        duration: buffer.duration,
        fileSize: data.length,
      },
    };
  }

  /**
   * Import from compressed format
   */
  private async importFromCompressed(data: Uint8Array): Promise<ImportResult> {
    // Decompress and delegate to JSON import
    const decompressed = await this.decompressBytes(data);
    const jsonString = new TextDecoder().decode(decompressed);
    return this.importFromJSON(jsonString);
  }

  /**
   * Parse CSV row to pose
   */
  private parseCSVRow(
    headers: string[],
    values: string[],
  ): PoseDetectionResult | null {
    const pose: Partial<PoseDetectionResult> = {};
    const keypoints: PoseKeypoint[] = [];

    let timestampIndex = headers.indexOf("timestamp");
    let confidenceIndex = headers.indexOf("pose_confidence");

    if (timestampIndex >= 0) {
      pose.timestamp = Number(values[timestampIndex]);
    }

    if (confidenceIndex >= 0) {
      pose.confidence = Number(values[confidenceIndex]);
    }

    // Parse keypoints (assuming flattened format)
    const keypointNames = [
      "nose",
      "left_eye",
      "right_eye",
      "left_ear",
      "right_ear",
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_wrist",
      "right_wrist",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
    ];

    keypointNames.forEach((name) => {
      const xIndex = headers.indexOf(`${name}_x`);
      const yIndex = headers.indexOf(`${name}_y`);
      const confIndex = headers.indexOf(`${name}_confidence`);

      if (xIndex >= 0 && yIndex >= 0) {
        keypoints.push({
          name: name as any,
          x: Number(values[xIndex]),
          y: Number(values[yIndex]),
          confidence: confIndex >= 0 ? Number(values[confIndex]) : 1.0,
        });
      }
    });

    if (keypoints.length === 0) {
      return null;
    }

    return {
      keypoints,
      confidence: pose.confidence ||
        keypoints.reduce((sum, kp) => sum + kp.confidence, 0) /
          keypoints.length,
      timestamp: pose.timestamp || Date.now(),
    };
  }

  /**
   * Convert numeric ID to keypoint name
   */
  private idToKeypointName(id: number): any {
    const keypointNames = [
      "nose",
      "left_eye",
      "right_eye",
      "left_ear",
      "right_ear",
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_wrist",
      "right_wrist",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
    ];

    return keypointNames[id] || "unknown";
  }

  /**
   * Decompress byte data
   */
  private async decompressBytes(data: Uint8Array): Promise<Uint8Array> {
    // Simple decompression placeholder
    // In production, you'd use a proper decompression library
    return data;
  }
}

/**
 * Utility functions for pose data export/import
 */
export const PoseDataExportUtils = {
  /**
   * Create exporter with common configurations
   */
  createExporter: (
    format: ExportFormat,
    options: Partial<ExportConfig> = {},
  ) => {
    return new PoseDataExporter({ format, ...options });
  },

  /**
   * Create importer
   */
  createImporter: () => {
    return new PoseDataImporter();
  },

  /**
   * Quick export to JSON
   */
  exportToJSON: async (buffer: PoseDataBuffer, compressed = false) => {
    const exporter = new PoseDataExporter({
      format: "json",
      compression: compressed,
    });
    return exporter.exportData(buffer);
  },

  /**
   * Quick export to CSV
   */
  exportToCSV: async (
    buffer: PoseDataBuffer,
    options: Partial<CSVExportOptions> = {},
  ) => {
    const exporter = new PoseDataExporter({ format: "csv" });
    return exporter.exportData(buffer);
  },

  /**
   * Quick import from file data
   */
  importFromData: async (data: string | Uint8Array, format?: ExportFormat) => {
    const importer = new PoseDataImporter();
    return importer.importData(data, format);
  },

  /**
   * Get supported formats
   */
  getSupportedFormats: (): ExportFormat[] => {
    return ["json", "csv", "binary", "compressed"];
  },

  /**
   * Estimate export size
   */
  estimateExportSize: (
    buffer: PoseDataBuffer,
    format: ExportFormat,
  ): number => {
    const poseCount = buffer.poses.length;
    const avgKeypointsPerPose = 17;

    switch (format) {
      case "json":
        return poseCount * avgKeypointsPerPose * 50; // ~50 bytes per keypoint in JSON
      case "csv":
        return poseCount * avgKeypointsPerPose * 20; // ~20 bytes per keypoint in CSV
      case "binary":
        return 64 + (poseCount * (8 + (avgKeypointsPerPose * 16))); // Header + poses
      case "compressed":
        return (poseCount * avgKeypointsPerPose * 50) * 0.3; // ~30% of JSON size
      default:
        return poseCount * avgKeypointsPerPose * 50;
    }
  },
};

export default PoseDataExporter;
