/**
 * Text-to-Speech Service
 * Handles audio synthesis from SSML markup
 */

import { generateTTSFromSSML } from '../../../ai-analyze-video/gemini-tts-audio.ts'
import { createValidatedGeminiConfig } from '../../gemini/config.ts'
import { createLogger } from '../../logger.ts'
import { AUDIO_FORMATS, AudioFormat, getEnvDefaultFormat, resolveAudioFormat } from '../../media/audio.ts'
import { generateAudioStoragePath, uploadProcessedArtifact } from '../../storage/upload.ts'

const logger = createLogger('tts-service')

/**
 * Detect audio format from MIME type
 */
function detectAudioFormat(contentType: string): AudioFormat {
  const normalized = contentType.toLowerCase()

  if ((AUDIO_FORMATS.wav.mimes as readonly string[]).includes(normalized)) {
    return 'wav'
  }
  if ((AUDIO_FORMATS.mp3.mimes as readonly string[]).includes(normalized)) {
    return 'mp3'
  }

  const fallback = getEnvDefaultFormat()
  logger.warn(`Unexpected content type: ${contentType}, defaulting to ${fallback} format`)
  return fallback
}

export interface TTSContext {
  ssml: string
  supabase?: any // Supabase client for storage upload
  analysisId?: string | number // Analysis ID for storage path generation
  storagePath?: string // Custom storage path
  customParams?: {
    voice?: string
    speed?: 'slow' | 'medium' | 'fast'
    pitch?: number
    format?: AudioFormat // Audio format from central configuration
    provider?: 'gemini' | 'google' // TTS provider selection
  }
}

export interface TTSResult {
  audioUrl: string
  duration?: number
  promptUsed?: string
  format?: AudioFormat // Audio format from central configuration
}

/**
 * TTS Service Interface
 */
export interface ITTSService {
  synthesize(context: TTSContext): Promise<TTSResult>
}

/**
 * Google Cloud TTS-based Service
 */
export class GeminiTTSService implements ITTSService {
  async synthesize(context: TTSContext): Promise<TTSResult> {
    const { ssml, supabase, analysisId, storagePath, customParams } = context

    logger.info('Starting TTS audio synthesis from SSML', {
      hasSupabase: !!supabase,
      analysisId,
      storagePath,
      customParams
    })

    try {
      // Get Gemini config for voice and settings
      const geminiConfig = createValidatedGeminiConfig()
      const defaultVoice = geminiConfig.defaultVoiceName

      // Resolve audio format using central configuration
      const resolvedFormat = resolveAudioFormat(customParams?.format ? [customParams.format] : undefined, 'gemini')

      // Generate TTS audio bytes using specified provider
      const ttsResult = await generateTTSFromSSML(ssml, {
        voice: customParams?.voice || defaultVoice,
        speed: customParams?.speed || 'medium',
        pitch: customParams?.pitch || 0,
        format: resolvedFormat
      })

      let audioUrl: string
      let format: AudioFormat

      if (supabase && analysisId) {
        // Upload to Supabase Storage
        const resolvedFormat = resolveAudioFormat(customParams?.format ? [customParams.format] : undefined, 'gemini')
        const path = storagePath || generateAudioStoragePath(analysisId, undefined, resolvedFormat)
        const uploadResult = await uploadProcessedArtifact(
          supabase,
          path,
          ttsResult.bytes,
          ttsResult.contentType
        )

        audioUrl = uploadResult.signedUrl || `storage://audio/${path}`
        format = detectAudioFormat(ttsResult.contentType)

        logger.info('TTS audio uploaded to storage', {
          path,
          audioUrl,
          size: uploadResult.size,
          format
        })
      } else {
        // Fallback: return data URL for testing (not recommended for production)
        try {
          const base64Audio = btoa(String.fromCharCode(...ttsResult.bytes))
          audioUrl = `data:${ttsResult.contentType};base64,${base64Audio}`
        } catch (error) {
          // If bytes conversion fails, use a mock data URL
          audioUrl = `data:${ttsResult.contentType};base64,mock-audio-data`
          logger.warn('Failed to encode audio bytes, using mock data URL', error)
        }
        format = detectAudioFormat(ttsResult.contentType)

        logger.warn('No Supabase client provided, using data URL (not suitable for production)', {
          format,
          size: ttsResult.bytes.length
        })
      }

      const result: TTSResult = {
        audioUrl,
        duration: ttsResult.duration,
        promptUsed: ttsResult.prompt,
        format,
      }

      logger.info(`TTS synthesis completed: ${audioUrl} (format: ${format})`)
      return result

    } catch (error) {
      logger.error('TTS synthesis failed', error)
      throw error
    }
  }
}

/**
 * Mock TTS Service for testing
 */
export class MockTTSService implements ITTSService {
  async synthesize(context: TTSContext): Promise<TTSResult> {
    logger.info('Mock TTS synthesis')

    const format = resolveAudioFormat(context.customParams?.format ? [context.customParams.format] : undefined, 'gemini')
    const extension = AUDIO_FORMATS[format].extension

    // If supabase + analysisId provided, mimic upload flow to `processed` bucket
    if (context.supabase && context.analysisId) {
      const path = context.storagePath || generateAudioStoragePath(context.analysisId, undefined, format)
      const mockBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      const contentType = AUDIO_FORMATS[format].mimes[0]

      const uploadResult = await uploadProcessedArtifact(
        context.supabase,
        path,
        mockBytes,
        contentType
      )

      const audioUrl = uploadResult.signedUrl || `storage://audio/${path}`
      logger.info('Mock TTS audio uploaded to storage', { path, audioUrl, size: uploadResult.size, format })

      return {
        audioUrl,
        duration: 5.2,
        format,
        promptUsed: 'mock-tts-prompt'
      }
    }

    // Fallback: simple mock URL
    return {
      audioUrl: `https://mock-tts-audio.example.com/generated-audio.${extension}`,
      duration: 5.2,
      format,
      promptUsed: 'mock-tts-prompt'
    }
  }
}
