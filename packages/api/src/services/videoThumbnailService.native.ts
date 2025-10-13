// @ts-nocheck - expo-video-thumbnails only available in expo-app workspace
import { log } from '@my/logging'
import * as VideoThumbnails from 'expo-video-thumbnails'

/**
 * Generate video thumbnail using expo-video-thumbnails (native platforms)
 *
 * @param videoUri - Local file URI to video (file://)
 * @returns Thumbnail URI or null if generation fails
 */
export async function generateVideoThumbnail(videoUri: string): Promise<{ uri: string } | null> {
  try {
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
