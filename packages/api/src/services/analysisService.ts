import type { Tables, TablesInsert, TablesUpdate } from '../../types/database'
import { supabase } from '../supabase'
import { validatePoseData } from '../validation/cameraRecordingSchemas'

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
    results: results as any, // Cast to Json type
    pose_data: poseData as any, // Cast to Json type
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
