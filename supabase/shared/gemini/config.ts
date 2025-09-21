/**
 * Gemini API Configuration and Validation
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../logger.ts'

const logger = createLogger('gemini-config')

// Import Deno environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

/**
 * Gemini API Configuration
 */
export interface GeminiConfig {
  /** Gemini API base URL */
  apiBase: string
  /** Gemini API key from environment */
  apiKey: string | undefined
  /** Gemini model to use */
  model: string
  /** Files upload endpoint URL */
  filesUploadUrl: string
  /** Generate content endpoint URL */
  generateUrl: string
  /** Maximum file size in MB */
  filesMaxMb: number
  /** Analysis mode: 'real' for API calls, 'mock' for testing */
  analysisMode: 'real' | 'mock'
}

/**
 * Get Gemini API configuration
 */
export function getGeminiConfig(): GeminiConfig {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('SUPABASE_ENV_GEMINI_API_KEY')

  return {
    apiBase: 'https://generativelanguage.googleapis.com',
    apiKey,
    model: Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro',
    filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
    generateUrl: `https://generativelanguage.googleapis.com/v1beta/models/${Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro'}:generateContent`,
    filesMaxMb: Number.parseInt(Deno.env.get('GEMINI_FILES_MAX_MB') || '20'),
    analysisMode: (Deno.env.get('AI_ANALYSIS_MODE') || 'real') as 'real' | 'mock',
  }
}

/**
 * Validate Gemini API configuration
 */
export function validateGeminiConfig(config: GeminiConfig): { valid: boolean; message: string } {
  // Mock mode doesn't require API key
  if (config.analysisMode === 'mock') {
    return {
      valid: true,
      message: 'Mock mode active - no API key required for testing',
    }
  }

  if (!config.apiKey) {
    return {
      valid: false,
      message: 'GEMINI_API_KEY environment variable is not set',
    }
  }

  if (config.apiKey.length < 20) {
    return {
      valid: false,
      message: 'GEMINI_API_KEY appears to be invalid (too short)',
    }
  }

  return {
    valid: true,
    message: 'Gemini API configuration is valid',
  }
}

/**
 * Create and validate Gemini configuration
 */
export function createValidatedGeminiConfig(): GeminiConfig {
  const config = getGeminiConfig()
  const validation = validateGeminiConfig(config)

  if (!validation.valid) {
    logger.error('Invalid Gemini configuration', { message: validation.message })
    throw new Error(`Gemini configuration validation failed: ${validation.message}`)
  }

  logger.info('Gemini configuration validated successfully')
  return config
}
