/**
 * Gemini TTS Audio Generation Client
 * Handles TTS audio generation requests to Gemini API
 */

// Import Deno environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

import { createLogger } from '../logger.ts'
import type { GeminiConfig } from './config.ts'

const logger = createLogger('gemini-tts')

/**
 * TTS generation request parameters
 */
export interface GenerateTTSRequest {
  ssml: string
  voiceName?: string
  speakingRate?: number
  pitch?: number
  responseMimeType?: string
}

/**
 * Generate TTS audio with Gemini
 * Returns audio bytes and metadata
 */
export async function generateTTSAudio(
  request: GenerateTTSRequest,
  config: GeminiConfig
): Promise<{ bytes: Uint8Array; contentType: string; prompt: string }> {
  // Check API key first
  if (!config.apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const startTime = Date.now()

  logger.info(`Generating TTS audio with Gemini (${config.ttsModel}) for SSML: ${request.ssml.substring(0, 50)}...`)

  // Use TTS-specific model URL from config
  const ttsGenerateUrl = config.ttsGenerateUrl

  // Set defaults
  const {
    voiceName = config.defaultVoiceName,
    speakingRate = 1.0,
    pitch = 0,
    responseMimeType = 'audio/mpeg'
  } = request

  // Gemini TTS request body
  const requestBody = {
    contents: [{
      parts: [{
        text: request.ssml // Pass SSML directly as text (Gemini handles SSML parsing)
      }]
    }],
    generationConfig: {
      responseModalities: ["text", "audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName // Use the voice name from options
          }
        },
        speakingRate,
        pitch
      }
    }
  }

  try {
    const response = await fetch(ttsGenerateUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': config.apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Gemini TTS API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Gemini TTS API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()

    // Extract audio from Gemini response
    const audioPart = data.candidates?.[0]?.content?.parts?.find((part: any) =>
      part.inlineData?.mimeType?.startsWith('audio/')
    )

    if (!audioPart?.inlineData?.data) {
      throw new Error('No audio data found in Gemini TTS response')
    }

    // Decode base64 audio content
    const bytes = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0))
    const contentType = audioPart.inlineData.mimeType || responseMimeType

    const processingTime = Date.now() - startTime
    logger.info('Gemini TTS synthesis completed', {
      bytesLength: bytes.length,
      contentType,
      processingTime
    })

    const prompt = `Gemini TTS synthesis: voice=${voiceName}, speed=${speakingRate}, pitch=${pitch}, format=${contentType}, ssml=${request.ssml.substring(0, 100)}...`

    return {
      bytes,
      contentType,
      prompt
    }

  } catch (error) {
    logger.error('Gemini TTS synthesis failed', error)
    throw error
  }
}
