/**
 * Text-to-Speech Service
 * Handles audio synthesis from SSML markup
 */

import { generateTTSFromSSML } from '../../../ai-analyze-video/gemini-tts-audio.ts'
import { createLogger } from '../../logger.ts'
import type { SSMLResult } from './SSMLService.ts'

const logger = createLogger('tts-service')

export interface TTSContext {
  ssml: string
  customParams?: {
    voice?: string
    speed?: number
    pitch?: number
    format?: 'mp3' | 'wav' | 'ogg'
  }
}

export interface TTSResult {
  audioUrl: string
  duration?: number
  promptUsed?: string
}

/**
 * TTS Service Interface
 */
export interface ITTSService {
  synthesize(context: TTSContext): Promise<TTSResult>
}

/**
 * Gemini-based TTS Service
 */
export class GeminiTTSService implements ITTSService {
  private geminiTTS20: any

  constructor(geminiTTS20Fn: any) {
    this.geminiTTS20 = geminiTTS20Fn
  }

  async synthesize(context: TTSContext): Promise<TTSResult> {
    const { ssml, customParams } = context

    logger.info('Starting TTS audio synthesis from SSML')

    try {
      const ttsResult = generateTTSFromSSML(ssml, {
        voice: customParams?.voice as any || 'neutral',
        speed: customParams?.speed as any || 'medium',
        pitch: customParams?.pitch || 0,
      })

      const result: TTSResult = {
        audioUrl: ttsResult.audioUrl,
        promptUsed: ttsResult.prompt,
      }

      logger.info(`TTS synthesis completed: ${result.audioUrl}`)
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

    return {
      audioUrl: 'https://mock-tts-audio.example.com/generated-audio.mp3',
      duration: 5.2,
    }
  }
}
