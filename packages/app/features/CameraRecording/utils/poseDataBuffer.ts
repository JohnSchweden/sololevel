/**
 * Pose Data Buffer with Compression and Memory Management
 *
 * This module provides efficient storage, compression, and management of pose
 * detection data with circular buffering, timestamp synchronization, and
 * memory optimization for real-time pose tracking applications.
 *
 * @platform both
 */

import type {
  PoseDataBuffer,
  PoseDetectionResult,
  PoseKeypoint,
} from "../types/pose";

/**
 * Compression configuration
 */
interface CompressionConfig {
  enableCompression: boolean;
  compressionLevel: number; // 0-9, higher = better compression
  quantizationBits: number; // 8, 12, 16 bits for coordinate precision
  confidenceThreshold: number; // Skip keypoints below threshold
  temporalCompression: boolean; // Delta compression between frames
  maxBufferSize: number; // Maximum buffer size in MB
}

/**
 * Circular buffer statistics
 */
interface BufferStatistics {
  totalFrames: number;
  droppedFrames: number;
  averageCompressionRatio: number;
  memoryUsage: number; // MB
  oldestTimestamp: number;
  newestTimestamp: number;
  bufferUtilization: number; // 0-1
}

/**
 * Compressed pose data format
 */
interface CompressedPoseFrame {
  timestamp: number;
  poseCount: number;
  data: Uint8Array; // Compressed keypoint data
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    quantizationBits: number;
  };
}

/**
 * Pose data circular buffer with compression
 */
export class PoseDataBufferManager {
  private buffer: CompressedPoseFrame[] = [];
  private maxFrames: number;
  private config: CompressionConfig;
  private statistics: BufferStatistics;
  private writeIndex = 0;
  private isCircular = false;

  constructor(
    maxFrames = 1000,
    config: Partial<CompressionConfig> = {},
  ) {
    this.maxFrames = maxFrames;
    this.config = {
      enableCompression: true,
      compressionLevel: 6,
      quantizationBits: 12,
      confidenceThreshold: 0.1,
      temporalCompression: true,
      maxBufferSize: 50, // 50MB default
      ...config,
    };

    this.statistics = {
      totalFrames: 0,
      droppedFrames: 0,
      averageCompressionRatio: 0,
      memoryUsage: 0,
      oldestTimestamp: 0,
      newestTimestamp: 0,
      bufferUtilization: 0,
    };
  }

  /**
   * Add pose detection results to buffer
   */
  addFrame(poses: PoseDetectionResult[], timestamp: number): boolean {
    try {
      // Check memory constraints
      if (this.shouldDropFrame()) {
        this.statistics.droppedFrames++;
        return false;
      }

      // Compress pose data
      const compressedFrame = this.compressPoseFrame(poses, timestamp);

      // Add to circular buffer
      this.buffer[this.writeIndex] = compressedFrame;
      this.writeIndex = (this.writeIndex + 1) % this.maxFrames;

      if (this.writeIndex === 0) {
        this.isCircular = true;
      }

      // Update statistics
      this.updateStatistics(compressedFrame);

      return true;
    } catch (error) {
      // console.error("Failed to add frame to pose buffer:", error);
      return false;
    }
  }

  /**
   * Get pose data for a specific time range
   */
  getFramesInRange(
    startTime: number,
    endTime: number,
  ): PoseDetectionResult[][] {
    const frames: PoseDetectionResult[][] = [];

    for (const compressedFrame of this.buffer) {
      if (!compressedFrame) continue;

      if (
        compressedFrame.timestamp >= startTime &&
        compressedFrame.timestamp <= endTime
      ) {
        const decompressedPoses = this.decompressPoseFrame(compressedFrame);
        frames.push(decompressedPoses);
      }
    }

    // Sort by timestamp
    return frames.sort((a, b) => {
      const timestampA = a[0]?.timestamp || 0;
      const timestampB = b[0]?.timestamp || 0;
      return timestampA - timestampB;
    });
  }

  /**
   * Get latest N frames
   */
  getLatestFrames(count: number): PoseDetectionResult[][] {
    const frames: PoseDetectionResult[][] = [];
    const actualCount = Math.min(count, this.getFrameCount());

    // Get frames in reverse chronological order
    for (let i = 0; i < actualCount; i++) {
      const index = this.isCircular
        ? (this.writeIndex - 1 - i + this.maxFrames) % this.maxFrames
        : this.writeIndex - 1 - i;

      if (index >= 0 && this.buffer[index]) {
        const decompressedPoses = this.decompressPoseFrame(this.buffer[index]);
        frames.unshift(decompressedPoses); // Add to beginning for chronological order
      }
    }

    return frames;
  }

  /**
   * Export buffer data for persistence or analysis
   */
  exportBuffer(): PoseDataBuffer {
    const allFrames = this.getAllFrames();
    const startTime = allFrames[0]?.[0]?.timestamp || Date.now();
    const endTime = allFrames[allFrames.length - 1]?.[0]?.timestamp ||
      Date.now();

    return {
      id: `pose-buffer-${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      poses: allFrames.flat(),
      frameCount: allFrames.length,
      compressionRatio: this.statistics.averageCompressionRatio,
      originalSize: this.calculateOriginalSize(),
      compressedSize: this.calculateCompressedSize(),
      videoTimestamp: startTime,
    };
  }

  /**
   * Import buffer data from external source
   */
  importBuffer(bufferData: PoseDataBuffer): void {
    this.clear();

    // Group poses by timestamp
    const frameMap = new Map<number, PoseDetectionResult[]>();
    for (const pose of bufferData.poses) {
      const timestamp = pose.timestamp;
      if (!frameMap.has(timestamp)) {
        frameMap.set(timestamp, []);
      }
      frameMap.get(timestamp)!.push(pose);
    }

    // Add frames in chronological order
    const sortedTimestamps = Array.from(frameMap.keys()).sort();
    for (const timestamp of sortedTimestamps) {
      const poses = frameMap.get(timestamp)!;
      this.addFrame(poses, timestamp);
    }
  }

  /**
   * Clear all buffer data
   */
  clear(): void {
    this.buffer = [];
    this.writeIndex = 0;
    this.isCircular = false;
    this.statistics = {
      totalFrames: 0,
      droppedFrames: 0,
      averageCompressionRatio: 0,
      memoryUsage: 0,
      oldestTimestamp: 0,
      newestTimestamp: 0,
      bufferUtilization: 0,
    };
  }

  /**
   * Get buffer statistics
   */
  getStatistics(): BufferStatistics {
    return { ...this.statistics };
  }

  /**
   * Update buffer configuration
   */
  updateConfig(newConfig: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.isCircular ? this.maxFrames : this.writeIndex;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.isCircular;
  }

  /**
   * Compress pose frame data
   */
  private compressPoseFrame(
    poses: PoseDetectionResult[],
    timestamp: number,
  ): CompressedPoseFrame {
    if (!this.config.enableCompression) {
      // Store uncompressed data
      const serialized = this.serializePoses(poses);
      return {
        timestamp,
        poseCount: poses.length,
        data: serialized,
        metadata: {
          originalSize: serialized.length,
          compressedSize: serialized.length,
          compressionRatio: 1.0,
          quantizationBits: 32, // Full precision
        },
      };
    }

    // Filter poses by confidence threshold
    const filteredPoses = poses.filter(
      (pose) => pose.confidence >= this.config.confidenceThreshold,
    );

    // Quantize coordinates
    const quantizedPoses = this.quantizePoses(
      filteredPoses,
      this.config.quantizationBits,
    );

    // Apply temporal compression if enabled
    const compressedData = this.config.temporalCompression
      ? this.applyTemporalCompression(quantizedPoses, timestamp)
      : this.serializePoses(quantizedPoses);

    // Calculate compression metrics
    const originalSize = this.calculatePoseDataSize(poses);
    const compressedSize = compressedData.length;
    const compressionRatio = originalSize / compressedSize;

    return {
      timestamp,
      poseCount: filteredPoses.length,
      data: compressedData,
      metadata: {
        originalSize,
        compressedSize,
        compressionRatio,
        quantizationBits: this.config.quantizationBits,
      },
    };
  }

  /**
   * Decompress pose frame data
   */
  private decompressPoseFrame(
    compressedFrame: CompressedPoseFrame,
  ): PoseDetectionResult[] {
    try {
      if (compressedFrame.metadata.quantizationBits === 32) {
        // Uncompressed data
        return this.deserializePoses(compressedFrame.data);
      }

      // Decompress temporal compression if applied
      const decompressedData = this.config.temporalCompression
        ? this.reverseTemporalCompression(
          compressedFrame.data,
          compressedFrame.timestamp,
        )
        : compressedFrame.data;

      // Deserialize and dequantize
      const quantizedPoses = this.deserializePoses(decompressedData);
      return this.dequantizePoses(
        quantizedPoses,
        compressedFrame.metadata.quantizationBits,
      );
    } catch (error) {
      // console.error("Failed to decompress pose frame:", error);
      return [];
    }
  }

  /**
   * Quantize pose coordinates for compression
   */
  private quantizePoses(
    poses: PoseDetectionResult[],
    bits: number,
  ): PoseDetectionResult[] {
    const maxValue = (1 << bits) - 1;

    return poses.map((pose) => ({
      ...pose,
      keypoints: pose.keypoints.map((keypoint) => ({
        ...keypoint,
        x: Math.round(keypoint.x * maxValue) / maxValue,
        y: Math.round(keypoint.y * maxValue) / maxValue,
        confidence: Math.round(keypoint.confidence * 255) / 255, // 8-bit confidence
      })),
    }));
  }

  /**
   * Dequantize pose coordinates after decompression
   */
  private dequantizePoses(
    poses: PoseDetectionResult[],
    bits: number,
  ): PoseDetectionResult[] {
    // Quantization is lossy, so we just return the poses as-is
    // The precision loss is already baked into the data
    return poses;
  }

  /**
   * Apply temporal compression (delta encoding)
   */
  private applyTemporalCompression(
    poses: PoseDetectionResult[],
    timestamp: number,
  ): Uint8Array {
    // Get previous frame for delta compression
    const previousFrame = this.getPreviousFrame();

    if (!previousFrame || previousFrame.length === 0) {
      // First frame or no previous frame - store as-is
      return this.serializePoses(poses);
    }

    // Calculate deltas from previous frame
    const deltaPoses = this.calculatePoseDeltas(poses, previousFrame);
    return this.serializePoses(deltaPoses);
  }

  /**
   * Reverse temporal compression (delta decoding)
   */
  private reverseTemporalCompression(
    compressedData: Uint8Array,
    timestamp: number,
  ): Uint8Array {
    // This is a simplified implementation
    // In a full implementation, you would need to track the reference frames
    // and apply delta decoding properly
    return compressedData;
  }

  /**
   * Calculate pose deltas for temporal compression
   */
  private calculatePoseDeltas(
    currentPoses: PoseDetectionResult[],
    previousPoses: PoseDetectionResult[],
  ): PoseDetectionResult[] {
    // Simplified delta calculation
    // In practice, you'd match poses by similarity and calculate actual deltas
    return currentPoses.map((pose, index) => {
      const prevPose = previousPoses[index];
      if (!prevPose) return pose;

      return {
        ...pose,
        keypoints: pose.keypoints.map((kp, kpIndex) => {
          const prevKp = prevPose.keypoints[kpIndex];
          if (!prevKp) return kp;

          return {
            ...kp,
            x: kp.x - prevKp.x, // Delta encoding
            y: kp.y - prevKp.y,
            confidence: kp.confidence - prevKp.confidence,
          };
        }),
      };
    });
  }

  /**
   * Serialize poses to binary format
   */
  private serializePoses(poses: PoseDetectionResult[]): Uint8Array {
    // Simple JSON serialization for now
    // In production, you'd use a more efficient binary format
    const jsonString = JSON.stringify(poses);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Deserialize poses from binary format
   */
  private deserializePoses(data: Uint8Array): PoseDetectionResult[] {
    try {
      const jsonString = new TextDecoder().decode(data);
      return JSON.parse(jsonString);
    } catch (error) {
      // console.error("Failed to deserialize pose data:", error);
      return [];
    }
  }

  /**
   * Calculate original pose data size
   */
  private calculatePoseDataSize(poses: PoseDetectionResult[]): number {
    // Estimate size: each pose has ~17 keypoints * 4 floats * 4 bytes = ~272 bytes
    // Plus metadata overhead
    return poses.length * 300; // Rough estimate
  }

  /**
   * Get previous frame for temporal compression
   */
  private getPreviousFrame(): PoseDetectionResult[] | null {
    if (this.buffer.length === 0) return null;

    const prevIndex = this.isCircular
      ? (this.writeIndex - 1 + this.maxFrames) % this.maxFrames
      : this.writeIndex - 1;

    if (prevIndex < 0 || !this.buffer[prevIndex]) return null;

    return this.decompressPoseFrame(this.buffer[prevIndex]);
  }

  /**
   * Check if frame should be dropped due to memory constraints
   */
  private shouldDropFrame(): boolean {
    const currentMemoryMB = this.calculateCompressedSize() / (1024 * 1024);
    return currentMemoryMB >= this.config.maxBufferSize;
  }

  /**
   * Update buffer statistics
   */
  private updateStatistics(frame: CompressedPoseFrame): void {
    this.statistics.totalFrames++;
    this.statistics.newestTimestamp = frame.timestamp;

    if (this.statistics.oldestTimestamp === 0) {
      this.statistics.oldestTimestamp = frame.timestamp;
    }

    // Update average compression ratio
    const totalRatio = this.statistics.averageCompressionRatio *
      (this.statistics.totalFrames - 1);
    this.statistics.averageCompressionRatio =
      (totalRatio + frame.metadata.compressionRatio) /
      this.statistics.totalFrames;

    // Update memory usage
    this.statistics.memoryUsage = this.calculateCompressedSize() /
      (1024 * 1024);

    // Update buffer utilization
    this.statistics.bufferUtilization = this.getFrameCount() / this.maxFrames;
  }

  /**
   * Get all frames in chronological order
   */
  private getAllFrames(): PoseDetectionResult[][] {
    const frames: PoseDetectionResult[][] = [];
    const frameCount = this.getFrameCount();

    for (let i = 0; i < frameCount; i++) {
      const index = this.isCircular
        ? (this.writeIndex + i) % this.maxFrames
        : i;

      if (this.buffer[index]) {
        const decompressedPoses = this.decompressPoseFrame(this.buffer[index]);
        frames.push(decompressedPoses);
      }
    }

    return frames;
  }

  /**
   * Calculate total original size
   */
  private calculateOriginalSize(): number {
    return this.buffer.reduce(
      (total, frame) => total + (frame?.metadata.originalSize || 0),
      0,
    );
  }

  /**
   * Calculate total compressed size
   */
  private calculateCompressedSize(): number {
    return this.buffer.reduce(
      (total, frame) => total + (frame?.metadata.compressedSize || 0),
      0,
    );
  }
}

/**
 * Singleton pose data buffer manager
 */
export const poseDataBuffer = new PoseDataBufferManager();

/**
 * Hook for using pose data buffer
 */
export function usePoseDataBuffer(config?: Partial<CompressionConfig>) {
  if (config) {
    poseDataBuffer.updateConfig(config);
  }

  return {
    // Core methods
    addFrame: (poses: PoseDetectionResult[], timestamp: number) =>
      poseDataBuffer.addFrame(poses, timestamp),
    getFramesInRange: (startTime: number, endTime: number) =>
      poseDataBuffer.getFramesInRange(startTime, endTime),
    getLatestFrames: (count: number) => poseDataBuffer.getLatestFrames(count),

    // Data management
    exportBuffer: () => poseDataBuffer.exportBuffer(),
    importBuffer: (data: PoseDataBuffer) => poseDataBuffer.importBuffer(data),
    clear: () => poseDataBuffer.clear(),

    // Statistics and info
    getStatistics: () => poseDataBuffer.getStatistics(),
    getFrameCount: () => poseDataBuffer.getFrameCount(),
    isFull: () => poseDataBuffer.isFull(),

    // Configuration
    updateConfig: (newConfig: Partial<CompressionConfig>) =>
      poseDataBuffer.updateConfig(newConfig),
  };
}

/**
 * Utility functions for pose data analysis
 */
export const PoseDataUtils = {
  /**
   * Calculate pose similarity between two poses
   */
  calculateSimilarity: (
    pose1: PoseDetectionResult,
    pose2: PoseDetectionResult,
  ): number => {
    if (pose1.keypoints.length !== pose2.keypoints.length) {
      return 0;
    }

    let totalDistance = 0;
    let validKeypoints = 0;

    for (let i = 0; i < pose1.keypoints.length; i++) {
      const kp1 = pose1.keypoints[i];
      const kp2 = pose2.keypoints[i];

      if (kp1.confidence > 0.3 && kp2.confidence > 0.3) {
        const distance = Math.sqrt(
          (kp1.x - kp2.x) ** 2 + (kp1.y - kp2.y) ** 2,
        );
        totalDistance += distance;
        validKeypoints++;
      }
    }

    if (validKeypoints === 0) return 0;

    const averageDistance = totalDistance / validKeypoints;
    return Math.max(0, 1 - averageDistance);
  },

  /**
   * Smooth pose sequence using temporal filtering
   */
  smoothPoseSequence: (
    poses: PoseDetectionResult[],
    smoothingFactor = 0.7,
  ): PoseDetectionResult[] => {
    if (poses.length < 2) return poses;

    const smoothedPoses = [poses[0]];

    for (let i = 1; i < poses.length; i++) {
      const currentPose = poses[i];
      const previousPose = smoothedPoses[i - 1];

      const smoothedKeypoints = currentPose.keypoints.map((keypoint, idx) => {
        const prevKeypoint = previousPose.keypoints[idx];

        return {
          ...keypoint,
          x: prevKeypoint.x * smoothingFactor +
            keypoint.x * (1 - smoothingFactor),
          y: prevKeypoint.y * smoothingFactor +
            keypoint.y * (1 - smoothingFactor),
          confidence: Math.max(prevKeypoint.confidence, keypoint.confidence),
        };
      });

      smoothedPoses.push({
        ...currentPose,
        keypoints: smoothedKeypoints,
      });
    }

    return smoothedPoses;
  },

  /**
   * Extract pose features for analysis
   */
  extractFeatures: (pose: PoseDetectionResult) => {
    const keypoints = pose.keypoints;

    // Calculate bounding box
    const validKeypoints = keypoints.filter((kp) => kp.confidence > 0.3);
    const xs = validKeypoints.map((kp) => kp.x);
    const ys = validKeypoints.map((kp) => kp.y);

    const boundingBox = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };

    // Calculate center of mass
    const centerOfMass = {
      x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
      y: ys.reduce((sum, y) => sum + y, 0) / ys.length,
    };

    return {
      boundingBox,
      centerOfMass,
      keypointCount: validKeypoints.length,
      averageConfidence: keypoints.reduce((sum, kp) => sum + kp.confidence, 0) /
        keypoints.length,
    };
  },
};

export default PoseDataBufferManager;
