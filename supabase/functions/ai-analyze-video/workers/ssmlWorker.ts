// SSML Worker - Processes SSML generation based on feedback statuses

import { storeSSMLSegmentForFeedback } from '../../_shared/db/analysis.ts'
import { getUserVoicePreferences, getVoiceConfig } from '../../_shared/db/voiceConfig.ts'
import { processAudioJobs as _processAudioJobs } from './audioWorker.ts'
import { getSSMLServiceForRuntime } from './workers.shared.ts'

interface SSMLTask {
  id: number
  message: string
  category: string
  timestamp_seconds: number
  confidence: number
  ssml_status: string
  ssml_attempts: number
  analysis_id: string // UUID referencing analyses.id
}

interface WorkerContext {
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  feedbackIds?: number[]
  analysisId?: string
}

interface ProcessingResult {
  processedJobs: number
  enqueuedAudioJobs: number
  errors: number
  retriedJobs: number
}

export async function processSSMLJobs({ supabase, logger, feedbackIds, analysisId }: WorkerContext): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processedJobs: 0,
    enqueuedAudioJobs: 0,
    errors: 0,
    retriedJobs: 0
  }

  try {
    let query = supabase
      .from('analysis_feedback')
      .select('id, message, category, timestamp_seconds, confidence, ssml_status, ssml_attempts, analysis_id')
      .eq('ssml_status', 'queued')

    if (Array.isArray(feedbackIds) && feedbackIds.length > 0) {
      query = query.in('id', feedbackIds)
    }

    if (analysisId) {
      query = query.eq('analysis_id', analysisId)
    }

    const { data: jobs, error: jobsError } = await query.limit(20)

    if (jobsError) {
      logger.error('Failed to fetch SSML jobs', { error: jobsError })
      return result
    }

    if (!jobs || jobs.length === 0) {
      logger.info('No SSML jobs to process')
      return result
    }

    logger.info(`Processing ${jobs.length} SSML jobs`)

    // Process each job
    for (const job of jobs as SSMLTask[]) {
      try {
        await processSingleSSMLJob(job, supabase, logger)
        result.processedJobs++
      } catch (error) {
        logger.error('Failed to process SSML job', { feedbackId: job.id, error })
        result.errors++
        
        await handleJobError(job, error, supabase, logger)
        result.retriedJobs++
      }
    }

    logger.info('SSML job processing completed', result)
    return result

  } catch (error) {
    logger.error('SSML worker failed', { error })
    result.errors++
    return result
  }
}

async function processSingleSSMLJob(job: SSMLTask, supabase: any, logger: any): Promise<void> {
  logger.info('Processing SSML job', { feedbackId: job.id, analysisId: job.analysis_id })

  await updateFeedbackSSMLStatus(job.id, 'processing', supabase)

  // Fetch voice config from analysis_jobs via analyses table
  // analysis_feedback.analysis_id → analyses.id (UUID) → analyses.job_id → analysis_jobs.id (bigint)
  let ssmlSystemInstruction: string | undefined
  try {
    // First get the analyses row to find the job_id
    const { data: analysis } = await supabase
      .from('analyses')
      .select('job_id')
      .eq('id', job.analysis_id)
      .single()

    if (!analysis?.job_id) {
      logger.warn('No analyses row found for analysis_id', { feedbackId: job.id, analysisId: job.analysis_id })
    }

    // Then get the analysis_jobs row using the job_id
    const { data: analysisJob } = analysis?.job_id ? await supabase
      .from('analysis_jobs')
      .select('user_id, coach_gender, coach_mode')
      .eq('id', analysis.job_id)
      .single() : { data: null }

    if (analysisJob) {
      // If analysis has voice snapshot, use it directly
      if (analysisJob.coach_gender && analysisJob.coach_mode) {
        const voiceConfig = await getVoiceConfig(
          supabase,
          analysisJob.coach_gender,
          analysisJob.coach_mode
        )
        ssmlSystemInstruction = voiceConfig.ssmlSystemInstruction
        logger.info('Using voice config from analysis snapshot', { 
          feedbackId: job.id,
          gender: analysisJob.coach_gender,
          mode: analysisJob.coach_mode
        })
      } else if (analysisJob.user_id) {
        // Fallback: fetch from user preferences
        const userPrefs = await getUserVoicePreferences(supabase, analysisJob.user_id)
        const voiceConfig = await getVoiceConfig(supabase, userPrefs.coachGender, userPrefs.coachMode)
        ssmlSystemInstruction = voiceConfig.ssmlSystemInstruction
        logger.info('Using voice config from user preferences', { 
          feedbackId: job.id,
          gender: userPrefs.coachGender,
          mode: userPrefs.coachMode
        })
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch voice config, using default', { feedbackId: job.id, error })
    // Continue without custom instruction - will use default
  }

  const ssmlService = getSSMLServiceForRuntime()
  const { ssml, promptUsed } = await ssmlService.generate({
    analysisResult: {
      textReport: job.message,
      feedback: [
        {
          timestamp: Number.isFinite(job.timestamp_seconds) ? job.timestamp_seconds : 0,
          category: job.category ?? 'General',
          message: job.message,
          confidence: typeof job.confidence === 'number' ? job.confidence : 0.75,
          impact: 0.5,
        },
      ],
      metrics: {},
      confidence: typeof job.confidence === 'number' ? job.confidence : 0.75,
    },
    customParams: {
      ssmlSystemInstruction
    }
  })

  const segmentId = await storeSSMLSegmentForFeedback(
    supabase,
    job.id,
    ssml,
    {
      provider: 'gemini',
      version: '1.0',
      segmentIndex: 0,
      ssmlPrompt: promptUsed ?? null,
    }
  )

  if (!segmentId) {
    throw new Error('Failed to write SSML segment: insert failed')
  }

  await updateFeedbackSSMLStatus(job.id, 'completed', supabase)
  await advanceAudioStatus(job.id, supabase)

  logger.info('SSML job completed successfully', { feedbackId: job.id })
}

async function updateFeedbackSSMLStatus(feedbackId: number, status: string, supabase: any): Promise<void> {
  const fields: Record<string, any> = {
    ssml_status: status,
    ssml_updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('analysis_feedback')
    .update(fields)
    .eq('id', feedbackId)

  if (error) {
    throw new Error(`Failed to update feedback SSML status: ${error.message}`)
  }
}

async function advanceAudioStatus(feedbackId: number, supabase: any): Promise<void> {
  const { error } = await supabase
    .from('analysis_feedback')
    .update({
      audio_status: 'queued',
      audio_attempts: 0,
      audio_last_error: null,
      audio_updated_at: new Date().toISOString()
    })
    .eq('id', feedbackId)

  if (error) {
    throw new Error(`Failed to queue audio processing: ${error.message}`)
  }
}

async function handleJobError(job: SSMLTask, error: any, supabase: any, logger: any): Promise<void> {
  const maxAttempts = 3
  const newAttempts = (job.ssml_attempts || 0) + 1

  if (newAttempts >= maxAttempts) {
    await supabase
      .from('analysis_feedback')
      .update({
        ssml_status: 'failed',
        ssml_attempts: newAttempts,
        ssml_last_error: error.message,
        ssml_updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    logger.error('SSML job failed permanently', {
      feedbackId: job.id,
      attempts: newAttempts,
      error: error.message
    })
  } else {
    const { error: updateError } = await supabase
      .from('analysis_feedback')
      .update({
        ssml_status: 'queued',
        ssml_attempts: newAttempts,
        ssml_last_error: error.message,
        ssml_updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (updateError) {
      logger.error('Failed to update feedback for retry', { feedbackId: job.id, updateError })
    } else {
      logger.info('SSML job queued for retry', {
        feedbackId: job.id,
        attempts: newAttempts
      })
    }
  }
}
