import { type AnalysisResults, updateAnalysisResults, updateAnalysisStatus } from '../db/analysis.ts'
import { notifyAnalysisComplete } from '../notifications.ts'
import {
  ISSMLService,
  ITTSService,
  IVideoAnalysisService,
  type SSMLContext,
  type TTSContext,
  type VideoAnalysisContext,
} from '../services/index.ts'

export interface PipelineContext {
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
  stages?: {
    runVideoAnalysis?: boolean
    runLLMFeedback?: boolean
    runSSML?: boolean
    runTTS?: boolean
  }
  // Service instances (dependency injection)
  services: {
    videoAnalysis: IVideoAnalysisService
    ssml: ISSMLService
    tts: ITTSService
  }
}

// Service-based architecture - no more global function injection needed
// Services are now properly instantiated with dependency injection in route handlers

export async function processAIPipeline(context: PipelineContext): Promise<void> {
  const {
    supabase,
    logger,
    analysisId,
    videoPath,
    videoSource,
    timingParams,
    stages = { runVideoAnalysis: true, runLLMFeedback: true, runSSML: true, runTTS: true },
    services
  } = context
  const startTime = Date.now()

  try {
    logger.info(`Starting AI pipeline for analysis ${analysisId}`, {
      videoPath,
      videoSource,
      analysisId,
      stages
    })

    // Update status to processing
    logger.info(`Updating analysis status to processing for job ${analysisId}`)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 10, logger)
    logger.info(`Successfully updated status to processing for job ${analysisId}`)

    // 1. Video Source Detection (No pose data needed for AI analysis)
    // Pose data is stored in database for UI purposes only
    // AI analysis uses video content directly

    // 2. Video Analysis - analyzes video content directly
    // Progress callback will handle: 20% download, 40% upload, 55% active, 70% inference
    logger.info(`Starting video analysis for ${videoPath}`, {
      analysisId,
      videoPath,
      videoSource
    })

    logger.info('Timing parameters received', {
      startTime: timingParams?.startTime,
      endTime: timingParams?.endTime,
      duration: timingParams?.duration,
      feedbackCount: timingParams?.feedbackCount,
      targetTimestamps: timingParams?.targetTimestamps,
    })

    let analysis
    let rawGeneratedText: string | undefined
    let fullFeedbackJson: any
    let feedbackPrompt: string | undefined
    let ssmlPrompt: string | undefined = undefined
    let audioPrompt: string | undefined = undefined

    try {
      logger.info('Starting video analysis service call...')
      analysis = await services.videoAnalysis.analyze({
        supabase,
        videoPath,
        analysisParams: timingParams,
        progressCallback: async (progress: number) => {
          logger.info(`Progress update: ${progress}% for analysis ${analysisId}`)
          await updateAnalysisStatus(supabase, analysisId, 'processing', null, progress, logger)
        }
      } as VideoAnalysisContext)
      logger.info('Video analysis service call completed successfully')

      // Extract prompts and raw data from analysis result
      rawGeneratedText = analysis.rawText || undefined
      fullFeedbackJson = analysis.jsonData || {}
      feedbackPrompt = analysis.promptUsed || undefined
    } catch (videoError) {
      logger.error('Video analysis failed', videoError)
      throw videoError
    }

    logger.info('Video analysis completed', {
      analysisId,
      hasTextReport: !!analysis?.textReport,
      feedbackCount: analysis?.feedback?.length || 0,
      hasRawData: !!rawGeneratedText,
      hasPrompt: !!feedbackPrompt
    })

    logger.info(`Video analysis completed: ${analysis.textReport.substring(0, 50)}...`)

    // Early exit: Stop after video analysis if LLM feedback is disabled
    if (!stages.runLLMFeedback) {
      logger.info(`Stopping pipeline after video analysis (LLM feedback disabled)`)
      const results: AnalysisResults = {
        text_feedback: analysis.textReport,
        feedback: analysis.feedback,
        summary_text: analysis.textReport.substring(0, 500),
        processing_time: Date.now() - startTime,
        video_source: videoSource,
      }
      await updateAnalysisResults(
        supabase,
        analysisId,
        results,
        null,
        Date.now() - startTime,
        videoSource,
        logger,
        rawGeneratedText,
        fullFeedbackJson,
        feedbackPrompt
      )
      await updateAnalysisStatus(supabase, analysisId, 'completed', null, 100, logger)
      await notifyAnalysisComplete(analysisId, logger)
      return
    }

    // 3. SSML Generation
    logger.info(`Starting SSML generation for analysis ${analysisId}`)
    const ssmlResult = await services.ssml.generate({ analysisResult: analysis } as SSMLContext)
    logger.info(`SSML generation completed: ${ssmlResult.ssml?.substring(0, 100)}...`)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 85, logger)

    // Extract SSML prompt (if available from the service)
    ssmlPrompt = (ssmlResult as any).promptUsed || undefined

    // Early exit: Stop after SSML generation if TTS is disabled
    if (!stages.runTTS) {
      logger.info(`Stopping pipeline after SSML generation (TTS disabled)`)
      const results: AnalysisResults = {
        text_feedback: analysis.textReport,
        feedback: analysis.feedback,
        summary_text: analysis.textReport.substring(0, 500),
        ssml: ssmlResult.ssml,
        processing_time: Date.now() - startTime,
        video_source: videoSource,
      }
      await updateAnalysisResults(
        supabase,
        analysisId,
        results,
        null,
        Date.now() - startTime,
        videoSource,
        logger,
        rawGeneratedText,
        fullFeedbackJson,
        feedbackPrompt,
        ssmlPrompt,
        audioPrompt
      )
      await updateAnalysisStatus(supabase, analysisId, 'completed', null, 100, logger)
      await notifyAnalysisComplete(analysisId, logger)
      return
    }

    // 4. TTS Audio Generation
    const ttsResult = await services.tts.synthesize({
      ssml: ssmlResult.ssml,
      supabase,
      analysisId
    } as TTSContext)
    await updateAnalysisStatus(supabase, analysisId, 'processing', null, 95, logger)

    // Extract audio prompt (if available from the service)
    audioPrompt = (ttsResult as any).promptUsed || undefined

    // 5. Store results and update status
    const results: AnalysisResults = {
      text_feedback: analysis.textReport, // Full text analysis feedback
      feedback: analysis.feedback, // Structured feedback items
      summary_text: analysis.textReport.substring(0, 500), // Backward compatibility
      ssml: ssmlResult.ssml,
      audio_url: ttsResult.audioUrl || 'placeholder-url',
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
      logger,
      rawGeneratedText,
      fullFeedbackJson,
      feedbackPrompt,
      ssmlPrompt,
      audioPrompt
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
