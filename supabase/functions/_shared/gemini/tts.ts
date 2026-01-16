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
  ttsSystemInstruction?: string // Voice style/accent instruction from config table
  // Note: speakingRate and pitch removed per web research examples
  // Will be added back if needed after basic functionality works
}

/**
 * Generate TTS audio with Gemini
 * Returns audio bytes and metadata
 */
export async function generateTTSAudio(
  request: GenerateTTSRequest,
  config: GeminiConfig,
  dbLogger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; child?: (module: string) => any }
): Promise<{ bytes: Uint8Array; contentType: string; prompt: string; duration: number }> {
  // Check API key first
  if (!config.apiKey) {
    const error = 'Gemini API key not configured'
    const ttsLogger = dbLogger?.child ? dbLogger.child('gemini-tts') : dbLogger
    ttsLogger?.error('TTS generation failed: API key not configured', {})
    throw new Error(error)
  }

  const startTime = Date.now()
  const ttsLogger = dbLogger?.child ? dbLogger.child('gemini-tts') : dbLogger

  logger.info(`Generating TTS audio with Gemini (${config.ttsModel}) for SSML: ${request.ssml.substring(0, 50)}...`)
  ttsLogger?.info('Starting TTS audio generation', {
    model: config.ttsModel,
    ssmlLength: request.ssml.length,
    voiceName: request.voiceName,
    format: request.format
  })

  // Use TTS-specific model URL from config
  const ttsGenerateUrl = config.ttsGenerateUrl

  // Set defaults
  // NOTE: ttsSystemInstruction should come from coach_voice_configs.tts_system_instruction
  // Empty default ensures database value is used; only raw SSML is sent if no instruction provided
  const {
    voiceName = config.defaultVoiceName,
    format = 'wav' as AudioFormat,
    ttsSystemInstruction = ''
  } = request

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

        response = await fetch(ttsGenerateUrl, {
          method: 'POST',
          headers: {
            'x-goog-api-key': config.apiKey!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
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
      ttsLogger?.error('Gemini TTS API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText?.slice(0, 500)
      })
      throw new Error(`Gemini TTS API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    ttsLogger?.info('Gemini TTS API response received', {
      status: response.status,
      hasCandidates: !!data.candidates?.[0]
    })

    // Extract audio from Gemini response
    const audioPart = data.candidates?.[0]?.content?.parts?.find((part: any) =>
      part.inlineData?.mimeType?.startsWith('audio/')
    )

    if (!audioPart?.inlineData?.data) {
      const error = 'No audio data found in Gemini TTS response'
      ttsLogger?.error('No audio data in TTS response', {
        hasCandidates: !!data.candidates?.[0],
        hasContent: !!data.candidates?.[0]?.content,
        hasParts: !!data.candidates?.[0]?.content?.parts,
        partTypes: data.candidates?.[0]?.content?.parts?.map((p: any) => Object.keys(p).join(','))
      })
      throw new Error(error)
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
      processingTime,
      ttsSystemInstruction: ttsSystemInstruction ? ttsSystemInstruction.substring(0, 50) : '(none)'
    })
    ttsLogger?.info('Gemini TTS synthesis completed', {
      bytesLength: finalBytes.length,
      contentType,
      duration,
      processingTime
    })

    // Store full prompt context for traceability: instruction (from config table) + SSML snippet
    // This matches what was actually sent to Gemini API as contentText
    const promptForStorage = ttsSystemInstruction 
      ? `${ttsSystemInstruction}\n\n${request.ssml.substring(0, 200)}${request.ssml.length > 200 ? '...' : ''}`
      : request.ssml.substring(0, 300)

    return {
      bytes: finalBytes,
      contentType,
      prompt: promptForStorage,
      duration
    }

  } catch (error) {
    logger.error('Gemini TTS synthesis failed', error)
    ttsLogger?.error('Gemini TTS synthesis failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ssmlLength: request.ssml.length
    })
    throw error
  }
}

