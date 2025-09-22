/**
 * Storage Upload Utilities
 * Handles uploading files to Supabase Storage buckets
 */

import { createLogger } from '../logger.ts'
import {
  AUDIO_FORMATS,
  AudioFormat,
  getEnvDefaultFormat,
  validateAudioContentType,
  validateAudioFileExtension
} from '../media/audio.ts'

// Get signed URL TTL from environment, default to 15 minutes (900 seconds)
const getSignedUrlTtl = (): number => {
  const ttl = (globalThis as any).Deno?.env?.get('SUPABASE_SIGNED_URL_TTL_SECONDS')
  return ttl ? parseInt(ttl, 10) : 900
}

const logger = createLogger('storage-upload')

export interface UploadResult {
  path: string
  publicUrl?: string
  signedUrl?: string
  size: number
}

/**
 * Upload processed artifact to Supabase Storage
 * @param supabase Supabase client instance
 * @param storagePath Path within the bucket (e.g., 'audio/analysis_123/full.mp3')
 * @param bytes File content as Uint8Array
 * @param contentType MIME type (e.g., 'audio/aac', 'audio/mpeg')
 * @param bucket Bucket name (defaults to 'processed')
 * @param ttlSeconds Optional TTL for signed URLs (defaults to env SUPABASE_SIGNED_URL_TTL_SECONDS or 900)
 * @returns Upload result with signed URLs
 */
export async function uploadProcessedArtifact(
  supabase: any,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
  bucket: string = 'processed',
  ttlSeconds?: number
): Promise<UploadResult> {
  logger.info('Uploading processed artifact to storage', {
    storagePath,
    contentType,
    size: bytes.length,
    bucket
  })

  // Validate audio file types for processed bucket
  if (bucket === 'processed') {
    // Extract format from file extension
    const fileExtension = storagePath.toLowerCase().split('.').pop()
    const format = fileExtension === 'wav' ? 'wav' : fileExtension === 'mp3' ? 'mp3' : null

    if (!format) {
      const error = `Invalid audio file extension: ${fileExtension}. Only .wav and .mp3 files are allowed.`
      logger.error('Audio upload validation failed - invalid extension', { storagePath, fileExtension })
      throw new Error(error)
    }

    // Validate content type matches format
    if (!validateAudioContentType(contentType, format as AudioFormat)) {
      const error = `Content type ${contentType} does not match expected format for ${format} files`
      logger.error('Audio upload validation failed - content type mismatch', { contentType, format, storagePath })
      throw new Error(error)
    }

    // Validate file extension consistency
    if (!validateAudioFileExtension(storagePath, format as AudioFormat)) {
      const error = `File extension in path ${storagePath} does not match expected extension for ${format} format`
      logger.error('Audio upload validation failed - extension mismatch', { storagePath, format })
      throw new Error(error)
    }

    logger.info('Audio upload validation passed', { storagePath, format, contentType })
  }

  try {
    // Create a Blob from the bytes
    const blob = new Blob([bytes as BlobPart], { type: contentType })

    // Upload to Supabase Storage
    const { data: _data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType,
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      logger.error('Storage upload failed', error)
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    logger.info('Storage upload successful', {
      storagePath,
      size: bytes.length
    })

    // Generate signed URL with TTL (bucket is private)
    const ttl = ttlSeconds || getSignedUrlTtl()
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, ttl)

    if (signedUrlError) {
      logger.error('Failed to generate signed URL', signedUrlError)
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`)
    }

    logger.info('Signed URL generated successfully', {
      storagePath,
      ttl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    })

    return {
      path: storagePath,
      signedUrl: signedUrlData?.signedUrl,
      size: bytes.length
    }

  } catch (error) {
    logger.error('Failed to upload processed artifact', error)
    throw error
  }
}

/**
 * Generate a unique storage path for audio files
 * @param analysisId Analysis job ID
 * @param segmentId Optional segment identifier
 * @param format Audio format from central configuration
 * @returns Storage path
 */
export function generateAudioStoragePath(
  analysisId: string | number,
  segmentId?: string | number,
  format: AudioFormat = getEnvDefaultFormat()
): string {
  const timestamp = Date.now()
  const extension = AUDIO_FORMATS[format].extension

  if (segmentId) {
    return `processed/audio/analysis_${analysisId}/segments/segment_${segmentId}_${timestamp}.${extension}`
  } else {
    return `processed/audio/analysis_${analysisId}/full_${timestamp}.${extension}`
  }
}

/**
 * Health check for storage bucket existence and permissions
 * @param supabase Supabase client instance
 * @param bucket Bucket name to check (defaults to 'processed')
 * @returns Promise resolving to health check result
 */
export async function checkStorageHealth(
  supabase: any,
  bucket: string = 'processed'
): Promise<{ healthy: boolean; message: string; details?: any }> {
  try {
    logger.info('Starting storage health check', { bucket })

    // Check if bucket exists by listing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      const message = `Failed to list buckets: ${listError.message}`
      logger.error('Storage health check failed - cannot list buckets', { error: listError, bucket })
      return { healthy: false, message, details: { error: listError } }
    }

    const bucketExists = buckets?.some((b: any) => b.name === bucket)
    if (!bucketExists) {
      const message = `Bucket '${bucket}' does not exist`
      logger.error('Storage health check failed - bucket missing', { bucket, availableBuckets: buckets?.map((b: any) => b.name) })
      return { healthy: false, message, details: { availableBuckets: buckets?.map((b: any) => b.name) } }
    }

    // Test write permissions by attempting to upload a small health check file
    const healthCheckPath = `audio/healthcheck/health_${Date.now()}.txt`
    const healthCheckContent = new TextEncoder().encode('Health check file - can be safely deleted')
    const healthCheckContentType = 'text/plain'

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(healthCheckPath, healthCheckContent, {
          contentType: healthCheckContentType,
          upsert: false // Don't overwrite if exists
        })

      if (uploadError) {
        // 409 Conflict means file exists (which is fine for health check)
        if (uploadError.statusCode === 409) {
          logger.info('Health check file already exists, permissions verified', { bucket, healthCheckPath })
        } else {
          const message = `Failed to upload health check file: ${uploadError.message}`
          logger.error('Storage health check failed - upload permissions', { error: uploadError, bucket })
          return { healthy: false, message, details: { error: uploadError } }
        }
      } else {
        logger.info('Health check upload successful', { bucket, healthCheckPath })
      }

      // Clean up health check file if we created it
      if (!uploadError || uploadError.statusCode !== 409) {
        try {
          await supabase.storage.from(bucket).remove([healthCheckPath])
          logger.info('Cleaned up health check file', { bucket, healthCheckPath })
        } catch (cleanupError) {
          logger.warn('Failed to clean up health check file (non-critical)', { error: cleanupError, bucket, healthCheckPath })
        }
      }

    } catch (uploadException) {
      const message = `Exception during upload test: ${uploadException instanceof Error ? uploadException.message : String(uploadException)}`
      logger.error('Storage health check failed - upload exception', { error: uploadException, bucket })
      return { healthy: false, message, details: { error: uploadException } }
    }

    const message = `Bucket '${bucket}' is healthy and accessible`
    logger.info('Storage health check passed', { bucket })
    return { healthy: true, message }

  } catch (error) {
    const message = `Unexpected error during storage health check: ${error instanceof Error ? error.message : String(error)}`
    logger.error('Storage health check failed - unexpected error', { error, bucket })
    return { healthy: false, message, details: { error } }
  }
}
