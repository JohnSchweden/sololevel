/**
 * SSML Generation Service
 * Handles conversion of analysis results to SSML markup for speech synthesis
 */

import { getSSMLGenerationPrompt } from '../../../ai-analyze-video/prompts-local.ts'
import { generateSSMLFromStructuredFeedback } from '../../gemini/ssml.ts'
import { createLogger } from '../../logger.ts'
import type { VideoAnalysisResult } from '../video/VideoAnalysisService.ts'

const logger = createLogger('ssml-service')

export interface SSMLContext {
  analysisResult: VideoAnalysisResult
  customParams?: {
    voice?: string
    speed?: number
    pitch?: number
  }
}

export interface SSMLResult {
  ssml: string
  promptUsed?: string
}

/**
 * SSML Generation Service Interface
 */
export interface ISSMLService {
  generate(context: SSMLContext): Promise<SSMLResult>
}

/**
 * Gemini-based SSML Generation Service
 */
export class GeminiSSMLService implements ISSMLService {
  private geminiLLMFeedback: any

  constructor(geminiLLMFeedbackFn: any) {
    this.geminiLLMFeedback = geminiLLMFeedbackFn
  }

  async generate(context: SSMLContext): Promise<SSMLResult> {
    const { analysisResult } = context

    logger.info('Starting SSML generation from analysis results')

    try {
      // Convert VideoAnalysisResult to GeminiAnalysisResult format
      const geminiAnalysis = {
        textReport: analysisResult.textReport,
        feedback: analysisResult.feedback.map(item => ({
          timestamp: item.timestamp,
          category: item.category as any, // Allow flexible categories
          message: item.message,
          confidence: item.confidence,
          impact: item.impact,
        })),
        metrics: analysisResult.metrics as any,
        confidence: analysisResult.confidence,
      }

      // Generate the SSML prompt from prompts-local.ts as single source of truth
      const feedbackText = geminiAnalysis.feedback?.map((f: any) => f.message).join(' ') ||
                          geminiAnalysis.textReport ||
                          'Analysis completed successfully'

      const ssmlPrompt = getSSMLGenerationPrompt({
        feedback_text: feedbackText
      })

      logger.info('Generated SSML prompt from prompts-local.ts')

      // Use the Gemini SSML generator with the prompt from prompts-local.ts
      const ssmlResult = await generateSSMLFromStructuredFeedback(geminiAnalysis, {
        voice: context.customParams?.voice as any || 'neutral',
        speed: context.customParams?.speed ? 'medium' : 'medium',
        emphasis: 'moderate',
        prompt: ssmlPrompt, // Use prompt from prompts-local.ts
      })

      const result: SSMLResult = {
        ssml: ssmlResult.ssml,
        promptUsed: ssmlResult.prompt, // Use the prompt returned by the SSML generator (may be 'mock-mode-no-prompt' in mock mode)
      }

      logger.info(`SSML generation completed: ${result.ssml.substring(0, 100)}...`)
      return result

    } catch (error) {
      logger.error('SSML generation failed', error)
      throw error
    }
  }
}

/**
 * Mock SSML Generation Service for testing
 */
export class MockSSMLService implements ISSMLService {
  async generate(_context: SSMLContext): Promise<SSMLResult> {
    logger.info('Mock SSML generation - STARTING')
    logger.info('Mock SSML generation - COMPLETED')

    return await Promise.resolve({
      ssml: `<speak><p>Mock SSML generated from analysis results.</p></speak>`,
      promptUsed: 'mock-ssml-prompt',
    })
  }
}
