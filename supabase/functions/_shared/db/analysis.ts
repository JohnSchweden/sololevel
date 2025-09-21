import type { AnalysisJob, PoseDetectionResult } from '../types/ai-analyze-video.ts'

export interface AnalysisResults {
  text_report: string
  feedback: unknown[]
  summary_text: string
  ssml: string
  audio_url: string
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

// Update analysis results using enhanced storage function with fallback
export async function updateAnalysisResults(
  supabase: any,
  analysisId: number,
  results: AnalysisResults,
  poseData: PoseDetectionResult[] | null,
  processingTimeMs?: number,
  videoSourceType?: string,
  _logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
): Promise<void> {
  if (!supabase) {
    _logger?.error('Database connection not available for results update')
    return
  }

  // Extract data for enhanced storage
  const fullReportText = results.text_report
  const summaryText = results.summary_text
  const ssml = results.ssml
  const audioUrl = results.audio_url
  const feedback = results.feedback || []
  const metrics = results.metrics || {}

  // Use enhanced storage function with fallback
  const { error } = await supabase.rpc('store_enhanced_analysis_results', {
    analysis_job_id: analysisId,
    p_full_report_text: fullReportText,
    p_summary_text: summaryText,
    p_ssml: ssml,
    p_audio_url: audioUrl,
    p_processing_time_ms: processingTimeMs,
    p_video_source_type: videoSourceType,
    p_feedback: feedback,
    p_metrics: metrics
  })

  if (error) {
    _logger?.error('Failed to update enhanced analysis results, falling back to basic update', error)
    // Fallback to basic update if enhanced function fails
    await supabase
      .from('analysis_jobs')
      .update({
        results,
        pose_data: poseData,
        full_report_text: fullReportText,
        summary_text: summaryText,
        ssml: ssml,
        audio_url: audioUrl,
        processing_time_ms: processingTimeMs,
        video_source_type: videoSourceType,
      })
      .eq('id', analysisId)
  }
}

// Get enhanced analysis data with structured feedback and metrics
export async function getEnhancedAnalysis(
  supabase: any,
  analysisId: string,
  _logger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
) {
  // Use enhanced query function to get structured feedback and metrics
  const { data: analysisData, error } = await supabase.rpc('get_enhanced_analysis_with_feedback', {
    analysis_job_id: Number.parseInt(analysisId)
  })

  if (error || !analysisData || analysisData.length === 0) {
    // Fallback to basic query if enhanced function fails
    const { data: analysisJob, error: fallbackError } = await supabase
      .from('analysis_jobs')
      .select(
        'id, status, progress_percentage, error_message, results, pose_data, created_at, processing_started_at, processing_completed_at, full_report_text, summary_text, ssml, audio_url, processing_time_ms, video_source_type'
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
        fullReport: analysisJob.full_report_text,
        summary: analysisJob.summary_text,
        ssml: analysisJob.ssml,
        audioUrl: analysisJob.audio_url,
        processingTimeMs: analysisJob.processing_time_ms,
        videoSourceType: analysisJob.video_source_type,
        timestamps: {
          created: analysisJob.created_at,
          started: analysisJob.processing_started_at,
          completed: analysisJob.processing_completed_at,
        },
      }
    }
  }

  // Return enhanced data with structured feedback and metrics
  const analysis = analysisData[0]
  return {
    data: {
      id: analysis.analysis_id,
      status: analysis.status,
      progress: analysis.progress_percentage,
      error: null, // Would need to query separately if needed
      results: analysis.metrics, // Legacy compatibility
      poseData: null, // Would need to query separately if needed
      fullReport: analysis.full_report_text,
      summary: analysis.summary_text,
      ssml: analysis.ssml,
      audioUrl: analysis.audio_url,
      processingTimeMs: analysis.processing_time_ms,
      videoSourceType: analysis.video_source_type,
      feedback: analysis.feedback,
      metrics: analysis.metrics,
      timestamps: {
        created: analysis.created_at,
        updated: analysis.updated_at,
      },
    }
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
