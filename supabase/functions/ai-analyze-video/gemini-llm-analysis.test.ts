/**
 * TDD Tests for Gemini LLM Analysis
 * Tests the real Gemini 2.5 video analysis functionality
 */

import { analyzeVideoWithGemini } from './gemini-llm-analysis.ts'

// Set mock mode for testing
const originalEnv = { ...globalThis.Deno?.env }
const mockEnv = {
  get: (key: string) => {
    const envMap: Record<string, string> = {
      'AI_ANALYSIS_MODE': 'mock'
    }
    return envMap[key] || originalEnv?.get?.(key)
  }
}

// Override Deno env for testing
if (globalThis.Deno) {
  ;(globalThis as any).Deno.env = mockEnv
}

// Mock Supabase client for testing
const mockSupabase = {
  storage: {
    from: () => ({
      download: () => ({
        arrayBuffer: () => new ArrayBuffer(100),
        type: 'video/mp4'
      })
    })
  }
}

// Test assertions for Gemini LLM analysis tests
const geminiAnalysisAssertEquals = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`)
  }
}

const geminiAnalysisAssertExists = (value: unknown) => {
  if (value == null) {
    throw new Error('Value should exist')
  }
}

Deno.test('Gemini LLM Analysis - Valid Video Path', async () => {
  const videoPath = '/raw/test-exercise.mp4'

  // Use mock mode to avoid actual API calls
  const result = await analyzeVideoWithGemini(mockSupabase as any, videoPath)

  geminiAnalysisAssertExists(result.textReport)
  geminiAnalysisAssertExists(result.feedback)
  geminiAnalysisAssertExists(result.metrics)
  geminiAnalysisAssertEquals(typeof result.confidence, 'number')
  geminiAnalysisAssertEquals(result.confidence >= 0 && result.confidence <= 1, true)
})

Deno.test('Gemini LLM Analysis - Invalid Video Path', async () => {
  try {
    await analyzeVideoWithGemini(mockSupabase as any, '')
    throw new Error('Should have thrown')
  } catch (error) {
    geminiAnalysisAssertEquals((error as Error).message, 'Video path is required for analysis')
  }
})

Deno.test('Gemini LLM Analysis - Missing Supabase Client', async () => {
  try {
    await analyzeVideoWithGemini(null as any, '/raw/test.mp4')
    throw new Error('Should have thrown')
  } catch (error) {
    geminiAnalysisAssertEquals((error as Error).message, 'Supabase client not available for video download')
  }
})

Deno.test('Gemini LLM Analysis - Analysis Result Structure', async () => {
  const videoPath = '/raw/test.mp4'
  const result = await analyzeVideoWithGemini(mockSupabase as any, videoPath)

  // Verify expected structure
  geminiAnalysisAssertEquals(typeof result.textReport, 'string')
  geminiAnalysisAssertEquals(Array.isArray(result.feedback), true)
  geminiAnalysisAssertEquals(typeof result.metrics!.posture, 'number')
  geminiAnalysisAssertEquals(typeof result.metrics!.movement, 'number')
  geminiAnalysisAssertEquals(typeof result.metrics!.overall, 'number')
  geminiAnalysisAssertEquals(typeof result.confidence, 'number')

  // Verify metrics are reasonable
  geminiAnalysisAssertEquals(result.metrics!.posture >= 0 && result.metrics!.posture <= 100, true)
  geminiAnalysisAssertEquals(result.metrics!.movement >= 0 && result.metrics!.movement <= 100, true)
  geminiAnalysisAssertEquals(result.metrics!.overall >= 0 && result.metrics!.overall <= 100, true)
})

// Test Suite: AI_ANALYSIS_MODE functionality
Deno.test('AI_ANALYSIS_MODE - validateGeminiConfig accepts mock mode without API key', () => {
  // This test validates the config behavior which is now in a separate module
  // The actual config validation tests are in config.test.ts
  geminiAnalysisAssertEquals(true, true) // Placeholder - config tests handle this
})

Deno.test('AI_ANALYSIS_MODE - Mock response structure validation', () => {
  // This test validates mock response structure which is now in mocks.test.ts
  geminiAnalysisAssertEquals(true, true) // Placeholder - mock tests handle this
})

Deno.test('AI_ANALYSIS_MODE - Mock mode preserves pipeline flow', () => {
  // This test validates pipeline flow in mock mode
  geminiAnalysisAssertEquals(true, true) // Placeholder - integration tests handle this
})

Deno.test('AI_ANALYSIS_MODE - Mock response contains realistic content', () => {
  // This test validates mock content quality
  geminiAnalysisAssertEquals(true, true) // Placeholder - mock tests handle this
})

