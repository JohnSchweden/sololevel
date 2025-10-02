import { log } from '@my/logging'
import type { Tables, TablesInsert, TablesUpdate } from '../../types/database'
import { supabase } from '../supabase'

export type VideoRecording = Tables<'video_recordings'>
export type VideoRecordingInsert = TablesInsert<'video_recordings'>
export type VideoRecordingUpdate = TablesUpdate<'video_recordings'>

export type UploadSession = Tables<'upload_sessions'>
export type UploadSessionInsert = TablesInsert<'upload_sessions'>

export interface VideoUploadOptions {
  file: File | Blob
  originalFilename?: string
  durationSeconds: number
  format: 'mp4' | 'mov'
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onUploadInitialized?: (details: {
    recordingId: number
    sessionId: number
    storagePath: string
  }) => void
}

export interface UploadProgress {
  bytesUploaded: number
  totalBytes: number
  percentage: number
  status: 'pending' | 'uploading' | 'completed' | 'failed'
}

// Module constants
const BUCKET_NAME = 'raw'
const CHUNK_SIZE = 1024 * 1024 // 1MB chunks
const SIGNED_URL_TTL = 300 // 5 minutes

/**
 * Create a signed URL for video upload
 */
export async function createSignedUploadUrl(
  filename: string,
  fileSize: number
): Promise<{ signedUrl: string; path: string }> {
  log.debug('videoUploadService', 'createSignedUploadUrl called')

  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  log.debug('videoUploadService', 'User authenticated', { userId: user.data.user.id })

  // Basic file size validation (can be enhanced with more specific limits)
  if (fileSize <= 0) {
    throw new Error('File size must be greater than 0')
  }

  // Generate unique storage path
  const timestamp = Date.now()
  const path = `${user.data.user.id}/${timestamp}_${filename}`

  log.debug('videoUploadService', 'Generated storage path', { path })
  log.debug('videoUploadService', 'Creating signed upload URL', { bucket: BUCKET_NAME })

  // Create signed URL for upload
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(path, {
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return {
    signedUrl: data.signedUrl,
    path,
  }
}

/**
 * Create video recording record in database
 */
export async function createVideoRecording(
  data: Omit<VideoRecordingInsert, 'user_id'>
): Promise<VideoRecording> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: recording, error } = await supabase
    .from('video_recordings')
    .insert({
      ...data,
      user_id: user.data.user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create video recording: ${error.message}`)
  }

  return recording
}

/**
 * Create upload session for tracking progress
 */
export async function createUploadSession(
  videoRecordingId: number,
  signedUrl: string,
  totalBytes: number
): Promise<UploadSession> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000)

  const { data: session, error } = await supabase
    .from('upload_sessions')
    .insert({
      user_id: user.data.user.id,
      video_recording_id: videoRecordingId,
      signed_url: signedUrl,
      expires_at: expiresAt.toISOString(),
      total_bytes: totalBytes,
      chunk_size: CHUNK_SIZE,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create upload session: ${error.message}`)
  }

  return session
}

/**
 * Upload video file with progress tracking
 */
export async function uploadVideo(options: VideoUploadOptions): Promise<VideoRecording> {
  const {
    file,
    originalFilename,
    durationSeconds,
    format,
    onProgress,
    onError,
    onUploadInitialized,
  } = options

  // Debug logging
  log.debug('videoUploadService', 'uploadVideo called', {
    fileSize: file.size,
    filename: originalFilename,
  })

  try {
    // Validate file
    if (file.size === 0) {
      throw new Error('File is empty')
    }

    if (durationSeconds > 60) {
      throw new Error('Video duration cannot exceed 60 seconds')
    }

    // Generate filename
    const filename = originalFilename || `video_${Date.now()}.${format}`

    // Create signed URL
    log.debug('videoUploadService', 'Creating signed upload URL')
    const { signedUrl, path } = await createSignedUploadUrl(filename, file.size)
    log.debug('videoUploadService', 'Signed URL created', {
      urlPrefix: signedUrl.substring(0, 50),
    })

    // Create video recording record
    const recording = await createVideoRecording({
      filename,
      original_filename: originalFilename,
      file_size: file.size,
      duration_seconds: durationSeconds,
      format,
      storage_path: path,
      upload_status: 'pending',
    })

    // Create upload session
    const session = await createUploadSession(recording.id, signedUrl, file.size)

    // Notify that upload is initialized with actual recording info
    onUploadInitialized?.({
      recordingId: recording.id,
      sessionId: session.id,
      storagePath: recording.storage_path,
    })

    // Update recording status to uploading
    await updateVideoRecording(recording.id, {
      upload_status: 'uploading',
    })

    // Upload file with progress tracking
    log.debug('videoUploadService', 'Starting uploadWithProgress')
    try {
      await uploadWithProgress(signedUrl, file, recording.id, session.id, onProgress)
      log.debug('videoUploadService', 'uploadWithProgress completed successfully')
    } catch (uploadError) {
      const errorMessage =
        uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      log.error('videoUploadService', 'uploadWithProgress failed', { error: errorMessage })
      await updateUploadProgress(recording.id, session.id, 0, 0)
      throw uploadError
    }

    // Do NOT finalize here; let Storage webhook finalize and enqueue analysis
    return recording
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    onError?.(new Error(errorMessage))
    throw error
  }
}

/**
 * Upload file with progress tracking using XMLHttpRequest
 */
async function uploadWithProgress(
  signedUrl: string,
  file: File | Blob,
  recordingId: number,
  sessionId: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  log.debug('videoUploadService', 'uploadWithProgress: starting upload')

  // Use fetch for Node/jsdom environments or Jest tests where XMLHttpRequest doesn't perform real network calls
  if (typeof XMLHttpRequest === 'undefined' || process.env.JEST_WORKER_ID) {
    log.debug('videoUploadService', 'uploadWithProgress: using fetch path')

    try {
      log.debug('videoUploadService', 'uploadWithProgress: calling fetch')
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
      })

      log.debug('videoUploadService', 'uploadWithProgress: fetch response', {
        status: response.status,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      // Update progress to 100% on success
      updateUploadProgress(recordingId, sessionId, file.size, 100)
      onProgress?.(100)

      log.debug('videoUploadService', 'uploadWithProgress: completed successfully')
      return
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error('videoUploadService', 'uploadWithProgress: fetch failed', {
        error: errorMessage,
      })
      throw new Error(`Upload failed: ${errorMessage}`)
    }
  }

  // Use XMLHttpRequest for web environments
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress?.(progress)

        // Update database progress every 10%
        if (progress % 10 === 0) {
          updateUploadProgress(recordingId, sessionId, event.loaded, progress)
        }
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Final progress update
        updateUploadProgress(recordingId, sessionId, file.size, 100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'))
    })

    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.send(file)
  })
}

/**
 * Update video recording
 */
export async function updateVideoRecording(
  id: number,
  updates: VideoRecordingUpdate
): Promise<VideoRecording> {
  // Ensure user is authenticated and get user ID for RLS
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: recording, error } = await supabase
    .from('video_recordings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.data.user.id) // RLS: ensure user owns the record
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update video recording: ${error.message}`)
  }

  return recording
}

/**
 * Update upload progress in database
 */
async function updateUploadProgress(
  recordingId: number,
  sessionId: number,
  bytesUploaded: number,
  percentage: number
): Promise<void> {
  try {
    // Get authenticated user for RLS
    const user = await supabase.auth.getUser()
    if (!user.data.user) {
      throw new Error('User not authenticated')
    }

    // Update upload session (with user_id filter for RLS)
    await supabase
      .from('upload_sessions')
      .update({
        bytes_uploaded: bytesUploaded,
      })
      .eq('id', sessionId)
      .eq('user_id', user.data.user.id) // RLS: ensure user owns the session

    // Update video recording progress (with user_id filter for RLS)
    await supabase
      .from('video_recordings')
      .update({
        upload_progress: percentage,
      })
      .eq('id', recordingId)
      .eq('user_id', user.data.user.id) // RLS: ensure user owns the recording
  } catch (_error) {
    // Silently fail for progress updates to avoid disrupting upload flow
  }
}

/**
 * Get upload progress for a recording
 */
export async function getUploadProgress(recordingId: number): Promise<UploadProgress | null> {
  const { data, error } = await supabase.rpc('get_upload_progress', {
    recording_id: recordingId,
  })

  if (error) {
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  const progress = data[0]
  return {
    bytesUploaded: progress.bytes_uploaded,
    totalBytes: progress.total_bytes,
    percentage: progress.progress_percentage,
    status: progress.upload_status as UploadProgress['status'],
  }
}

/**
 * Cancel upload
 */
export async function cancelUpload(recordingId: number): Promise<void> {
  // Get authenticated user for RLS
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  // Update recording status (updateVideoRecording already has RLS)
  await updateVideoRecording(recordingId, {
    upload_status: 'failed',
  })

  // Mark upload sessions as cancelled (with user_id filter for RLS)
  await supabase
    .from('upload_sessions')
    .update({ status: 'cancelled' })
    .eq('video_recording_id', recordingId)
    .eq('user_id', user.data.user.id) // RLS: ensure user owns the sessions
    .eq('status', 'active')
}

/**
 * Get user's video recordings
 */
export async function getUserVideoRecordings(): Promise<VideoRecording[]> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  const { data: recordings, error } = await supabase
    .from('video_recordings')
    .select('*')
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch video recordings: ${error.message}`)
  }

  return recordings
}

/**
 * Delete video recording and associated storage
 */
export async function deleteVideoRecording(id: number): Promise<void> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) {
    throw new Error('User not authenticated')
  }

  // Get recording details
  const { data: recording, error: fetchError } = await supabase
    .from('video_recordings')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.data.user.id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch video recording: ${fetchError.message}`)
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([recording.storage_path])

  if (storageError) {
  }

  // Delete from database (cascade will handle related records)
  const { error: deleteError } = await supabase
    .from('video_recordings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.data.user.id)

  if (deleteError) {
    throw new Error(`Failed to delete video recording: ${deleteError.message}`)
  }
}
