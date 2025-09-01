/**
 * Video File Validation Utilities
 * Handles format, duration, and size validation for video uploads
 * Cross-platform compatible for web and native
 */

export interface VideoValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    duration: number
    size: number
    format: string
    width?: number
    height?: number
    bitrate?: number
    codec?: string
  }
}

export interface VideoValidationOptions {
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  allowedFormats?: string[]
  requireAudio?: boolean
  minDurationSeconds?: number
  minResolution?: { width: number; height: number }
  maxResolution?: { width: number; height: number }
}

const DEFAULT_OPTIONS: Required<VideoValidationOptions> = {
  maxDurationSeconds: 60,
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  allowedFormats: ['video/mp4', 'video/quicktime', 'video/mov'],
  requireAudio: false,
  minDurationSeconds: 1,
  minResolution: { width: 320, height: 240 },
  maxResolution: { width: 4096, height: 2160 },
}

/**
 * Validate video file format, duration, and size
 */
export async function validateVideoFile(
  file: File,
  options: VideoValidationOptions = {}
): Promise<VideoValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const errors: string[] = []
  const warnings: string[] = []

  // Basic file validation
  if (!file) {
    errors.push('No file provided')
    return { isValid: false, errors, warnings }
  }

  // Format validation
  if (!opts.allowedFormats.includes(file.type)) {
    errors.push(`Invalid format. Supported formats: ${opts.allowedFormats.join(', ')}`)
  }

  // Size validation
  if (file.size > opts.maxFileSizeBytes) {
    errors.push(`File too large. Maximum size: ${formatFileSize(opts.maxFileSizeBytes)}`)
  }

  if (file.size === 0) {
    errors.push('File is empty')
  }

  // Get video metadata
  let metadata: VideoValidationResult['metadata']
  try {
    metadata = await getVideoMetadata(file)

    // Duration validation
    if (metadata.duration > opts.maxDurationSeconds) {
      errors.push(`Video too long. Maximum duration: ${opts.maxDurationSeconds} seconds`)
    }

    if (metadata.duration < opts.minDurationSeconds) {
      errors.push(`Video too short. Minimum duration: ${opts.minDurationSeconds} seconds`)
    }

    if (metadata.duration === 0) {
      errors.push('Video has no duration')
    }

    // Resolution validation
    if (metadata.width && metadata.height) {
      const { width, height } = metadata

      // Minimum resolution check
      if (width < opts.minResolution.width || height < opts.minResolution.height) {
        errors.push(
          `Video resolution too low. Minimum: ${opts.minResolution.width}x${opts.minResolution.height}`
        )
      }

      // Maximum resolution check
      if (width > opts.maxResolution.width || height > opts.maxResolution.height) {
        warnings.push(`Video resolution very high. May cause performance issues.`)
      }

      // Quality warnings based on resolution
      const resolution = width * height
      if (resolution < 720 * 1280) {
        warnings.push(
          'Video resolution is quite low. Consider using higher quality for better analysis.'
        )
      }

      // Aspect ratio warnings
      const aspectRatio = width / height
      if (aspectRatio < 0.5 || aspectRatio > 2.0) {
        warnings.push('Video has unusual aspect ratio. Square or 16:9 recommended.')
      }
    }

    // File size vs duration warnings
    const bitrate = (file.size * 8) / metadata.duration // bits per second
    if (bitrate < 500000) {
      warnings.push('Video quality appears to be very low. Consider using higher bitrate.')
    } else if (bitrate > 10000000) {
      warnings.push('Video bitrate is very high. File size may be unnecessarily large.')
    }

    // Format-specific warnings
    if (file.type === 'video/quicktime' || file.type === 'video/mov') {
      warnings.push('MOV format detected. MP4 recommended for better compatibility.')
    }
  } catch (_error) {
    errors.push('Unable to read video metadata. File may be corrupted or unsupported format.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  }
}

/**
 * Get video metadata using cross-platform approach
 * Web: HTML5 video element
 * Native: File system metadata extraction
 */
function getVideoMetadata(file: File): Promise<{
  duration: number
  size: number
  format: string
  width?: number
  height?: number
  bitrate?: number
  codec?: string
}> {
  return new Promise((resolve, reject) => {
    // Web platform - use HTML5 video element
    if (typeof document !== 'undefined' && 'createElement' in document) {
      const video = document.createElement('video')
      const url = URL.createObjectURL(file)

      video.preload = 'metadata'
      video.muted = true // Prevent audio playback

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        const bitrate = file.size > 0 ? (file.size * 8) / video.duration : 0
        resolve({
          duration: video.duration,
          size: file.size,
          format: file.type,
          width: video.videoWidth,
          height: video.videoHeight,
          bitrate: bitrate,
          codec: getVideoCodec(file.type),
        })
      }

      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load video metadata'))
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        URL.revokeObjectURL(url)
        reject(new Error('Timeout loading video metadata'))
      }, 10000)

      video.src = url
    } else {
      // Native platform - use file metadata
      // For native, we'll use basic file info and estimate duration from size
      // In a real native implementation, you'd use platform-specific APIs
      const estimatedBitrate = 2000000 // 2Mbps average
      const estimatedDuration = file.size / (estimatedBitrate / 8)

      resolve({
        duration: estimatedDuration,
        size: file.size,
        format: file.type,
        bitrate: estimatedBitrate,
        codec: getVideoCodec(file.type),
      })
    }
  })
}

/**
 * Get video codec information from file type
 */
function getVideoCodec(mimeType: string): string {
  switch (mimeType) {
    case 'video/mp4':
      return 'H.264/AVC'
    case 'video/quicktime':
    case 'video/mov':
      return 'H.264/AVC (MOV)'
    default:
      return 'Unknown'
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format duration in MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if file type is supported video format
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') && DEFAULT_OPTIONS.allowedFormats.includes(file.type)
}

/**
 * Get video thumbnail from file
 */
export function getVideoThumbnail(file: File, timeSeconds = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const url = URL.createObjectURL(file)

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      video.currentTime = Math.min(timeSeconds, video.duration)
    }

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(url)
      resolve(thumbnail)
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to generate thumbnail'))
    }

    video.src = url
  })
}
