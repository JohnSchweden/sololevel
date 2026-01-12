// Audio Worker - Processes audio generation using feedback status tracking

import { storeAudioSegmentForFeedback } from '../../_shared/db/analysis.ts'
import {
  type CoachGender,
  type CoachMode,
  getUserVoicePreferences,
  getVoiceConfig,
  updateAnalysisJobVoiceSnapshot,
} from '../../_shared/db/voiceConfig.ts'
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

export async function processAudioJobs({ 
  supabase, 
  logger, 
  feedbackIds, 
  analysisId 
}: WorkerContext): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processedJobs: 0,
    errors: 0,
    retriedJobs: 0
  }

  try {
    const jobs = await fetchAudioJobs(supabase, feedbackIds, analysisId)

    if (!jobs || jobs.length === 0) {
      logger.info('No audio jobs to process')
      return result
    }

    logger.info(`Processing ${jobs.length} audio jobs`)

    for (const job of jobs) {
      const jobResult = await processJobWithRetry(job, supabase, logger)
      
      result.processedJobs += jobResult.success ? 1 : 0
      result.errors += jobResult.success ? 0 : 1
      result.retriedJobs += jobResult.retryCount
    }

    logger.info('Audio job processing completed', result)
    return result

  } catch (error) {
    logger.error('Audio worker failed', { error })
    result.errors++
    return result
  }
}

async function fetchAudioJobs(
  supabase: any,
  feedbackIds?: number[],
  analysisId?: string
): Promise<AudioTask[] | null> {
  let query = supabase
    .from('analysis_feedback')
    .select('id, audio_status, audio_attempts')
    .in('audio_status', ['queued', 'retrying'])

  if (Array.isArray(feedbackIds) && feedbackIds.length > 0) {
    query = query.in('id', feedbackIds)
  }

  if (analysisId) {
    query = query.eq('analysis_id', analysisId)
  }

  const { data: jobs, error } = await query.limit(20)

  if (error) {
    throw new Error(`Failed to fetch audio jobs: ${error.message}`)
  }

  return jobs as AudioTask[] | null
}

async function processSingleAudioJob(
  job: AudioTask, 
  supabase: any, 
  logger: any
): Promise<void> {
  logger.info('Processing audio job', { feedbackId: job.id })

  await updateFeedbackAudioStatus(job.id, 'processing', supabase)

  const videoContext = await fetchVideoContext(job.id, supabase, logger)
  const voiceConfig = await fetchVoiceConfig(videoContext.userId, supabase, logger)
  
  await storeVoiceSnapshot(videoContext.jobId, voiceConfig, supabase, logger)

  const ssmlSegments = await fetchSSMLSegments(job.id, supabase)
  
  logger.info(`Found ${ssmlSegments.length} SSML segments for feedback ${job.id}`)

  const ttsService = getTTSServiceForRuntime()
  const resolvedFormat = resolveAudioFormat(undefined, 'gemini')

  for (const segment of ssmlSegments) {
    await processSSMLSegment({
      segment,
      videoContext,
      voiceName: voiceConfig.voiceName,
      ttsSystemInstruction: voiceConfig.ttsSystemInstruction,
      supabase,
      logger,
      ttsService,
      resolvedFormat,
    })
  }

  await updateFeedbackAudioStatus(job.id, 'completed', supabase)

  logger.info('Audio job completed successfully', { feedbackId: job.id })
}

async function fetchVideoContext(feedbackId: number, supabase: any, logger: any) {
  const { data: feedbackData, error } = await supabase
    .from('analysis_feedback')
    .select(`
      id,
      analysis_id,
      analyses!inner(
        job_id,
        analysis_jobs!inner(
          id,
          video_recording_id,
          video_recordings!inner(
            id,
            created_at,
            user_id
          )
        )
      )
    `)
    .eq('id', feedbackId)
    .single()

  if (error || !feedbackData) {
    throw new Error(`Failed to fetch video context: ${error?.message || 'No data'}`)
  }

  const analysisJob = feedbackData.analyses.analysis_jobs
  const videoRecording = analysisJob.video_recordings
  
  const context = {
    userId: videoRecording.user_id,
    videoRecordingId: videoRecording.id,
    videoCreatedAt: videoRecording.created_at,
    jobId: analysisJob.id,
  }

  logger.info('Fetched video context', context)
  
  return context
}

async function fetchVoiceConfig(userId: string, supabase: any, logger: any) {
  const prefs = await getUserVoicePreferences(supabase, userId)
  logger.info('Fetched voice preferences', { userId, prefs })

  const config = await getVoiceConfig(supabase, prefs.coachGender, prefs.coachMode)
  
  const truncatedInstruction = config.ttsSystemInstruction 
    ? config.ttsSystemInstruction.substring(0, 50) + '...'
    : '(empty)'

  logger.info('Resolved voice config', {
    voiceName: config.voiceName,
    ttsSystemInstruction: truncatedInstruction,
    gender: prefs.coachGender,
    mode: prefs.coachMode,
  })

  return {
    voiceName: config.voiceName,
    ttsSystemInstruction: config.ttsSystemInstruction,
    avatarAssetKey: config.avatarAssetKey,
    coachGender: prefs.coachGender,
    coachMode: prefs.coachMode,
  }
}

async function storeVoiceSnapshot(
  jobId: number,
  voiceConfig: {
    voiceName: string
    avatarAssetKey: string
    coachGender: CoachGender
    coachMode: CoachMode
  },
  supabase: any,
  logger: any
): Promise<void> {
  await updateAnalysisJobVoiceSnapshot(supabase, jobId, {
    coachGender: voiceConfig.coachGender,
    coachMode: voiceConfig.coachMode,
    voiceNameUsed: voiceConfig.voiceName,
    avatarAssetKeyUsed: voiceConfig.avatarAssetKey,
  })
  
  logger.info('Voice snapshot stored on analysis_jobs', { jobId })
}

async function fetchSSMLSegments(feedbackId: number, supabase: any): Promise<SSMLSegment[]> {
  const { data: ssmlSegments, error } = await supabase
    .from('analysis_ssml_segments')
    .select('*')
    .eq('feedback_id', feedbackId)

  if (error || !ssmlSegments || ssmlSegments.length === 0) {
    throw new Error(`SSML segments not found: ${error?.message || 'No segments'}`)
  }

  return ssmlSegments as SSMLSegment[]
}

interface ProcessSegmentContext {
  segment: SSMLSegment
  videoContext: {
    userId: string
    videoRecordingId: number
    videoCreatedAt: string
    jobId: number
  }
  voiceName: string
  ttsSystemInstruction: string
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
  ttsService: ReturnType<typeof getTTSServiceForRuntime>
  resolvedFormat: ReturnType<typeof resolveAudioFormat>
}

async function processSSMLSegment(context: ProcessSegmentContext): Promise<void> {
  const { segment, videoContext, voiceName, ttsSystemInstruction, supabase, logger, ttsService, resolvedFormat } = context
  
  const truncatedInstruction = ttsSystemInstruction 
    ? ttsSystemInstruction.substring(0, 50) + '...'
    : '(empty)'

  logger.info('Processing SSML segment', {
    segmentId: segment.id,
    feedbackId: segment.feedback_id,
    segmentIndex: segment.segment_index,
    voiceName,
    ttsSystemInstruction: truncatedInstruction,
  })

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
      voice: voiceName,
      format: resolvedFormat,
      ttsSystemInstruction,
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
      storagePath,
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

async function updateFeedbackAudioStatus(
  feedbackId: number, 
  status: string, 
  supabase: any
): Promise<void> {
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

interface RetryResult {
  success: boolean
  retryCount: number
}

/**
 * Process a single audio job with inline retry.
 * Retries up to MAX_ATTEMPTS with exponential backoff within the same invocation.
 * This ensures retries actually happen (vs. orphaned 'retrying' status).
 */
async function processJobWithRetry(
  job: AudioTask,
  supabase: any,
  logger: any
): Promise<RetryResult> {
  const MAX_ATTEMPTS = 3
  let attempt = job.audio_attempts || 0
  let lastError: Error | null = null

  while (attempt < MAX_ATTEMPTS) {
    attempt++
    
    try {
      if (attempt > 1) {
        await updateRetryStatus(job.id, attempt, supabase)
      }

      await processSingleAudioJob(job, supabase, logger)
      
      logger.info('Audio job completed', { feedbackId: job.id, attempt })
      return { success: true, retryCount: attempt - 1 }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logger.error('Audio job attempt failed', {
        feedbackId: job.id,
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        error: lastError.message,
        stack: lastError.stack
      })

      if (attempt < MAX_ATTEMPTS) {
        await applyExponentialBackoff(job.id, attempt, logger)
      }
    }
  }

  await markJobAsFailed(job.id, attempt, lastError, supabase, logger)

  return { success: false, retryCount: attempt - 1 }
}

async function updateRetryStatus(
  jobId: number, 
  attempt: number, 
  supabase: any
): Promise<void> {
  await supabase
    .from('analysis_feedback')
    .update({
      audio_status: 'retrying',
      audio_attempts: attempt,
      audio_updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

async function applyExponentialBackoff(
  jobId: number,
  attempt: number,
  logger: any
): Promise<void> {
  const backoffMs = Math.pow(2, attempt - 1) * 1000
  
  logger.info('Retrying audio job after backoff', {
    feedbackId: jobId,
    attempt,
    nextAttempt: attempt + 1,
    backoffMs
  })
  
  await new Promise(resolve => setTimeout(resolve, backoffMs))
}

async function markJobAsFailed(
  jobId: number,
  attempts: number,
  error: Error | null,
  supabase: any,
  logger: any
): Promise<void> {
  await supabase
    .from('analysis_feedback')
    .update({
      audio_status: 'failed',
      audio_attempts: attempts,
      audio_last_error: error?.message ?? 'Unknown error',
      audio_updated_at: new Date().toISOString()
    })
    .eq('id', jobId)

  logger.error('Audio job failed permanently after all retries', {
    feedbackId: jobId,
    attempts,
    error: error?.message
  })
}
