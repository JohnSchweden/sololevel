import { log } from '@my/logging'
import {
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system'

const THUMBNAIL_DIR = `${documentDirectory}thumbnails/`

// Promise-based lock to prevent concurrent directory creation
let directoryInitPromise: Promise<void> | null = null

/**
 * Ensure thumbnails directory exists
 * Creates directory if it doesn't exist
 * Handles concurrent calls safely (only one creation attempt)
 */
export async function ensureThumbnailDirectory(): Promise<void> {
  // If directory creation is already in progress, wait for it
  if (directoryInitPromise) {
    return directoryInitPromise
  }

  // Start directory creation
  directoryInitPromise = (async () => {
    try {
      const info = await getInfoAsync(THUMBNAIL_DIR)
      if (!info.exists) {
        try {
          await makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true })
          log.info('thumbnailCache', 'Created thumbnails directory', { THUMBNAIL_DIR })
        } catch (createError) {
          // Directory might have been created by concurrent call - check again
          const recheck = await getInfoAsync(THUMBNAIL_DIR)
          if (!recheck.exists) {
            // Real error, rethrow
            throw createError
          }
          // Directory exists now (created by another process), continue
          log.debug('thumbnailCache', 'Directory created concurrently, proceeding', {
            THUMBNAIL_DIR,
          })
        }
      }
      // Clear promise on success so future calls check again
      directoryInitPromise = null
    } catch (error) {
      // Clear promise on error so retry is possible
      directoryInitPromise = null
      log.error('thumbnailCache', 'Failed to ensure thumbnails directory', {
        error: error instanceof Error ? error.message : String(error),
        THUMBNAIL_DIR,
      })
      throw error
    }
  })()

  return directoryInitPromise
}

/**
 * Get cached thumbnail path for a video ID
 * @param videoId - Video recording ID
 * @returns File path for cached thumbnail
 */
export function getCachedThumbnailPath(videoId: number): string {
  return `${THUMBNAIL_DIR}${videoId}.jpg`
}

/**
 * Download and persist thumbnail from remote URL to disk
 * @param videoId - Video recording ID
 * @param remoteUrl - Remote URL to download thumbnail from
 * @returns Path to persisted thumbnail file
 * @throws Error if download fails
 */
export async function persistThumbnailFile(videoId: number, remoteUrl: string): Promise<string> {
  try {
    await ensureThumbnailDirectory()
    const target = getCachedThumbnailPath(videoId)

    await downloadAsync(remoteUrl, target)

    log.info('thumbnailCache', 'Thumbnail persisted to disk', {
      videoId,
      path: target,
    })
    return target
  } catch (error) {
    log.error('thumbnailCache', 'Failed to persist thumbnail', {
      videoId,
      remoteUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Get thumbnail storage usage statistics
 * @returns Storage stats with file count and size in MB
 */
export async function getThumbnailStorageUsage(): Promise<{
  count: number
  sizeMB: number
}> {
  try {
    await ensureThumbnailDirectory()
    const files = await readDirectoryAsync(THUMBNAIL_DIR)

    // Filter to jpg files (thumbnails)
    const thumbnailFiles = files.filter((file) => file.endsWith('.jpg'))

    let totalSize = 0
    const fileInfos = await Promise.all(
      thumbnailFiles.map((file) => getInfoAsync(`${THUMBNAIL_DIR}${file}`))
    )

    for (const info of fileInfos) {
      if (info.exists && 'size' in info) {
        totalSize += info.size || 0
      }
    }

    return {
      count: thumbnailFiles.length,
      sizeMB: totalSize / (1024 * 1024),
    }
  } catch (error) {
    log.error('thumbnailCache', 'Failed to get thumbnail storage usage', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
