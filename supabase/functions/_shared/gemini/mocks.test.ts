/**
 * Tests for Gemini mock data and fixtures
 */

import { describe, expect, it } from 'vitest'
import { PREPARED_GEMINI_MOCK_RESPONSE, getMockAnalysisResult } from './mocks.ts'
import { validateGeminiVideoAnalysisResult } from './types.ts'

describe('PREPARED_GEMINI_MOCK_RESPONSE', () => {
  it('should contain TEXT FEEDBACK blocks', () => {
    expect(PREPARED_GEMINI_MOCK_RESPONSE).toContain('=== TEXT FEEDBACK START ===')
    expect(PREPARED_GEMINI_MOCK_RESPONSE).toContain('=== TEXT FEEDBACK END ===')
  })

  it('should contain JSON DATA blocks', () => {
    expect(PREPARED_GEMINI_MOCK_RESPONSE).toContain('=== JSON DATA START ===')
    expect(PREPARED_GEMINI_MOCK_RESPONSE).toContain('=== JSON DATA END ===')
  })

  it('should contain valid JSON in JSON DATA block', () => {
    const jsonMatch = PREPARED_GEMINI_MOCK_RESPONSE.match(/=== JSON DATA START ===([\s\S]*?)=== JSON DATA END ===/)
    expect(jsonMatch).toBeTruthy()

    const jsonStr = jsonMatch![1].trim()
    expect(() => JSON.parse(jsonStr)).not.toThrow()
  })
})

describe('getMockAnalysisResult', () => {
  it('should return a valid GeminiVideoAnalysisResult', () => {
    const result = getMockAnalysisResult()

    const isValid = validateGeminiVideoAnalysisResult(result)
    expect(isValid).toBe(true)
  })

  it('should have required textReport field', () => {
    const result = getMockAnalysisResult()

    expect(result.textReport).toBeDefined()
    expect(typeof result.textReport).toBe('string')
    expect(result.textReport.length).toBeGreaterThan(0)
  })

  it('should have feedback array with valid items', () => {
    const result = getMockAnalysisResult()

    expect(Array.isArray(result.feedback)).toBe(true)
    expect(result.feedback.length).toBeGreaterThan(0)

    result.feedback.forEach(feedback => {
      expect(typeof feedback.timestamp).toBe('number')
      expect(typeof feedback.category).toBe('string')
      expect(typeof feedback.message).toBe('string')
      expect(typeof feedback.confidence).toBe('number')
      expect(typeof feedback.impact).toBe('number')
      expect(feedback.confidence).toBeGreaterThanOrEqual(0)
      expect(feedback.confidence).toBeLessThanOrEqual(1)
      expect(feedback.impact).toBeGreaterThanOrEqual(0)
      expect(feedback.impact).toBeLessThanOrEqual(1)
    })
  })

  it('should have valid metrics object', () => {
    const result = getMockAnalysisResult()

    expect(result.metrics).toBeDefined()
    expect(typeof result.metrics!.posture).toBe('number')
    expect(typeof result.metrics!.movement).toBe('number')
    expect(typeof result.metrics!.overall).toBe('number')

    expect(result.metrics!.posture).toBeGreaterThanOrEqual(0)
    expect(result.metrics!.posture).toBeLessThanOrEqual(100)
    expect(result.metrics!.movement).toBeGreaterThanOrEqual(0)
    expect(result.metrics!.movement).toBeLessThanOrEqual(100)
    expect(result.metrics!.overall).toBeGreaterThanOrEqual(0)
    expect(result.metrics!.overall).toBeLessThanOrEqual(100)
  })

  it('should have valid confidence score', () => {
    const result = getMockAnalysisResult()

    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('should have realistic feedback data', () => {
    const result = getMockAnalysisResult()

    // Check that we have a variety of feedback categories
    const categories = result.feedback.map(f => f.category)
    expect(categories.length).toBeGreaterThan(1)

    // Check that messages are meaningful
    result.feedback.forEach(feedback => {
      expect(feedback.message.length).toBeGreaterThan(10) // Meaningful messages
      expect(feedback.confidence).toBeGreaterThan(0.5) // High confidence for mock data
    })
  })

  it('should have consistent mock data across calls', () => {
    const result1 = getMockAnalysisResult()
    const result2 = getMockAnalysisResult()

    expect(result1.textReport).toBe(result2.textReport)
    expect(result1.feedback.length).toBe(result2.feedback.length)
    expect(result1.metrics!.posture).toBe(result2.metrics!.posture)
    expect(result1.confidence).toBe(result2.confidence)
  })
})
