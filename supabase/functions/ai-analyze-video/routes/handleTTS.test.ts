/**
 * Tests for TTS endpoint handler
 */

import { handleTTS } from './handleTTS.ts'

// Simple assertion helpers for Deno
function assertEquals(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

function assertContains(actual: string, expected: string, message?: string) {
  if (!actual.includes(expected)) {
    throw new Error(message || `Expected "${actual}" to contain "${expected}"`)
  }
}

function assertGreaterThan(actual: number, expected: number, message?: string) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} to be greater than ${expected}`)
  }
}

// Test setup
const mockSupabase = {}
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {}
}

Deno.test('should return error when no required parameters provided', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({})
  })

  const response = await handleTTS({ req, supabase: mockSupabase, logger: mockLogger })

  assertEquals(response.status, 400)
  const body = await response.json()
  assertContains(body.error, 'analysisId, text, or ssml is required')
})

Deno.test('should return error when supabase not available', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello world' })
  })

  const response = await handleTTS({ req, supabase: null, logger: mockLogger })

  assertEquals(response.status, 500)
  const body = await response.json()
  assertEquals(body.error, 'Database connection failed')
})

Deno.test('should handle OPTIONS request for CORS', async () => {
  const req = new Request('http://localhost', {
    method: 'OPTIONS'
  })

  const response = await handleTTS({ req, supabase: mockSupabase, logger: mockLogger })

  assertEquals(response.status, 200)
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*')
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS')
  assertEquals(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization')
})

Deno.test('should generate TTS from text input', async () => {
  // Set mock mode for testing
  const originalEnv = Deno.env.get('AI_ANALYSIS_MODE')
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')

  try {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello world' })
    })

    const response = await handleTTS({ req, supabase: mockSupabase, logger: mockLogger })

    assertEquals(response.status, 200)
    const body = await response.json()
    assertContains(body.audioUrl, 'data:audio/')
    assertEquals(body.format, 'mp3')
    assertGreaterThan(body.duration, 0)
  } finally {
    // Restore original environment
    if (originalEnv !== undefined) {
      Deno.env.set('AI_ANALYSIS_MODE', originalEnv)
    } else {
      Deno.env.delete('AI_ANALYSIS_MODE')
    }
  }
})

Deno.test('should generate TTS from SSML input', async () => {
  // Set mock mode for testing
  const originalEnv = Deno.env.get('AI_ANALYSIS_MODE')
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')

  try {
    const ssml = '<speak>Hello world</speak>'
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ ssml })
    })

    const response = await handleTTS({ req, supabase: mockSupabase, logger: mockLogger })

    assertEquals(response.status, 200)
    const body = await response.json()
    assertContains(body.audioUrl, 'data:audio/')
    assertEquals(body.format, 'mp3')
  } finally {
    // Restore original environment
    if (originalEnv !== undefined) {
      Deno.env.set('AI_ANALYSIS_MODE', originalEnv)
    } else {
      Deno.env.delete('AI_ANALYSIS_MODE')
    }
  }
})
