/**
 * Shared service for video upload and analysis pipeline
 * Handles compression, upload, and AI analysis orchestration
 */

import { supabase, uploadVideo, uploadVideoThumbnail } from '@my/api'
import { useUploadProgressStore } from '@my/app/features/VideoAnalysis/stores/uploadProgress'
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
  onRecordingIdAvailable?: (recordingId: number) => void
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
}): Promise<{
  videoToUpload: File | Blob
  metadata: VideoMetadata
  thumbnailUri?: string
  thumbnailUrl?: string
}> {
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
    // No thumbnail generation for pre-processed files (P0 scope)
    return { videoToUpload: file, metadata, thumbnailUri: undefined, thumbnailUrl: undefined }
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
  let thumbnailUri: string | undefined
  try {
    log.info('videoUploadAndAnalysis', 'Starting video compression')
    const compressionResult = await compressVideo(sourceUri)

    log.info('videoUploadAndAnalysis', 'Video compression completed', {
      compressedUri: compressionResult.compressedUri,
      size: compressionResult.metadata.size,
      duration: durationSeconds ? durationSeconds : undefined,
    })

    // Generate thumbnail (non-blocking - errors logged but don't fail upload)
    try {
      const { generateVideoThumbnail } = await import('@my/api')
      const result = await generateVideoThumbnail(sourceUri)
      thumbnailUri = result?.uri

      if (thumbnailUri) {
        log.info('videoUploadAndAnalysis', 'Thumbnail generated successfully', {
          thumbnailLength: thumbnailUri.length,
          thumbnailType: thumbnailUri.startsWith('data:') ? 'data-url' : 'file-uri',
        })
      }
    } catch (err) {
      log.warn('videoUploadAndAnalysis', 'Thumbnail generation failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      thumbnailUri = undefined
    }

    videoToUploadUri = compressionResult.compressedUri
    const compressedFormat = (compressionResult.metadata.format === 'mov' ? 'mov' : 'mp4') as
      | 'mp4'
      | 'mov'
    metadata = {
      duration: durationSeconds || 30,
      format: compressedFormat,
    }
  } catch (compressionError) {
    log.warn('videoUploadAndAnalysis', 'Video compression failed, using original video', {
      error:
        compressionError instanceof Error ? compressionError.message : String(compressionError),
    })
    // Keep defaults and original URI
  }

  log.info('startUploadAndAnalysis', 'Converting video to Blob', { uri: videoToUploadUri })
  const videoToUpload = await uriToBlob(videoToUploadUri)
  return { videoToUpload, metadata, thumbnailUri, thumbnailUrl: undefined }
}

/**
 * Upload the file/blob to storage with progress callbacks and store updates.
 */
async function uploadWithProgress(args: {
  videoToUpload: File | Blob
  metadata: VideoMetadata
  thumbnailUri?: string
  thumbnailUrl?: string
  originalFilename?: string
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
    thumbnailUri,
    thumbnailUrl,
    originalFilename,
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
    originalFilename: originalFilename || `video.${metadata.format}`,
    durationSeconds: metadata.duration,
    format: metadata.format,
    metadata: thumbnailUri ? { thumbnailUri } : undefined,
    thumbnailUrl: thumbnailUrl || null,
    onProgress: (progress: number) => {
      log.info('startUploadAndAnalysis', 'Upload progress', { progress })
      useUploadProgressStore.getState().updateUploadProgress(tempTaskId, {
        percentage: progress,
        bytesUploaded: Math.round((progress / 100) * videoToUpload.size),
      })
      onProgress?.(progress)
    },
    onError: (error: Error) => {
      log.error('videoUploadAndAnalysis', 'Upload error', { error: error.message })
      useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'failed', error.message)
      onError?.(error)
    },
    onUploadInitialized: ({ recordingId, sessionId, storagePath }) => {
      log.info('startUploadAndAnalysis', 'Upload initialized', {
        recordingId,
        videoRecordingId: recordingId,
        sessionId,
        storagePath,
      })
      useUploadProgressStore.getState().setUploadTaskRecordingId(tempTaskId, recordingId)
      onRecordingIdAvailable?.(recordingId)
      onUploadInitialized?.({ recordingId, sessionId, storagePath })
    },
  })

  log.info('startUploadAndAnalysis', 'Video upload completed', {
    videoId: uploadedVideo.id,
    recordingId: uploadedVideo.id,
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
  const tempTaskId = seedUploadTask(originalFilename || 'video.mp4', file)

  // 2) Process video in background (compression → upload → analysis)
  try {
    const { videoToUpload, metadata, thumbnailUri } = await resolveVideoToUpload({
      sourceUri,
      file,
      durationSeconds,
      format,
    })

    // Log thumbnail generation success
    if (thumbnailUri) {
      log.info('startUploadAndAnalysis', 'Thumbnail generated and will be stored in metadata', {
        thumbnailUri: thumbnailUri.substring(0, 50),
        thumbnailType: thumbnailUri.startsWith('data:') ? 'data-url' : 'file-uri',
      })
    }

    // Step 3: Upload with progress callbacks and store updates
    // Cloud thumbnail upload happens in onUploadInitialized callback after we get recording ID
    let cloudThumbnailUrl: string | null = null

    await uploadWithProgress({
      videoToUpload,
      metadata,
      thumbnailUri,
      thumbnailUrl: undefined, // Will be uploaded after getting recordingId
      originalFilename,
      tempTaskId,
      onProgress,
      onError,
      onUploadInitialized: async (details) => {
        // Upload thumbnail to cloud storage after getting recording ID
        if (thumbnailUri) {
          try {
            // Get user from supabase
            const { data: userData } = await supabase.auth.getUser()
            if (userData.user) {
              // Get video recording to get created_at timestamp
              const { data: recording } = await supabase
                .from('video_recordings')
                .select('created_at')
                .eq('id', details.recordingId)
                .single()

              if (recording) {
                cloudThumbnailUrl = await uploadVideoThumbnail(
                  thumbnailUri,
                  details.recordingId,
                  userData.user.id,
                  recording.created_at
                )

                if (cloudThumbnailUrl) {
                  // Update video_recordings with thumbnail_url
                  await supabase
                    .from('video_recordings')
                    .update({ thumbnail_url: cloudThumbnailUrl })
                    .eq('id', details.recordingId)

                  log.info('startUploadAndAnalysis', 'Thumbnail uploaded to CDN', {
                    recordingId: details.recordingId,
                    thumbnailUrl: cloudThumbnailUrl,
                  })
                }
              }
            }
          } catch (err) {
            log.warn('startUploadAndAnalysis', 'Cloud thumbnail upload failed (non-blocking)', {
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }

        // Call original callback
        onUploadInitialized?.(details)
      },
      onRecordingIdAvailable,
    })

    // Mark the temporary task as completed
    useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'completed')

    // Analysis is auto-started in the backend after upload; UI will subscribe to updates
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('videoUploadAndAnalysis', 'Failed to process video', { error: errorMessage })
    // Update task status to failed if we haven't already
    useUploadProgressStore.getState().setUploadStatus(tempTaskId, 'failed', errorMessage)
    onError?.(error instanceof Error ? error : new Error(errorMessage))
    throw error
  }
}
