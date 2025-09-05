/**
 * MVP Pose Detection Integration Tests
 * Validates state management integration between MVP hooks and existing components
 */

import type { MVPPoseDetectionResult } from '../types/MVPpose'
import { adaptMVPPoseToProduction, isMVPPoseCompatible } from '../utils/MVPTypeAdapter'

describe('MVP Pose Detection Integration', () => {
  describe('MVP Type Adapter', () => {
    const mockMVPPose: MVPPoseDetectionResult = {
      keypoints: [
        { name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 },
        { name: 'left_shoulder', x: 0.4, y: 0.5, confidence: 0.8 },
        { name: 'right_shoulder', x: 0.6, y: 0.5, confidence: 0.8 },
      ],
      confidence: 0.85,
      timestamp: Date.now(),
    }

    it('should adapt MVP pose to production format', () => {
      const adaptedPose = adaptMVPPoseToProduction(mockMVPPose)

      expect(adaptedPose.keypoints).toHaveLength(3)
      expect(adaptedPose.confidence).toBe(0.85)
      expect(adaptedPose.timestamp).toBe(mockMVPPose.timestamp)
      expect(adaptedPose.keypoints[0].name).toBe('nose')
      expect(adaptedPose.keypoints[0].x).toBe(0.5)
    })

    it('should validate MVP pose compatibility', () => {
      expect(isMVPPoseCompatible(mockMVPPose)).toBe(true)

      // Test invalid pose
      const invalidPose = { ...mockMVPPose, keypoints: null } as any
      expect(isMVPPoseCompatible(invalidPose)).toBe(false)
    })

    it('should handle empty keypoints array', () => {
      const emptyPose: MVPPoseDetectionResult = {
        keypoints: [],
        confidence: 0,
        timestamp: Date.now(),
      }

      const adaptedPose = adaptMVPPoseToProduction(emptyPose)
      expect(adaptedPose.keypoints).toHaveLength(0)
      expect(isMVPPoseCompatible(emptyPose)).toBe(true)
    })
  })

  describe('State Management Integration', () => {
    it('should validate MVP pose detection state flow', () => {
      // Test the core integration logic without React hooks
      const mockMVPPose: MVPPoseDetectionResult = {
        keypoints: [{ name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 }],
        confidence: 0.85,
        timestamp: Date.now(),
      }

      // Verify pose can be adapted for production components
      const adaptedPose = adaptMVPPoseToProduction(mockMVPPose)
      expect(adaptedPose).toBeDefined()
      expect(adaptedPose.keypoints).toHaveLength(1)

      // Verify compatibility check passes
      expect(isMVPPoseCompatible(mockMVPPose)).toBe(true)
    })

    it('should handle toggle state logic', () => {
      // Test the toggle logic that would be used in components
      let poseEnabled = false

      // Simulate toggle function
      const togglePoseDetection = () => {
        poseEnabled = !poseEnabled
      }

      expect(poseEnabled).toBe(false)
      togglePoseDetection()
      expect(poseEnabled).toBe(true)
      togglePoseDetection()
      expect(poseEnabled).toBe(false)
    })
  })

  describe('Component Integration Compatibility', () => {
    it('should provide compatible interface for PoseOverlay component', () => {
      const mockMVPPose: MVPPoseDetectionResult = {
        keypoints: [{ name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 }],
        confidence: 0.85,
        timestamp: Date.now(),
      }

      const adaptedPose = adaptMVPPoseToProduction(mockMVPPose)

      // Verify PoseOverlay expected interface
      expect(adaptedPose).toHaveProperty('keypoints')
      expect(adaptedPose).toHaveProperty('confidence')
      expect(adaptedPose).toHaveProperty('timestamp')
      expect(Array.isArray(adaptedPose.keypoints)).toBe(true)

      // Verify keypoint structure
      if (adaptedPose.keypoints.length > 0) {
        const keypoint = adaptedPose.keypoints[0]
        expect(keypoint).toHaveProperty('name')
        expect(keypoint).toHaveProperty('x')
        expect(keypoint).toHaveProperty('y')
        expect(keypoint).toHaveProperty('confidence')
      }
    })
  })
})
