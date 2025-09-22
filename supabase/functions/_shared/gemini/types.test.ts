/**
 * Tests for Gemini types and validation
 */

import { describe, expect, it } from 'vitest'
import { safeValidateFeedbackList, validateFeedbackItem, validateGeminiVideoAnalysisResult } from './types.ts'
import type { FeedbackItem, GeminiVideoAnalysisResult } from './types.ts'

describe('safeValidateFeedbackList', () => {
  it('should return valid feedback items and filter out invalid ones', () => {
    const input = [
      {
        timestamp: 1.5,
        category: 'Movement' as const,
        message: 'Valid feedback',
        confidence: 0.85,
        impact: 0.6,
      },
      {
        timestamp: 'invalid',
        category: 'Posture',
        message: 'Invalid timestamp',
        confidence: 0.8,
        impact: 0.5,
      },
      {
        timestamp: 2.0,
        category: 'Speech',
        message: 'Valid feedback 2',
        confidence: 1.2, // Invalid confidence
        impact: 0.4,
      },
    ]

    const result = safeValidateFeedbackList(input)

    expect(result).toHaveLength(1)
    expect(result[0].timestamp).toBe(1.5)
    expect(result[0].message).toBe('Valid feedback')
  })

  it('should handle empty array', () => {
    const result = safeValidateFeedbackList([])
    expect(result).toHaveLength(0)
  })

  it('should handle array with all invalid items', () => {
    const input = [
      { invalid: 'object' },
      null,
      undefined,
      'string',
    ]

    const result = safeValidateFeedbackList(input)
    expect(result).toHaveLength(0)
  })
})

describe('validateFeedbackItem', () => {
  it('should return true for valid feedback item', () => {
    const validItem: FeedbackItem = {
      timestamp: 1.5,
      category: 'Movement',
      message: 'Valid feedback',
      confidence: 0.85,
      impact: 0.6,
    }

    expect(validateFeedbackItem(validItem)).toBe(true)
  })

  it('should return false for invalid timestamp', () => {
    const invalidItem = {
      timestamp: 'invalid',
      category: 'Movement',
      message: 'Invalid timestamp',
      confidence: 0.85,
      impact: 0.6,
    }

    expect(validateFeedbackItem(invalidItem)).toBe(false)
  })

  it('should return false for invalid category', () => {
    const invalidItem = {
      timestamp: 1.5,
      category: 'InvalidCategory',
      message: 'Invalid category',
      confidence: 0.85,
      impact: 0.6,
    }

    expect(validateFeedbackItem(invalidItem)).toBe(false)
  })

  it('should return false for confidence out of range', () => {
    const invalidItem = {
      timestamp: 1.5,
      category: 'Movement',
      message: 'Invalid confidence',
      confidence: 1.5,
      impact: 0.6,
    }

    expect(validateFeedbackItem(invalidItem)).toBe(false)
  })

  it('should return false for impact out of range', () => {
    const invalidItem = {
      timestamp: 1.5,
      category: 'Movement',
      message: 'Invalid impact',
      confidence: 0.85,
      impact: -0.1,
    }

    expect(validateFeedbackItem(invalidItem)).toBe(false)
  })

  it('should return false for non-objects', () => {
    expect(validateFeedbackItem(null)).toBe(false)
    expect(validateFeedbackItem(undefined)).toBe(false)
    expect(validateFeedbackItem('string')).toBe(false)
    expect(validateFeedbackItem(123)).toBe(false)
  })
})

describe('validateGeminiVideoAnalysisResult', () => {
  it('should return true for valid result', () => {
    const validResult: GeminiVideoAnalysisResult = {
      textReport: 'Valid report',
      feedback: [
        {
          timestamp: 1.0,
          category: 'Movement',
          message: 'Valid feedback',
          confidence: 0.8,
          impact: 0.5,
        },
      ],
      metrics: {
        posture: 85,
        movement: 90,
        overall: 87,
      },
      confidence: 0.85,
    }

    expect(validateGeminiVideoAnalysisResult(validResult)).toBe(true)
  })

  it('should return false for missing textReport', () => {
    const invalidResult = {
      feedback: [],
      confidence: 0.8,
    }

    expect(validateGeminiVideoAnalysisResult(invalidResult)).toBe(false)
  })

  it('should return false for invalid feedback', () => {
    const invalidResult = {
      textReport: 'Valid report',
      feedback: [
        {
          timestamp: 'invalid',
          category: 'Movement',
          message: 'Invalid feedback',
          confidence: 0.8,
          impact: 0.5,
        },
      ],
      confidence: 0.8,
    }

    expect(validateGeminiVideoAnalysisResult(invalidResult)).toBe(false)
  })

  it('should return false for confidence out of range', () => {
    const invalidResult = {
      textReport: 'Valid report',
      feedback: [],
      confidence: 1.5,
    }

    expect(validateGeminiVideoAnalysisResult(invalidResult)).toBe(false)
  })

  it('should return false for non-objects', () => {
    expect(validateGeminiVideoAnalysisResult(null)).toBe(false)
    expect(validateGeminiVideoAnalysisResult('string')).toBe(false)
  })

  it('should allow optional metrics', () => {
    const resultWithoutMetrics = {
      textReport: 'Valid report',
      feedback: [],
      confidence: 0.8,
    }

    expect(validateGeminiVideoAnalysisResult(resultWithoutMetrics)).toBe(true)
  })
})
