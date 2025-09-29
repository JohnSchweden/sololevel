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
  /** Gemini Multi-Modal model to use */
  mmModel: string
  /** Gemini LLM model to use */
  llmModel: string
  /** Gemini TTS model for audio generation */
  ttsModel: string
  /** Files upload endpoint URL */
  filesUploadUrl: string
  /** Multi-Modal generate content endpoint URL */
  mmGenerateUrl: string
  /** LLM generate content endpoint URL */
  llmGenerateUrl: string
  /** TTS generate content endpoint URL */
  ttsGenerateUrl: string
  /** Maximum file size in MB */
  filesMaxMb: number
  /** Analysis mode: 'real' for API calls, 'mock' for testing */
  analysisMode: 'real' | 'mock'
  /** Default voice name for TTS generation */
  defaultVoiceName: string
}

/**
 * Get Gemini API configuration
 */
export function getGeminiConfig(): GeminiConfig {
  const apiBase = 'https://generativelanguage.googleapis.com'
  const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('SUPABASE_ENV_GEMINI_API_KEY')

  const mmModel = Deno.env.get('GEMINI_MMM_MODEL') || 'gemini-2.5-flash'
  const llmModel = Deno.env.get('GEMINI_LLM_MODEL') || 'gemini-2.5-flash-lite'
  const ttsModel = Deno.env.get('GEMINI_TTS_MODEL') || 'gemini-2.5-flash-preview-tts'

  const filesUploadUrl = `${apiBase}/upload/v1beta/files`
  const mmGenerateUrl = `${apiBase}/v1beta/models/${mmModel}:generateContent`
  const llmGenerateUrl = `${apiBase}/v1beta/models/${llmModel}:generateContent`
  const ttsGenerateUrl = `${apiBase}/v1beta/models/${ttsModel}:generateContent`

  const filesMaxMb = Number.parseInt(Deno.env.get('GEMINI_FILES_MAX_MB') || '20')
  const analysisMode = (Deno.env.get('AI_ANALYSIS_MODE') || 'real') as 'real' | 'mock'
  const defaultVoiceName = Deno.env.get('DEFAULT_VOICE_NAME') || 'Sadachbia'

  return {
    apiBase,
    apiKey,
    mmModel,
    llmModel,
    ttsModel,
    filesUploadUrl,
    mmGenerateUrl,
    llmGenerateUrl,
    ttsGenerateUrl,
    filesMaxMb,
    analysisMode,
    defaultVoiceName,
  }
}

/**
 * Validate Gemini API configuration
 */
export function validateGeminiConfig(config: GeminiConfig): { valid: boolean; message: string } {
  // Validate TTS model
  if (!config.ttsModel || config.ttsModel.trim().length === 0) {
    return {
      valid: false,
      message: 'TTS model is not configured',
    }
  }

  if (!config.ttsModel.includes('tts')) {
    return {
      valid: false,
      message: 'TTS model name should contain "tts" for clarity',
    }
  }

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
