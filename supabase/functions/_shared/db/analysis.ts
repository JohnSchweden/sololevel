import { getEnvDefaultFormat } from '../media/audio.ts'
import type { AnalysisJob, PoseDetectionResult } from '../types/ai-analyze-video.ts'

export interface AnalysisResults {
  text_feedback: string
  feedback: unknown[]
  summary_text: string
  processing_time: number
  video_source: string
  metrics?: Record<string, unknown>
}

// Create a new analysis job in the database
export async function createAnalysisJob(
  supabase: any,
  userId: string,
  videoRecordingId: number,
  logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<AnalysisJob> {
  logger?.info('Creating analysis job', { userId, videoRecordingId })

  const { data: analysisJob, error: createError } = await supabase
    .from('analysis_jobs')
    .insert({
      user_id: userId,
      video_recording_id: videoRecordingId,
      status: 'queued',
      progress_percentage: 0,
      results: {},
      pose_data: {},
    })
    .select()
    .single()

  if (createError || !analysisJob) {
    logger?.error('Failed to create analysis job', { error: createError, data: analysisJob })
    throw new Error(`Failed to create analysis job: ${createError?.message || 'Unknown error'}`)
  }

  logger?.info('Successfully created analysis job', { jobId: analysisJob.id })
  return analysisJob
}

// Update analysis job status
export async function updateAnalysisStatus(
  supabase: any,
  analysisId: number,
  status: AnalysisJob['status'],
  errorMessage?: string | null,
  progress?: number,
  logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<void> {
  if (!supabase) {
    logger?.error('Database connection not available for status update')
    return
  }

  const updateData: Partial<Pick<AnalysisJob, 'status' | 'progress_percentage' | 'processing_started_at' | 'processing_completed_at' | 'error_message'>> = { status }

  if (progress !== undefined) {
    updateData.progress_percentage = progress
  }

  if (status === 'processing' && !errorMessage) {
    updateData.processing_started_at = new Date().toISOString()
  }

  if (status === 'completed' || status === 'failed') {
    updateData.processing_completed_at = new Date().toISOString()
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  const { error } = await supabase.from('analysis_jobs').update(updateData).eq('id', analysisId)

  if (error) {
    logger?.error('Failed to update analysis status', error)
  }
}

// Update analysis results using new normalized schema
export async function updateAnalysisResults(
  supabase: any,
  analysisId: number,
  results: AnalysisResults,
  _poseData: PoseDetectionResult[] | null,
  processingTimeMs?: number,
  videoSourceType?: string,
  _logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void },
  // New parameters for normalized schema
  rawGeneratedText?: string,
  fullFeedbackJson?: any,
  feedbackPrompt?: string,
  _ssmlPrompt?: string,
  _audioPrompt?: string
): Promise<void> {
  if (!supabase) {
    _logger?.error('Database connection not available for results update')
    return
  }

  // Extract data for new normalized storage
  const fullFeedbackText = results.text_feedback
  const summaryText = results.summary_text
  const feedback = results.feedback || []
  const metrics = results.metrics || {}

  try {
    // Create analysis record using new function
    const { data: analysisIdResult, error: analysisError } = await supabase.rpc('store_analysis_results', {
      p_job_id: analysisId,
      p_full_feedback_text: fullFeedbackText,
      p_summary_text: summaryText,
      p_raw_generated_text: rawGeneratedText,
      p_full_feedback_json: fullFeedbackJson,
      p_feedback_prompt: feedbackPrompt
    })

    if (analysisError) {
      throw analysisError
    }

    _logger?.info('Created analysis record', { analysisId: analysisIdResult, jobId: analysisId })

    // NOTE: SSML and audio data should now be stored via storeAudioSegmentForFeedback()
    // with proper linkage to individual feedback items, not analysis-level storage
    // The old store_analysis_audio_segment RPC is deprecated for new usage

    // Insert feedback items into analysis_feedback table
    if (feedback.length > 0 && analysisIdResult) {
      const feedbackInserts = feedback.map((item: any) => ({
        analysis_id: analysisIdResult, // Now references analyses.id (UUID)
        timestamp_seconds: item.timestamp || item.timestamp_seconds,
        category: item.category,
        message: item.message,
        confidence: item.confidence,
        impact: item.impact
      }))

      const { error: feedbackError } = await supabase
        .from('analysis_feedback')
        .insert(feedbackInserts)

      if (feedbackError) {
        _logger?.error('Failed to insert feedback items', feedbackError)
        // Don't fail the whole operation for feedback errors
      }
    }

    // Insert metrics if provided
    if (Object.keys(metrics).length > 0) {
      const metricInserts = Object.entries(metrics).map(([key, value]) => {
        let metricValue: number
        let unit = 'count'

        if (typeof value === 'number') {
          metricValue = value
        } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
          metricValue = parseFloat(value)
        } else {
          metricValue = 0
        }

        // Determine unit based on key
        if (key.includes('percentage') || key.includes('score')) {
          unit = 'percentage'
        } else if (key.includes('time') || key.includes('duration')) {
          unit = 'seconds'
        } else if (key.includes('angle')) {
          unit = 'degrees'
        } else if (key.includes('distance')) {
          unit = 'pixels'
        }

        return {
          analysis_id: analysisId,
          metric_key: key,
          metric_value: metricValue,
          unit
        }
      })

      const { error: metricsError } = await supabase
        .from('analysis_metrics')
        .insert(metricInserts)
        .onConflictDoUpdate({
          target: ['analysis_id', 'metric_key'],
          set: { metric_value: supabase.raw('excluded.metric_value'), unit: supabase.raw('excluded.unit'), updated_at: supabase.raw('now()') }
        })

      if (metricsError) {
        _logger?.error('Failed to insert metrics', metricsError)
        // Don't fail the whole operation for metrics errors
      }
    }

    // Update job status and processing time
    const { error: jobUpdateError } = await supabase
      .from('analysis_jobs')
      .update({
        processing_time_ms: processingTimeMs,
        video_source_type: videoSourceType,
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)

    if (jobUpdateError) {
      _logger?.error('Failed to update job status', jobUpdateError)
    }

  } catch (error) {
    _logger?.error('Failed to store analysis results in new schema, falling back to legacy', error)

    // Fallback to legacy storage for backward compatibility
    const { error: legacyError } = await supabase.rpc('store_enhanced_analysis_results', {
      analysis_job_id: analysisId,
      p_full_feedback_text: results.text_feedback,
      p_summary_text: results.summary_text,
      p_processing_time_ms: processingTimeMs,
      p_video_source_type: videoSourceType,
      p_feedback: results.feedback || [],
      p_metrics: results.metrics || {}
    })

    if (legacyError) {
      _logger?.error('Legacy fallback also failed', legacyError)
      throw error // Re-throw original error if both fail
    }
  }
}

// Get enhanced analysis data with structured feedback and metrics
export async function getEnhancedAnalysis(
  supabase: any,
  analysisId: string,
  _logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
) {
  try {
    // Use new normalized query function
    const { data: analysisData, error } = await supabase.rpc('get_complete_analysis', {
      job_id: Number.parseInt(analysisId)
    })

    if (!error && analysisData && analysisData.length > 0) {
      const job = analysisData[0]
      return {
        data: {
          id: job.job_status ? parseInt(analysisId) : job.analysis_id,
          status: job.job_status || 'unknown',
          progress: job.job_progress_percentage || 0,
          error: null,
          results: job.audio_segments || [],
          poseData: null,
          fullFeedback: job.full_feedback_text,
          summary: job.summary_text,
          rawGeneratedText: job.raw_generated_text,
          fullFeedbackJson: job.full_feedback_json,
          feedbackPrompt: job.feedback_prompt,
          ssml: job.audio_segments?.[0]?.feedback_ssml,
          audioUrl: job.audio_segments?.[0]?.feedback_audio_url,
          ssmlPrompt: job.audio_segments?.[0]?.ssml_prompt,
          audioPrompt: job.audio_segments?.[0]?.audio_prompt,
          processingTimeMs: null, // Will be in job table
          videoSourceType: null, // Will be in job table
          timestamps: {
            created: null,
            processingStarted: null,
            processingCompleted: null,
          },
          metrics: {}, // Will be queried separately if needed
        },
      }
    }
  } catch (newSchemaError) {
    _logger?.info('New schema query failed, falling back to legacy', newSchemaError)
  }

  // Fallback to legacy enhanced query function
  const { data: analysisData, error } = await supabase.rpc('get_enhanced_analysis_with_feedback', {
    analysis_job_id: Number.parseInt(analysisId)
  })

  if (error || !analysisData || analysisData.length === 0) {
    // Final fallback to basic query
    const { data: analysisJob, error: fallbackError } = await supabase
      .from('analysis_jobs')
      .select(
        'id, status, progress_percentage, error_message, results, pose_data, created_at, processing_started_at, processing_completed_at, full_feedback_text, summary_text, processing_time_ms, video_source_type'
      )
      .eq('id', analysisId)
      .single()

    if (fallbackError || !analysisJob) {
      return { error: 'Analysis not found', status: 404 }
    }

    return {
      data: {
        id: analysisJob.id,
        status: analysisJob.status,
        progress: analysisJob.progress_percentage,
        error: analysisJob.error_message,
        results: analysisJob.results,
        poseData: analysisJob.pose_data,
        fullFeedback: analysisJob.full_feedback_text,
        summary: analysisJob.summary_text,
        processingTimeMs: analysisJob.processing_time_ms,
        videoSourceType: analysisJob.video_source_type,
        timestamps: {
          created: analysisJob.created_at,
          started: analysisJob.processing_started_at,
          completed: analysisJob.processing_completed_at,
        },
      },
    }
  }

  // Transform legacy enhanced data
  const analysis = analysisData[0]
  return {
    data: {
      id: analysis.analysis_id,
      status: analysis.status,
      progress: analysis.progress_percentage,
      error: null,
      results: analysis.feedback,
      poseData: null,
      fullFeedback: analysis.full_feedback_text,
      summary: analysis.summary_text,
      processingTimeMs: analysis.processing_time_ms,
      videoSourceType: analysis.video_source_type,
      timestamps: {
        created: analysis.created_at,
        updated: analysis.updated_at,
      },
      metrics: analysis.metrics,
    },
  }
}

// Find or create a video recording for testing purposes
export async function findOrCreateVideoRecording(
  supabase: any,
  testUserId: string,
  _logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<number> {
  // Try to find an existing video recording for this user
  const { data: recordings } = await supabase
    .from('video_recordings')
    .select('id')
    .eq('user_id', testUserId)
    .limit(1)

  if (recordings && recordings.length > 0) {
    _logger?.info('Found existing video recording', { recordingId: recordings[0].id })
    return recordings[0].id
  }

  // Create a new video recording for testing
  const { data: newRecording, error } = await supabase
    .from('video_recordings')
    .insert({
      user_id: testUserId,
      title: 'Test Recording',
      description: 'Created for testing',
      recording_type: 'uploaded_video',
      status: 'completed'
    })
    .select('id')
    .single()

  if (error || !newRecording) {
    _logger?.error('Failed to create test video recording', error)
    throw new Error('Failed to create test video recording')
  }

  _logger?.info('Created new test video recording', { recordingId: newRecording.id })
  return newRecording.id
}

// Get complete analysis data by job ID (with fallback for auth-restricted RPC)
export async function getCompleteAnalysisByJobId(
  supabase: any,
  jobId: number,
  logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<{ analysisId: string; feedback: any[]; fullFeedbackText: string; summaryText: string } | null> {
  logger?.info('Getting complete analysis by job ID', { jobId })

  try {
    // For Edge Functions, skip RPC and use direct queries (RPC has auth restrictions)
    // TODO: Fix RPC auth context for proper production usage
    logger?.info('Using direct query (RPC auth context issues in Edge Functions)')

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (analysisError || !analysis) {
      logger?.error('Failed to get analysis record', analysisError)
      return null
    }

    // Get feedback items
    const { data: feedback, error: feedbackError } = await supabase
      .from('analysis_feedback')
      .select('*')
      .eq('analysis_id', analysis.id)
      .order('timestamp_seconds', { ascending: true })

    if (feedbackError) {
      logger?.error('Failed to get feedback items', feedbackError)
      return null
    }

    logger?.info('Retrieved complete analysis data via direct query', {
      analysisId: analysis.id,
      feedbackCount: feedback?.length || 0
    })

    return {
      analysisId: analysis.id,
      feedback: feedback || [],
      fullFeedbackText: analysis.full_feedback_text,
      summaryText: analysis.summary_text
    }
  } catch (error) {
    logger?.error('Error getting complete analysis', error)
    return null
  }
}

// Store audio segment for specific feedback item
export async function storeAudioSegmentForFeedback(
  supabase: any,
  analysisId: string,
  feedbackId: number,
  ssml: string,
  audioUrl: string,
  options?: {
    audioDurationMs?: number
    audioFormat?: string
    ssmlPrompt?: string
    audioPrompt?: string
  },
  logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<number | null> {
  logger?.info('Storing audio segment for feedback item', {
    analysisId,
    feedbackId,
    ssmlLength: ssml.length,
    audioUrl
  })

  try {
    const { data: segmentId, error } = await supabase.rpc('store_analysis_audio_segment_for_feedback', {
      p_analysis_id: analysisId,
      p_analysis_feedback_id: feedbackId,
      p_feedback_ssml: ssml,
      p_audio_url: audioUrl,
      p_audio_duration_ms: options?.audioDurationMs || null,
      p_audio_format: options?.audioFormat || getEnvDefaultFormat(),
      p_ssml_prompt: options?.ssmlPrompt || null,
      p_audio_prompt: options?.audioPrompt || null
    })

    if (error) {
      logger?.error('Failed to store audio segment', error)
      return null
    }

    logger?.info('Successfully stored audio segment', { segmentId, feedbackId })
    return segmentId
  } catch (error) {
    logger?.error('Error storing audio segment', error)
    return null
  }
}
