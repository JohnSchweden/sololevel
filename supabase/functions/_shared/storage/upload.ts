/**
 * Storage Upload Utilities
 * Handles uploading files to Supabase Storage buckets
 */

import { createLogger } from '../logger.ts'
import { AUDIO_FORMATS, AudioFormat, getEnvDefaultFormat } from '../media/audio.ts'

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
 * @returns Upload result with URLs
 */
export async function uploadProcessedArtifact(
  supabase: any,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
  bucket: string = 'processed'
): Promise<UploadResult> {
  logger.info('Uploading processed artifact to storage', {
    storagePath,
    contentType,
    size: bytes.length,
    bucket
  })

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

    // Get public URL (assuming bucket allows public access)
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    return {
      path: storagePath,
      publicUrl: publicUrlData?.publicUrl,
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
    return `audio/analysis_${analysisId}/segments/segment_${segmentId}_${timestamp}.${extension}`
  } else {
    return `audio/analysis_${analysisId}/full_${timestamp}.${extension}`
  }
}
