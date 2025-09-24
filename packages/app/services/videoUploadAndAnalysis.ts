/**
 * Shared service for video upload and analysis pipeline
 * Handles compression, upload, and AI analysis orchestration
 */

import { useUploadProgressStore } from '@app/stores/uploadProgress'
import { uploadVideo } from '@my/api'
import { log } from '@my/logging'
import { uriToBlob } from '../utils/files'
import { compressVideo } from './videoCompression'

type VideoMetadata = { duration: number; format: 'mp4' | 'mov' }

export interface VideoUploadAndAnalysisOptions {
  // Source options - provide either sourceUri OR file
  sourceUri?: string // For URIs that need compression and conversion
  file?: File | Blob // For already-processed files

  // Metadata hints (optional, will be computed if not provided)
  originalFilename?: string
  durationSeconds?: number
  format?: 'mp4' | 'mov'

  // Callbacks for progress tracking
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onUploadInitialized?: (context: {
    recordingId: number
    sessionId: number
    storagePath: string
  }) => void

  // Optional: callback to propagate recordingId to navigation/route params
  onRecordingIdAvailable?: (recordingId: number) => void
}

/**
 * Extract a meaningful filename from a URI path
 */
function extractFilenameFromUri(uri: string): string {
  try {
    // Remove file:// prefix and get the path
    const path = uri.replace(/^file:\/\//, '')
    // Get the last part of the path
    const filename = path.split('/').pop() || 'video.mp4'
    // Ensure it has .mp4 extension
    return filename.includes('.') ? filename : `${filename}.mp4`
  } catch {
    return 'video.mp4'
  }
}

/**
 * Add a temporary upload task so the UI can reflect progress immediately.
 */
function seedUploadTask(filename: string, file?: File | Blob): string {
  return useUploadProgressStore.getState().addUploadTask({
    videoRecordingId: null,
    filename,
    fileSize: file?.size || 0,
    status: 'pending',
    error: null,
    maxRetries: 3,
  })
}

/**
 * Resolve the file/blob to upload and its metadata from either a provided file
 * or a local URI that may need compression and conversion to Blob.
 */
async function resolveVideoToUpload(params: {
  sourceUri?: string
  file?: File | Blob
  durationSeconds?: number
  format?: 'mp4' | 'mov'
}): Promise<{ videoToUpload: File | Blob; metadata: VideoMetadata }> {
  const { sourceUri, file, durationSeconds, format } = params

  if (file) {
    const metadata: VideoMetadata = {
      duration: durationSeconds || 30,
      format: format || 'mp4',
    }
    log.info('startUploadAndAnalysis', 'Using provided file directly', {
      fileName: (file instanceof File ? file.name : undefined) || 'video.mp4',
      fileSize: file.size,
      duration: metadata.duration,
      format: metadata.format,
    })
    return { videoToUpload: file, metadata }
  }

  if (!sourceUri) {
    throw new Error('Invalid options: neither file nor sourceUri provided')
  }

  // Default metadata before compression
  let metadata: VideoMetadata = {
    duration: durationSeconds || 30,
    format: format || 'mp4',
  }

  // Attempt compression first, with graceful fallback
  let videoToUploadUri = sourceUri
  try {
    log.info('startUploadAndAnalysis', 'Starting video compression')
    const compressionResult = await compressVideo(sourceUri)

    log.info('startUploadAndAnalysis', 'Video compression completed', {
      compressedUri: compressionResult.compressedUri,
      size: compressionResult.metadata.size,
      duration: compressionResult.metadata.duration,
    })

    videoToUploadUri = compressionResult.compressedUri
    const compressedFormat = (compressionResult.metadata.format === 'mov' ? 'mov' : 'mp4') as
      | 'mp4'
      | 'mov'
    metadata = {
      duration: compressionResult.metadata.duration,
      format: compressedFormat,
    }
  } catch (compressionError) {
    log.warn(
      'startUploadAndAnalysis',
      'Video compression failed, using original video',
      compressionError
    )
    // Keep defaults and original URI
  }

  log.info('startUploadAndAnalysis', 'Converting video to Blob', { uri: videoToUploadUri })
  const videoToUpload = await uriToBlob(videoToUploadUri)
  return { videoToUpload, metadata }
}

/**
 * Upload the file/blob to storage with progress callbacks and store updates.
 */
async function uploadWithProgress(args: {
  videoToUpload: File | Blob
  metadata: VideoMetadata
  originalFilename?: string
  defaultFilename: string
  tempTaskId: string
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onUploadInitialized?: (context: {
    recordingId: number
    sessionId: number
    storagePath: string
  }) => void
  onRecordingIdAvailable?: (recordingId: number) => void
}): Promise<ReturnType<typeof uploadVideo>> {
  const {
    videoToUpload,
    metadata,
    originalFilename,
    defaultFilename,
    tempTaskId,
    onProgress,
    onError,
    onUploadInitialized,
    onRecordingIdAvailable,
  } = args

  log.info('startUploadAndAnalysis', 'Starting video upload to Supabase')
  useUploadProgressStore.getState().initializeUploadTask(tempTaskId, {
    fileSize: videoToUpload.size,
  })

  const uploadedVideo = await uploadVideo({
    file: videoToUpload,
    originalFilename: originalFilename || defaultFilename,
    durationSeconds: metadata.duration,
    format: metadata.format,
    onProgress: (progress: number) => {
      log.info('startUploadAndAnalysis', 'Upload progress', { progress })
      useUploadProgressStore.getState().updateUploadProgress(tempTaskId, {
        percentage: progress,
        bytesUploaded: Math.round((progress / 100) * videoToUpload.size),
      })
      onProgress?.(progress)
    },
    onError: (error: Error) => {
      log.error('startUploadAndAnalysis', 'Upload error', error)
      useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'failed', error.message)
      onError?.(error)
    },
    onUploadInitialized: ({ recordingId, sessionId, storagePath }) => {
      log.info('startUploadAndAnalysis', 'Upload initialized', {
        recordingId,
        sessionId,
        storagePath,
      })
      useUploadProgressStore.getState().setUploadTaskRecordingId(tempTaskId, recordingId)
      onUploadInitialized?.({ recordingId, sessionId, storagePath })
      onRecordingIdAvailable?.(recordingId)
    },
  })

  log.info('startUploadAndAnalysis', 'Video upload completed', {
    videoId: uploadedVideo.id,
    storagePath: uploadedVideo.storage_path,
    uploadStatus: uploadedVideo.upload_status,
  })

  return uploadedVideo
}

// Analysis is now auto-started server-side after upload; no client trigger needed.

/**
 * Orchestrates the complete video upload and analysis pipeline
 * Handles compression → upload → AI analysis in sequence
 */
export async function startUploadAndAnalysis(
  options: VideoUploadAndAnalysisOptions
): Promise<void> {
  const {
    sourceUri,
    file,
    originalFilename,
    durationSeconds,
    format,
    onProgress,
    onError,
    onUploadInitialized,
    onRecordingIdAvailable,
  } = options

  // Input validation
  if (!sourceUri && !file) {
    throw new Error('Either sourceUri or file must be provided')
  }

  // 1) Seed upload progress store with a temporary pending task so UI shows processing
  const defaultFilename = sourceUri ? extractFilenameFromUri(sourceUri) : 'video.mp4'
  const tempTaskId = seedUploadTask(originalFilename || defaultFilename, file)

  // 2) Process video in background (compression → upload → analysis)
  try {
    const { videoToUpload, metadata } = await resolveVideoToUpload({
      sourceUri,
      file,
      durationSeconds,
      format,
    })

    // Step 3: Upload with progress callbacks and store updates
    await uploadWithProgress({
      videoToUpload,
      metadata,
      originalFilename,
      defaultFilename,
      tempTaskId,
      onProgress,
      onError,
      onUploadInitialized,
      onRecordingIdAvailable,
    })

    // Mark the temporary task as completed
    useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'completed')

    // Analysis is auto-started in the backend after upload; UI will subscribe to updates
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('startUploadAndAnalysis', 'Failed to process video', errorMessage)
    // Update task status to failed if we haven't already
    useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'failed', errorMessage)
    onError?.(error instanceof Error ? error : new Error(errorMessage))
    throw error
  }
}
