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

// Diagnostic utilities for realtime subscription debugging
interface HealthCheckResult {
  authenticated: boolean
  userId?: string
  networkOnline: boolean
  supabaseConnected: boolean
  rlsPoliciesAccessible: boolean
  error?: string
}

interface ChannelConfig {
  channelName: string
  event: string
  schema: string
  table: string
  filter?: string
  userId?: string
}

/**
 * Perform comprehensive health check before realtime subscription
 */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const networkOnline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true

  const result: HealthCheckResult = {
    authenticated: false,
    networkOnline,
    supabaseConnected: false,
    rlsPoliciesAccessible: false,
  }

  try {
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) {
      result.error = `Auth error: ${authError.message}`
      return result
    }

    if (authData.user) {
      result.authenticated = true
      result.userId = authData.user.id
    } else {
      result.error = 'No authenticated user'
      return result
    }

    // Check basic Supabase connectivity
    const { error: healthError } = await supabase
      .from('analysis_jobs')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    if (healthError) {
      result.error = `Supabase connection error: ${healthError.message}`
      return result
    }

    result.supabaseConnected = true

    // Check RLS policies by attempting a user-specific query
    const { error: rlsError } = await supabase
      .from('analysis_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', result.userId!)
      .limit(1)

    if (rlsError) {
      result.error = `RLS policy error: ${rlsError.message}`
      return result
    }

    result.rlsPoliciesAccessible = true

    log.info('performHealthCheck', 'Health check completed successfully', result)
    return result
  } catch (error) {
    result.error = `Unexpected health check error: ${error instanceof Error ? error.message : 'Unknown error'}`
    log.error('performHealthCheck', 'Health check failed', result)
    return result
  }
}

/**
 * Log detailed channel configuration for debugging
 */
function logChannelConfig(config: ChannelConfig, context: string): void {
  log.info(context, 'Channel configuration', {
    channelName: config.channelName,
    event: config.event,
    schema: config.schema,
    table: config.table,
    filter: config.filter,
    userId: config.userId,
  })
}

export type AnalysisJob = Tables<'analysis_jobs'>
export type AnalysisJobInsert = TablesInsert<'analysis_jobs'>
export type AnalysisJobUpdate = TablesUpdate<'analysis_jobs'>

// Extended type for analysis jobs with video_recordings join
export type AnalysisJobWithVideo = AnalysisJob & {
  video_recordings?: {
    id: number
    filename: string
    storage_path?: string // Optional for backward compatibility
    original_filename?: string | null
    duration_seconds: number
    created_at: string
    thumbnail_url?: string | null // Cloud CDN URL for thumbnail
    metadata?: {
      thumbnailUri?: string
    } | null
  } | null
}

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
 * Get user's analysis jobs with video_recordings join
 * @param limit - Maximum number of jobs to fetch (default: 10)
 */
export async function getUserAnalysisJobs(
  limit = 10,
  status?: AnalysisStatus
): Promise<AnalysisJobWithVideo[]> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  let query = supabase
    .from('analysis_jobs')
    .select(`
      *,
      video_recordings:video_recording_id (
        id,
        filename,
        storage_path,
        original_filename,
        duration_seconds,
        created_at,
        thumbnail_url,
        metadata
      ),
      analyses:analyses!analyses_job_id_fkey (
        title
      )
    `)
    .eq('user_id', user.data.user.id)

  // Filter by status if provided (more efficient than filtering in JS)
  if (status) {
    query = query.eq('status', status)
  }

  const { data: jobs, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) {
    throw new Error(`Failed to fetch analysis jobs: ${error.message}`)
  }

  // Cast to AnalysisJobWithVideo[] since Supabase join typing is complex
  return jobs as unknown as AnalysisJobWithVideo[]
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
 * Get the latest analysis job for a video recording ID
 */
export async function getLatestAnalysisJobForRecordingId(
  recordingId: number
): Promise<AnalysisJob | null> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('video_recording_id', recordingId)
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch latest analysis job: ${error.message}`)
  }

  return job
}

/**
 * Get the analysis UUID for a given job ID
 * The analyses table contains the UUIDs that correspond to job IDs
 * Retries with exponential backoff if analysis row doesn't exist yet (backend timing)
 */
export async function getAnalysisIdForJobId(
  jobId: number,
  options?: { maxRetries?: number; baseDelay?: number }
): Promise<string | null> {
  const maxRetries = options?.maxRetries ?? 5
  const baseDelay = options?.baseDelay ?? 300

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Use any type since 'analyses' table may not be in current type definitions
    // Use an inner join via select syntax to filter by user ownership without relying on join()
    const { data: analysis, error } = await (supabase as any)
      .from('analyses')
      .select('id, analysis_jobs!inner(user_id, status)')
      .eq('job_id', jobId)
      .eq('analysis_jobs.user_id', user.id)
      .in('analysis_jobs.status', ['processing', 'completed'])
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to get analysis ID for job ${jobId}: ${error.message}`)
    }

    if (analysis?.id) {
      return String(analysis.id)
    }

    // Retry with exponential backoff if analysis row doesn't exist yet
    if (attempt < maxRetries) {
      const delay = baseDelay * 2 ** (attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return null
}

/**
 * Subscribe to analysis jobs by video recording ID
 * Returns the latest job for the recording and subscribes to future updates
 */
export function subscribeToLatestAnalysisJobByRecordingId(
  recordingId: number,
  onJob: (job: AnalysisJob) => void,
  options?: {
    onStatus?: (status: string, details?: any) => void
    onError?: (error: string, details?: any) => void
  }
): () => void {
  let unsubscribed = false

  // Perform health check before subscription
  performHealthCheck()
    .then((health) => {
      if (unsubscribed) return

      // Log health check results
      log.info('subscribeToLatestAnalysisJobByRecordingId', 'Pre-subscription health check', {
        recordingId,
        ...health,
      })

      if (!health.authenticated || !health.supabaseConnected || !health.rlsPoliciesAccessible) {
        options?.onError?.('HEALTH_CHECK_FAILED', {
          health,
          recordingId,
        })
        return
      }

      // Fetch initial job
      getLatestAnalysisJobForRecordingId(recordingId)
        .then((job) => {
          if (!unsubscribed) {
            if (job) {
              options?.onStatus?.('BACKFILL_SUCCESS', {
                recordingId,
                jobId: job.id,
                status: job.status,
              })
              onJob(job)
            } else {
              options?.onStatus?.('BACKFILL_EMPTY', { recordingId })
            }
          }
        })
        .catch((error) => {
          options?.onError?.('BACKFILL_ERROR', {
            error: error.message,
            recordingId,
          })
          log.error(
            'subscribeToLatestAnalysisJobByRecordingId',
            'Error fetching initial analysis job',
            {
              error: error.message,
              recordingId,
            }
          )
        })

      // Log channel configuration
      const channelConfig: ChannelConfig = {
        channelName: `analysis_jobs_recording_${recordingId}`,
        event: '*',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `video_recording_id=eq.${recordingId}`,
        userId: health.userId,
      }
      logChannelConfig(channelConfig, 'subscribeToLatestAnalysisJobByRecordingId')

      // Subscribe to changes for this recording ID
      const subscription = supabase
        .channel(channelConfig.channelName)
        .on(
          'postgres_changes',
          {
            event: channelConfig.event as any,
            schema: channelConfig.schema,
            table: channelConfig.table,
            filter: channelConfig.filter,
          },
          (payload) => {
            if (!unsubscribed) {
              options?.onStatus?.('PAYLOAD_RECEIVED', {
                eventType: payload.eventType,
                oldId: (payload.old as any)?.id,
                newId: (payload.new as any)?.id,
                status: (payload.new as any)?.status,
                recordingId,
                userId: health.userId,
              })
              const job = payload.new as AnalysisJob
              onJob(job)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            options?.onStatus?.('SUBSCRIBED', {
              channel: channelConfig.channelName,
              filter: channelConfig.filter,
              userId: health.userId,
              networkOnline: health.networkOnline,
            })
          } else if (status === 'CHANNEL_ERROR') {
            options?.onError?.('CHANNEL_ERROR', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
              health,
              networkOnline: health.networkOnline,
            })
          } else if (status === 'TIMED_OUT') {
            options?.onError?.('CHANNEL_TIMEOUT', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
            })
          } else if (status === 'CLOSED') {
            options?.onError?.('CHANNEL_CLOSED', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
            })
          }
        })

      return () => {
        unsubscribed = true
        subscription.unsubscribe()
      }
    })
    .catch((healthError) => {
      options?.onError?.('HEALTH_CHECK_ERROR', {
        error: healthError instanceof Error ? healthError.message : 'Unknown health check error',
        recordingId,
      })
      log.error('subscribeToLatestAnalysisJobByRecordingId', 'Health check failed', {
        error: healthError instanceof Error ? healthError.message : 'Unknown error',
        recordingId,
      })
    })

  // Return cleanup function (will be set after health check completes)
  return () => {
    unsubscribed = true
  }
}

/**
 * Subscribe to analysis job updates
 */
export function subscribeToAnalysisJob(
  id: number,
  callback: (job: AnalysisJob) => void,
  options?: {
    onStatus?: (status: string, details?: any) => void
    onError?: (error: string, details?: any) => void
  }
): () => void {
  let unsubscribed = false

  // Perform health check before subscription
  performHealthCheck()
    .then((health) => {
      if (unsubscribed) return

      // Log health check results
      log.info('subscribeToAnalysisJob', 'Pre-subscription health check', {
        jobId: id,
        ...health,
      })

      if (!health.authenticated || !health.supabaseConnected || !health.rlsPoliciesAccessible) {
        options?.onError?.('HEALTH_CHECK_FAILED', {
          health,
          jobId: id,
        })
        return
      }

      // Log channel configuration
      const channelConfig: ChannelConfig = {
        channelName: `analysis_job_${id}`,
        event: 'UPDATE',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `id=eq.${id}`,
        userId: health.userId,
      }
      logChannelConfig(channelConfig, 'subscribeToAnalysisJob')

      const subscription = supabase
        .channel(channelConfig.channelName)
        .on(
          'postgres_changes',
          {
            event: channelConfig.event as any,
            schema: channelConfig.schema,
            table: channelConfig.table,
            filter: channelConfig.filter,
          },
          (payload) => {
            if (!unsubscribed) {
              options?.onStatus?.('PAYLOAD_RECEIVED', {
                eventType: payload.eventType,
                oldId: (payload.old as any)?.id,
                newId: (payload.new as any)?.id,
                status: (payload.new as any)?.status,
                jobId: id,
                userId: health.userId,
              })
              callback(payload.new as AnalysisJob)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            options?.onStatus?.('SUBSCRIBED', {
              channel: channelConfig.channelName,
              filter: channelConfig.filter,
              userId: health.userId,
              networkOnline: health.networkOnline,
            })
          } else if (status === 'CHANNEL_ERROR') {
            options?.onError?.('CHANNEL_ERROR', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
              health,
              networkOnline: health.networkOnline,
            })
          } else if (status === 'TIMED_OUT') {
            options?.onError?.('CHANNEL_TIMEOUT', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
            })
          } else if (status === 'CLOSED') {
            options?.onError?.('CHANNEL_CLOSED', {
              channel: channelConfig.channelName,
              status,
              userId: health.userId,
            })
          }
        })

      return () => {
        unsubscribed = true
        subscription.unsubscribe()
      }
    })
    .catch((healthError) => {
      options?.onError?.('HEALTH_CHECK_ERROR', {
        error: healthError instanceof Error ? healthError.message : 'Unknown health check error',
        jobId: id,
      })
      log.error('subscribeToAnalysisJob', 'Health check failed', {
        error: healthError instanceof Error ? healthError.message : 'Unknown error',
        jobId: id,
      })
    })

  // Return cleanup function (will be set after health check completes)
  return () => {
    unsubscribed = true
  }
}

/**
 * Subscribe to analysis title updates from analyses table
 * This gets the title as soon as it's stored (right after LLM analysis, before job completion)
 */
export function subscribeToAnalysisTitle(
  jobId: number,
  onTitle: (title: string | null) => void
): (() => void) | undefined {
  let unsubscribed = false

  performHealthCheck()
    .then((health) => {
      if (unsubscribed) return

      if (!health.authenticated || !health.supabaseConnected) {
        // Return undefined to indicate subscription failed
        // The caller should handle this gracefully
        return undefined
      }

      const channelConfig: ChannelConfig = {
        channelName: `analysis_title_${jobId}`,
        event: '*',
        schema: 'public',
        table: 'analyses',
        filter: `job_id=eq.${jobId}`,
        userId: health.userId,
      }

      const subscription = supabase
        .channel(channelConfig.channelName)
        .on(
          'postgres_changes',
          {
            event: channelConfig.event as any,
            schema: channelConfig.schema,
            table: channelConfig.table,
            filter: channelConfig.filter,
          },
          (payload) => {
            if (!unsubscribed) {
              const analysis = payload.new as { title?: string | null } | null
              // Note: log object is no-op in this file, but we call onTitle which will log in the store
              if (analysis?.title !== undefined && analysis.title !== null) {
                onTitle(analysis.title)
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Fetch current title immediately in case it was already stored
            // Use maybeSingle() to handle case where row doesn't exist yet
            Promise.resolve(
              supabase.from('analyses').select('title').eq('job_id', jobId).maybeSingle()
            )
              .then((result) => {
                const { data, error } = result as {
                  data: { title: string | null } | null
                  error: any
                }
                if (!unsubscribed && !error && data?.title) {
                  onTitle(data.title)
                }
              })
              .catch(() => {
                // Silent fail - title might not exist yet
              })
          }
        })

      return () => {
        unsubscribed = true
        subscription.unsubscribe()
      }
    })
    .catch(() => {
      // Silent fail - title subscription is optional
      // Health check failure is handled gracefully
      return undefined
    })

  return () => {
    unsubscribed = true
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
    const { summary_text } = results

    const { data, error } = await (supabase.rpc as any)('store_analysis_results', {
      p_job_id: analysisJobId,
      p_full_feedback_text: summary_text || null,
      p_summary_text: summary_text || null,
      p_raw_generated_text: null,
      p_full_feedback_json: null,
      p_feedback_prompt: null,
    })

    if (error) {
      log.error('Error storing analysis results:', error)
      return { data: false, error: error.message }
    }

    // Metrics now handled by a separate helper until TRD catches up
    return { data: !!data, error: null }
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
