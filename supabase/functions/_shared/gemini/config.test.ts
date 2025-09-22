/**
 * Tests for Gemini API configuration and validation
 */

import { describe, expect, it } from 'vitest'
import { createValidatedGeminiConfig, getGeminiConfig, validateGeminiConfig } from './config.ts'

// Mock Deno environment for testing
const _originalEnv = { ...(globalThis as any).Deno?.env }
const mockEnv = {
  get: (key: string) => {
    const envMap: Record<string, string> = {
      GEMINI_API_KEY: 'test-api-key-12345',
      SUPABASE_ENV_GEMINI_API_KEY: 'supabase-api-key-67890',
      GEMINI_MODEL: 'gemini-1.5-pro',
      GEMINI_TTS_MODEL: 'gemini-2.5-flash-preview-tts',
      GEMINI_FILES_MAX_MB: '25',
      AI_ANALYSIS_MODE: 'mock',
      DEFAULT_VOICE_NAME: 'TestVoice',
    }
    return envMap[key] || undefined
  }
}

describe('getGeminiConfig', () => {
  it('should return default configuration when no env vars set', () => {
    // Mock empty environment
    ;(globalThis as any).Deno = { env: { get: () => undefined } }

    const config = getGeminiConfig()

    expect(config.apiBase).toBe('https://generativelanguage.googleapis.com')
    expect(config.apiKey).toBeUndefined()
    expect(config.model).toBe('gemini-1.5-pro')
    expect(config.ttsModel).toBe('gemini-2.5-flash-preview-tts')
    expect(config.filesMaxMb).toBe(20)
    expect(config.analysisMode).toBe('real')
    expect(config.defaultVoiceName).toBe('Sadachbia')
  })

  it('should use environment variables when available', () => {
    ;(globalThis as any).Deno = { env: mockEnv }

    const config = getGeminiConfig()

    expect(config.apiKey).toBe('test-api-key-12345')
    expect(config.model).toBe('gemini-1.5-pro')
    expect(config.ttsModel).toBe('gemini-2.5-flash-preview-tts')
    expect(config.filesMaxMb).toBe(25)
    expect(config.analysisMode).toBe('mock')
    expect(config.defaultVoiceName).toBe('TestVoice')
  })

  it('should prefer GEMINI_API_KEY over SUPABASE_ENV_GEMINI_API_KEY', () => {
    const envWithBoth = {
      ...mockEnv,
      get: (key: string) => {
        if (key === 'GEMINI_API_KEY') return 'primary-key'
        if (key === 'SUPABASE_ENV_GEMINI_API_KEY') return 'fallback-key'
        return mockEnv.get(key)
      }
    }
    ;(globalThis as any).Deno = { env: envWithBoth }

    const config = getGeminiConfig()
    expect(config.apiKey).toBe('primary-key')
  })

  it('should fallback to SUPABASE_ENV_GEMINI_API_KEY when GEMINI_API_KEY not set', () => {
    const envWithFallback = {
      ...mockEnv,
      get: (key: string) => {
        if (key === 'GEMINI_API_KEY') return undefined
        if (key === 'SUPABASE_ENV_GEMINI_API_KEY') return 'fallback-key'
        return mockEnv.get(key)
      }
    }
    ;(globalThis as any).Deno = { env: envWithFallback }

    const config = getGeminiConfig()
    expect(config.apiKey).toBe('fallback-key')
  })

  it('should construct correct URLs', () => {
    ;(globalThis as any).Deno = { env: mockEnv }

    const config = getGeminiConfig()

    expect(config.filesUploadUrl).toBe('https://generativelanguage.googleapis.com/upload/v1beta/files')
    expect(config.generateUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent')
    expect(config.ttsGenerateUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent')
  })
})

describe('validateGeminiConfig', () => {
  it('should accept mock mode without API key', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'mock' as const,
      apiKey: undefined
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(true)
    expect(result.message).toBe('Mock mode active - no API key required for testing')
  })

  it('should reject real mode without API key', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: undefined
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('GEMINI_API_KEY environment variable is not set')
  })

  it('should reject API keys that are too short', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: 'short'
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('GEMINI_API_KEY appears to be invalid (too short)')
  })

  it('should accept valid API keys', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: 'valid-api-key-that-is-long-enough-for-gemini'
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(true)
    expect(result.message).toBe('Gemini API configuration is valid')
  })

  it('should reject empty TTS model', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: 'valid-api-key-that-is-long-enough-for-gemini',
      ttsModel: ''
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('TTS model is not configured')
  })

  it('should reject TTS model without "tts" in name', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: 'valid-api-key-that-is-long-enough-for-gemini',
      ttsModel: 'gemini-2.5-flash'
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('TTS model name should contain "tts" for clarity')
  })

  it('should accept valid TTS model with "tts" in name', () => {
    const config = {
      ...getGeminiConfig(),
      analysisMode: 'real' as const,
      apiKey: 'valid-api-key-that-is-long-enough-for-gemini',
      ttsModel: 'gemini-2.5-flash-preview-tts'
    }

    const result = validateGeminiConfig(config)
    expect(result.valid).toBe(true)
    expect(result.message).toBe('Gemini API configuration is valid')
  })
})

describe('createValidatedGeminiConfig', () => {
  it('should return config when validation passes', () => {
    const envWithValidKey = {
      ...mockEnv,
      get: (key: string) => {
        if (key === 'GEMINI_API_KEY') return 'valid-api-key-that-is-long-enough-for-gemini'
        if (key === 'AI_ANALYSIS_MODE') return 'real'
        return mockEnv.get(key)
      }
    }
    ;(globalThis as any).Deno = { env: envWithValidKey }

    const config = createValidatedGeminiConfig()
    expect(config.apiKey).toBe('valid-api-key-that-is-long-enough-for-gemini')
    expect(config.analysisMode).toBe('real')
  })

  it('should throw error when validation fails', () => {
    // Override global mock to force real mode with no API key
    const originalDeno = (globalThis as any).Deno
    ;(globalThis as any).Deno = {
      env: {
        get: (key: string) => {
          if (key === 'AI_ANALYSIS_MODE') return 'real'
          if (key === 'GEMINI_API_KEY') return undefined
          // Return undefined for all other keys to ensure no fallback values
          return undefined
        }
      }
    }

    try {
      expect(() => createValidatedGeminiConfig()).toThrow('Gemini configuration validation failed: GEMINI_API_KEY environment variable is not set')
    } finally {
      // Restore original mock
      ;(globalThis as any).Deno = originalDeno
    }
  })
})
