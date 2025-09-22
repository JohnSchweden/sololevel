import { describe, expect, it } from 'vitest'
import { runMoveNetLightning } from './movenet.ts'

describe('runMoveNetLightning', () => {
  it('should return pose data for each frame', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result).toHaveLength(3)
    expect(result[0]).toHaveProperty('timestamp')
    expect(result[0]).toHaveProperty('joints')
    expect(result[0]).toHaveProperty('confidence')
    expect(result[0]).toHaveProperty('metadata')
  })

  it('should generate joints array with expected structure', () => {
    const frames = ['frame1.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result[0].joints).toHaveLength(17) // Standard MoveNet joint count
    expect(result[0].joints[0]).toHaveProperty('id')
    expect(result[0].joints[0]).toHaveProperty('x')
    expect(result[0].joints[0]).toHaveProperty('y')
    expect(result[0].joints[0]).toHaveProperty('confidence')
    expect(result[0].joints[0]).toHaveProperty('connections')
  })

  it('should include standard MoveNet joint names', () => {
    const frames = ['frame1.jpg']
    const result = runMoveNetLightning(frames, {})

    const jointIds = result[0].joints.map(joint => joint.id)
    expect(jointIds).toContain('nose')
    expect(jointIds).toContain('left_eye')
    expect(jointIds).toContain('right_shoulder')
    expect(jointIds).toContain('left_knee')
    expect(jointIds).toContain('right_ankle')
  })

  it('should set appropriate metadata for uploaded videos', () => {
    const frames = ['frame1.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result[0].metadata?.source).toBe('uploaded_video')
    expect(result[0].metadata?.processingMethod).toBe('video_processing')
    expect(result[0].metadata).toHaveProperty('frameIndex')
    expect(result[0].metadata).toHaveProperty('originalTimestamp')
  })

  it('should generate different timestamps for each frame', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result[0].timestamp).toBeLessThan(result[1].timestamp)
    expect(result[1].timestamp).toBeLessThan(result[2].timestamp)
  })

  it('should handle empty frames array', () => {
    const result = runMoveNetLightning([], {})
    expect(result).toHaveLength(0)
  })

  it('should handle single frame', () => {
    const frames = ['single.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result).toHaveLength(1)
    expect(result[0].metadata?.frameIndex).toBe(0)
  })

  it('should generate reasonable confidence values', () => {
    const frames = ['frame1.jpg']
    const result = runMoveNetLightning(frames, {})

    expect(result[0].confidence).toBeGreaterThan(0)
    expect(result[0].confidence).toBeLessThanOrEqual(1)
    result[0].joints.forEach(joint => {
      expect(joint.confidence).toBeGreaterThan(0)
      expect(joint.confidence).toBeLessThanOrEqual(1)
    })
  })

  it('should generate reasonable joint coordinates', () => {
    const frames = ['frame1.jpg']
    const result = runMoveNetLightning(frames, {})

    result[0].joints.forEach(joint => {
      expect(joint.x).toBeGreaterThanOrEqual(0)
      expect(joint.x).toBeLessThanOrEqual(1)
      expect(joint.y).toBeGreaterThanOrEqual(0)
      expect(joint.y).toBeLessThanOrEqual(1)
    })
  })

  it('should ignore options parameter', () => {
    const frames = ['frame1.jpg']
    const result1 = runMoveNetLightning(frames, {})
    const result2 = runMoveNetLightning(frames, { someOption: 'value' })

    // Results should be the same since options are ignored
    expect(result1).toHaveLength(1)
    expect(result2).toHaveLength(1)
  })
})
