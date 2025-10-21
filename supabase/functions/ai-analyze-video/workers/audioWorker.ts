// Audio Worker - Processes audio generation using feedback status tracking

import { storeAudioSegmentForFeedback } from '../../_shared/db/analysis.ts'
import { resolveAudioFormat } from '../../_shared/media/audio.ts'
import { generateAudioStoragePath } from '../../_shared/storage/upload.ts'
import { getTTSServiceForRuntime } from './workers.shared.ts'

interface AudioTask {
  id: number
  audio_status: string
  audio_attempts: number
}

interface SSMLSegment {
  id: number
  feedback_id: number
  segment_index: number
  ssml: string
  provider: string
  version: string
}

interface WorkerContext {
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  feedbackIds?: number[]
  analysisId?: string
}

interface ProcessingResult {
  processedJobs: number
  errors: number
  retriedJobs: number
}

export async function processAudioJobs({ supabase, logger, feedbackIds, analysisId }: WorkerContext): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processedJobs: 0,
    errors: 0,
    retriedJobs: 0
  }

  try {
    let query = supabase
      .from('analysis_feedback')
      .select('id, audio_status, audio_attempts')
      .eq('audio_status', 'queued')

    if (Array.isArray(feedbackIds) && feedbackIds.length > 0) {
      query = query.in('id', feedbackIds)
    }

    if (analysisId) {
      query = query.eq('analysis_id', analysisId)
    }

    const { data: jobs, error: jobsError } = await query.limit(20)

    if (jobsError) {
      logger.error('Failed to fetch audio jobs', { error: jobsError })
      return result
    }

    if (!jobs || jobs.length === 0) {
      logger.info('No audio jobs to process')
      return result
    }

    logger.info(`Processing ${jobs.length} audio jobs`)

    // Process each job
    for (const job of jobs as AudioTask[]) {
      try {
        await processSingleAudioJob(job, supabase, logger)
        result.processedJobs++
      } catch (error) {
        logger.error('Failed to process audio job', { feedbackId: job.id, error })
        result.errors++
        
        await handleJobError(job, error, supabase, logger)
        result.retriedJobs++
      }
    }

    logger.info('Audio job processing completed', result)
    return result

  } catch (error) {
    logger.error('Audio worker failed', { error })
    result.errors++
    return result
  }
}

async function processSingleAudioJob(job: AudioTask, supabase: any, logger: any): Promise<void> {
  logger.info('Processing audio job', { feedbackId: job.id })

  await updateFeedbackAudioStatus(job.id, 'processing', supabase)

  // Fetch video context for semantic path generation
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('analysis_feedback')
    .select(`
      id,
      analysis_id,
      analyses!inner(
        job_id,
        analysis_jobs!inner(
          video_recording_id,
          video_recordings!inner(
            id,
            created_at,
            user_id
          )
        )
      )
    `)
    .eq('id', job.id)
    .single()

  if (feedbackError || !feedbackData) {
    throw new Error(`Failed to fetch video context: ${feedbackError?.message || 'No data'}`)
  }

  const videoRecording = feedbackData.analyses.analysis_jobs.video_recordings
  const videoContext = {
    userId: videoRecording.user_id,
    videoRecordingId: videoRecording.id,
    videoCreatedAt: videoRecording.created_at,
  }

  logger.info('Fetched video context', videoContext)

  const { data: ssmlSegments, error: ssmlError } = await supabase
    .from('analysis_ssml_segments')
    .select('*')
    .eq('feedback_id', job.id)

  if (ssmlError || !ssmlSegments || ssmlSegments.length === 0) {
    throw new Error(`SSML segments not found: ${ssmlError?.message || 'No segments'}`)
  }

  logger.info(`Found ${ssmlSegments.length} SSML segments for feedback ${job.id}`)

  const ttsService = getTTSServiceForRuntime()
  const resolvedFormat = resolveAudioFormat(undefined, 'gemini')

  for (const segment of ssmlSegments as SSMLSegment[]) {
    await processSSMLSegment({
      segment,
      videoContext,
      supabase,
      logger,
      ttsService,
      resolvedFormat,
    })
  }

  await updateFeedbackAudioStatus(job.id, 'completed', supabase)

  logger.info('Audio job completed successfully', { feedbackId: job.id })
}

interface ProcessSegmentContext {
  segment: SSMLSegment
  videoContext: {
    userId: string
    videoRecordingId: number
    videoCreatedAt: string
  }
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  ttsService: ReturnType<typeof getTTSServiceForRuntime>
  resolvedFormat: ReturnType<typeof resolveAudioFormat>
}

async function processSSMLSegment({
  segment,
  videoContext,
  supabase,
  logger,
  ttsService,
  resolvedFormat,
}: ProcessSegmentContext): Promise<void> {
  logger.info('Processing SSML segment', {
    segmentId: segment.id,
    feedbackId: segment.feedback_id,
    segmentIndex: segment.segment_index,
  })

  // Generate semantic storage path using video context
  const storagePath = generateAudioStoragePath(
    videoContext.userId,
    videoContext.videoRecordingId,
    segment.feedback_id,
    segment.segment_index ?? 0,
    videoContext.videoCreatedAt,
    resolvedFormat
  )

  logger.info('Generated semantic audio storage path', { storagePath })

  const ttsResult = await ttsService.synthesize({
    ssml: segment.ssml,
    supabase,
    analysisId: segment.feedback_id,
    storagePath,
    customParams: {
      format: resolvedFormat,
    },
  })

  const segmentId = await storeAudioSegmentForFeedback(
    supabase,
    segment.feedback_id,
    ttsResult.audioUrl,
    {
      durationMs: ttsResult.duration,
      format: ttsResult.format ?? resolvedFormat,
      prompt: ttsResult.promptUsed,
      provider: 'gemini',
      version: segment.version ?? '1.0',
      segmentIndex: segment.segment_index,
      storagePath, // Store semantic path
    },
    logger,
  )

  if (!segmentId) {
    throw new Error('Failed to write audio segment')
  }

  logger.info('Audio segment processed successfully', {
    segmentId,
    audioUrl: ttsResult.audioUrl,
    format: ttsResult.format ?? resolvedFormat,
    duration: ttsResult.duration,
    storagePath,
  })
}

async function _updateJobStatus(jobId: number, status: string, supabase: any): Promise<void> {
  const { error } = await supabase
    .from('audio_jobs')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`)
  }
}

async function updateFeedbackAudioStatus(feedbackId: number, status: string, supabase: any): Promise<void> {
  const { error } = await supabase
    .from('analysis_feedback')
    .update({
      audio_status: status,
      audio_updated_at: new Date().toISOString()
    })
    .eq('id', feedbackId)

  if (error) {
    throw new Error(`Failed to update feedback audio status: ${error.message}`)
  }
}

async function handleJobError(job: AudioTask, error: any, supabase: any, logger: any): Promise<void> {
  const maxAttempts = 3
  const newAttempts = (job.audio_attempts || 0) + 1
  
  if (newAttempts >= maxAttempts) {
    await supabase
      .from('analysis_feedback')
      .update({
        audio_status: 'failed',
        audio_attempts: newAttempts,
        audio_last_error: error.message,
        audio_updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    logger.error('Audio job failed permanently', {
      feedbackId: job.id,
      attempts: newAttempts,
      error: error.message
    })
  } else {
    const { error: updateError } = await supabase
      .from('analysis_feedback')
      .update({
        audio_status: 'queued',
        audio_attempts: newAttempts,
        audio_last_error: error.message,
        audio_updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (updateError) {
      logger.error('Failed to update feedback for retry', { feedbackId: job.id, updateError })
    } else {
      logger.info('Audio job queued for retry', {
        feedbackId: job.id,
        attempts: newAttempts
      })
    }
  }
}
