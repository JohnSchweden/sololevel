import { log } from '@my/logging'

/**
 * Generate video thumbnail using expo-video-thumbnails (native platforms)
 *
 * @param videoUri - Local file URI to video (file://)
 * @returns Thumbnail URI or null if generation fails
 */
export async function generateVideoThumbnail(videoUri: string): Promise<{ uri: string } | null> {
  try {
    // Dynamic import for native platform only (Metro will resolve at runtime)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - expo-video-thumbnails only available in expo-app (native environment)
    const VideoThumbnails = await import('expo-video-thumbnails')

    const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // Extract frame at 1 second
      quality: 0.8, // 80% quality
    })

    log.debug('videoThumbnailService', 'Thumbnail generated successfully', {
      videoUri,
      thumbnailUri: thumbnail.uri,
    })

    return thumbnail
  } catch (error) {
    log.error('videoThumbnailService', 'Failed to generate thumbnail', {
      videoUri,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
