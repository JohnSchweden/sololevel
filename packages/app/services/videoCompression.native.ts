/**
 * Video compression utility for native platforms (iOS/Android)
 * Uses react-native-compressor for client-side compression
 */

import Constants from 'expo-constants'

import { log } from '@my/logging'

export interface CompressionOptions {
  quality?: 'low' | 'medium' | 'high'
  maxSize?: number // bytes
  targetBitrate?: number // bps
}

export interface CompressionResult {
  compressedUri: string
  metadata: {
    size: number
    duration: number
    format?: string
  }
}

/**
 * Compress video file for native platforms using react-native-video-processing
 */
export async function compressVideo(
  fileUri: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  if (!fileUri || typeof fileUri !== 'string') {
    throw new Error('Invalid file URI provided')
  }

  // Basic URI validation for native
  if (!fileUri.startsWith('file://')) {
    throw new Error('Native compression requires file:// URI')
  }

  const ownership = Constants?.appOwnership ?? null

  if (ownership === 'expo' || ownership === 'guest') {
    log.warn('Skipping native compression inside Expo Go', { fileUri })

    const metadata = await getVideoMetadata(fileUri)

    return {
      compressedUri: fileUri,
      metadata,
    }
  }

  try {
    const originalMetadata = await getVideoMetadata(fileUri)

    log.info('Starting video compression', { fileUri, options })

    // Import react-native-compressor dynamically
    const { Video } = await import('react-native-compressor')

    // Set default options
    const quality = options.quality ?? 'medium'
    const compressionOptions: Record<string, unknown> = {
      compressionMethod: 'auto',
      quality,
      bitrate: options.targetBitrate ?? getBitrateForQuality(quality),
    }

    if (typeof options.maxSize === 'number') {
      compressionOptions.maxSize = options.maxSize
    }

    const compressedUri = await Video.compress(fileUri, compressionOptions)

    // Get metadata of compressed video
    const compressedMetadata = await getCompressedVideoMetadata(compressedUri)

    const compressionRatio =
      originalMetadata.size > 0 && compressedMetadata.size > 0
        ? 1 - compressedMetadata.size / originalMetadata.size
        : null

    log.info('Video compression completed', {
      originalUri: fileUri,
      compressedUri,
      originalSize: originalMetadata.size,
      compressedSize: compressedMetadata.size,
      compressionRatio,
    })

    return {
      compressedUri,
      metadata: {
        ...compressedMetadata,
        duration: compressedMetadata.duration || originalMetadata.duration,
        format: compressedMetadata.format || originalMetadata.format,
      },
    }
  } catch (error) {
    log.error('Video compression failed', { fileUri, error })

    // Graceful degradation - return original URI with basic metadata
    try {
      const fallbackMetadata = await getVideoMetadata(fileUri)
      return {
        compressedUri: fileUri, // Return original if compression fails
        metadata: fallbackMetadata,
      }
    } catch (metadataError) {
      log.error('Failed to get fallback metadata', { metadataError })

      // Ultimate fallback
      return {
        compressedUri: fileUri,
        metadata: {
          size: 0,
          duration: 0,
          format: 'unknown',
        },
      }
    }
  }
}

/**
 * Get bitrate based on quality setting
 */
function getBitrateForQuality(quality: 'low' | 'medium' | 'high'): number {
  switch (quality) {
    case 'low':
      return 1000000 // 1Mbps
    case 'high':
      return 4000000 // 4Mbps
    default:
      return 2000000 // 2Mbps
  }
}

/**
 * Get metadata for compressed video
 */
async function getCompressedVideoMetadata(
  compressedUri: string
): Promise<CompressionResult['metadata']> {
  try {
    // In test environment, return mock metadata
    if (process.env.NODE_ENV === 'test') {
      return {
        size: 1024 * 1024, // 1MB mock size
        duration: 30, // 30 seconds mock duration
        format: getFormatFromUri(compressedUri),
      }
    }

    // Use expo-file-system or react-native-fs to get file info
    const { getInfoAsync } = await import('expo-file-system')

    const fileInfo = await getInfoAsync(compressedUri, { size: true })

    return {
      size: (fileInfo as any).size || 0,
      duration: 0, // Would need additional processing to get duration
      format: getFormatFromUri(compressedUri),
    }
  } catch (error) {
    log.warn('Failed to get compressed video metadata', { compressedUri, error })

    return {
      size: 0,
      duration: 0,
      format: getFormatFromUri(compressedUri),
    }
  }
}

/**
 * Get basic metadata for original video
 */
async function getVideoMetadata(fileUri: string): Promise<CompressionResult['metadata']> {
  try {
    // In test environment, return mock metadata
    if (process.env.NODE_ENV === 'test') {
      return {
        size: 2 * 1024 * 1024, // 2MB mock size for original
        duration: 30, // 30 seconds mock duration
        format: getFormatFromUri(fileUri),
      }
    }

    const { getInfoAsync } = await import('expo-file-system')
    const fileInfo = await getInfoAsync(fileUri, { size: true })

    return {
      size: (fileInfo as any).size || 0,
      duration: 0, // Would need video processing to get duration
      format: getFormatFromUri(fileUri),
    }
  } catch (error) {
    log.warn('Failed to get video metadata', { fileUri, error })

    return {
      size: 0,
      duration: 0,
      format: getFormatFromUri(fileUri),
    }
  }
}

/**
 * Extract format from URI
 */
function getFormatFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase()
  return extension || 'mp4'
}
