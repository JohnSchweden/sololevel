/**
 * Video Analysis Service
 * Handles video content analysis using AI models
 */

import type { GeminiVideoAnalysisResult } from '../../gemini/types.ts'
import { createLogger } from '../../logger.ts'
import type { VideoAnalysisParams } from '../../types/ai-analyze-video.ts'

const logger = createLogger('video-analysis-service')

export interface VideoAnalysisContext {
  supabase: any
  videoPath: string
  analysisParams?: VideoAnalysisParams
  progressCallback?: (progress: number) => Promise<void>
}

export interface VideoAnalysisResult {
  textReport: string
  feedback: Array<{
    timestamp: number
    category: string
    message: string
    confidence: number
    impact: number
  }>
  metrics: Record<string, unknown>
  confidence: number
  rawResponse?: any
  rawText?: string
  promptUsed?: string
  jsonData?: any
}

/**
 * Video Analysis Service Interface
 */
export interface IVideoAnalysisService {
  analyze(context: VideoAnalysisContext): Promise<VideoAnalysisResult>
}

/**
 * Gemini-based Video Analysis Service
 */
export class GeminiVideoAnalysisService implements IVideoAnalysisService {
  private analyzeVideoWithGemini: any

  constructor(analyzeVideoWithGeminiFn: any) {
    this.analyzeVideoWithGemini = analyzeVideoWithGeminiFn
  }

  async analyze(context: VideoAnalysisContext): Promise<VideoAnalysisResult> {
    const { supabase, videoPath, analysisParams, progressCallback } = context

    logger.info(`Starting video analysis for: ${videoPath}`)

    try {
      const geminiResult: GeminiVideoAnalysisResult = await this.analyzeVideoWithGemini(
        supabase,
        videoPath,
        analysisParams,
        progressCallback
      )

      const result: VideoAnalysisResult = {
        textReport: geminiResult.textReport,
        feedback: Array.isArray(geminiResult.feedback) ? geminiResult.feedback : [],
        metrics: geminiResult.metrics || {},
        confidence: geminiResult.confidence || 0.85,
        rawResponse: geminiResult.rawResponse,
        rawText: geminiResult.rawText,
        promptUsed: geminiResult.promptUsed,
        jsonData: geminiResult.jsonData,
      }

      logger.info(`Video analysis completed: ${result.textReport.substring(0, 100)}...`)
      return result

    } catch (error) {
      logger.error('Video analysis failed', error)
      throw error
    }
  }
}

/**
 * Mock Video Analysis Service for testing
 */
export class MockVideoAnalysisService implements IVideoAnalysisService {
  async analyze(context: VideoAnalysisContext): Promise<VideoAnalysisResult> {
    logger.info(`Mock video analysis for: ${context.videoPath}`)

    // Simulate progress
    if (context.progressCallback) {
      await context.progressCallback(20)
      await context.progressCallback(40)
      await context.progressCallback(55)
      await context.progressCallback(70)
    }

    return {
      textReport: "Mock analysis completed successfully",
      feedback: [{
        timestamp: 0,
        category: 'Movement',
        message: 'Mock feedback item',
        confidence: 0.85,
        impact: 0.5,
      }],
      metrics: { mock_metric: 1.0 },
      confidence: 0.85,
    }
  }
}
