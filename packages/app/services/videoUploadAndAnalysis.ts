/**
 * Shared service for video upload and analysis pipeline
 * Handles compression, upload, and AI analysis orchestration
 */

import { generateVideoThumbnail, supabase, uploadVideo, uploadVideoThumbnail } from '@my/api'
import { useVideoHistoryStore } from '@my/app/features/HistoryProgress/stores/videoHistory'
import { useAnalysisSubscriptionStore } from '@my/app/features/VideoAnalysis/stores/analysisSubscription'
import { useUploadProgressStore } from '@my/app/features/VideoAnalysis/stores/uploadProgress'
import { log } from '@my/logging'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { uriToBlob } from '../utils/files'
import { compressVideo } from './videoCompression'

export type VideoMetadata = { duration: number; format: 'mp4' | 'mov'; localUri?: string }

export interface VideoUploadAndAnalysisOptions {
  // Source options - provide either sourceUri OR file
  sourceUri?: string // For URIs that need compression and conversion
  file?: File | Blob // For already-processed files

  // Metadata hints (optional, will be computed if not provided)
  originalFilename?: string
  durationSeconds?: number
  format?: 'mp4' | 'mov'
  /** Local file URI for thumbnail generation when file is provided directly */
  localUri?: string

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
 * Check if a local URI points to a temporary/cache location that should be persisted.
 * Temporary paths are cleared by iOS/Android and need to be copied to Documents/recordings/
 */
function isTemporaryPath(localUri: string): boolean {
  return (
    localUri.includes('Caches/') ||
    localUri.includes('temp/') ||
    localUri.includes('tmp/') ||
    localUri.includes('ExponentAsset-') ||
    localUri.includes('ImagePicker/') ||
    localUri.includes('DocumentPicker/')
  )
}

/**
 * Check if a local URI is already in a persistent location (Documents/recordings/)
 */
function isPersistentPath(localUri: string): boolean {
  return localUri.includes('Documents/recordings/') || localUri.includes('Documents/recordings\\')
}

/**
 * Best-effort cleanup of temp compressed file.
 * Non-blocking, silent failure (compressor may already clean up its own temps).
 */
async function cleanupTempFile(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true })
    }
  } catch {
    // Silent failure - temp cleanup is best-effort
    // iOS/Android will eventually clean temp directories anyway
  }
}

/**
 * Generate thumbnail from video URI (unified for both recorded and uploaded videos)
 * Uses static import to avoid Metro bundling overhead in hot path
 */
async function generateThumbnail(videoUri: string, context: string): Promise<string | undefined> {
  if (Platform.OS === 'web' || !videoUri) {
    return undefined
  }

  try {
    const result = await generateVideoThumbnail(videoUri)
    if (result?.uri) {
      log.info('videoUploadAndAnalysis', `Thumbnail generated for ${context}`, {
        thumbnailLength: result.uri.length,
        thumbnailType: result.uri.startsWith('data:') ? 'data-url' : 'file-uri',
      })
      return result.uri
    }
  } catch (err) {
    log.warn('videoUploadAndAnalysis', `Thumbnail generation failed for ${context}`, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
  return undefined
}

/**
 * Resolve the file/blob to upload and its metadata from either a provided file
 * or a local URI that may need compression and conversion to Blob.
 *
 * UNIFIED BEHAVIOR:
 * - Both recorded (sourceUri) and uploaded (file + localUri) videos:
 *   1. Generate thumbnails from the original video URI
 *   2. Track localUri in device-local storage (localUriIndex) for fast access
 *   3. Go through the same upload pipeline
 */
async function resolveVideoToUpload(params: {
  sourceUri?: string
  file?: File | Blob
  durationSeconds?: number
  format?: 'mp4' | 'mov'
  /** Local file URI for thumbnail generation and persistence when file is provided directly */
  localUri?: string
}): Promise<{
  videoToUpload: File | Blob
  metadata: VideoMetadata
  thumbnailUri?: string
  thumbnailUrl?: string
}> {
  const { sourceUri, file, durationSeconds, format, localUri } = params

  // FILE PICKER PATH: localUri provided (native may not have file blob)
  // Native: file is undefined (avoids 28MB memory spike), uses localUri for compression
  // Web: file is provided as fallback
  if (localUri && !sourceUri) {
    log.info('startUploadAndAnalysis', 'Processing file picker video', {
      hasFile: !!file,
      fileSize: file?.size,
      duration: durationSeconds,
      format: format || 'mp4',
      localUri: localUri.substring(0, 80),
      isTemporary: isTemporaryPath(localUri),
      isPersistent: isPersistentPath(localUri),
    })

    // PERF: Start thumbnail generation in parallel with compression
    // Thumbnail uses original localUri, doesn't need to wait for compression
    const thumbnailPromise = generateThumbnail(localUri, 'uploaded video')

    // Compress the video from localUri (single blob creation after compression)
    let videoToUpload: File | Blob | undefined = undefined
    let finalFormat: 'mp4' | 'mov' = format || 'mp4'
    let compressedTempUri: string | undefined = undefined

    try {
      log.info('videoUploadAndAnalysis', 'Starting video compression for file picker video')
      const compressionResult = await compressVideo(localUri)
      compressedTempUri = compressionResult.compressedUri

      log.info('videoUploadAndAnalysis', 'File picker video compression completed', {
        compressedUri: compressionResult.compressedUri,
        compressedSize: compressionResult.metadata.size,
        duration: durationSeconds,
      })

      // Convert compressed URI to blob for upload (single blob creation)
      videoToUpload = await uriToBlob(compressionResult.compressedUri)
      finalFormat = (compressionResult.metadata.format === 'mov' ? 'mov' : 'mp4') as 'mp4' | 'mov'

      // Clean up temp compressed file after reading to blob (best-effort, non-blocking)
      // Note: react-native-compressor may already clean up its temp files
      if (compressedTempUri && compressedTempUri !== localUri) {
        void cleanupTempFile(compressedTempUri)
      }
    } catch (compressionError) {
      log.warn('videoUploadAndAnalysis', 'File picker video compression failed', {
        error:
          compressionError instanceof Error ? compressionError.message : String(compressionError),
      })

      // Fallback: use provided file blob if available, otherwise create from localUri
      if (file) {
        videoToUpload = file
      } else {
        log.info('videoUploadAndAnalysis', 'Creating fallback blob from localUri')
        videoToUpload = await uriToBlob(localUri)
      }
    }

    const metadata: VideoMetadata = {
      duration: durationSeconds || 30,
      format: finalFormat,
      localUri: localUri, // Store for persistence check later
    }

    // Await thumbnail (started in parallel, may already be done)
    const thumbnailUri = await thumbnailPromise

    return { videoToUpload, metadata, thumbnailUri, thumbnailUrl: undefined }
  }

  // RECORDED VIDEO PATH: sourceUri provided (from camera recording)
  if (!sourceUri) {
    throw new Error('Invalid options: neither file+localUri nor sourceUri provided')
  }

  // Store original sourceUri as localUri - this is the persistent saved video from camera
  const persistentLocalUri = sourceUri

  // PERF: Start thumbnail generation in parallel with compression
  // Thumbnail uses original sourceUri, doesn't need to wait for compression
  const thumbnailPromise = generateThumbnail(persistentLocalUri, 'recorded video')

  // Default metadata before compression
  let metadata: VideoMetadata = {
    duration: durationSeconds || 30,
    format: format || 'mp4',
  }

  // Attempt compression first, with graceful fallback
  let videoToUploadUri = sourceUri
  let compressedTempUri: string | undefined = undefined

  try {
    log.info('videoUploadAndAnalysis', 'Starting video compression for recorded video')
    const compressionResult = await compressVideo(sourceUri)
    compressedTempUri = compressionResult.compressedUri

    log.info('videoUploadAndAnalysis', 'Video compression completed', {
      compressedUri: compressionResult.compressedUri,
      size: compressionResult.metadata.size,
      duration: durationSeconds ? durationSeconds : undefined,
    })

    videoToUploadUri = compressionResult.compressedUri
    const compressedFormat = (compressionResult.metadata.format === 'mov' ? 'mov' : 'mp4') as
      | 'mp4'
      | 'mov'
    metadata = {
      duration: durationSeconds || 30,
      format: compressedFormat,
      // Keep original persistent localUri, not compressed temp path
      localUri: persistentLocalUri,
    }
  } catch (compressionError) {
    log.warn('videoUploadAndAnalysis', 'Video compression failed, using original video', {
      error:
        compressionError instanceof Error ? compressionError.message : String(compressionError),
    })
    // Keep defaults and original URI
  }

  // Ensure localUri is set in metadata
  metadata = { ...metadata, localUri: metadata.localUri ?? persistentLocalUri }

  log.info('startUploadAndAnalysis', 'Converting video to Blob', { uri: videoToUploadUri })
  const videoToUpload = await uriToBlob(videoToUploadUri)

  // Clean up temp compressed file after reading to blob (best-effort, non-blocking)
  // Note: react-native-compressor may already clean up its temp files
  if (compressedTempUri && compressedTempUri !== sourceUri) {
    void cleanupTempFile(compressedTempUri)
  }

  // Await thumbnail (started in parallel, may already be done)
  const thumbnailUri = await thumbnailPromise

  return {
    videoToUpload,
    metadata,
    thumbnailUri,
    thumbnailUrl: undefined,
  }
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
    // Only store thumbnailUri in DB metadata - localUri is device-specific
    // and maintained in localUriIndex (Zustand + AsyncStorage) instead
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

      // FIX 5: Create subscription EARLY when recordingId is available
      // This ensures subscription is active BEFORE server trigger fires (when upload completes)
      // Prevents race condition where job is created before subscription is ready
      // Backfill mechanism will still catch any missed events, but this eliminates the 500ms delay
      const subscriptionKey = `recording:${recordingId}`
      void useAnalysisSubscriptionStore
        .getState()
        .subscribe(subscriptionKey, { recordingId })
        .catch((error) => {
          log.warn('startUploadAndAnalysis', 'Early subscription setup failed (non-blocking)', {
            recordingId,
            error: error instanceof Error ? error.message : String(error),
            note: 'Subscription will be created when screen renders',
          })
        })

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
 * Upload thumbnail to cloud storage in background (fire-and-forget)
 * Optimized to use cached auth data and minimal DB queries
 */
async function uploadThumbnailInBackground(
  thumbnailUri: string,
  recordingId: number
): Promise<void> {
  // Get userId from cached auth (fast, no network call)
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error('User not authenticated')
  }

  // Query only created_at field (single field, primary key lookup - very fast)
  const { data: recording } = await supabase
    .from('video_recordings')
    .select('created_at')
    .eq('id', recordingId)
    .single()

  if (!recording) {
    throw new Error(`Video recording ${recordingId} not found`)
  }

  // Upload thumbnail (non-blocking, fire-and-forget)
  const cloudThumbnailUrl = await uploadVideoThumbnail(
    thumbnailUri,
    recordingId,
    userData.user.id,
    recording.created_at
  )

  if (cloudThumbnailUrl) {
    // Update video_recordings with thumbnail_url (non-blocking)
    await supabase
      .from('video_recordings')
      .update({ thumbnail_url: cloudThumbnailUrl })
      .eq('id', recordingId)

    log.info('startUploadAndAnalysis', 'Thumbnail uploaded to CDN', {
      recordingId,
      thumbnailUrl: cloudThumbnailUrl,
    })
  }
}

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
    localUri,
    onProgress,
    onError,
    onUploadInitialized,
    onRecordingIdAvailable,
  } = options

  // Input validation
  // Valid inputs: sourceUri (camera) OR file (web picker) OR localUri (native picker)
  if (!sourceUri && !file && !localUri) {
    throw new Error('Either sourceUri, file, or localUri must be provided')
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
      localUri,
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
        // UNIFIED PERSISTENCE: Persist video to recordings/ if it's in temporary location
        // This ensures both recorded and uploaded videos survive app restarts
        // Works for:
        // - Uploaded videos from ImagePicker/DocumentPicker (Library/Caches/...)
        // - Any other temporary paths that might get cleared by the OS
        if (metadata.localUri && Platform.OS !== 'web') {
          const localUri = metadata.localUri

          // Skip if already in persistent location
          if (isPersistentPath(localUri)) {
            // Compile-time stripping: DEBUG logs removed in production builds
            if (__DEV__) {
              log.debug(
                'startUploadAndAnalysis',
                'Video already in persistent location, skipping copy',
                {
                  recordingId: details.recordingId,
                  localUri: localUri.substring(0, 80),
                }
              )
            }

            // Even if already persisted, ensure the localUriIndex is populated
            // Use pre-imported store to avoid dynamic import overhead
            try {
              const historyStore = useVideoHistoryStore.getState()
              historyStore.setLocalUri(details.storagePath, localUri)
            } catch (error) {
              log.warn(
                'startUploadAndAnalysis',
                'Failed to update localUri index for persisted video',
                {
                  recordingId: details.recordingId,
                  localUri: localUri.substring(0, 80),
                  error: error instanceof Error ? error.message : String(error),
                }
              )
            }
          } else if (isTemporaryPath(localUri)) {
            // Persist to Documents/recordings/ for offline playback
            const recordingsDir = `${FileSystem.documentDirectory}recordings/`
            const persistedPath = `${recordingsDir}analysis_${details.recordingId}.mp4`

            log.info(
              'startUploadAndAnalysis',
              'Persisting temporary video to recordings directory',
              {
                recordingId: details.recordingId,
                from: localUri.substring(0, 80),
                to: persistedPath.substring(0, 80),
              }
            )

            // Persist video asynchronously (non-blocking)
            FileSystem.getInfoAsync(recordingsDir)
              .then((dirInfo) => {
                if (!dirInfo.exists) {
                  return FileSystem.makeDirectoryAsync(recordingsDir, {
                    intermediates: true,
                  })
                }
                return Promise.resolve()
              })
              .then(() => FileSystem.copyAsync({ from: localUri, to: persistedPath }))
              .then(async () => {
                // Update history store index with persisted path
                // Use pre-imported store to avoid dynamic import overhead
                try {
                  const historyStore = useVideoHistoryStore.getState()
                  historyStore.setLocalUri(details.storagePath, persistedPath)

                  log.info('startUploadAndAnalysis', 'Video persisted successfully', {
                    recordingId: details.recordingId,
                    from: localUri.substring(0, 80),
                    to: persistedPath.substring(0, 80),
                    storagePath: details.storagePath,
                  })
                } catch (error) {
                  // Store update can fail (state corruption, etc.)
                  // This is non-critical - video is already persisted, just missing index update
                  log.warn('startUploadAndAnalysis', 'Failed to update store index', {
                    recordingId: details.recordingId,
                    error: error instanceof Error ? error.message : String(error),
                    note: 'Video persisted successfully, but localUri index not updated',
                  })
                  // Don't rethrow - video persistence succeeded, index update is non-critical
                }
              })
              .catch((error) => {
                log.warn('startUploadAndAnalysis', 'Failed to persist temporary video', {
                  recordingId: details.recordingId,
                  from: localUri.substring(0, 80),
                  to: persistedPath,
                  error: error instanceof Error ? error.message : String(error),
                })
              })
          } else {
            // Compile-time stripping: DEBUG logs removed in production builds
            if (__DEV__) {
              log.debug(
                'startUploadAndAnalysis',
                'Video path is not temporary, skipping persistence',
                {
                  recordingId: details.recordingId,
                  localUri: localUri.substring(0, 80),
                }
              )
            }
          }
        }

        // Upload thumbnail to cloud storage after getting recording ID
        // Fire-and-forget: non-blocking, uses cached auth data
        if (thumbnailUri) {
          void uploadThumbnailInBackground(thumbnailUri, details.recordingId).catch((err) => {
            log.warn('startUploadAndAnalysis', 'Cloud thumbnail upload failed (non-blocking)', {
              error: err instanceof Error ? err.message : String(err),
            })
          })
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
