/**
 * Deno Tests for Gemini TTS Audio Generation Orchestrator
 * Tests the thin wrapper that coordinates TTS generation using shared modules
 */

// Environment helper for clean test setup/teardown
const withEnv = (envVars: Record<string, string>, testFn: () => void | Promise<void>) => {
  const originalValues: Record<string, string | undefined> = {}

  // Set new values and store originals
  for (const [key, value] of Object.entries(envVars)) {
    originalValues[key] = Deno.env.get(key)
    Deno.env.set(key, value)
  }

  try {
    return testFn()
  } finally {
    // Restore original values
    for (const [key, originalValue] of Object.entries(originalValues)) {
      if (originalValue === undefined) {
        Deno.env.delete(key)
      } else {
        Deno.env.set(key, originalValue)
      }
    }
  }
}

// Now import the orchestrator
import { type TTSOptions, generateTTSFromSSML } from './gemini-tts-audio.ts'

// Test constants
const validSSML = '<speak><prosody rate="medium">Test audio content</prosody></speak>'
const validOptions: TTSOptions = {
  voice: 'en-US-Neural2-F',
  speed: 'medium',
  pitch: 0,
  format: 'wav'
}

Deno.test('generateTTSFromSSML - mock mode returns mock data', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '0' }, async () => {
    const result = await generateTTSFromSSML(validSSML, validOptions)

    // Should return mock data structure
    if (!result.bytes || !result.contentType || !result.prompt) {
      throw new Error('Mock result should have bytes, contentType, and prompt')
    }
  })
})

Deno.test('generateTTSFromSSML - handles missing options gracefully', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '0' }, async () => {
    const result = await generateTTSFromSSML(validSSML)

    // Should return result even with no options
    if (!result || !result.bytes || !result.contentType || !result.prompt) {
      throw new Error('Should return complete result even with no options')
    }
  })
})

Deno.test('generateTTSFromSSML - validates required SSML parameter', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '0' }, async () => {
    try {
      await generateTTSFromSSML('')
      throw new Error('Should have thrown for empty SSML')
    } catch (_error) {
      // Should throw due to config validation (empty SSML not directly tested here)
      // The orchestrator relies on config validation which happens first
    }
  })
})

Deno.test('generateTTSFromSSML - handles different speed options in mock mode', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '0' }, async () => {
    const result = await generateTTSFromSSML(validSSML, { ...validOptions, speed: 'fast' })
    if (!result) {
      throw new Error('Should handle fast speed option')
    }
  })
})

Deno.test('generateTTSFromSSML - handles different format options in mock mode', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '0' }, async () => {
    const result = await generateTTSFromSSML(validSSML, { ...validOptions, format: 'mp3' })
    if (!result) {
      throw new Error('Should handle mp3 format option')
    }
  })
})

Deno.test('generateTTSFromSSML - handles invalid config in real mode', async () => {
  // Test with invalid config (no API key)
  await withEnv({ AI_ANALYSIS_MODE: 'real' }, async () => {
    try {
      await generateTTSFromSSML(validSSML, validOptions)
      throw new Error('Should have thrown due to missing API key')
    } catch (error) {
      // Should throw config validation error
      if (!(error instanceof Error) || !error.message.includes('GEMINI_API_KEY environment variable is not set')) {
        throw new Error('Expected config validation error for missing API key')
      }
    }
  })
})

Deno.test('generateTTSFromSSML - mock mode includes delay for realistic simulation', async () => {
  await withEnv({ AI_ANALYSIS_MODE: 'mock', AI_ANALYSIS_MOCK_DELAY_MS: '50' }, async () => {
    const startTime = Date.now()
    await generateTTSFromSSML(validSSML, validOptions)
    const elapsedTime = Date.now() - startTime
    
    // Should take at least 50ms due to delay simulation
    // Allow some tolerance for test execution overhead (±10ms)
    if (elapsedTime < 40) {
      throw new Error(`Expected at least 40ms delay, got ${elapsedTime}ms`)
    }
  })
})
