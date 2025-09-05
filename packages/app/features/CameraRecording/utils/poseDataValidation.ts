/**
 * Pose Data Validation and Integrity Checking
 *
 * This module provides comprehensive validation, integrity checking,
 * and quality assessment for pose detection data to ensure reliability
 * and consistency across the application.
 *
 * @platform both
 */

import type {
  PoseDataBuffer,
  PoseDetectionResult,
  PoseKeypoint,
  PoseKeypointName,
} from "../types/pose";

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-1, overall quality score
  details: ValidationDetails;
}

/**
 * Detailed validation information
 */
interface ValidationDetails {
  keypointValidation: KeypointValidationResult[];
  temporalConsistency: number; // 0-1
  spatialConsistency: number; // 0-1
  confidenceDistribution: ConfidenceStats;
  anatomicalPlausibility: number; // 0-1
  outlierDetection: OutlierResult[];
}

/**
 * Keypoint validation result
 */
interface KeypointValidationResult {
  name: PoseKeypointName;
  isValid: boolean;
  confidence: number;
  position: { x: number; y: number };
  issues: string[];
}

/**
 * Confidence statistics
 */
interface ConfidenceStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  distribution: number[]; // Histogram bins
}

/**
 * Outlier detection result
 */
interface OutlierResult {
  keypointName: PoseKeypointName;
  isOutlier: boolean;
  deviation: number;
  reason: string;
}

/**
 * Validation configuration
 */
interface ValidationConfig {
  minConfidence: number;
  maxConfidence: number;
  coordinateBounds: { minX: number; maxX: number; minY: number; maxY: number };
  anatomicalConstraints: AnatomicalConstraints;
  temporalThresholds: TemporalThresholds;
  outlierSensitivity: number; // 0-1, higher = more sensitive
}

/**
 * Anatomical constraints for pose validation
 */
interface AnatomicalConstraints {
  maxLimbLength: number; // Maximum limb length ratio
  minJointAngle: number; // Minimum joint angle in degrees
  maxJointAngle: number; // Maximum joint angle in degrees
  symmetryTolerance: number; // Tolerance for left-right symmetry
  proportionRatios: { [key: string]: { min: number; max: number } };
}

/**
 * Temporal validation thresholds
 */
interface TemporalThresholds {
  maxMovementPerFrame: number; // Maximum movement between frames
  maxAcceleration: number; // Maximum acceleration
  smoothnessThreshold: number; // Smoothness requirement
  consistencyWindow: number; // Number of frames to check
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minConfidence: 0.1,
  maxConfidence: 1.0,
  coordinateBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  anatomicalConstraints: {
    maxLimbLength: 0.5, // 50% of image diagonal
    minJointAngle: 10,
    maxJointAngle: 170,
    symmetryTolerance: 0.1,
    proportionRatios: {
      "head-torso": { min: 0.1, max: 0.3 },
      "torso-legs": { min: 0.4, max: 0.7 },
      "arm-torso": { min: 0.3, max: 0.8 },
    },
  },
  temporalThresholds: {
    maxMovementPerFrame: 0.1, // 10% of image size
    maxAcceleration: 0.05,
    smoothnessThreshold: 0.8,
    consistencyWindow: 5,
  },
  outlierSensitivity: 0.7,
};

/**
 * Pose data validator class
 */
export class PoseDataValidator {
  private config: ValidationConfig;
  private poseHistory: PoseDetectionResult[] = [];

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validate a single pose detection result
   */
  validatePose(pose: PoseDetectionResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const keypointValidation: KeypointValidationResult[] = [];

    // Basic structure validation
    if (!pose) {
      errors.push("Pose is null or undefined");
      return this.createValidationResult(false, errors, warnings, 0, {
        keypointValidation: [],
        temporalConsistency: 0,
        spatialConsistency: 0,
        confidenceDistribution: this.createEmptyConfidenceStats(),
        anatomicalPlausibility: 0,
        outlierDetection: [],
      });
    }

    if (!pose.keypoints || !Array.isArray(pose.keypoints)) {
      errors.push("Invalid keypoints array");
    }

    if (
      typeof pose.confidence !== "number" || pose.confidence < 0 ||
      pose.confidence > 1
    ) {
      errors.push("Invalid pose confidence value");
    }

    if (typeof pose.timestamp !== "number" || pose.timestamp <= 0) {
      errors.push("Invalid timestamp");
    }

    // Validate individual keypoints
    pose.keypoints.forEach((keypoint, index) => {
      const validation = this.validateKeypoint(keypoint, index);
      keypointValidation.push(validation);

      if (!validation.isValid) {
        errors.push(
          `Keypoint ${keypoint.name}: ${validation.issues.join(", ")}`,
        );
      }
    });

    // Calculate confidence statistics
    const confidenceStats = this.calculateConfidenceStats(pose.keypoints);

    // Check anatomical plausibility
    const anatomicalScore = this.checkAnatomicalPlausibility(pose);
    if (anatomicalScore < 0.5) {
      warnings.push("Pose may not be anatomically plausible");
    }

    // Detect outliers
    const outliers = this.detectOutliers(pose);
    outliers.forEach((outlier) => {
      if (outlier.isOutlier) {
        warnings.push(
          `Outlier detected: ${outlier.keypointName} - ${outlier.reason}`,
        );
      }
    });

    // Calculate temporal consistency if we have history
    const temporalConsistency = this.calculateTemporalConsistency(pose);
    if (temporalConsistency < 0.6) {
      warnings.push("Low temporal consistency detected");
    }

    // Calculate spatial consistency
    const spatialConsistency = this.calculateSpatialConsistency(pose);
    if (spatialConsistency < 0.7) {
      warnings.push("Low spatial consistency detected");
    }

    // Calculate overall quality score
    const score = this.calculateQualityScore(
      pose,
      anatomicalScore,
      temporalConsistency,
      spatialConsistency,
      confidenceStats,
    );

    // Add pose to history for temporal validation
    this.addToHistory(pose);

    const details: ValidationDetails = {
      keypointValidation,
      temporalConsistency,
      spatialConsistency,
      confidenceDistribution: confidenceStats,
      anatomicalPlausibility: anatomicalScore,
      outlierDetection: outliers,
    };

    return this.createValidationResult(
      errors.length === 0,
      errors,
      warnings,
      score,
      details,
    );
  }

  /**
   * Validate keypoint data
   */
  private validateKeypoint(
    keypoint: PoseKeypoint,
    index: number,
  ): KeypointValidationResult {
    const issues: string[] = [];

    // Check required properties
    if (!keypoint.name) {
      issues.push("Missing keypoint name");
    }

    if (typeof keypoint.x !== "number") {
      issues.push("Invalid x coordinate");
    } else if (
      keypoint.x < this.config.coordinateBounds.minX ||
      keypoint.x > this.config.coordinateBounds.maxX
    ) {
      issues.push("X coordinate out of bounds");
    }

    if (typeof keypoint.y !== "number") {
      issues.push("Invalid y coordinate");
    } else if (
      keypoint.y < this.config.coordinateBounds.minY ||
      keypoint.y > this.config.coordinateBounds.maxY
    ) {
      issues.push("Y coordinate out of bounds");
    }

    if (typeof keypoint.confidence !== "number") {
      issues.push("Invalid confidence value");
    } else if (
      keypoint.confidence < this.config.minConfidence ||
      keypoint.confidence > this.config.maxConfidence
    ) {
      issues.push("Confidence out of valid range");
    }

    return {
      name: keypoint.name,
      isValid: issues.length === 0,
      confidence: keypoint.confidence,
      position: { x: keypoint.x, y: keypoint.y },
      issues,
    };
  }

  /**
   * Calculate confidence statistics
   */
  private calculateConfidenceStats(keypoints: PoseKeypoint[]): ConfidenceStats {
    const confidences = keypoints.map((kp) => kp.confidence);
    const sorted = [...confidences].sort((a, b) => a - b);

    const mean = confidences.reduce((sum, c) => sum + c, 0) /
      confidences.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) /
      confidences.length;
    const std = Math.sqrt(variance);

    // Create histogram
    const bins = 10;
    const distribution = new Array(bins).fill(0);
    confidences.forEach((c) => {
      const binIndex = Math.min(Math.floor(c * bins), bins - 1);
      distribution[binIndex]++;
    });

    return {
      mean,
      median,
      std,
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      distribution,
    };
  }

  /**
   * Check anatomical plausibility
   */
  private checkAnatomicalPlausibility(pose: PoseDetectionResult): number {
    let score = 1.0;
    const keypoints = pose.keypoints;

    // Check limb length ratios
    const limbLengths = this.calculateLimbLengths(keypoints);
    Object.entries(limbLengths).forEach(([limb, length]) => {
      if (length > this.config.anatomicalConstraints.maxLimbLength) {
        score -= 0.2;
      }
    });

    // Check joint angles
    const jointAngles = this.calculateJointAngles(keypoints);
    Object.entries(jointAngles).forEach(([joint, angle]) => {
      if (
        angle < this.config.anatomicalConstraints.minJointAngle ||
        angle > this.config.anatomicalConstraints.maxJointAngle
      ) {
        score -= 0.1;
      }
    });

    // Check left-right symmetry
    const symmetryScore = this.checkSymmetry(keypoints);
    score *= symmetryScore;

    return Math.max(0, score);
  }

  /**
   * Calculate limb lengths
   */
  private calculateLimbLengths(
    keypoints: PoseKeypoint[],
  ): { [key: string]: number } {
    const getKeypoint = (name: PoseKeypointName) =>
      keypoints.find((kp) => kp.name === name);

    const calculateDistance = (kp1?: PoseKeypoint, kp2?: PoseKeypoint) => {
      if (!kp1 || !kp2) return 0;
      return Math.sqrt((kp1.x - kp2.x) ** 2 + (kp1.y - kp2.y) ** 2);
    };

    return {
      leftUpperArm: calculateDistance(
        getKeypoint("left_shoulder"),
        getKeypoint("left_elbow"),
      ),
      leftForearm: calculateDistance(
        getKeypoint("left_elbow"),
        getKeypoint("left_wrist"),
      ),
      rightUpperArm: calculateDistance(
        getKeypoint("right_shoulder"),
        getKeypoint("right_elbow"),
      ),
      rightForearm: calculateDistance(
        getKeypoint("right_elbow"),
        getKeypoint("right_wrist"),
      ),
      leftThigh: calculateDistance(
        getKeypoint("left_hip"),
        getKeypoint("left_knee"),
      ),
      leftShin: calculateDistance(
        getKeypoint("left_knee"),
        getKeypoint("left_ankle"),
      ),
      rightThigh: calculateDistance(
        getKeypoint("right_hip"),
        getKeypoint("right_knee"),
      ),
      rightShin: calculateDistance(
        getKeypoint("right_knee"),
        getKeypoint("right_ankle"),
      ),
    };
  }

  /**
   * Calculate joint angles
   */
  private calculateJointAngles(
    keypoints: PoseKeypoint[],
  ): { [key: string]: number } {
    const getKeypoint = (name: PoseKeypointName) =>
      keypoints.find((kp) => kp.name === name);

    const calculateAngle = (
      kp1?: PoseKeypoint,
      kp2?: PoseKeypoint,
      kp3?: PoseKeypoint,
    ) => {
      if (!kp1 || !kp2 || !kp3) return 90; // Default angle

      const v1 = { x: kp1.x - kp2.x, y: kp1.y - kp2.y };
      const v2 = { x: kp3.x - kp2.x, y: kp3.y - kp2.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
      const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

      if (mag1 === 0 || mag2 === 0) return 90;

      const cos = dot / (mag1 * mag2);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    };

    return {
      leftElbow: calculateAngle(
        getKeypoint("left_shoulder"),
        getKeypoint("left_elbow"),
        getKeypoint("left_wrist"),
      ),
      rightElbow: calculateAngle(
        getKeypoint("right_shoulder"),
        getKeypoint("right_elbow"),
        getKeypoint("right_wrist"),
      ),
      leftKnee: calculateAngle(
        getKeypoint("left_hip"),
        getKeypoint("left_knee"),
        getKeypoint("left_ankle"),
      ),
      rightKnee: calculateAngle(
        getKeypoint("right_hip"),
        getKeypoint("right_knee"),
        getKeypoint("right_ankle"),
      ),
    };
  }

  /**
   * Check left-right symmetry
   */
  private checkSymmetry(keypoints: PoseKeypoint[]): number {
    const leftShoulder = keypoints.find((kp) => kp.name === "left_shoulder");
    const rightShoulder = keypoints.find((kp) => kp.name === "right_shoulder");
    const leftHip = keypoints.find((kp) => kp.name === "left_hip");
    const rightHip = keypoints.find((kp) => kp.name === "right_hip");

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return 0.5; // Partial symmetry if key points missing
    }

    // Check shoulder-hip alignment
    const shoulderDistance = Math.abs(leftShoulder.y - rightShoulder.y);
    const hipDistance = Math.abs(leftHip.y - rightHip.y);

    const alignmentScore = 1 -
      Math.min(1, (shoulderDistance + hipDistance) / 0.2);

    return alignmentScore;
  }

  /**
   * Detect outliers in pose data
   */
  private detectOutliers(pose: PoseDetectionResult): OutlierResult[] {
    const results: OutlierResult[] = [];

    pose.keypoints.forEach((keypoint) => {
      let isOutlier = false;
      let deviation = 0;
      let reason = "";

      // Check confidence outliers
      const confidenceStats = this.calculateConfidenceStats(pose.keypoints);
      const confidenceDeviation = Math.abs(
        keypoint.confidence - confidenceStats.mean,
      );
      if (confidenceDeviation > 2 * confidenceStats.std) {
        isOutlier = true;
        deviation = confidenceDeviation;
        reason = "Confidence outlier";
      }

      // Check position outliers (if we have history)
      if (this.poseHistory.length > 0) {
        const recentPose = this.poseHistory[this.poseHistory.length - 1];
        const historicalKeypoint = recentPose.keypoints.find(
          (kp) => kp.name === keypoint.name,
        );

        if (historicalKeypoint) {
          const positionChange = Math.sqrt(
            (keypoint.x - historicalKeypoint.x) ** 2 +
              (keypoint.y - historicalKeypoint.y) ** 2,
          );

          if (
            positionChange > this.config.temporalThresholds.maxMovementPerFrame
          ) {
            isOutlier = true;
            deviation = positionChange;
            reason = "Sudden position change";
          }
        }
      }

      results.push({
        keypointName: keypoint.name,
        isOutlier,
        deviation,
        reason,
      });
    });

    return results;
  }

  /**
   * Calculate temporal consistency
   */
  private calculateTemporalConsistency(pose: PoseDetectionResult): number {
    if (this.poseHistory.length < 2) {
      return 1.0; // Perfect consistency if no history
    }

    const windowSize = Math.min(
      this.config.temporalThresholds.consistencyWindow,
      this.poseHistory.length,
    );
    const recentPoses = this.poseHistory.slice(-windowSize);

    let totalConsistency = 0;
    let comparisons = 0;

    for (let i = 1; i < recentPoses.length; i++) {
      const similarity = this.calculatePoseSimilarity(
        recentPoses[i - 1],
        recentPoses[i],
      );
      totalConsistency += similarity;
      comparisons++;
    }

    return comparisons > 0 ? totalConsistency / comparisons : 1.0;
  }

  /**
   * Calculate spatial consistency
   */
  private calculateSpatialConsistency(pose: PoseDetectionResult): number {
    // Check if keypoints form a reasonable spatial configuration
    const keypoints = pose.keypoints.filter((kp) => kp.confidence > 0.3);

    if (keypoints.length < 5) {
      return 0.3; // Low consistency if too few keypoints
    }

    // Calculate bounding box and check if it's reasonable
    const xs = keypoints.map((kp) => kp.x);
    const ys = keypoints.map((kp) => kp.y);

    const boundingBox = {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };

    // Check aspect ratio (human poses should have reasonable proportions)
    const aspectRatio = boundingBox.width / boundingBox.height;
    const idealAspectRatio = 0.6; // Typical human aspect ratio
    const aspectScore = 1 -
      Math.abs(aspectRatio - idealAspectRatio) / idealAspectRatio;

    // Check keypoint distribution
    const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;

    const distributionScore = keypoints.reduce((score, kp) => {
      const distanceFromCenter = Math.sqrt(
        (kp.x - centerX) ** 2 + (kp.y - centerY) ** 2,
      );
      return score + (distanceFromCenter < 0.5 ? 1 : 0.5);
    }, 0) / keypoints.length;

    return (aspectScore + distributionScore) / 2;
  }

  /**
   * Calculate pose similarity
   */
  private calculatePoseSimilarity(
    pose1: PoseDetectionResult,
    pose2: PoseDetectionResult,
  ): number {
    if (pose1.keypoints.length !== pose2.keypoints.length) {
      return 0;
    }

    let totalSimilarity = 0;
    let validComparisons = 0;

    for (let i = 0; i < pose1.keypoints.length; i++) {
      const kp1 = pose1.keypoints[i];
      const kp2 = pose2.keypoints[i];

      if (kp1.confidence > 0.3 && kp2.confidence > 0.3) {
        const distance = Math.sqrt(
          (kp1.x - kp2.x) ** 2 + (kp1.y - kp2.y) ** 2,
        );
        const similarity = Math.max(0, 1 - distance / 0.5); // Normalize by max expected distance
        totalSimilarity += similarity;
        validComparisons++;
      }
    }

    return validComparisons > 0 ? totalSimilarity / validComparisons : 0;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(
    pose: PoseDetectionResult,
    anatomicalScore: number,
    temporalConsistency: number,
    spatialConsistency: number,
    confidenceStats: ConfidenceStats,
  ): number {
    const weights = {
      confidence: 0.3,
      anatomical: 0.25,
      temporal: 0.25,
      spatial: 0.2,
    };

    const confidenceScore = confidenceStats.mean;

    return (
      weights.confidence * confidenceScore +
      weights.anatomical * anatomicalScore +
      weights.temporal * temporalConsistency +
      weights.spatial * spatialConsistency
    );
  }

  /**
   * Add pose to history for temporal validation
   */
  private addToHistory(pose: PoseDetectionResult): void {
    this.poseHistory.push(pose);

    // Keep only recent history
    const maxHistorySize = this.config.temporalThresholds.consistencyWindow * 2;
    if (this.poseHistory.length > maxHistorySize) {
      this.poseHistory = this.poseHistory.slice(-maxHistorySize);
    }
  }

  /**
   * Create validation result
   */
  private createValidationResult(
    isValid: boolean,
    errors: string[],
    warnings: string[],
    score: number,
    details: ValidationDetails,
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      score,
      details,
    };
  }

  /**
   * Create empty confidence stats
   */
  private createEmptyConfidenceStats(): ConfidenceStats {
    return {
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0,
      distribution: [],
    };
  }

  /**
   * Clear pose history
   */
  clearHistory(): void {
    this.poseHistory = [];
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Validate pose data buffer
 */
export function validatePoseDataBuffer(
  buffer: PoseDataBuffer,
): ValidationResult {
  const validator = new PoseDataValidator();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic buffer validation
  if (!buffer.poses || !Array.isArray(buffer.poses)) {
    errors.push("Invalid poses array in buffer");
  }

  if (buffer.poses.length === 0) {
    warnings.push("Empty pose buffer");
  }

  if (buffer.duration <= 0) {
    errors.push("Invalid buffer duration");
  }

  // Validate individual poses
  const poseValidations = buffer.poses.map((pose) =>
    validator.validatePose(pose)
  );
  const invalidPoses = poseValidations.filter((v) => !v.isValid);

  if (invalidPoses.length > 0) {
    errors.push(`${invalidPoses.length} invalid poses found in buffer`);
  }

  // Calculate overall buffer quality
  const averageScore = poseValidations.reduce((sum, v) => sum + v.score, 0) /
    poseValidations.length;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: averageScore,
    details: {
      keypointValidation: [],
      temporalConsistency: averageScore,
      spatialConsistency: averageScore,
      confidenceDistribution: validator["createEmptyConfidenceStats"](),
      anatomicalPlausibility: averageScore,
      outlierDetection: [],
    },
  };
}

/**
 * Singleton validator instance
 */
export const poseValidator = new PoseDataValidator();

/**
 * Utility functions for pose validation
 */
export const PoseValidationUtils = {
  /**
   * Quick validation check
   */
  isValidPose: (pose: PoseDetectionResult): boolean => {
    return poseValidator.validatePose(pose).isValid;
  },

  /**
   * Get pose quality score
   */
  getPoseQuality: (pose: PoseDetectionResult): number => {
    return poseValidator.validatePose(pose).score;
  },

  /**
   * Filter poses by quality
   */
  filterByQuality: (
    poses: PoseDetectionResult[],
    minQuality: number,
  ): PoseDetectionResult[] => {
    return poses.filter((pose) =>
      PoseValidationUtils.getPoseQuality(pose) >= minQuality
    );
  },

  /**
   * Get validation summary
   */
  getValidationSummary: (poses: PoseDetectionResult[]) => {
    const validations = poses.map((pose) => poseValidator.validatePose(pose));
    const validCount = validations.filter((v) => v.isValid).length;
    const averageScore = validations.reduce((sum, v) => sum + v.score, 0) /
      validations.length;

    return {
      totalPoses: poses.length,
      validPoses: validCount,
      invalidPoses: poses.length - validCount,
      averageQuality: averageScore,
      validationRate: validCount / poses.length,
    };
  },
};

export default PoseDataValidator;
