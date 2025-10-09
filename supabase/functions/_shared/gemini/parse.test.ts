/**
 * Tests for Gemini response parsing and metrics extraction
 */

import { describe, expect, it } from 'vitest'
import { PREPARED_GEMINI_MOCK_RESPONSE } from './mocks.ts'
import { extractMetricsFromText, parseDualOutput } from './parse.ts'

describe('parseDualOutput', () => {
  it('should parse new format with TEXT REPORT and JSON DATA blocks', () => {
    const result = parseDualOutput(PREPARED_GEMINI_MOCK_RESPONSE)

    expect(result.textReport).toContain('Big Picture')
    expect(result.textReport).toContain('Posture & Movement')
    expect(result.feedback).toHaveLength(2)
    expect(result.feedback[0]?.category).toBe('Posture')
    expect(result.feedback[0]?.timestamp).toBe(2.5)
    expect(result.feedback[0]?.confidence).toBe(0.92)
    expect(result.feedback[0]?.impact).toBe(0.7)
    expect(result.jsonData).toBeDefined()
    expect(typeof result.jsonData).toBe('object')
    expect(Array.isArray(result.jsonData.feedback)).toBe(true)
    expect(result.jsonData.feedback).toHaveLength(2)
  })

  it('should handle legacy format without blocks', () => {
    const legacyResponse = `
--- ANALYSIS REPORT:
This is a test report with some content.

FEEDBACK JSON:
[
  {
    "timestamp": 1.0,
    "category": "Movement",
    "message": "Test feedback",
    "confidence": 0.8,
    "impact": 0.4
  }
]
`
    const result = parseDualOutput(legacyResponse)

    expect(result.textReport).toContain('This is a test report')
    expect(result.feedback).toHaveLength(1)
    expect(result.feedback[0]?.category).toBe('Movement')
    expect(result.jsonData).toEqual({}) // No JSON DATA block in legacy format
  })

  it('should return empty feedback when parsing fails', () => {
    const invalidResponse = 'Invalid response without proper formatting'
    const result = parseDualOutput(invalidResponse)

    expect(result.feedback).toHaveLength(0)
    expect(result.textReport).toBe(invalidResponse.trim())
    expect(result.jsonData).toEqual({})
  })

  it('should filter out invalid feedback items', () => {
    const responseWithInvalidItems = `=== TEXT REPORT START ===
Test report
=== TEXT REPORT END ===

=== JSON DATA START ===
{
  "feedback": [
    {
      "timestamp": 1.0,
      "category": "Movement",
      "message": "Valid item",
      "confidence": 0.8,
      "impact": 0.4
    },
    {
      "timestamp": "invalid",
      "category": "Posture",
      "message": "Invalid item",
      "confidence": 1.5,
      "impact": 0.5
    }
  ]
}
=== JSON DATA END ===`
    const result = parseDualOutput(responseWithInvalidItems)

    expect(result.feedback).toHaveLength(1)
    expect(result.feedback[0]?.message).toBe('Valid item')
    expect(result.jsonData).toBeDefined()
    expect(result.jsonData.feedback).toHaveLength(2) // Full JSON includes invalid items
  })
})

describe('extractMetricsFromText', () => {
  it('should extract metrics from text with posture, movement, and overall scores', () => {
    const text = `
Posture score: 85
Movement quality: 92
Overall performance: 88
`
    const metrics = extractMetricsFromText(text)

    expect(metrics.posture).toBe(85)
    expect(metrics.movement).toBe(92)
    expect(metrics.overall).toBe(88)
  })

  it('should return default values when no metrics found', () => {
    const text = 'Some text without any metrics mentioned'
    const metrics = extractMetricsFromText(text)

    expect(metrics.posture).toBe(75)
    expect(metrics.movement).toBe(80)
    expect(metrics.overall).toBe(77)
  })

  it('should handle case insensitive matching', () => {
    const text = `
POSTURE: 90
movement: 85
OVERALL: 87
`
    const metrics = extractMetricsFromText(text)

    expect(metrics.posture).toBe(90)
    expect(metrics.movement).toBe(85)
    expect(metrics.overall).toBe(87)
  })

  it('should clamp values to valid range', () => {
    const text = `
Posture: 150
Movement: -5
Overall: 200
`
    const metrics = extractMetricsFromText(text)


    expect(metrics.posture).toBe(100)
    expect(metrics.movement).toBe(0)
    expect(metrics.overall).toBe(100)
  })
})
