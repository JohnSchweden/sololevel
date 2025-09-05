/**
 * PoseOverlay MVP Integration Tests
 * Validates that MVP pose data can be properly adapted for PoseOverlay component
 */

import type { MVPPoseDetectionResult } from '../types/MVPpose'
import type { PoseDetectionResult } from '../types/pose'
import { adaptMVPPoseToProduction } from '../utils/MVPTypeAdapter'

describe('PoseOverlay MVP Integration', () => {
  const createMockMVPPose = (keypointCount = 3): MVPPoseDetectionResult => ({
    keypoints: Array.from({ length: keypointCount }, (_, i) => ({
      name: `keypoint_${i}` as any,
      x: 0.3 + i * 0.1, // Spread keypoints across screen
      y: 0.4 + i * 0.1,
      confidence: 0.7 + i * 0.05, // Varying confidence levels
    })),
    confidence: 0.85,
    timestamp: Date.now(),
  })

  describe('MVP Pose Data Adaptation', () => {
    it('should adapt MVP pose data for PoseOverlay component', () => {
      const mvpPose = createMockMVPPose(5)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      // Verify adaptation maintains data integrity
      expect(adaptedPose.keypoints).toHaveLength(5)
      expect(adaptedPose.confidence).toBe(mvpPose.confidence)
      expect(adaptedPose.timestamp).toBe(mvpPose.timestamp)

      // Verify PoseOverlay expected interface
      expect(adaptedPose).toHaveProperty('keypoints')
      expect(adaptedPose).toHaveProperty('confidence')
      expect(adaptedPose).toHaveProperty('timestamp')
      expect(Array.isArray(adaptedPose.keypoints)).toBe(true)
    })

    it('should handle empty MVP pose data', () => {
      const emptyMVPPose: MVPPoseDetectionResult = {
        keypoints: [],
        confidence: 0,
        timestamp: Date.now(),
      }
      const adaptedPose = adaptMVPPoseToProduction(emptyMVPPose)

      // Should adapt without crashing
      expect(adaptedPose.keypoints).toHaveLength(0)
      expect(adaptedPose.confidence).toBe(0)
      expect(typeof adaptedPose.timestamp).toBe('number')
    })

    it('should validate adapted pose structure for PoseOverlay', () => {
      const mvpPose = createMockMVPPose(3)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      // Verify each keypoint has required PoseOverlay properties
      adaptedPose.keypoints.forEach((keypoint) => {
        expect(keypoint).toHaveProperty('name')
        expect(keypoint).toHaveProperty('x')
        expect(keypoint).toHaveProperty('y')
        expect(keypoint).toHaveProperty('confidence')
        expect(typeof keypoint.x).toBe('number')
        expect(typeof keypoint.y).toBe('number')
        expect(typeof keypoint.confidence).toBe('number')
        expect(typeof keypoint.name).toBe('string')
      })
    })
  })

  describe('MVP Pose Data Accuracy', () => {
    it('should preserve keypoint count through adaptation', () => {
      const keypointCounts = [1, 3, 5, 17] // Test various keypoint counts

      keypointCounts.forEach((count) => {
        const mvpPose = createMockMVPPose(count)
        const adaptedPose = adaptMVPPoseToProduction(mvpPose)

        expect(adaptedPose.keypoints).toHaveLength(count)
        expect(adaptedPose.keypoints).toHaveLength(mvpPose.keypoints.length)
      })
    })

    it('should preserve confidence values through adaptation', () => {
      const mvpPose = createMockMVPPose(3)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      expect(adaptedPose.confidence).toBe(mvpPose.confidence)

      // Check individual keypoint confidences
      adaptedPose.keypoints.forEach((keypoint, index) => {
        expect(keypoint.confidence).toBe(mvpPose.keypoints[index].confidence)
      })
    })

    it('should preserve coordinate values through adaptation', () => {
      const mvpPose = createMockMVPPose(2)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      adaptedPose.keypoints.forEach((keypoint, index) => {
        const originalKeypoint = mvpPose.keypoints[index]
        expect(keypoint.x).toBe(originalKeypoint.x)
        expect(keypoint.y).toBe(originalKeypoint.y)
        expect(keypoint.name).toBe(originalKeypoint.name)
      })
    })

    it('should preserve timestamp through adaptation', () => {
      const mvpPose = createMockMVPPose(1)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      expect(adaptedPose.timestamp).toBe(mvpPose.timestamp)
    })
  })

  describe('Component Integration Scenarios', () => {
    it('should adapt realistic MVP pose data for PoseOverlay', () => {
      // Simulate realistic pose detection result
      const realisticMVPPose: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0.5, y: 0.2, confidence: 0.95 },
          { name: 'left_shoulder', x: 0.3, y: 0.4, confidence: 0.88 },
          { name: 'right_shoulder', x: 0.7, y: 0.4, confidence: 0.92 },
          { name: 'left_elbow', x: 0.2, y: 0.6, confidence: 0.75 },
          { name: 'right_elbow', x: 0.8, y: 0.6, confidence: 0.82 },
        ],
        confidence: 0.86,
        timestamp: Date.now(),
      }

      const adaptedPose = adaptMVPPoseToProduction(realisticMVPPose)

      // Verify realistic pose data is properly adapted
      expect(adaptedPose.keypoints).toHaveLength(5)
      expect(adaptedPose.confidence).toBe(0.86)
      expect(adaptedPose.keypoints[0].name).toBe('nose')
      expect(adaptedPose.keypoints[0].confidence).toBe(0.95)
    })

    it('should handle low confidence MVP pose data', () => {
      const lowConfidencePose: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0.5, y: 0.3, confidence: 0.2 }, // Low confidence
          { name: 'left_shoulder', x: 0.4, y: 0.5, confidence: 0.15 },
        ],
        confidence: 0.18, // Overall low confidence
        timestamp: Date.now(),
      }

      const adaptedPose = adaptMVPPoseToProduction(lowConfidencePose)

      // Should adapt even with low confidence
      expect(adaptedPose.keypoints).toHaveLength(2)
      expect(adaptedPose.confidence).toBe(0.18)
      expect(adaptedPose.keypoints[0].confidence).toBe(0.2)
    })

    it('should maintain coordinate precision for different screen dimensions', () => {
      const mvpPose = createMockMVPPose(3)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      // Verify coordinates are preserved exactly
      adaptedPose.keypoints.forEach((keypoint, index) => {
        const originalKeypoint = mvpPose.keypoints[index]
        expect(keypoint.x).toBe(originalKeypoint.x)
        expect(keypoint.y).toBe(originalKeypoint.y)
        // Coordinates should be normalized (0-1) for any screen size
        expect(keypoint.x).toBeGreaterThanOrEqual(0)
        expect(keypoint.x).toBeLessThanOrEqual(1)
        expect(keypoint.y).toBeGreaterThanOrEqual(0)
        expect(keypoint.y).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle maximum keypoint count', () => {
      // MoveNet Lightning supports up to 17 keypoints
      const maxKeypointPose = createMockMVPPose(17)
      const adaptedPose = adaptMVPPoseToProduction(maxKeypointPose)

      expect(adaptedPose.keypoints).toHaveLength(17)
      expect(adaptedPose.confidence).toBe(maxKeypointPose.confidence)
    })

    it('should handle edge coordinate values', () => {
      const edgeCasePose: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0, y: 0, confidence: 1 }, // Top-left corner
          { name: 'left_shoulder', x: 1, y: 1, confidence: 1 }, // Bottom-right corner
          { name: 'right_shoulder', x: 0.5, y: 0.5, confidence: 1 }, // Center
        ],
        confidence: 1,
        timestamp: Date.now(),
      }

      const adaptedPose = adaptMVPPoseToProduction(edgeCasePose)

      // Verify edge coordinates are preserved
      expect(adaptedPose.keypoints[0].x).toBe(0)
      expect(adaptedPose.keypoints[0].y).toBe(0)
      expect(adaptedPose.keypoints[1].x).toBe(1)
      expect(adaptedPose.keypoints[1].y).toBe(1)
      expect(adaptedPose.keypoints[2].x).toBe(0.5)
      expect(adaptedPose.keypoints[2].y).toBe(0.5)
    })

    it('should validate PoseOverlay interface compatibility', () => {
      const mvpPose = createMockMVPPose(5)
      const adaptedPose = adaptMVPPoseToProduction(mvpPose)

      // Verify the adapted pose matches PoseDetectionResult interface
      const validatePoseDetectionResult = (pose: PoseDetectionResult): boolean => {
        return (
          Array.isArray(pose.keypoints) &&
          typeof pose.confidence === 'number' &&
          typeof pose.timestamp === 'number' &&
          pose.keypoints.every(
            (kp) =>
              typeof kp.name === 'string' &&
              typeof kp.x === 'number' &&
              typeof kp.y === 'number' &&
              typeof kp.confidence === 'number'
          )
        )
      }

      expect(validatePoseDetectionResult(adaptedPose)).toBe(true)
    })
  })
})
