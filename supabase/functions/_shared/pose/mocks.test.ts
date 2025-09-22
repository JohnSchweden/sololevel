import { describe, expect, it } from 'vitest'
import { mockJoints } from './mocks.ts'

describe('mockJoints', () => {
  it('should return an array of joints', () => {
    const result = mockJoints()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should return expected joint structure', () => {
    const result = mockJoints()

    result.forEach(joint => {
      expect(joint).toHaveProperty('id')
      expect(joint).toHaveProperty('x')
      expect(joint).toHaveProperty('y')
      expect(joint).toHaveProperty('confidence')
      expect(joint).toHaveProperty('connections')
      expect(typeof joint.id).toBe('string')
      expect(typeof joint.x).toBe('number')
      expect(typeof joint.y).toBe('number')
      expect(typeof joint.confidence).toBe('number')
      expect(Array.isArray(joint.connections)).toBe(true)
    })
  })

  it('should include specific expected joints', () => {
    const result = mockJoints()
    const jointIds = result.map(joint => joint.id)

    expect(jointIds).toContain('nose')
    expect(jointIds).toContain('left_eye')
    expect(jointIds).toContain('right_eye')
  })

  it('should have reasonable coordinate values', () => {
    const result = mockJoints()

    result.forEach(joint => {
      expect(joint.x).toBeGreaterThanOrEqual(0)
      expect(joint.x).toBeLessThanOrEqual(1)
      expect(joint.y).toBeGreaterThanOrEqual(0)
      expect(joint.y).toBeLessThanOrEqual(1)
    })
  })

  it('should have reasonable confidence values', () => {
    const result = mockJoints()

    result.forEach(joint => {
      expect(joint.confidence).toBeGreaterThan(0)
      expect(joint.confidence).toBeLessThanOrEqual(1)
    })
  })

  it('should have connections as array of strings', () => {
    const result = mockJoints()

    result.forEach(joint => {
      expect(Array.isArray(joint.connections)).toBe(true)
      joint.connections.forEach(connection => {
        expect(typeof connection).toBe('string')
      })
    })
  })

  it('should return consistent results on multiple calls', () => {
    const result1 = mockJoints()
    const result2 = mockJoints()

    expect(result1.length).toBe(result2.length)
    expect(result1[0].id).toBe(result2[0].id)
    expect(result1[0].x).toBe(result2[0].x)
    expect(result1[0].y).toBe(result2[0].y)
    expect(result1[0].confidence).toBe(result2[0].confidence)
  })

  it('should not return empty connections array for all joints', () => {
    const result = mockJoints()
    const hasConnections = result.some(joint => joint.connections.length > 0)
    expect(hasConnections).toBe(true)
  })

  it('should return joints with proper connections structure', () => {
    const result = mockJoints()

    // Nose should connect to eyes
    const nose = result.find(joint => joint.id === 'nose')
    expect(nose?.connections).toContain('left_eye')
    expect(nose?.connections).toContain('right_eye')

    // Eyes should connect back to nose
    const leftEye = result.find(joint => joint.id === 'left_eye')
    expect(leftEye?.connections).toContain('nose')

    const rightEye = result.find(joint => joint.id === 'right_eye')
    expect(rightEye?.connections).toContain('nose')
  })
})
