// Audio Worker - Processes audio generation using feedback status tracking

import { storeAudioSegmentForFeedback } from '../../_shared/db/analysis.ts'

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

  const { data: ssmlSegments, error: ssmlError } = await supabase
    .from('analysis_ssml_segments')
    .select('*')
    .eq('feedback_id', job.id)

  if (ssmlError || !ssmlSegments || ssmlSegments.length === 0) {
    throw new Error(`SSML segments not found: ${ssmlError?.message || 'No segments'}`)
  }

  logger.info(`Found ${ssmlSegments.length} SSML segments for feedback ${job.id}`)

  for (const segment of ssmlSegments) {
    await processSSMLSegment(segment, supabase, logger)
  }

  await updateFeedbackAudioStatus(job.id, 'completed', supabase)

  logger.info('Audio job completed successfully', { feedbackId: job.id })
}

async function processSSMLSegment(segment: SSMLSegment, supabase: any, logger: any): Promise<void> {
  logger.info('Processing SSML segment', { 
    segmentId: segment.id, 
    feedbackId: segment.feedback_id, 
    segmentIndex: segment.segment_index 
  })

  // Generate audio from SSML (mock implementation)
  const audioData = generateAudioFromSSML(segment.ssml, logger)

  // Upload audio to storage
  const audioPath = `audio/feedback_${segment.feedback_id}_segment_${segment.segment_index}.aac`
  const { data: _uploadData, error: uploadError } = await supabase.storage
    .from('processed')
    .upload(audioPath, audioData.buffer)

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`)
  }

  // Get the public URL for the uploaded audio
  const audioUrl = `processed/${audioPath}`

  const segmentId = await storeAudioSegmentForFeedback(supabase, segment.feedback_id, audioUrl, {
    audioDurationMs: audioData.durationMs,
    audioFormat: audioData.format,
    provider: 'gemini',
    version: '1.0',
    segmentIndex: segment.segment_index,
  })

  if (!segmentId) {
    throw new Error('Failed to write audio segment')
  }

  logger.info('Audio segment processed successfully', {
    segmentId,
    audioUrl,
    format: audioData.format,
    duration: audioData.durationMs,
  })
}

function generateAudioFromSSML(ssml: string, logger: any): {
  buffer: ArrayBuffer
  format: string
  durationMs: number
} {
  // Mock audio generation - in production this would use Gemini TTS
  logger.info('Generating audio from SSML', { ssmlLength: ssml.length })
  
  // Create a mock audio buffer (empty AAC file header)
  const mockAudioData = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // Mock AAC header
    0x4D, 0x34, 0x41, 0x20, 0x00, 0x00, 0x00, 0x00,
    0x4D, 0x34, 0x41, 0x20, 0x6D, 0x70, 0x34, 0x31
  ])

  // Estimate duration based on SSML content (rough approximation)
  const textLength = ssml.replace(/<[^>]*>/g, '').length
  const estimatedDurationMs = Math.max(1000, textLength * 100) // ~100ms per character

  return {
    buffer: mockAudioData.buffer,
    format: 'aac',
    durationMs: estimatedDurationMs
  }
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
