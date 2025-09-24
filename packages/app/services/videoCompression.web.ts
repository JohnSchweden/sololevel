/**
 * Video compression utility for web platform
 * Web implementation - passthrough with basic metadata extraction
 */

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
 * Compress video file for web platform
 * Currently a passthrough - web browsers don't support client-side video compression
 * In future, could use WebCodecs API or WebAssembly codecs
 */
export async function compressVideo(
  fileUri: string,
  _options?: CompressionOptions
): Promise<CompressionResult> {
  // For web, we can't actually compress videos client-side
  // This is a passthrough implementation that validates the URI and returns metadata

  if (!fileUri || typeof fileUri !== 'string') {
    throw new Error('Invalid file URI provided')
  }

  // Basic URI validation
  if (
    !fileUri.startsWith('blob:') &&
    !fileUri.startsWith('file://') &&
    !fileUri.startsWith('http')
  ) {
    throw new Error('Unsupported URI format for compression')
  }

  try {
    // For web platform, we return the original URI with estimated metadata
    // In a real implementation, this could use MediaRecorder or WebCodecs
    const metadata = await getVideoMetadata(fileUri)

    return {
      compressedUri: fileUri, // No actual compression on web
      metadata,
    }
  } catch (error) {
    // Graceful degradation - return original URI with minimal metadata
    // Removed console.warn as per linting rules

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

/**
 * Get basic video metadata for web platform
 */
async function getVideoMetadata(_fileUri: string): Promise<CompressionResult['metadata']> {
  // For web, we can't easily get file size from URI
  // This would need to be passed in or estimated

  return {
    size: 0, // Would need to be provided or estimated
    duration: 0, // Would need HTML5 video element to get duration
    format: 'mp4', // Assume MP4 for web
  }
}
