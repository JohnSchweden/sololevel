/**
 * Gemini LLM Analysis for Video Processing
 * Real implementation using Google AI Gemini 2.5 API
 * Refactored to use modular architecture
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'

// Import local edge-safe prompts (fallback until JSR package is published)
import { 
  getGeminiAnalysisPrompt as _getGeminiAnalysisPrompt, 
  buildPromptFromConfig
} from './prompts-local.ts'

// Import extracted modules
import { createValidatedGeminiConfig } from '../_shared/gemini/config.ts'
import { pollFileActive, uploadToGemini } from '../_shared/gemini/filesClient.ts'
import { generateContent } from '../_shared/gemini/generate.ts'
import { type CoachMode, getMockResponseForMode } from '../_shared/gemini/mocks.ts'
import { extractMetricsFromText, parseDualOutput } from '../_shared/gemini/parse.ts'
import type { GeminiVideoAnalysisResult, VideoAnalysisParams } from '../_shared/gemini/types.ts'
import { downloadVideo } from '../_shared/storage/download.ts'

const logger = createLogger('gemini-llm-analysis')

// Re-export types for backward compatibility
export type { GeminiVideoAnalysisResult }

/**
 * Analyze video content using Gemini with Files API
 * This uses the proper Files API approach for video analysis
 */
export async function analyzeVideoWithGemini(
  supabaseClient: any,
  videoPath: string,
  analysisParams?: VideoAnalysisParams,
  progressCallback?: (progress: number) => Promise<void>,
  customPrompt?: string, // Custom prompt with injected voice config
  dbLogger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; child?: (module: string) => any } // Database logger for persistent logging
): Promise<GeminiVideoAnalysisResult> {
  // Get validated configuration
  const config = createValidatedGeminiConfig()

  if (!videoPath) {
    throw new Error('Video path is required for analysis')
  }

  if (!supabaseClient) {
    throw new Error('Supabase client not available for video download')
  }

  // 0) Generate analysis prompt (shared)
  // Note: new prompt template only uses duration; other params are unused
  const mappedParams = {
    duration: analysisParams?.duration || 6,
  }
  
  // Use customPrompt if provided, otherwise check voiceConfig, otherwise fall back to default (Roast)
  const prompt = customPrompt 
    || (analysisParams?.voiceConfig 
      ? buildPromptFromConfig(analysisParams.voiceConfig, mappedParams.duration)
      : _getGeminiAnalysisPrompt(mappedParams as any))
    
  logger.info(`Generated analysis prompt: ${prompt.length} characters`)

  try {
    let generationResult: { text: string; rawResponse: any; prompt: string }

    // Mock mode: Use prepared response instead of API calls
    if (config.analysisMode === 'mock') {
      logger.info(`AI_ANALYSIS_MODE=mock: Using prepared response for MVP testing with video: ${videoPath}`)

      // Get mock delay from env (0 for tests, 1000 for production)
      const mockDelayMs = parseInt((globalThis as any).Deno?.env?.get('AI_ANALYSIS_MOCK_DELAY_MS') ?? '1000', 10)
      
      // Helper for delay simulation
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms * (mockDelayMs / 1000)))

      // Simulate progress callbacks with delays to mimic real API latency (1s total or 0 if disabled)
      if (mockDelayMs > 0) {
        if (progressCallback) {
          await progressCallback(20) // Download simulation
          await delay(250)
          await progressCallback(40) // Upload simulation
          await delay(250)
          await progressCallback(55) // Processing simulation
          await delay(250)
          await progressCallback(70) // Analysis simulation
          await delay(250)
        } else {
          // No progress callback, still simulate delay
          await delay(1000)
        }
      }

      // Detect mode from prompt content for mode-specific mock response
      const mode: CoachMode = prompt.includes('Zen me') ? 'zen' 
                            : prompt.includes('Lovebomb me') ? 'lovebomb' 
                            : 'roast'
      
      logger.info(`Mock mode detected: ${mode}`, { 
        promptSnippet: prompt.substring(0, 100) 
      })
      
      const mockResponse = getMockResponseForMode(mode)

      // Use mode-specific mock response
      generationResult = {
        text: mockResponse,
        rawResponse: { source: 'mock', model: config.mmModel, mode },
        prompt,
      }
    } else {
      // REAL mode: Use Gemini API
      logger.info(`Starting Gemini analysis (${config.mmModel}) for video: ${videoPath}`)

      // Step 1: Download video (20% progress)
      const downloadLogger = dbLogger?.child ? dbLogger.child('storage-download') : dbLogger
      downloadLogger?.info('Starting video download', { videoPath })
      const downloadStartTime = Date.now()
      const { bytes, mimeType } = await downloadVideo(supabaseClient, videoPath, config.filesMaxMb, downloadLogger)
      downloadLogger?.info('Video download completed', {
        videoPath,
        sizeMB: (bytes.length / (1024 * 1024)).toFixed(2),
        elapsedMs: Date.now() - downloadStartTime
      })

      if (progressCallback) {
        await progressCallback(20)
      }

      // Step 2: Upload video to Gemini Files API (40% progress)
      const displayName = `analysis_${Date.now()}.mp4`
      const filesLogger = dbLogger?.child ? dbLogger.child('gemini-files-client') : dbLogger
      filesLogger?.info('Starting video upload to Gemini', { displayName, sizeMB: (bytes.length / (1024 * 1024)).toFixed(2) })
      const uploadStartTime = Date.now()
      const fileRef = await uploadToGemini(bytes, mimeType, displayName, config, filesLogger)
      filesLogger?.info('Video upload to Gemini completed', {
        fileName: fileRef.name,
        elapsedMs: Date.now() - uploadStartTime
      })

      if (progressCallback) {
        await progressCallback(40)
      }

      // Step 3: Poll until file is ACTIVE (55% progress)
      filesLogger?.info('Starting file polling until ACTIVE', { fileName: fileRef.name })
      const pollStartTime = Date.now()
      await pollFileActive(fileRef.name, config, undefined, filesLogger)
      filesLogger?.info('File became ACTIVE', {
        fileName: fileRef.name,
        elapsedMs: Date.now() - pollStartTime
      })

      if (progressCallback) {
        await progressCallback(55)
      }

      // Step 4: Generate content with Gemini (70% progress)
      const generateLogger = dbLogger?.child ? dbLogger.child('gemini-generate') : dbLogger
      generateLogger?.info('Starting content generation', { fileName: fileRef.name, promptLength: prompt.length })
      const generateStartTime = Date.now()
      generationResult = await generateContent({
        fileRef,
        prompt,
        temperature: 1.0,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingLevel: 'LOW',
        },
        mediaResolution: 'MEDIA_RESOLUTION_LOW',
      }, config, generateLogger)
      generateLogger?.info('Content generation completed', {
        fileName: fileRef.name,
        textLength: generationResult.text.length,
        elapsedMs: Date.now() - generateStartTime
      })

      if (progressCallback) {
        await progressCallback(70)
      }
    }

    // Step 5: Parse the response (shared)
    const { textReport, feedback, metrics, jsonData, title } = parseDualOutput(generationResult.text)

    // Step 6: Validate and normalize the response (shared)
    const result: GeminiVideoAnalysisResult = {
      textReport: textReport || 'Video analysis completed successfully',
      feedback:
        feedback.length > 0
          ? feedback
          : [
              {
                timestamp: 0,
                category: 'Movement',
                message: 'Analysis completed successfully',
                confidence: 0.85,
                impact: 0.5,
              },
            ],
      metrics: metrics || extractMetricsFromText(textReport),
      confidence: 0.85, // Default confidence for AI analysis
      rawText: generationResult.text,
      rawResponse: generationResult.rawResponse,
      promptUsed: generationResult.prompt,
      jsonData: jsonData,
      title: title,
    }

    logger.info(`${config.mmModel} analysis completed: ${result.textReport.substring(0, 100)}...`)
    const analysisLogger = dbLogger?.child ? dbLogger.child('gemini-llm-analysis') : dbLogger
    analysisLogger?.info('Gemini analysis completed successfully', {
      textReportLength: result.textReport.length,
      feedbackCount: result.feedback.length
    })

    return result
  } catch (error) {
    logger.error(`${config.mmModel} analysis failed`, error)
    const analysisLogger = dbLogger?.child ? dbLogger.child('gemini-llm-analysis') : dbLogger
    analysisLogger?.error('Gemini analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      videoPath,
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/**
 * Analyze video content using Gemini 2.5 with custom analysis parameters
 * Allows for flexible prompt generation based on video characteristics
 */
export function analyzeVideoWithGeminiCustom(
  supabaseClient: any,
  videoPath: string,
  analysisParams: VideoAnalysisParams
): Promise<GeminiVideoAnalysisResult> {
  return analyzeVideoWithGemini(supabaseClient, videoPath, analysisParams)
}