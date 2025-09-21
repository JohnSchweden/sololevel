import { type AnalysisResults, updateAnalysisResults, updateAnalysisStatus } from '../db/analysis.ts'
import { notifyAnalysisComplete } from '../notifications.ts'

interface PipelineContext {
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  analysisId: number
  videoPath: string
  videoSource: string
  frameData?: string[]
  existingPoseData?: any[]
  timingParams?: {
    startTime?: number
    endTime?: number
    duration?: number
    feedbackCount?: number
    targetTimestamps?: number[]
    minGap?: number
    firstTimestamp?: number
  }
}

// Import Gemini modules (these will be injected to allow testing)
let _analyzeVideoWithGemini: any = null
let geminiLLMFeedback: any = null
let geminiTTS20: any = null

// Dependency injection for testability
export function injectGeminiDependencies(
  analyzeVideoWithGemini: any,
  llmFeedback: any,
  tts20: any
) {
  _analyzeVideoWithGemini = analyzeVideoWithGemini
  geminiLLMFeedback = llmFeedback
  geminiTTS20 = tts20
}

export async function processAIPipeline(context: PipelineContext): Promise<void> {
  const { supabase, logger, analysisId, videoPath, videoSource, timingParams } = context
  const startTime = Date.now()

  try {
    logger.info(`Starting AI pipeline for analysis ${analysisId}`, {
      videoPath,
      videoSource,
      analysisId
    })

    // Update status to processing
    logger.info(`Updating analysis status to processing for job ${analysisId}`)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 10, logger)
    logger.info(`Successfully updated status to processing for job ${analysisId}`)

    // 1. Video Source Detection (No pose data needed for AI analysis)
    // Pose data is stored in database for UI purposes only
    // AI analysis uses video content directly

    // 2. Gemini Video Analysis - analyzes video content directly
    // Progress callback will handle: 20% download, 40% upload, 55% active, 70% inference
    logger.info(`Starting Gemini analysis for ${videoPath}`, {
      analysisId,
      videoPath,
      videoSource
    })

    logger.info('About to call _analyzeVideoWithGemini function')

    logger.info('Timing parameters received', {
      startTime: timingParams?.startTime,
      endTime: timingParams?.endTime,
      duration: timingParams?.duration,
      feedbackCount: timingParams?.feedbackCount,
      targetTimestamps: timingParams?.targetTimestamps,
    })

    let analysis
    try {
      analysis = await _analyzeVideoWithGemini(supabase, videoPath, timingParams, async (progress: number) => {
        logger.info(`Progress update: ${progress}% for analysis ${analysisId}`)
        await updateAnalysisStatus(supabase, analysisId, 'processing', null, progress, logger)
      })
      logger.info('Gemini analysis function completed', {
        analysisId,
        hasTextReport: !!analysis?.textReport,
        feedbackCount: analysis?.feedback?.length || 0
      })
    } catch (geminiError) {
      logger.error('Gemini analysis function failed', {
        error: geminiError instanceof Error ? geminiError.message : String(geminiError),
        stack: geminiError instanceof Error ? geminiError.stack : undefined,
        analysisId,
        videoPath
      })
      throw geminiError
    }
    logger.info(`Gemini analysis completed: ${analysis.textReport.substring(0, 50)}...`)

    // 3. Gemini LLM SSML Generation
    const ssml = await geminiLLMFeedback(analysis)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 85, logger)

    // 4. Gemini TTS 2.0 Audio Generation
    const audioUrl = await geminiTTS20(ssml)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 95, logger)

    // 5. Store results and update status
    const results: AnalysisResults = {
      text_report: analysis.textReport, // Full text analysis report
      feedback: analysis.feedback, // Structured feedback items
      summary_text: analysis.textReport.substring(0, 500), // Backward compatibility
      ssml: ssml,
      audio_url: audioUrl,
      processing_time: Date.now() - startTime,
      video_source: videoSource,
    }

    // Note: Pose data is stored separately in analysis_jobs.pose_data for UI purposes
    // AI analysis results don't include pose data
    await updateAnalysisResults(
      supabase,
      analysisId,
      results,
      null,
      Date.now() - startTime,
      videoSource,
      logger
    )
    await updateAnalysisStatus(supabase, analysisId, 'completed', null, 100, logger)

    // 6. Real-time notification
    await notifyAnalysisComplete(analysisId, logger)
  } catch (error) {
    logger.error('AI Pipeline failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId,
      videoPath
    })
    await updateAnalysisStatus(
      supabase,
      analysisId,
      'failed',
      error instanceof Error ? error.message : String(error),
      undefined,
      logger
    )
  }
}
