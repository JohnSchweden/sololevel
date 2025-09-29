/**
 * Gemini TTS Audio Generation Orchestrator
 * Thin wrapper that coordinates TTS generation using shared modules
 */

// Import shared Gemini modules
import { createValidatedGeminiConfig } from '../_shared/gemini/config.ts'
import { getMockTTSResult } from '../_shared/gemini/mocks.ts'
import { generateTTSAudio } from '../_shared/gemini/tts.ts'
// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'
import { AudioFormat } from '../_shared/media/audio.ts'

const logger = createLogger('gemini-tts-audio')

export interface TTSOptions {
  voice?: string // Gemini TTS voice name
  speed?: 'slow' | 'medium' | 'fast'
  pitch?: number // -10 to +10
  format?: AudioFormat // Audio format from central configuration
}

export interface TTSResult {
  bytes: Uint8Array
  contentType: string
  prompt: string
  duration: number
}

/**
 * Generate TTS audio from SSML markup using Gemini TTS
 * Thin orchestrator that uses shared modules
 */
export async function generateTTSFromSSML(ssml: string, options?: TTSOptions): Promise<TTSResult> {
  // Get validated configuration
  const config = createValidatedGeminiConfig()

  logger.info(`Starting Gemini TTS generation for ${ssml.length} characters`)

  // Mock mode: Return prepared mock response
  if (config.analysisMode === 'mock') {
    logger.info('AI_ANALYSIS_MODE=mock: Using prepared TTS mock response')
    const format = options?.format || 'wav'
    logger.info(`Mock TTS: requested format=${format}`)
    return getMockTTSResult(format)
  }

  // Real mode: Generate TTS using shared module
  try {
    // Generate TTS audio using shared module (speakingRate/pitch removed per web research)
    const result = await generateTTSAudio({
      ssml,
      voiceName: options?.voice,
      format: options?.format || 'wav' // Default to WAV to trigger PCM→WAV conversion
    }, config)

    logger.info(`Gemini TTS generation completed: ${result.bytes.length} bytes`)
    return result

  } catch (error) {
    logger.error('Gemini TTS generation failed', error)
    throw error
  }
}


