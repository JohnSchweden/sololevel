import { describe, expect, it } from 'vitest'
import { type PoseDetectionResult } from '../types/ai-analyze-video.ts'
import { calculateAverageConfidence, unifyPoseDataFormat } from './format.ts'

describe('unifyPoseDataFormat', () => {
  it('should set source to live_recording for live videos', () => {
  const poseData: PoseDetectionResult[] = [{
    timestamp: 1000,
    joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
    confidence: 0.8,
    metadata: {
      source: 'live_recording' as const,
      processingMethod: 'vision_camera' as const,
      frameIndex: 0,
      originalTimestamp: 1000,
    }
  }]

  const result = unifyPoseDataFormat(poseData, 'live_recording')

  expect(result[0].metadata?.source).toBe('live_recording')
  expect(result[0].metadata?.processingMethod).toBe('vision_camera')
  })

  it('should set source to uploaded_video for uploaded videos', () => {
    const poseData: PoseDetectionResult[] = [{
      timestamp: 1000,
      joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
      confidence: 0.8,
      metadata: {
        source: 'live_recording' as const,
        processingMethod: 'vision_camera' as const,
        frameIndex: 0,
        originalTimestamp: 1000,
      }
    }]

    const result = unifyPoseDataFormat(poseData, 'uploaded_video')

    expect(result[0].metadata?.source).toBe('uploaded_video')
    expect(result[0].metadata?.processingMethod).toBe('video_processing')
  })

  it('should preserve existing metadata properties', () => {
    const poseData: PoseDetectionResult[] = [{
      timestamp: 1000,
      joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
      confidence: 0.8,
      metadata: {
        source: 'live_recording' as const,
        processingMethod: 'vision_camera' as const,
        frameIndex: 5,
        originalTimestamp: 1000,
      }
    }]

    const result = unifyPoseDataFormat(poseData, 'uploaded_video')

    expect(result[0].metadata?.frameIndex).toBe(5)
    expect(result[0].metadata?.originalTimestamp).toBe(1000)
  })

  it('should handle empty pose data array', () => {
    const result = unifyPoseDataFormat([], 'live_recording')
    expect(result).toHaveLength(0)
  })

  it('should handle multiple frames', () => {
    const poseData: PoseDetectionResult[] = [
      {
        timestamp: 1000,
        joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
        confidence: 0.8,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 0, originalTimestamp: 1000 }
      },
      {
        timestamp: 1033,
        joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
        confidence: 0.7,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 1, originalTimestamp: 1033 }
      }
    ]

    const result = unifyPoseDataFormat(poseData, 'uploaded_video')

    expect(result).toHaveLength(2)
    expect(result[0].metadata?.source).toBe('uploaded_video')
    expect(result[1].metadata?.source).toBe('uploaded_video')
  })

  it('should not modify original pose data', () => {
    const originalPoseData: PoseDetectionResult[] = [{
      timestamp: 1000,
      joints: [{ id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }],
      confidence: 0.8,
      metadata: {
        source: 'live_recording' as const,
        processingMethod: 'vision_camera' as const,
        frameIndex: 0,
        originalTimestamp: 1000,
      }
    }]

    const _originalMetadata = { ...originalPoseData[0].metadata }
    unifyPoseDataFormat(originalPoseData, 'uploaded_video')

    // Original data should be unchanged
    expect(originalPoseData[0].metadata?.source).toBe('live_recording')
    expect(originalPoseData[0].metadata?.processingMethod).toBe('vision_camera')
  })
})

describe('calculateAverageConfidence', () => {
  it('should return 0 for empty array', () => {
    const result = calculateAverageConfidence([])
    expect(result).toBe(0)
  })

  it('should calculate average of single confidence value', () => {
    const poseData: PoseDetectionResult[] = [{
      timestamp: 1000,
      joints: [],
      confidence: 0.8,
      metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 0, originalTimestamp: 1000 }
    }]

    const result = calculateAverageConfidence(poseData)
    expect(result).toBe(0.8)
  })

  it('should calculate average of multiple confidence values', () => {
    const poseData: PoseDetectionResult[] = [
      {
        timestamp: 1000,
        joints: [],
        confidence: 0.6,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 0, originalTimestamp: 1000 }
      },
      {
        timestamp: 1033,
        joints: [],
        confidence: 0.8,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 1, originalTimestamp: 1033 }
      },
      {
        timestamp: 1066,
        joints: [],
        confidence: 0.9,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 2, originalTimestamp: 1066 }
      }
    ]

    const result = calculateAverageConfidence(poseData)
    // (0.6 + 0.8 + 0.9) / 3 = 0.7666666666666667
    expect(result).toBeCloseTo(0.767, 3)
  })

  it('should handle zero confidence values', () => {
    const poseData: PoseDetectionResult[] = [
      {
        timestamp: 1000,
        joints: [],
        confidence: 0,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 0, originalTimestamp: 1000 }
      },
      {
        timestamp: 1033,
        joints: [],
        confidence: 1,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 1, originalTimestamp: 1033 }
      }
    ]

    const result = calculateAverageConfidence(poseData)
    expect(result).toBe(0.5)
  })

  it('should handle decimal confidence values', () => {
    const poseData: PoseDetectionResult[] = [
      {
        timestamp: 1000,
        joints: [],
        confidence: 0.123,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 0, originalTimestamp: 1000 }
      },
      {
        timestamp: 1033,
        joints: [],
        confidence: 0.456,
        metadata: { source: 'live_recording' as const, processingMethod: 'vision_camera' as const, frameIndex: 1, originalTimestamp: 1033 }
      }
    ]

    const result = calculateAverageConfidence(poseData)
    // (0.123 + 0.456) / 2 = 0.2895
    expect(result).toBeCloseTo(0.2895, 4)
  })
})
