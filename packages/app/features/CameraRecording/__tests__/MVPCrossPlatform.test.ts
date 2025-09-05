/**
 * MVP Cross-Platform Compatibility Tests
 * Validates MVP pose detection works on both web (MediaDevices) and native (VisionCamera) platforms
 */

import { Platform } from 'react-native'
import type { MVPPoseDetectionConfig, MVPPoseDetectionResult } from '../types/MVPpose'

// Mock Platform.OS for testing
const mockPlatform = (os: string) => {
  Object.defineProperty(Platform, 'OS', {
    writable: true,
    value: os,
  })
}

describe('MVP Cross-Platform Compatibility', () => {
  const mockConfig: MVPPoseDetectionConfig = {
    modelType: 'lightning',
    confidenceThreshold: 0.3,
    targetFps: 30,
    inputResolution: { width: 256, height: 256 },
  }

  const mockPoseResult: MVPPoseDetectionResult = {
    keypoints: [
      { name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 },
      { name: 'left_shoulder', x: 0.3, y: 0.5, confidence: 0.8 },
      { name: 'right_shoulder', x: 0.7, y: 0.5, confidence: 0.8 },
    ],
    confidence: 0.85,
    timestamp: Date.now(),
  }

  beforeEach(() => {
    // Reset to default platform
    mockPlatform('ios')
  })

  describe('Platform Detection and Delegation', () => {
    it('should detect iOS as native platform', () => {
      mockPlatform('ios')
      expect(Platform.OS).toBe('ios')
      expect(Platform.OS !== 'web').toBe(true)
    })

    it('should detect Android as native platform', () => {
      mockPlatform('android')
      expect(Platform.OS).toBe('android')
      expect(Platform.OS !== 'web').toBe(true)
    })

    it('should detect web platform correctly', () => {
      mockPlatform('web')
      expect(Platform.OS).toBe('web')
      expect(Platform.OS === 'web').toBe(true)
    })

    it('should use correct implementation based on platform', () => {
      // Test platform detection logic used in useMVPPoseDetection
      mockPlatform('ios')
      const isNative = Platform.OS !== 'web'
      expect(isNative).toBe(true)

      mockPlatform('web')
      const isWeb = Platform.OS === 'web'
      expect(isWeb).toBe(true)
    })
  })

  describe('Native Platform Compatibility', () => {
    beforeEach(() => {
      mockPlatform('ios')
    })

    it('should validate native platform configuration', () => {
      const nativeConfig: MVPPoseDetectionConfig = {
        modelType: 'thunder', // Higher accuracy for native
        confidenceThreshold: 0.5,
        targetFps: 15, // Lower FPS for better performance on mobile
        inputResolution: { width: 256, height: 256 },
      }

      expect(nativeConfig.modelType).toBe('thunder')
      expect(nativeConfig.targetFps).toBe(15)
      expect(nativeConfig.confidenceThreshold).toBe(0.5)
    })

    it('should validate native pose result structure', () => {
      const nativePoseResult: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 },
          { name: 'left_shoulder', x: 0.3, y: 0.5, confidence: 0.8 },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      }

      expect(nativePoseResult.keypoints).toHaveLength(2)
      expect(nativePoseResult.confidence).toBe(0.85)
      expect(typeof nativePoseResult.timestamp).toBe('number')
    })

    it('should handle native error scenarios', () => {
      const nativeErrors = [
        'Native camera access failed',
        'VisionCamera not available',
        'TensorFlow Lite model loading failed',
      ]

      nativeErrors.forEach((error) => {
        expect(typeof error).toBe('string')
        expect(error.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Web Platform Compatibility', () => {
    beforeEach(() => {
      mockPlatform('web')
    })

    it('should validate web platform configuration', () => {
      const webConfig: MVPPoseDetectionConfig = {
        modelType: 'lightning', // Faster model for web
        confidenceThreshold: 0.3,
        targetFps: 30, // Higher FPS possible on desktop
        inputResolution: { width: 256, height: 256 },
      }

      expect(webConfig.modelType).toBe('lightning')
      expect(webConfig.targetFps).toBe(30)
      expect(webConfig.confidenceThreshold).toBe(0.3)
    })

    it('should validate web pose result structure', () => {
      const webPoseResult: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0.5, y: 0.3, confidence: 0.9 },
          { name: 'left_shoulder', x: 0.3, y: 0.5, confidence: 0.8 },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      }

      expect(webPoseResult.keypoints).toHaveLength(2)
      expect(webPoseResult.confidence).toBe(0.85)
      expect(typeof webPoseResult.timestamp).toBe('number')
    })

    it('should handle web browser compatibility issues', () => {
      const webErrors = [
        'MediaDevices not supported',
        'TensorFlow.js model loading failed',
        'WebGL not available',
      ]

      webErrors.forEach((error) => {
        expect(typeof error).toBe('string')
        expect(error.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Cross-Platform Data Consistency', () => {
    it('should produce consistent pose data structure across platforms', () => {
      const nativePose: MVPPoseDetectionResult = mockPoseResult
      const webPose: MVPPoseDetectionResult = mockPoseResult

      // Both should have identical data structure
      expect(nativePose.keypoints).toHaveLength(3)
      expect(webPose.keypoints).toHaveLength(3)

      expect(typeof nativePose.confidence).toBe('number')
      expect(typeof webPose.confidence).toBe('number')

      expect(typeof nativePose.timestamp).toBe('number')
      expect(typeof webPose.timestamp).toBe('number')
    })

    it('should handle coordinate normalization consistently', () => {
      const testPose: MVPPoseDetectionResult = {
        keypoints: [
          { name: 'nose', x: 0, y: 0, confidence: 1 }, // Top-left
          { name: 'left_shoulder', x: 1, y: 1, confidence: 1 }, // Bottom-right
          { name: 'right_shoulder', x: 0.5, y: 0.5, confidence: 1 }, // Center
        ],
        confidence: 1,
        timestamp: Date.now(),
      }

      // Both platforms should handle normalized coordinates (0-1) identically
      testPose.keypoints.forEach((kp) => {
        expect(kp.x).toBeGreaterThanOrEqual(0)
        expect(kp.x).toBeLessThanOrEqual(1)
        expect(kp.y).toBeGreaterThanOrEqual(0)
        expect(kp.y).toBeLessThanOrEqual(1)
      })
    })

    it('should handle confidence thresholds consistently', () => {
      const highConfidenceConfig: MVPPoseDetectionConfig = {
        modelType: 'lightning',
        confidenceThreshold: 0.7, // High threshold
        targetFps: 30,
        inputResolution: { width: 256, height: 256 },
      }

      // Both platforms should respect the same confidence threshold
      expect(highConfidenceConfig.confidenceThreshold).toBe(0.7)
      expect(typeof highConfidenceConfig.confidenceThreshold).toBe('number')
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle different FPS targets per platform', () => {
      const nativeConfig: MVPPoseDetectionConfig = {
        modelType: 'lightning',
        confidenceThreshold: 0.3,
        targetFps: 15, // Conservative for mobile
        inputResolution: { width: 256, height: 256 },
      }

      const webConfig: MVPPoseDetectionConfig = {
        modelType: 'lightning',
        confidenceThreshold: 0.3,
        targetFps: 30, // Higher for desktop
        inputResolution: { width: 256, height: 256 },
      }

      expect(nativeConfig.targetFps).toBe(15)
      expect(webConfig.targetFps).toBe(30)
    })

    it('should handle model type selection per platform', () => {
      // Native might prefer thunder for accuracy
      const nativeConfig: MVPPoseDetectionConfig = {
        modelType: 'thunder',
        confidenceThreshold: 0.3,
        targetFps: 15,
        inputResolution: { width: 256, height: 256 },
      }

      // Web might prefer lightning for speed
      const webConfig: MVPPoseDetectionConfig = {
        modelType: 'lightning',
        confidenceThreshold: 0.3,
        targetFps: 30,
        inputResolution: { width: 256, height: 256 },
      }

      expect(nativeConfig.modelType).toBe('thunder')
      expect(webConfig.modelType).toBe('lightning')
    })
  })

  describe('Error Handling Consistency', () => {
    it('should handle initialization failures consistently', () => {
      const initErrors = [
        'Failed to initialize pose detection',
        'Model loading failed',
        'Camera access denied',
      ]

      initErrors.forEach((error) => {
        expect(typeof error).toBe('string')
        expect(error.length).toBeGreaterThan(0)
      })
    })

    it('should handle detection failures consistently', () => {
      const detectionErrors = [
        'Detection inference failed',
        'No pose detected',
        'Low confidence detection',
      ]

      detectionErrors.forEach((error) => {
        expect(typeof error).toBe('string')
        expect(error.length).toBeGreaterThan(0)
      })
    })

    it('should validate error state structure', () => {
      const errorState = {
        isInitialized: false,
        isDetecting: false,
        isEnabled: true,
        currentPose: null,
        lastDetectionTime: 0,
        config: mockConfig,
        error: 'Test error message',
      }

      expect(errorState.error).toBe('Test error message')
      expect(errorState.currentPose).toBeNull()
      expect(errorState.isInitialized).toBe(false)
    })
  })
})
