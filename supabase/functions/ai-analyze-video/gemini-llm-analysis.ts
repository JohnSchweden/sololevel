/**
 * Gemini LLM Analysis for Video Processing
 * Real implementation using Google AI Gemini 2.5 API
 * Refactored to use modular architecture
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'

// Import local edge-safe prompts (fallback until JSR package is published)
import { getGeminiAnalysisPrompt as _getGeminiAnalysisPrompt } from './prompts-local.ts'

// Import extracted modules
import { createValidatedGeminiConfig } from '../_shared/gemini/config.ts'
import { pollFileActive, uploadToGemini } from '../_shared/gemini/filesClient.ts'
import { generateContent } from '../_shared/gemini/generate.ts'
import { PREPARED_GEMINI_MOCK_RESPONSE } from '../_shared/gemini/mocks.ts'
import { extractMetricsFromText, parseDualOutput } from '../_shared/gemini/parse.ts'
import type { GeminiVideoAnalysisResult, VideoAnalysisParams } from '../_shared/gemini/types.ts'
import { downloadVideo } from '../_shared/storage/download.ts'

const logger = createLogger('gemini-llm-analysis')

// Re-export types for backward compatibility
export type { GeminiVideoAnalysisResult }

// Legacy function for backward compatibility - now removed
// This function is no longer needed as we use the new modular approach
export function setSupabaseClient(_client: any) {
  // No-op: supabase client is now passed as parameter to functions
  logger.warn('setSupabaseClient is deprecated - supabase client is now passed as parameter')
}

/**
 * Analyze video content using Gemini with Files API
 * This uses the proper Files API approach for video analysis
 */
export async function analyzeVideoWithGemini(
  supabaseClient: any,
  videoPath: string,
  analysisParams?: VideoAnalysisParams,
  progressCallback?: (progress: number) => Promise<void>
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
  const mappedParams = {
    duration: analysisParams?.duration || 6,
    // Unused variables (commented out - new prompt template only uses duration):
    // start_time: analysisParams?.startTime || 0,
    // end_time: analysisParams?.endTime || analysisParams?.duration || 6,
    // feedback_count: analysisParams?.feedbackCount || 1,
    // target_timestamps: analysisParams?.targetTimestamps,
    // min_gap: analysisParams?.minGap,
    // first_timestamp: analysisParams?.firstTimestamp,
  }
  const prompt = _getGeminiAnalysisPrompt(mappedParams as any)
  logger.info(`Generated analysis prompt: ${prompt.length} characters`)

  try {
    let generationResult: { text: string; rawResponse: any; prompt: string }

    // Mock mode: Use prepared response instead of API calls
    if (config.analysisMode === 'mock') {
      logger.info(`AI_ANALYSIS_MODE=mock: Using prepared response for MVP testing with video: ${videoPath}`)

      // Helper for delay simulation
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // Simulate progress callbacks with delays to mimic real API latency (1s total)
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
        // No progress callback, still simulate 1s delay
        await delay(1000)
      }

      // Use mock response
      //return getMockAnalysisResult()

      // Use mock response
      generationResult = {
        text: PREPARED_GEMINI_MOCK_RESPONSE,
        rawResponse: { source: 'mock', model: config.mmModel },
        prompt,
      }
    } else {
      // REAL mode: Use Gemini API
      logger.info(`Starting Gemini analysis (${config.mmModel}) for video: ${videoPath}`)

      // Step 1: Download video (20% progress)
      const { bytes, mimeType } = await downloadVideo(supabaseClient, videoPath, config.filesMaxMb)

      if (progressCallback) {
        await progressCallback(20)
      }

      // Step 2: Upload video to Gemini Files API (40% progress)
      const displayName = `analysis_${Date.now()}.mp4`
      const fileRef = await uploadToGemini(bytes, mimeType, displayName, config)

      if (progressCallback) {
        await progressCallback(40)
      }

      // Step 3: Poll until file is ACTIVE (55% progress)
      await pollFileActive(fileRef.name, config)

      if (progressCallback) {
        await progressCallback(55)
      }

      // Step 4: Generate content with Gemini (70% progress)
      generationResult = await generateContent({
        fileRef,
        prompt,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }, config)

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

    return result
  } catch (error) {
    logger.error(`${config.mmModel} analysis failed`, error)
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