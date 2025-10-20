import { log } from '@my/logging'

/**
 * Generate video thumbnail using Canvas API (web platform)
 *
 * @param videoUri - Video URL (http://, https://, or blob:)
 * @returns Data URL of thumbnail or null if generation fails
 */
export async function generateVideoThumbnail(videoUri: string): Promise<{ uri: string } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      log.error('videoThumbnailService', 'Canvas context not available (web)', { videoUri })
      resolve(null)
      return
    }

    video.crossOrigin = 'anonymous' // Handle CORS

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      video.currentTime = Math.min(1.0, video.duration) // 1 second or video duration
    }

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8) // 80% quality

        log.debug('videoThumbnailService', 'Thumbnail generated successfully (web)', {
          videoUri,
          dataUrlLength: dataUrl.length,
        })

        resolve({ uri: dataUrl })
      } catch (error) {
        log.error('videoThumbnailService', 'Failed to generate thumbnail (web)', {
          videoUri,
          error: error instanceof Error ? error.message : String(error),
        })
        resolve(null)
      }
    }

    video.onerror = (error) => {
      log.error('videoThumbnailService', 'Failed to load video (web)', {
        videoUri,
        error: String(error),
      })
      resolve(null)
    }

    video.src = videoUri
  })
}

// Re-export shared upload function (platform-agnostic)
export { uploadVideoThumbnail } from './videoThumbnailUpload'
