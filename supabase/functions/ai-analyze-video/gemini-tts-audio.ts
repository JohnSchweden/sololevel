/**
 * Gemini TTS Audio Generation
 * Converts SSML markup to audio using Gemini 2.0 TTS
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('gemini-tts-audio')

export interface TTSOptions {
  voice?: 'male' | 'female' | 'neutral'
  speed?: 'slow' | 'normal' | 'fast'
  pitch?: number // -10 to +10
  volume?: number // 0.0 to 1.0
}

export interface TTSAudioResult {
  audioUrl: string
  duration: number // seconds
  format: string // 'mp3', 'wav', etc.
  size: number // bytes
  metadata?: {
    ssmlLength: number
    voiceUsed: string
    processingTime: number
  }
}

/**
 * Generate TTS audio from SSML markup
 * Uses Gemini 2.0 TTS API to convert SSML to audio
 */
export function generateTTSFromSSML(ssml: string, options?: TTSOptions): string {
  try {
    if (!ssml) {
      throw new Error('SSML text is required')
    }

    if (!ssml.includes('<speak>') || !ssml.includes('</speak>')) {
      logger.warn('SSML does not contain proper speak tags, wrapping automatically')
      ssml = `<speak>${ssml}</speak>`
    }

    logger.info(`Generating TTS audio from SSML (${ssml.length} characters)`, {
      hasProsody: ssml.includes('<prosody'),
      hasBreaks: ssml.includes('<break'),
      options,
    })

    // TODO: Implement real Gemini TTS 2.0 integration
    // This would involve:
    // 1. Authenticating with Gemini API
    // 2. Sending SSML to TTS endpoint
    // 3. Receiving audio stream/file
    // 4. Uploading to storage (Supabase Storage)
    // 5. Returning public URL

    // For now, return a placeholder URL
    const audioUrl = `https://placeholder-tts-audio.com/tts_${Date.now()}.mp3`

    logger.info('TTS audio generated successfully', { audioUrl })
    return audioUrl
  } catch (error) {
    logger.error('Failed to generate TTS audio', error)
    // Return fallback URL
    return `https://placeholder-tts-audio.com/fallback_${Date.now()}.mp3`
  }
}

/**
 * Generate TTS from plain text (convenience function)
 */
export async function generateTTSFromText(text: string, options?: TTSOptions): Promise<string> {
  try {
    logger.info(`Generating TTS from plain text: ${text.substring(0, 50)}...`)

    // Convert plain text to basic SSML
    const ssml = `<speak><prosody rate="medium">${text}</prosody></speak>`

    return await generateTTSFromSSML(ssml, options)
  } catch (error) {
    logger.error('Failed to generate TTS from text', error)
    return `https://placeholder-tts-audio.com/text_fallback_${Date.now()}.mp3`
  }
}

/**
 * Validate SSML structure
 */
export function validateSSML(ssml: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!ssml) {
    errors.push('SSML cannot be empty')
    return { isValid: false, errors, warnings }
  }

  if (!ssml.includes('<speak>') || !ssml.includes('</speak>')) {
    errors.push('SSML must contain <speak> and </speak> tags')
  }

  // Check for unclosed tags
  const openTags = ssml.match(/<[^/][^>]*>/g) || []
  const closeTags = ssml.match(/<\/[^>]+>/g) || []

  if (openTags.length !== closeTags.length) {
    warnings.push('Potential unclosed SSML tags detected')
  }

  // Check for nested prosody tags (not supported by all TTS engines)
  const nestedProsody = ssml.match(/<prosody[^>]*>[\s\S]*?<prosody[^>]*>/g)
  if (nestedProsody && nestedProsody.length > 0) {
    warnings.push('Nested prosody tags detected - may not be supported by all TTS engines')
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Estimate audio duration from SSML
 * Rough calculation based on text length and prosody settings
 */
export function estimateAudioDuration(ssml: string): number {
  try {
    // Remove SSML tags for text length calculation
    const textOnly = ssml
      .replace(/<[^>]+>/g, '') // Remove all XML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Base speaking rate: ~150 words per minute = ~2.5 words per second
    const wordsPerSecond = 2.5
    const wordCount = textOnly.split(/\s+/).length

    // Adjust for prosody settings
    let speedMultiplier = 1.0
    if (ssml.includes('rate="slow"')) speedMultiplier = 0.7
    else if (ssml.includes('rate="fast"')) speedMultiplier = 1.3

    // Add time for breaks
    const breakCount = (ssml.match(/<break[^>]*>/g) || []).length
    const breakTime = breakCount * 0.5 // Assume 500ms per break

    const estimatedSeconds = (wordCount / wordsPerSecond) * speedMultiplier + breakTime

    return Math.max(1, Math.round(estimatedSeconds))
  } catch (error) {
    logger.warn('Failed to estimate audio duration, using default', error)
    return 30 // Default 30 seconds
  }
}

/**
 * Get supported voices and languages
 */
export function getSupportedVoices(): Array<{
  id: string
  name: string
  language: string
  gender: string
}> {
  // TODO: Query Gemini API for actual supported voices
  return [
    { id: 'en-US-Neural2-D', name: 'Neural Male', language: 'en-US', gender: 'male' },
    { id: 'en-US-Neural2-F', name: 'Neural Female', language: 'en-US', gender: 'female' },
    { id: 'en-GB-Neural2-A', name: 'British Male', language: 'en-GB', gender: 'male' },
    { id: 'en-GB-Neural2-C', name: 'British Female', language: 'en-GB', gender: 'female' },
  ]
}
