import { analysisKeys } from '@app/hooks/useAnalysis'
import { videoUploadKeys } from '@app/hooks/useVideoUpload'
import { useAnalysisStatusStore } from '@app/stores/analysisStatus'
import { useUploadProgressStore } from '@app/stores/uploadProgress'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import type { Tables, TablesInsert, TablesUpdate } from '../../types/database'
import type { AnalysisJob as SchemaAnalysisJob } from '../validation/cameraRecordingSchemas'

export type VideoRecording = Tables<'video_recordings'>
export type AnalysisJob = SchemaAnalysisJob
export type DatabaseAnalysisJob = Tables<'analysis_jobs'>

/**
 * Type guard to ensure status is a valid AnalysisStatus
 */
function isValidAnalysisStatus(
  status: string
): status is 'queued' | 'processing' | 'completed' | 'failed' {
  return ['queued', 'processing', 'completed', 'failed'].includes(status)
}

export interface OptimisticUpdate<T = any> {
  id: string
  type: 'video_recording' | 'analysis_job' | 'upload_progress'
  operation: 'create' | 'update' | 'delete'
  data: T
  originalData?: T
  timestamp: number
  rollback: () => void
}

// Module-level state
let pendingUpdates = new Map<string, OptimisticUpdate>()
let queryClient: ReturnType<typeof useQueryClient> | null = null

/**
 * Initialize with query client
 */
function initialize(queryClient_: ReturnType<typeof useQueryClient>): void {
  queryClient = queryClient_
}

/**
 * Create optimistic video recording
 */
export function createOptimisticVideoRecording(
  data: TablesInsert<'video_recordings'> & { user_id: string }
): string {
  if (!queryClient) {
    throw new Error('OptimisticUpdatesService not initialized')
  }

  const optimisticId = `temp_${Date.now()}`
  const optimisticRecording: VideoRecording = {
    id: -1, // Temporary ID
    ...data,
    original_filename: data.original_filename ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    upload_status: data.upload_status || 'pending',
    upload_progress: data.upload_progress || 0,
    metadata: data.metadata || {},
  }

  // Add to recordings list
  queryClient.setQueryData(videoUploadKeys.recordings(), (old: VideoRecording[] = []) => {
    return [optimisticRecording, ...old]
  })

  // Create rollback function
  const rollback = () => {
    queryClient!.setQueryData(videoUploadKeys.recordings(), (old: VideoRecording[] = []) => {
      return old.filter((r) => r.id !== -1)
    })
  }

  // Store pending update
  const update: OptimisticUpdate<VideoRecording> = {
    id: optimisticId,
    type: 'video_recording',
    operation: 'create',
    data: optimisticRecording,
    timestamp: Date.now(),
    rollback,
  }

  pendingUpdates.set(optimisticId, update)

  return optimisticId
}

/**
 * Update optimistic video recording
 */
export function updateOptimisticVideoRecording(
  id: number,
  updates: TablesUpdate<'video_recordings'>
): string {
  if (!queryClient) {
    throw new Error('OptimisticUpdatesService not initialized')
  }

  const updateId = `update_${id}_${Date.now()}`

  // Get current data for rollback
  const currentRecording = queryClient.getQueryData<VideoRecording>(videoUploadKeys.recording(id))

  if (!currentRecording) {
    throw new Error('Recording not found in cache')
  }

  const updatedRecording: VideoRecording = {
    ...currentRecording,
    ...updates,
    updated_at: new Date().toISOString(),
  }

  // Update query cache optimistically
  queryClient.setQueryData(videoUploadKeys.recording(id), updatedRecording)

  // Update in recordings list
  queryClient.setQueryData(videoUploadKeys.recordings(), (old: VideoRecording[] = []) => {
    return old.map((r) => (r.id === id ? updatedRecording : r))
  })

  // Create rollback function
  const rollback = () => {
    queryClient!.setQueryData(videoUploadKeys.recording(id), currentRecording)
    queryClient!.setQueryData(videoUploadKeys.recordings(), (old: VideoRecording[] = []) => {
      return old.map((r) => (r.id === id ? currentRecording : r))
    })
  }

  // Store pending update
  const update: OptimisticUpdate<VideoRecording> = {
    id: updateId,
    type: 'video_recording',
    operation: 'update',
    data: updatedRecording,
    originalData: currentRecording,
    timestamp: Date.now(),
    rollback,
  }

  pendingUpdates.set(updateId, update)

  return updateId
}

/**
 * Create optimistic analysis job
 */
export function createOptimisticAnalysisJob(
  data: TablesInsert<'analysis_jobs'> & { user_id: string }
): string {
  if (!queryClient) {
    throw new Error('OptimisticUpdatesService not initialized')
  }

  const optimisticId = `temp_analysis_${Date.now()}`
  const optimisticJob: AnalysisJob = {
    id: -1, // Temporary ID
    user_id: data.user_id,
    video_recording_id: data.video_recording_id,
    status: (isValidAnalysisStatus(data.status || '') ? data.status : 'queued') as
      | 'queued'
      | 'processing'
      | 'completed'
      | 'failed',
    progress_percentage: data.progress_percentage || 0,
    processing_started_at: data.processing_started_at || null,
    processing_completed_at: data.processing_completed_at || null,
    error_message: data.error_message || null,
    results: data.results ? (data.results as any) : null,
    pose_data: data.pose_data ? (data.pose_data as any) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Add to analysis jobs list
  queryClient.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] = []) => {
    return [optimisticJob, ...old]
  })

  // Add to video-specific query
  queryClient.setQueryData(analysisKeys.jobByVideo(data.video_recording_id), optimisticJob)

  // Update store
  useAnalysisStatusStore.getState().addJob(optimisticJob)

  // Create rollback function
  const rollback = () => {
    queryClient!.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] = []) => {
      return old.filter((j) => j.id !== -1)
    })
    queryClient!.removeQueries({
      queryKey: analysisKeys.jobByVideo(data.video_recording_id),
    })
    useAnalysisStatusStore.getState().removeJob(-1)
  }

  // Store pending update
  const update: OptimisticUpdate<AnalysisJob> = {
    id: optimisticId,
    type: 'analysis_job',
    operation: 'create',
    data: optimisticJob,
    timestamp: Date.now(),
    rollback,
  }

  pendingUpdates.set(optimisticId, update)

  return optimisticId
}

/**
 * Update optimistic analysis job
 */
function updateOptimisticAnalysisJob(id: number, updates: TablesUpdate<'analysis_jobs'>): string {
  if (!queryClient) {
    throw new Error('OptimisticUpdatesService not initialized')
  }

  const updateId = `update_analysis_${id}_${Date.now()}`

  // Get current data for rollback
  const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))

  if (!currentJob) {
    throw new Error('Analysis job not found in cache')
  }

  const updatedJob: AnalysisJob = {
    ...currentJob,
    ...(updates as Partial<AnalysisJob>),
    status: updates.status
      ? isValidAnalysisStatus(updates.status)
        ? updates.status
        : currentJob.status
      : currentJob.status,
    results: updates.results ? (updates.results as any) : currentJob.results,
    pose_data: updates.pose_data ? (updates.pose_data as any) : currentJob.pose_data,
    updated_at: new Date().toISOString(),
  }

  // Update query cache optimistically
  queryClient.setQueryData(analysisKeys.job(id), updatedJob)
  queryClient.setQueryData(analysisKeys.jobByVideo(updatedJob.video_recording_id), updatedJob)

  // Update in jobs list
  queryClient.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] = []) => {
    return old.map((j) => (j.id === id ? updatedJob : j))
  })

  // Update store
  const storeUpdates: Partial<AnalysisJob> = {
    ...updates,
    status: updates.status
      ? isValidAnalysisStatus(updates.status)
        ? updates.status
        : undefined
      : undefined,
  } as Partial<AnalysisJob>
  useAnalysisStatusStore.getState().updateJob(id, storeUpdates)

  // Create rollback function
  const rollback = () => {
    queryClient!.setQueryData(analysisKeys.job(id), currentJob)
    queryClient!.setQueryData(analysisKeys.jobByVideo(currentJob.video_recording_id), currentJob)
    queryClient!.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] = []) => {
      return old.map((j) => (j.id === id ? currentJob : j))
    })
    useAnalysisStatusStore.getState().updateJob(id, currentJob)
  }

  // Store pending update
  const update: OptimisticUpdate<AnalysisJob> = {
    id: updateId,
    type: 'analysis_job',
    operation: 'update',
    data: updatedJob,
    originalData: currentJob,
    timestamp: Date.now(),
    rollback,
  }

  pendingUpdates.set(updateId, update)

  return updateId
}

/**
 * Create optimistic upload progress update
 */
function updateOptimisticUploadProgress(
  taskId: string,
  progress: {
    bytesUploaded: number
    percentage: number
    status?: 'pending' | 'uploading' | 'completed' | 'failed'
  }
): string {
  const updateId = `upload_progress_${taskId}_${Date.now()}`

  // Get current state for rollback
  const uploadStore = useUploadProgressStore.getState()
  const currentTask = uploadStore.getUploadTask(taskId)

  if (!currentTask) {
    throw new Error('Upload task not found')
  }

  const originalProgress = {
    bytesUploaded: currentTask.bytesUploaded,
    progress: currentTask.progress,
    status: currentTask.status,
  }

  // Update store optimistically
  uploadStore.updateUploadProgress(taskId, {
    bytesUploaded: progress.bytesUploaded,
    totalBytes: currentTask.fileSize,
    percentage: progress.percentage,
    status: progress.status || currentTask.status,
  })

  // Create rollback function
  const rollback = () => {
    uploadStore.updateUploadProgress(taskId, {
      bytesUploaded: originalProgress.bytesUploaded,
      totalBytes: currentTask.fileSize,
      percentage: originalProgress.progress,
      status: originalProgress.status,
    })
  }

  // Store pending update
  const update: OptimisticUpdate = {
    id: updateId,
    type: 'upload_progress',
    operation: 'update',
    data: progress,
    originalData: originalProgress,
    timestamp: Date.now(),
    rollback,
  }

  pendingUpdates.set(updateId, update)

  return updateId
}

/**
 * Confirm optimistic update (remove from pending)
 */
function confirmOptimisticUpdate(updateId: string): void {
  pendingUpdates.delete(updateId)
}

/**
 * Rollback optimistic update
 */
export function rollbackOptimisticUpdate(updateId: string): void {
  const update = pendingUpdates.get(updateId)
  if (update) {
    update.rollback()
    pendingUpdates.delete(updateId)
  }
}

/**
 * Rollback all pending updates
 */
function rollbackAllOptimisticUpdates(): void {
  pendingUpdates.forEach((update) => {
    update.rollback()
  })
  pendingUpdates.clear()
}

/**
 * Get pending updates
 */
function getPendingUpdates(): OptimisticUpdate[] {
  return Array.from(pendingUpdates.values())
}

/**
 * Clean up old pending updates (older than 5 minutes)
 */
function cleanupOldUpdates(): void {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

  pendingUpdates.forEach((update, id) => {
    if (update.timestamp < fiveMinutesAgo) {
      update.rollback()
      pendingUpdates.delete(id)
    }
  })
}

/**
 * Handle successful mutation (confirm optimistic update)
 */
function handleMutationSuccess<T>(updateId: string, serverData: T): void {
  const update = pendingUpdates.get(updateId)
  if (!update || !queryClient) {
    return
  }

  // Update cache with server data
  switch (update.type) {
    case 'video_recording': {
      const recording = serverData as VideoRecording
      queryClient.setQueryData(videoUploadKeys.recording(recording.id), recording)
      queryClient.setQueryData(videoUploadKeys.recordings(), (old: VideoRecording[] = []) => {
        return old.map((r) => (r.id === recording.id || r.id === -1 ? recording : r))
      })
      break
    }

    case 'analysis_job': {
      const job = serverData as AnalysisJob
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
      queryClient.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] = []) => {
        return old.map((j) => (j.id === job.id || j.id === -1 ? job : j))
      })
      useAnalysisStatusStore.getState().updateJob(job.id, job)
      break
    }
  }

  // Confirm the update
  confirmOptimisticUpdate(updateId)
}

/**
 * Handle failed mutation (rollback optimistic update)
 */
function handleMutationError(updateId: string, _error: Error): void {
  rollbackOptimisticUpdate(updateId)
}

/**
 * Reset service
 */
function reset(): void {
  rollbackAllOptimisticUpdates()
  queryClient = null
}

// Export object with all methods
export const OptimisticUpdatesService = {
  initialize,
  createOptimisticVideoRecording,
  updateOptimisticVideoRecording,
  createOptimisticAnalysisJob,
  updateOptimisticAnalysisJob,
  updateOptimisticUploadProgress,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  rollbackAllOptimisticUpdates,
  getPendingUpdates,
  cleanupOldUpdates,
  handleMutationSuccess,
  handleMutationError,
  reset,
}

// Hook for using optimistic updates in React components
export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    OptimisticUpdatesService.initialize(queryClient)

    // Cleanup old updates periodically
    const interval = setInterval(() => {
      OptimisticUpdatesService.cleanupOldUpdates()
    }, 60000) // Every minute

    return () => {
      clearInterval(interval)
    }
  }, [queryClient])

  return {
    createOptimisticVideoRecording: OptimisticUpdatesService.createOptimisticVideoRecording,
    updateOptimisticVideoRecording: OptimisticUpdatesService.updateOptimisticVideoRecording,
    createOptimisticAnalysisJob: OptimisticUpdatesService.createOptimisticAnalysisJob,
    updateOptimisticAnalysisJob: OptimisticUpdatesService.updateOptimisticAnalysisJob,
    updateOptimisticUploadProgress: OptimisticUpdatesService.updateOptimisticUploadProgress,
    confirmUpdate: OptimisticUpdatesService.confirmOptimisticUpdate,
    rollbackUpdate: OptimisticUpdatesService.rollbackOptimisticUpdate,
    rollbackAll: OptimisticUpdatesService.rollbackAllOptimisticUpdates,
    pendingUpdates: OptimisticUpdatesService.getPendingUpdates(),
  }
}
