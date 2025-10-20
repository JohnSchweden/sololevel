/**
 * Shared upload logic for video thumbnails
 * Platform-agnostic implementation using Web APIs
 * Imported by .native.ts and .web.ts for consistent exports
 */

import { log } from '@my/logging'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system'
import { supabase } from '../supabase'

/**
 * Upload video thumbnail to Supabase Storage with immutable CDN caching
 * @param thumbnailUri - Local URI or data URL of thumbnail
 * @param videoId - Video recording ID
 * @param userId - User UUID
 * @param createdAtIso - ISO timestamp from video_recordings.created_at
 * @param retryCount - Internal retry counter (0 = first attempt, 1 = retry)
 * @returns Public CDN URL of uploaded thumbnail, or null on failure
 */
export async function uploadVideoThumbnail(
  thumbnailUri: string,
  videoId: number,
  userId: string,
  createdAtIso: string,
  retryCount = 0
): Promise<string | null> {
  try {
    // Extract yyyymmdd date folder for organization
    const yyyymmdd = createdAtIso.slice(0, 10).replace(/-/g, '')

    // For hashing: read file and convert to base64
    const base64 = await FileSystem.readAsStringAsync(thumbnailUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Hash the base64 data using expo-crypto
    const fullHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64)
    const hash = fullHash.slice(0, 16)

    const filePath = `${userId}/videos/${yyyymmdd}/${videoId}/${hash}.jpg`

    // Use FormData with the file URI for upload (React Native compatible)
    const formData = new FormData()
    formData.append('file', {
      uri: thumbnailUri,
      type: 'image/jpeg',
      name: 'thumbnail.jpg',
    } as any)

    // Get signed upload URL
    const { data: uploadData, error: uploadUrlError } = await supabase.storage
      .from('thumbnails')
      .createSignedUploadUrl(filePath)

    if (uploadUrlError || !uploadData) {
      throw new Error(uploadUrlError?.message || 'Failed to create signed upload URL')
    }

    // Upload using fetch with FormData
    const uploadResponse = await fetch(uploadData.signedUrl, {
      method: 'PUT',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`
      )
    }

    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(filePath)

    log.info('videoThumbnailService', 'Thumbnail uploaded to CDN', {
      videoId,
      path: filePath,
      url: urlData.publicUrl,
    })

    return urlData.publicUrl
  } catch (error) {
    // Retry once on failure
    if (retryCount === 0) {
      log.warn('videoThumbnailService', 'Thumbnail upload failed, retrying once', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      })
      return uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso, 1)
    }

    // Final failure after retry
    log.error('videoThumbnailService', 'Failed to upload thumbnail after retry', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
