/**
 * Gemini TTS Audio Generation Client
 * Handles TTS audio generation requests to Gemini API
 */

// Import Deno environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  writeFile(path: string | URL, data: Uint8Array): Promise<void>
  writeFileSync(path: string | URL, data: Uint8Array): void
}

import { createLogger } from '../logger.ts'
import { AUDIO_FORMATS, type AudioFormat } from '../media/audio.ts'
import { convertPCMToMP3, convertPCMToWAV, convertPCMToWAVLowQuality } from '../media/convert.ts'
import type { GeminiConfig } from './config.ts'
// Import TTS system instruction template
// import { TTS_GENERATION_PROMPT_TEMPLATE } from '../../ai-analyze-video/prompts-local.ts'

const logger = createLogger('gemini-tts')

/**
 * TTS generation request parameters
 */
export interface GenerateTTSRequest {
  ssml: string
  voiceName?: string
  format?: AudioFormat
  // Note: speakingRate and pitch removed per web research examples
  // Will be added back if needed after basic functionality works
}

/**
 * Generate TTS audio with Gemini
 * Returns audio bytes and metadata
 */
export async function generateTTSAudio(
  request: GenerateTTSRequest,
  config: GeminiConfig
): Promise<{ bytes: Uint8Array; contentType: string; prompt: string; duration: number }> {
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
    format = 'wav' as AudioFormat
  } = request

  // Get TTS system instruction from environment variable with default
  const ttsSystemInstruction = Deno.env.get('TTS_SYSTEM_INSTRUCTION') 
    || 'Use a funny north european accent.'

  // Combine system instruction with SSML content
  // Gemini TTS doesn't support separate system role, so prepend instruction to user content
  const contentText = ttsSystemInstruction ? `${ttsSystemInstruction}\n\n${request.ssml}` : request.ssml

  // Map format to MIME type

  // Gemini TTS request body (following Gemini TTS API schema)
  const requestBody = {
    contents: [{
      role: "user",
      parts: [{
        text: contentText
      }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName // Use the voice name from options
          }
        }
      }
    }
  }

  try {
    let response = await fetch(ttsGenerateUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': config.apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    // Retry once on 400 INVALID_ARGUMENT by stripping speakingRate/pitch
    if (!response.ok && response.status === 400) {
      const errorText = await response.text()
      if (/Invalid JSON payload|INVALID_ARGUMENT/i.test(errorText)) {
        logger.warn('Gemini TTS API returned 400 INVALID_ARGUMENT, retrying without speakingRate/pitch', {
          originalError: errorText
        })

        // Create retry request body - use same structure as original (audioConfig already at top level)
        const retryRequestBody = {
          ...requestBody
          // audioConfig is already at top level, no need to modify for retry
        }

        response = await fetch(ttsGenerateUrl, {
          method: 'POST',
          headers: {
            'x-goog-api-key': config.apiKey!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(retryRequestBody)
        })
      }
    }

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

    // Decode base64 audio content - Gemini returns PCM by default
    const pcmBytes = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0))

    // Calculate duration from PCM bytes (16-bit, 24kHz, mono)
    // Formula: duration = pcm_length / (sample_rate * channels * bits_per_sample / 8)
    // 24000 Hz * 1 channel * 16 bits / 8 = 48000 bytes per second
    const duration = pcmBytes.length / 48000

    // Convert PCM to requested format
    let finalBytes: Uint8Array
    let contentType: string

    if (format === 'wav') {
      // Convert PCM to WAV
      finalBytes = convertPCMToWAV(pcmBytes) || convertPCMToWAVLowQuality(pcmBytes)
      contentType = AUDIO_FORMATS[format].mimes[0]
    } else if (format === 'mp3') {
      // For MP3, we need to use a different approach since we can't directly convert PCM to MP3 in Edge Functions
      // For now, we'll return WAV and let the client handle MP3 conversion if needed
      // Alternatively, you could use a service like FFmpeg WASM
      finalBytes = convertPCMToMP3(pcmBytes)
      contentType = AUDIO_FORMATS[format].mimes[0]
    } else {
      // Return raw PCM
      finalBytes = pcmBytes
      contentType = 'audio/pcm'
    }
    

    const processingTime = Date.now() - startTime
    logger.info('Gemini TTS synthesis completed', {
      bytesLength: finalBytes.length,
      contentType,
      processingTime
    })

    const prompt = `Gemini TTS synthesis: voice=${voiceName}, format=${contentType}, instruction="${ttsSystemInstruction}", ssml=${request.ssml.substring(0, 100)}...`

    return {
      bytes: finalBytes,
      contentType,
      prompt,
      duration
    }

  } catch (error) {
    logger.error('Gemini TTS synthesis failed', error)
    throw error
  }
}

