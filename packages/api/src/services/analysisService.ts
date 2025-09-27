import type { Tables, TablesInsert, TablesUpdate } from '../../types/database'
import { supabase } from '../supabase'
import { validatePoseData } from '../validation/cameraRecordingSchemas'

// Simple logger to avoid @my/ui dependency
const log = {
  debug: (_message: string, ..._args: unknown[]) => {
    // No-op in backend service
  },
  info: (_message: string, ..._args: unknown[]) => {
    // No-op in backend service
  },
  warn: (_message: string, ..._args: unknown[]) => {
    // No-op in backend service
  },
  error: (_message: string, ..._args: unknown[]) => {
    // No-op in backend service
  },
}

export type AnalysisJob = Tables<'analysis_jobs'>
export type AnalysisJobInsert = TablesInsert<'analysis_jobs'>
export type AnalysisJobUpdate = TablesUpdate<'analysis_jobs'>

export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface AnalysisResults {
  pose_analysis?: {
    keypoints: Array<{
      x: number
      y: number
      confidence: number
      name: string
    }>
    confidence_score: number
    frame_count: number
  }
  movement_analysis?: {
    total_movement: number
    movement_quality: number
    stability_score: number
  }
  recommendations?: Array<{
    type: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }>
}

// TRD-compliant analysis result structure
export interface TRDAnalysisResult {
  summary_text?: string
  metrics?: Record<
    string,
    {
      value: number
      unit: string
    }
  >
}

export interface AnalysisMetric {
  metric_key: string
  metric_value: number
  unit: string
}

export interface PoseData {
  frames: Array<{
    timestamp: number
    keypoints: Array<{
      x: number
      y: number
      confidence: number
      name: string
    }>
  }>
  metadata: {
    fps: number
    duration: number
    total_frames: number
  }
}

/**
 * Create analysis job for a video recording
 */
export async function createAnalysisJob(videoRecordingId: number): Promise<AnalysisJob> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .insert({
      user_id: user.data.user.id,
      video_recording_id: videoRecordingId,
      status: 'queued',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create analysis job: ${error.message}`)
  }

  return job
}

/**
 * Create analysis job with pose data processing for uploaded videos
 */
export async function createAnalysisJobWithPoseProcessing(
  videoRecordingId: number
): Promise<AnalysisJob> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  // Create analysis job
  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .insert({
      user_id: user.data.user.id,
      video_recording_id: videoRecordingId,
      status: 'queued',
      video_source: 'uploaded_video',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create analysis job: ${error.message}`)
  }

  // Start pose processing in background (this would be called from the client)
  // The actual pose processing happens on the client side and the results
  // are saved to the pose_data field via updateAnalysisJobWithPoseData

  return job
}

/**
 * Update analysis job with processed pose data
 */
export async function updateAnalysisJobWithPoseData(
  id: number,
  poseData: PoseData
): Promise<AnalysisJob> {
  const updates: AnalysisJobUpdate = {
    pose_data: JSON.parse(JSON.stringify(poseData)),
  }

  return updateAnalysisJob(id, updates)
}

/**
 * Get analysis job by ID
 */
export async function getAnalysisJob(id: number): Promise<AnalysisJob | null> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.data.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch analysis job: ${error.message}`)
  }

  return job
}

/**
 * Get analysis job by video recording ID
 */
export async function getAnalysisJobByVideoId(
  videoRecordingId: number
): Promise<AnalysisJob | null> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('video_recording_id', videoRecordingId)
    .eq('user_id', user.data.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch analysis job: ${error.message}`)
  }

  return job
}

/**
 * Get user's analysis jobs
 */
export async function getUserAnalysisJobs(): Promise<AnalysisJob[]> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: jobs, error } = await supabase
    .from('analysis_jobs')
    .select(`
      *,
      video_recordings:video_recording_id (
        id,
        filename,
        original_filename,
        duration_seconds,
        created_at
      )
    `)
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch analysis jobs: ${error.message}`)
  }

  return jobs
}

/**
 * Update analysis job
 */
export async function updateAnalysisJob(
  id: number,
  updates: AnalysisJobUpdate
): Promise<AnalysisJob> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update analysis job: ${error.message}`)
  }

  return job
}

/**
 * Start analysis job processing
 */
export async function startAnalysisProcessing(id: number): Promise<AnalysisJob> {
  return updateAnalysisJob(id, {
    status: 'processing',
    processing_started_at: new Date().toISOString(),
    progress_percentage: 0,
  })
}

/**
 * Update analysis progress
 */
export async function updateAnalysisProgress(
  id: number,
  progressPercentage: number
): Promise<AnalysisJob> {
  return updateAnalysisJob(id, {
    progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
  })
}

/**
 * Complete analysis job with results
 */
export async function completeAnalysisJob(
  id: number,
  results: AnalysisResults,
  poseData?: PoseData
): Promise<AnalysisJob> {
  return updateAnalysisJob(id, {
    status: 'completed',
    processing_completed_at: new Date().toISOString(),
    progress_percentage: 100,
    results: JSON.parse(JSON.stringify(results)),
    pose_data: poseData ? JSON.parse(JSON.stringify(poseData)) : null,
  })
}

/**
 * Fail analysis job with error
 */
export async function failAnalysisJob(id: number, errorMessage: string): Promise<AnalysisJob> {
  return updateAnalysisJob(id, {
    status: 'failed',
    processing_completed_at: new Date().toISOString(),
    error_message: errorMessage,
  })
}

/**
 * Delete analysis job
 */
export async function deleteAnalysisJob(id: number): Promise<void> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('analysis_jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.data.user.id)

  if (error) {
    throw new Error(`Failed to delete analysis job: ${error.message}`)
  }
}

/**
 * Get analysis results
 */
export function getAnalysisResults(job: AnalysisJob): AnalysisResults | null {
  if (!job.results || job.status !== 'completed') {
    return null
  }

  try {
    return job.results as AnalysisResults
  } catch (_error) {
    return null
  }
}

/**
 * Get pose data
 */
export function getPoseData(job: AnalysisJob): PoseData | null {
  if (!job.pose_data || job.status !== 'completed') {
    return null
  }

  try {
    return validatePoseData(job.pose_data)
  } catch (_error) {
    return null
  }
}

/**
 * Subscribe to analysis job updates
 */
export function subscribeToAnalysisJob(
  id: number,
  callback: (job: AnalysisJob) => void
): () => void {
  const subscription = supabase
    .channel(`analysis_job_${id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        callback(payload.new as AnalysisJob)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * Subscribe to all user's analysis jobs
 */
export function subscribeToUserAnalysisJobs(
  callback: (job: AnalysisJob, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
): () => void {
  const subscription = supabase
    .channel('user_analysis_jobs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'analysis_jobs',
      },
      (payload) => {
        const job = payload.new || payload.old
        callback(job as AnalysisJob, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE')
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * Get analysis job statistics
 */
export async function getAnalysisStats(): Promise<{
  total: number
  completed: number
  processing: number
  failed: number
  queued: number
}> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: jobs, error } = await supabase
    .from('analysis_jobs')
    .select('status')
    .eq('user_id', user.data.user.id)

  if (error) {
    throw new Error(`Failed to fetch analysis stats: ${error.message}`)
  }

  const stats = {
    total: jobs.length,
    completed: 0,
    processing: 0,
    failed: 0,
    queued: 0,
  }

  jobs.forEach((job) => {
    switch (job.status) {
      case 'completed':
        stats.completed++
        break
      case 'processing':
        stats.processing++
        break
      case 'failed':
        stats.failed++
        break
      case 'queued':
        stats.queued++
        break
    }
  })

  return stats
}

/**
 * Store analysis results using TRD-compliant schema (Phase 1)
 * Updated to support new normalized schema when available
 */
export async function storeAnalysisResults(
  analysisJobId: number,
  results: TRDAnalysisResult
): Promise<{ data: boolean; error: string | null }> {
  try {
    const { summary_text, metrics } = results
    const metricsJsonb = metrics ? JSON.stringify(metrics) : '{}'

    const { error } = await (supabase.rpc as any)('store_enhanced_analysis_results', {
      analysis_job_id: analysisJobId,
      p_full_feedback_text: summary_text || undefined,
      p_summary_text: summary_text || undefined,
      p_processing_time_ms: null,
      p_video_source_type: null,
      p_feedback: '[]',
      p_metrics: metricsJsonb,
    })

    if (error) {
      log.error('Error storing analysis results:', error)
      return { data: false, error: error.message }
    }

    return { data: true, error: null }
  } catch (error) {
    log.error('Unexpected error storing analysis results:', error)
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get analysis with metrics using TRD-compliant schema (Phase 1)
 */
export async function getAnalysisWithMetrics(analysisJobId: number): Promise<{
  data: {
    analysis_id: number
    status: string
    progress_percentage: number
    summary_text: string | null
    created_at: string
    updated_at: string
    metrics: any
  } | null
  error: string | null
}> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_analysis_with_metrics', {
      job_id: analysisJobId,
    })

    if (error) {
      log.error('Error getting analysis with metrics:', error)
      return { data: null, error: error.message }
    }

    // Return first result (function returns array)
    const result = Array.isArray(data) ? data[0] : data
    return { data: (result as any) || null, error: null }
  } catch (error) {
    log.error('Unexpected error getting analysis with metrics:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Add individual metrics to an analysis (Phase 1)
 */
export async function addAnalysisMetrics(
  analysisId: number,
  metrics: AnalysisMetric[]
): Promise<{ data: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('analysis_metrics').insert(
      metrics.map((metric) => ({
        analysis_id: analysisId,
        metric_key: metric.metric_key,
        metric_value: metric.metric_value,
        unit: metric.unit,
      }))
    )

    if (error) {
      log.error('Error adding analysis metrics:', error)
      return { data: false, error: error.message }
    }

    return { data: true, error: null }
  } catch (error) {
    log.error('Unexpected error adding analysis metrics:', error)
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// AI Analysis Edge Service Types and Functions
export interface VideoTimingParams {
  duration?: number
  startTime?: number
  endTime?: number
  feedbackCount?: number
  targetTimestamps?: number[]
  minGap?: number
  firstTimestamp?: number
}

export interface AIAnalysisRequest {
  videoPath: string
  // userId is now extracted from JWT token on the server side
  videoSource?: 'live_recording' | 'uploaded_video'
  timingParams?: VideoTimingParams
}

export interface AIAnalysisResponse {
  analysisId: number
  status: 'queued'
  message: string
}

/**
 * Compute video timing parameters using Python logic
 * This mirrors the logic from the Python Gemini strategy
 */
export function computeVideoTimingParams(
  duration: number,
  startTime = 0,
  endTime?: number
): VideoTimingParams {
  // Use full video if endTime not specified
  const actualEndTime = endTime ?? duration
  const actualStartTime = startTime

  // Calculate feedback count: max(1, min(10, round(duration / 5.0)))
  const feedbackCount = Math.max(1, Math.min(10, Math.round(actualEndTime / 5.0)))

  // Calculate first timestamp with special logic for edge cases
  let firstTimestamp: number
  if (actualStartTime <= 0.0001 && actualEndTime < 5.0) {
    firstTimestamp = actualEndTime
  } else if (actualStartTime <= 0.0001) {
    firstTimestamp = 5.0
  } else {
    firstTimestamp = actualStartTime
  }

  // Calculate minimum gap: max(4.0, 0.06 * duration)
  const minGap = Math.max(4.0, 0.06 * actualEndTime)

  // Generate target timestamps list
  let targetTimestamps: number[]
  if (feedbackCount === 1) {
    targetTimestamps = [Math.min(actualEndTime, Math.max(firstTimestamp, actualStartTime))]
  } else {
    const span = Math.max(0.0, actualEndTime - Math.max(firstTimestamp, actualStartTime))
    if (span <= 0.0) {
      targetTimestamps = Array(feedbackCount).fill(actualEndTime)
    } else {
      const step = span / feedbackCount
      targetTimestamps = Array.from(
        { length: feedbackCount },
        (_, i) => Math.max(firstTimestamp, actualStartTime) + step * i
      )
    }
  }

  return {
    duration: Math.round(actualEndTime),
    startTime: actualStartTime,
    endTime: actualEndTime,
    feedbackCount,
    targetTimestamps: targetTimestamps.map((t) => Math.round(t * 100) / 100), // Round to 2 decimal places
    minGap: Math.round(minGap),
    firstTimestamp,
  }
}

/**
 * Start Gemini video analysis with timing parameters
 */
export async function startGeminiVideoAnalysis(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const { videoPath, videoSource = 'uploaded_video', timingParams } = request

  const { data, error } = await supabase.functions.invoke('ai-analyze-video', {
    body: {
      videoPath,
      videoSource,
      startTime: timingParams?.startTime,
      endTime: timingParams?.endTime,
      duration: timingParams?.duration,
      feedbackCount: timingParams?.feedbackCount,
      targetTimestamps: timingParams?.targetTimestamps,
      minGap: timingParams?.minGap,
      firstTimestamp: timingParams?.firstTimestamp,
    },
  })

  if (error) {
    throw new Error(`AI Analysis failed: ${error.message}`)
  }

  return data as AIAnalysisResponse
}

// Mock exports for testing (defined in __mocks__ directory)
export const __mockCreateAnalysisJob = (() => {}) as any
export const __mockUpdateAnalysisJob = (() => {}) as any
export const __mockComputeVideoTimingParams = (() => {}) as any
