import { buildPromptFromConfig } from '../../ai-analyze-video/prompts-local.ts'
import { type AnalysisResults, updateAnalysisResults, updateAnalysisStatus } from '../db/analysis.ts'
import { getUserVoicePreferences, getVoiceConfig, updateAnalysisJobVoiceSnapshot } from '../db/voiceConfig.ts'
import { notifyAnalysisComplete } from '../notifications.ts'
import {
  IVideoAnalysisService,
  type VideoAnalysisContext,
} from '../services/index.ts'

export interface PipelineContext {
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  analysisId: number
  userId: string // Required for voice config lookup
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
  // Note: Only videoAnalysis service is used in this phase
  // SSML/TTS services are now used in the /post-analyze endpoint
  services: {
    videoAnalysis: IVideoAnalysisService
  }
}

// Service-based architecture - no more global function injection needed
// Services are now properly instantiated with dependency injection in route handlers

export async function processAIPipeline(context: PipelineContext): Promise<void> {
  const {
    supabase,
    logger,
    analysisId,
    userId,
    videoPath,
    videoSource,
    timingParams,
    stages = { runVideoAnalysis: true, runLLMFeedback: true, runSSML: true, runTTS: true },
    services
  } = context
  const startTime = Date.now()

  // Create database-backed logger early for full pipeline visibility
  // Get analysis UUID from job_id for proper context
  const { data: analysis } = await supabase
    .from('analyses')
    .select('id')
    .eq('job_id', analysisId)
    .single()
  
  const { createDatabaseLogger } = await import('../../_shared/db/logging.ts')
  const dbLogger = createDatabaseLogger('ai-analyze-video', 'pipeline', supabase, {
    jobId: analysisId,  // analysisId is actually the job_id (number)
    analysisId: analysis?.id || undefined,  // UUID from analyses table
  })

  try {
    logger.info(`Starting AI pipeline for analysis ${analysisId}`, {
      videoPath,
      videoSource,
      analysisId,
      stages
    })
    dbLogger.info('AI pipeline started', { videoPath, videoSource, analysisId, stages })

    // Update status to processing (idempotent - only if still queued)
    // Note: handleWebhookStart may have already set this, so we check current status first
    const { data: currentJob } = await supabase
      .from('analysis_jobs')
      .select('status')
      .eq('id', analysisId)
      .single()

    if (currentJob?.status === 'queued') {
      await updateAnalysisStatus(supabase, analysisId, 'processing', null, 10, logger)
    }

    // 1. Fetch user voice preferences and build custom prompt
    let customPrompt: string | undefined
    let voiceConfig: Awaited<ReturnType<typeof getVoiceConfig>> | undefined
    
    try {
      const prefs = await getUserVoicePreferences(supabase, userId)
      voiceConfig = await getVoiceConfig(supabase, prefs.coachGender, prefs.coachMode)
      logger.info('Voice config fetched', { 
        userId, 
        configId: voiceConfig.id,
        gender: voiceConfig.gender,
        mode: voiceConfig.mode 
      })
      
      // Build prompt with injected voice/personality
      customPrompt = buildPromptFromConfig(
        {
          promptVoice: voiceConfig.promptVoice,
          promptPersonality: voiceConfig.promptPersonality,
          ssmlSystemInstruction: voiceConfig.ssmlSystemInstruction,
        },
        timingParams?.duration || 6
      )
      logger.info('Custom prompt built', { 
        userId,
        promptLength: customPrompt.length,
        voice: voiceConfig.promptVoice.substring(0, 50),
        personality: voiceConfig.promptPersonality.substring(0, 50)
      })
    } catch (voiceConfigError) {
      logger.error('Failed to fetch voice config, using default prompt', { 
        error: voiceConfigError instanceof Error ? voiceConfigError.message : String(voiceConfigError),
        userId 
      })
      // Continue with default prompt (customPrompt remains undefined)
    }

    // 2. Video Source Detection (No pose data needed for AI analysis)
    // Pose data is stored in database for UI purposes only
    // AI analysis uses video content directly

    let feedbackIds: number[] | undefined

    // 3. Video Analysis - analyzes video content directly (conditional)
    if (stages.runVideoAnalysis) {
      // Progress callback will handle: 20% download, 40% upload, 55% active, 70% inference
      logger.info(`Starting video analysis for ${videoPath}`, {
        analysisId,
        videoPath,
        videoSource,
        timingParams
      })

      let analysis
      let rawGeneratedText: string | undefined
      let fullFeedbackJson: any
      let feedbackPrompt: string | undefined

      try {
        const videoAnalysisLogger = dbLogger.child('video-analysis')
        analysis = await services.videoAnalysis.analyze({
          supabase,
          videoPath,
          analysisParams: timingParams,
          customPrompt, // Pass custom prompt with injected voice config
          progressCallback: async (progress: number) => {
            await updateAnalysisStatus(supabase, analysisId, 'processing', null, progress, logger)
          },
          dbLogger: videoAnalysisLogger // Pass child logger to video analysis service
        } as VideoAnalysisContext)

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
        feedbackCount: analysis?.feedback?.length || 0
      })

      // 3. Persist analysis results and feedback items (conditional)
      if (stages.runLLMFeedback) {
        const results: AnalysisResults = {
          text_feedback: analysis.textReport,
          feedback: analysis.feedback,
          summary_text: analysis.textReport.substring(0, 500),
          processing_time: Date.now() - startTime,
          video_source: videoSource,
        }

        feedbackIds = await updateAnalysisResults(
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
          undefined, // _ssmlPrompt
          undefined, // _audioPrompt
          analysis.title // title
        )
      }
      
      // Store voice config snapshot on analysis job for historical accuracy
      // CRITICAL: This must run OUTSIDE runLLMFeedback conditional to capture voice config
      // even when feedback is skipped (e.g., mock mode)
      if (voiceConfig) {
        try {
          await updateAnalysisJobVoiceSnapshot(supabase, analysisId, {
            coachGender: voiceConfig.gender,
            coachMode: voiceConfig.mode,
            voiceNameUsed: voiceConfig.voiceName,
            avatarAssetKeyUsed: voiceConfig.avatarAssetKey,
          })
          logger.info('Voice config snapshot stored on analysis job', { 
            analysisId,
            gender: voiceConfig.gender,
            mode: voiceConfig.mode 
          })
        } catch (snapshotError) {
          logger.error('Failed to store voice config snapshot', { 
            error: snapshotError instanceof Error ? snapshotError.message : String(snapshotError),
            analysisId 
          })
          // Don't fail the pipeline for snapshot errors
        }
      }
    }

    // Mark analysis job as analysis_complete NOW - video analysis is done, feedback items are available
    // SSML/Audio phase will be triggered by UPDATE webhook (see /post-analyze endpoint)
    await updateAnalysisStatus(supabase, analysisId, 'analysis_complete', null, 80, logger)
    await notifyAnalysisComplete(analysisId, logger)

    // SSML/Audio processing is triggered by UPDATE webhook when status = 'analysis_complete'
    // See /post-analyze endpoint (handlePostAnalyze.ts)
    logger.info('Video analysis complete, SSML/Audio will be triggered by UPDATE webhook', {
      analysisId,
      feedbackIds: feedbackIds?.length || 0
    })

    return
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error('AI Pipeline failed', { error: errorMessage, stack: errorStack, analysisId, videoPath })
    dbLogger.error('AI Pipeline failed', { error: errorMessage, stack: errorStack, analysisId, videoPath })
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
