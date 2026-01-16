import { buildPromptFromConfig } from '../../ai-analyze-video/prompts-local.ts'
import { processAudioJobs as _processAudioJobs } from '../../ai-analyze-video/workers/audioWorker.ts'
import { processSSMLJobs } from '../../ai-analyze-video/workers/ssmlWorker.ts'
import { type AnalysisResults, updateAnalysisResults, updateAnalysisStatus } from '../db/analysis.ts'
import { getUserVoicePreferences, getVoiceConfig, updateAnalysisJobVoiceSnapshot } from '../db/voiceConfig.ts'
import { notifyAnalysisComplete } from '../notifications.ts'
import {
  ISSMLService,
  ITTSService,
  IVideoAnalysisService,
  type VideoAnalysisContext,
  type SSMLContext as _SSMLContext,
  type TTSContext as _TTSContext,
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
    dbLogger.info('AI pipeline started', {
      videoPath,
      videoSource,
      analysisId,
      stages
    })

    // Update status to processing (idempotent - only if still queued)
    // Note: handleWebhookStart may have already set this, so we check current status first
    const { data: currentJob } = await supabase
      .from('analysis_jobs')
      .select('status')
      .eq('id', analysisId)
      .single()

    if (currentJob?.status === 'queued') {
      logger.info(`Updating analysis status to processing for job ${analysisId}`)
      await updateAnalysisStatus(supabase, analysisId, 'processing', null, 10, logger)
      logger.info(`Successfully updated status to processing for job ${analysisId}`)
    } else {
      logger.info(`Analysis job ${analysisId} already in status: ${currentJob?.status}, skipping status update`)
    }

    // 1. Fetch user voice preferences and build custom prompt
    let customPrompt: string | undefined
    let voiceConfig: Awaited<ReturnType<typeof getVoiceConfig>> | undefined
    
    try {
      logger.info('Fetching user voice preferences', { userId, analysisId })
      const prefs = await getUserVoicePreferences(supabase, userId)
      logger.info('User preferences fetched', { userId, prefs })
      
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

      try {
        logger.info('Starting video analysis service call...')
        const videoAnalysisLogger = dbLogger.child('video-analysis')
        videoAnalysisLogger.info('Starting video analysis service call', {
          videoPath,
          analysisId
        })
        analysis = await services.videoAnalysis.analyze({
          supabase,
          videoPath,
          analysisParams: timingParams,
          customPrompt, // Pass custom prompt with injected voice config
          progressCallback: async (progress: number) => {
            logger.info(`Progress update: ${progress}% for analysis ${analysisId}`)
            videoAnalysisLogger.info(`Progress update: ${progress}%`, { analysisId, progress })
            await updateAnalysisStatus(supabase, analysisId, 'processing', null, progress, logger)
          },
          dbLogger: videoAnalysisLogger // Pass child logger to video analysis service
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

    // Mark analysis job completed NOW - video analysis is done, feedback items are available
    // SSML/audio will continue processing in background (don't block completion)
    await updateAnalysisStatus(supabase, analysisId, 'completed', null, 100, logger)
    await notifyAnalysisComplete(analysisId, logger)

    // 4. Kick SSML worker (conditional) and then audio worker for newly created feedback items
    // Process asynchronously in background - don't block job completion
    if (Array.isArray(feedbackIds) && feedbackIds.length > 0) {
      if (stages.runSSML) {
        // Fire and forget - SSML/audio processing continues in background
        // Errors are logged but don't fail the completed job (SSML/audio errors are per-feedback)
        const ssmlLogger = dbLogger.child('ssml-worker')
        processSSMLJobs({ supabase, logger: ssmlLogger, feedbackIds, analysisId: analysis?.id })
          .then(async (ssmlResult) => {
            if (ssmlResult.errors === 0 && stages.runTTS) {
              // Properly handle audio processing errors - don't use void
              // Pass startTime to track timeout from pipeline start
              try {
                const audioLogger = dbLogger.child('audio-worker')
                await _processAudioJobs({ 
                  supabase, 
                  logger: audioLogger, 
                  feedbackIds,
                  analysisId: analysis?.id,
                  startTime  // Use original pipeline start time for timeout tracking
                })
              } catch (audioError) {
                logger.error('Audio processing failed', {
                  error: audioError instanceof Error ? audioError.message : String(audioError),
                  stack: audioError instanceof Error ? audioError.stack : undefined,
                  feedbackIds
                })
                await markFeedbackAudioFailed(supabase, feedbackIds, audioError, logger)
              }
            } else if (ssmlResult.errors > 0) {
              logger.info('Skipping audio generation due to SSML errors', {
                feedbackIds,
                errors: ssmlResult.errors,
                processed: ssmlResult.processedJobs
              })
            } else if (!stages.runTTS) {
              logger.info('Skipping audio generation (TTS stage disabled)', {
                feedbackIds,
                ssmlProcessed: ssmlResult.processedJobs
              })
            }
          })
          .catch(async (error) => {
            logger.error('Background SSML/audio processing failed', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              feedbackIds,
              analysisId: analysis?.id
            })
            
            // CRITICAL FIX: Mark all feedback items as failed so clients show proper error state
            // Without this, users see "processing" spinner forever when SSML/audio crashes
            // Individual worker errors are already handled per-feedback with retry logic
            // This catch handles catastrophic failures (e.g., worker import crash, OOM)
            try {
              const errorMessage = error instanceof Error ? error.message : String(error)
              const { error: updateError } = await supabase
                .from('analysis_feedback')
                .update({
                  ssml_status: 'failed',
                  audio_status: 'failed',
                  ssml_last_error: errorMessage,
                  audio_last_error: errorMessage,
                  ssml_updated_at: new Date().toISOString(),
                  audio_updated_at: new Date().toISOString()
                })
                .in('id', feedbackIds)
              
              if (updateError) {
                logger.error('Failed to mark feedback items as failed', {
                  updateError: updateError.message,
                  feedbackIds
                })
              } else {
                logger.info('Marked feedback items as failed after catastrophic worker error', {
                  feedbackIds,
                  count: feedbackIds.length
                })
              }
            } catch (updateErr) {
              // Don't throw - this is a best-effort cleanup
              logger.error('Error updating feedback failure status', {
                updateErr: updateErr instanceof Error ? updateErr.message : String(updateErr)
              })
            }
            // Don't fail the completed job - SSML/audio errors are per-feedback
            // Errors are logged for monitoring/debugging but don't propagate
          })
      } else {
        logger.info('Skipping SSML generation (SSML stage disabled)', {
          feedbackIds
        })
      }
    }

    return
  } catch (error) {
    logger.error('AI Pipeline failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId,
      videoPath
    })
    dbLogger.error('AI Pipeline failed', {
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

/**
 * Mark feedback items' audio status as failed
 * Used when audio processing fails catastrophically (e.g., unhandled promise rejection)
 */
async function markFeedbackAudioFailed(
  supabase: any,
  feedbackIds: number[],
  error: unknown,
  logger: { error: (msg: string, data?: any) => void; info: (msg: string, data?: any) => void }
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const { error: updateError } = await supabase
      .from('analysis_feedback')
      .update({
        audio_status: 'failed',
        audio_last_error: errorMessage,
        audio_updated_at: new Date().toISOString()
      })
      .in('id', feedbackIds)
    
    if (updateError) {
      logger.error('Failed to mark feedback audio as failed', {
        updateError: updateError.message,
        feedbackIds
      })
    } else {
      logger.info('Marked feedback audio as failed after error', {
        feedbackIds,
        count: feedbackIds.length,
        error: errorMessage
      })
    }
  } catch (updateErr) {
    // Don't throw - this is a best-effort cleanup
    logger.error('Error updating feedback audio failure status', {
      updateErr: updateErr instanceof Error ? updateErr.message : String(updateErr)
    })
  }
}
