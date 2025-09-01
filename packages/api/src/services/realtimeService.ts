import { useAnalysisStatusStore } from '@app/stores/analysisStatus'
import { useUploadProgressStore } from '@app/stores/uploadProgress'
import type { UploadTask } from '@app/stores/uploadProgress'
import React from 'react'
import type { Tables } from '../../types/database'
import { supabase } from '../supabase'
import type { AnalysisJob as SchemaAnalysisJob } from '../validation/cameraRecordingSchemas'

export type AnalysisJob = SchemaAnalysisJob
export type VideoRecording = Tables<'video_recordings'>
export type DatabaseAnalysisJob = Tables<'analysis_jobs'>

/**
 * Type guard to ensure status is a valid AnalysisStatus
 */
function isValidAnalysisStatus(
  status: string
): status is 'queued' | 'processing' | 'completed' | 'failed' {
  return ['queued', 'processing', 'completed', 'failed'].includes(status)
}

/**
 * Safely convert database record to AnalysisJob with proper status typing
 */
function safeAnalysisJob(record: DatabaseAnalysisJob): AnalysisJob {
  return {
    ...record,
    status: isValidAnalysisStatus(record.status) ? record.status : 'queued',
  } as AnalysisJob
}

export interface RealtimeSubscription {
  id: string
  channel: string
  unsubscribe: () => void
}

// Module-level state
const subscriptions = new Map<string, RealtimeSubscription>()
let isInitialized = false

/**
 * Initialize real-time subscriptions
 */
export async function initializeRealtimeSubscriptions(): Promise<void> {
  if (isInitialized) {
    return
  }

  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  // Subscribe to analysis jobs updates
  subscribeToAnalysisJobs(user.data.user.id)

  // Subscribe to video recordings updates
  subscribeToVideoRecordings(user.data.user.id)

  isInitialized = true
}

/**
 * Subscribe to analysis jobs updates
 */
function subscribeToAnalysisJobs(userId: string): void {
  const channelName = `analysis_jobs_${userId}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        handleAnalysisJobUpdate(payload)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to analysis jobs updates')
      } else if (status === 'CHANNEL_ERROR') {
      }
    })

  const subscription: RealtimeSubscription = {
    id: channelName,
    channel: channelName,
    unsubscribe: () => {
      channel.unsubscribe()
      subscriptions.delete(channelName)
    },
  }

  subscriptions.set(channelName, subscription)
}

/**
 * Subscribe to video recordings updates
 */
function subscribeToVideoRecordings(userId: string): void {
  const channelName = `video_recordings_${userId}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'video_recordings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        handleVideoRecordingUpdate(payload)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to video recordings updates')
      } else if (status === 'CHANNEL_ERROR') {
      }
    })

  const subscription: RealtimeSubscription = {
    id: channelName,
    channel: channelName,
    unsubscribe: () => {
      channel.unsubscribe()
      subscriptions.delete(channelName)
    },
  }

  subscriptions.set(channelName, subscription)
}

/**
 * Handle analysis job updates from real-time subscription
 */
function handleAnalysisJobUpdate(payload: any): void {
  const { eventType, new: newRecord, old: oldRecord } = payload

  try {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          useAnalysisStatusStore.getState().addJob(safeAnalysisJob(newRecord))
        }
        break

      case 'UPDATE':
        if (newRecord) {
          useAnalysisStatusStore
            .getState()
            .updateJob(newRecord.id, safeAnalysisJob(newRecord) as Partial<AnalysisJob>)
        }
        break

      case 'DELETE':
        if (oldRecord) {
          useAnalysisStatusStore.getState().removeJob(oldRecord.id)
        }
        break
    }
  } catch (_error) {}
}

/**
 * Handle video recording updates from real-time subscription
 */
function handleVideoRecordingUpdate(payload: any): void {
  const { eventType, new: newRecord, old: oldRecord } = payload

  try {
    switch (eventType) {
      case 'UPDATE':
        if (newRecord) {
          handleVideoUploadProgress(newRecord as VideoRecording)
        }
        break

      case 'DELETE':
        if (oldRecord) {
          // Handle video deletion if needed
          console.log('Video recording deleted:', oldRecord.id)
        }
        break
    }
  } catch (_error) {}
}

/**
 * Handle video upload progress updates
 */
function handleVideoUploadProgress(recording: VideoRecording): void {
  const uploadStore = useUploadProgressStore.getState()

  // Find active upload task for this recording
  const activeUploads: UploadTask[] = Array.from(uploadStore.activeUploads.values())
  const uploadTask = activeUploads.find(
    (task: UploadTask) => task.videoRecordingId === recording.id
  )

  if (uploadTask) {
    // Update upload progress
    uploadStore.updateUploadProgress(uploadTask.id, {
      bytesUploaded: Math.round(((recording.upload_progress || 0) / 100) * recording.file_size),
      totalBytes: recording.file_size,
      percentage: recording.upload_progress || 0,
      status: recording.upload_status as any,
    })

    // Update status if changed
    if (uploadTask.status !== recording.upload_status) {
      uploadStore.setUploadStatus(
        uploadTask.id,
        recording.upload_status as any,
        recording.upload_status === 'failed' ? 'Upload failed' : undefined
      )
    }
  }
}

/**
 * Subscribe to specific analysis job updates
 */
export function subscribeToAnalysisJob(jobId: number): () => void {
  const channelName = `analysis_job_${jobId}`

  if (subscriptions.has(channelName)) {
    // Already subscribed
    return subscriptions.get(channelName)!.unsubscribe
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        if (payload.new) {
          useAnalysisStatusStore
            .getState()
            .updateJob(
              jobId,
              safeAnalysisJob(payload.new as DatabaseAnalysisJob) as Partial<AnalysisJob>
            )
        }
      }
    )
    .subscribe()

  const unsubscribe = () => {
    channel.unsubscribe()
    subscriptions.delete(channelName)
    useAnalysisStatusStore.getState().unsubscribeFromJob(jobId)
  }

  const subscription: RealtimeSubscription = {
    id: channelName,
    channel: channelName,
    unsubscribe,
  }

  subscriptions.set(channelName, subscription)
  useAnalysisStatusStore.getState().subscribeToJob(jobId, unsubscribe)

  return unsubscribe
}

/**
 * Subscribe to upload session updates
 */
export function subscribeToUploadSession(sessionId: string): () => void {
  const channelName = `upload_session_${sessionId}`

  if (subscriptions.has(channelName)) {
    return subscriptions.get(channelName)!.unsubscribe
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'upload_sessions',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.new) {
          // Handle upload session update
          console.log('Upload session updated:', payload.new)
        }
      }
    )
    .subscribe()

  const unsubscribe = () => {
    channel.unsubscribe()
    subscriptions.delete(channelName)
  }

  const subscription: RealtimeSubscription = {
    id: channelName,
    channel: channelName,
    unsubscribe,
  }

  subscriptions.set(channelName, subscription)

  return unsubscribe
}

/**
 * Get active subscriptions
 */
export function getActiveSubscriptions(): RealtimeSubscription[] {
  return Array.from(subscriptions.values())
}

/**
 * Unsubscribe from specific channel
 */
export function unsubscribe(channelName: string): void {
  const subscription = subscriptions.get(channelName)
  if (subscription) {
    subscription.unsubscribe()
  }
}

/**
 * Unsubscribe from all channels
 */
export function unsubscribeAll(): void {
  subscriptions.forEach((subscription) => {
    subscription.unsubscribe()
  })
  subscriptions.clear()
  isInitialized = false
}

/**
 * Cleanup on user logout
 */
export function cleanupRealtime(): void {
  unsubscribeAll()

  // Reset stores
  useAnalysisStatusStore.getState().reset()
  useUploadProgressStore.getState().clearAll()
}

/**
 * Check connection status
 */
export function getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
  // Get the first channel's status as a proxy for overall connection
  const firstSubscription = Array.from(subscriptions.values())[0]
  if (!firstSubscription) {
    return 'CLOSED'
  }

  // This is a simplified status check - in a real implementation,
  // you might want to track the actual connection status
  return 'OPEN'
}

/**
 * Reconnect all subscriptions
 */
export async function reconnectRealtime(): Promise<void> {
  console.log('🔄 Reconnecting real-time subscriptions...')

  // Unsubscribe all current subscriptions
  unsubscribeAll()

  // Reinitialize
  await initializeRealtimeSubscriptions()
}

// Hook for managing real-time subscriptions in React components
export const useRealtimeSubscriptions = () => {
  const [isConnected, setIsConnected] = React.useState(false)
  const [connectionStatus, setConnectionStatus] = React.useState<
    'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'
  >('CLOSED')

  React.useEffect(() => {
    const initializeSubscriptions = async () => {
      try {
        setConnectionStatus('CONNECTING')
        await initializeRealtimeSubscriptions()
        setIsConnected(true)
        setConnectionStatus('OPEN')
      } catch (_error) {
        setIsConnected(false)
        setConnectionStatus('CLOSED')
      }
    }

    initializeSubscriptions()

    return () => {
      cleanupRealtime()
      setIsConnected(false)
      setConnectionStatus('CLOSED')
    }
  }, [])

  const reconnect = React.useCallback(async () => {
    try {
      setConnectionStatus('CONNECTING')
      await reconnectRealtime()
      setIsConnected(true)
      setConnectionStatus('OPEN')
    } catch (_error) {
      setIsConnected(false)
      setConnectionStatus('CLOSED')
    }
  }, [])

  return {
    isConnected,
    connectionStatus,
    activeSubscriptions: getActiveSubscriptions().length,
    reconnect,
  }
}
