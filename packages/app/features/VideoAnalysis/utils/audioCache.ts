import { log } from '@my/logging'
import {
  deleteAsync,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system'

const AUDIO_DIR = `${documentDirectory}feedback-audio/`

export const MAX_AUDIO_STORAGE_MB = 100

/**
 * Extract audio file extension from URL or storage path
 * Supports common audio formats: wav, mp3, aac, m4a
 * Defaults to 'wav' if extension cannot be determined
 * @param urlOrPath - URL (http/https) or storage path
 * @returns Audio file extension (without dot)
 */
export function extractAudioExtension(urlOrPath: string): string {
  // Remove query parameters and fragments
  const cleanUrl = urlOrPath.split('?')[0].split('#')[0]

  // Extract extension from path
  const match = cleanUrl.match(/\.([a-z0-9]+)$/i)
  if (match) {
    const ext = match[1].toLowerCase()
    // Validate it's a known audio format
    if (['wav', 'mp3', 'aac', 'm4a'].includes(ext)) {
      return ext
    }
  }

  // Default to wav
  return 'wav'
}

export async function ensureAudioDirectory() {
  const info = await getInfoAsync(AUDIO_DIR)
  if (!info.exists) {
    await makeDirectoryAsync(AUDIO_DIR, { intermediates: true })
    log.info('audioCache', 'Created feedback audio directory', { AUDIO_DIR })
  }
}

/**
 * Get cached audio file path for a feedback ID
 * @param feedbackId - Feedback ID
 * @param extension - Optional file extension (defaults to 'wav' if not provided)
 * @returns Full file path
 */
export function getCachedAudioPath(feedbackId: string, extension = 'wav'): string {
  return `${AUDIO_DIR}${feedbackId}.${extension}`
}

/**
 * Check if audio file exists in cache (tries multiple extensions)
 * Priority order: wav, mp3, aac, m4a
 * @param feedbackId - Feedback ID
 * @param extension - Optional extension hint (checks this first, then tries others)
 * @returns True if any format of the file exists
 */
export async function checkCachedAudio(feedbackId: string, extension?: string): Promise<boolean> {
  const defaultOrder = ['wav', 'mp3', 'aac', 'm4a']
  const extensionsToCheck = extension
    ? [extension, ...defaultOrder.filter((e) => e !== extension)]
    : defaultOrder

  for (const ext of extensionsToCheck) {
    try {
      const path = getCachedAudioPath(feedbackId, ext)
      const info = await getInfoAsync(path)
      if (info.exists) {
        return true
      }
    } catch (error) {
      // Try next extension
    }
  }

  return false
}

export async function persistAudioFile(feedbackId: string, remoteUrl: string): Promise<string> {
  try {
    await ensureAudioDirectory()
    // Extract extension from URL
    const extension = extractAudioExtension(remoteUrl)
    const target = getCachedAudioPath(feedbackId, extension)

    await downloadAsync(remoteUrl, target)

    log.info('audioCache', 'Audio persisted to disk', { feedbackId, path: target, extension })
    return target
  } catch (error) {
    log.error('audioCache', 'Failed to persist audio', {
      feedbackId,
      remoteUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Delete cached audio file (tries all known extensions)
 * Priority order: wav, mp3, aac, m4a
 * @param feedbackId - Feedback ID
 * @param extension - Optional extension hint (deletes this first, then tries others)
 */
export async function deleteCachedAudio(feedbackId: string, extension?: string): Promise<void> {
  const defaultOrder = ['wav', 'mp3', 'aac', 'm4a']
  const extensionsToTry = extension
    ? [extension, ...defaultOrder.filter((e) => e !== extension)]
    : defaultOrder

  let lastError: Error | null = null

  for (const ext of extensionsToTry) {
    try {
      const path = getCachedAudioPath(feedbackId, ext)
      const info = await getInfoAsync(path)

      if (info.exists) {
        try {
          await deleteAsync(path)
          log.info('audioCache', 'Cached audio deleted', { feedbackId, path, extension: ext })
          return // Successfully deleted, no need to try other extensions
        } catch (deleteError) {
          // Deletion failed, try next extension
          lastError = deleteError instanceof Error ? deleteError : new Error(String(deleteError))
        }
      }
    } catch (error) {
      // File check failed, try next extension
    }
  }

  // If we get here, we tried all extensions but couldn't delete
  if (lastError) {
    log.warn('audioCache', 'Failed to delete cached audio', {
      feedbackId,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    })
  }
}

export async function getAudioStorageUsage(): Promise<{
  count: number
  sizeMB: number
}> {
  try {
    await ensureAudioDirectory()
    const files = await readDirectoryAsync(AUDIO_DIR)

    // Filter audio files (all supported formats)
    // Priority order: wav, mp3, aac, m4a
    const audioExtensions = ['.wav', '.mp3', '.aac', '.m4a']
    const audioFiles = files.filter((file) => audioExtensions.some((ext) => file.endsWith(ext)))

    let totalSize = 0
    const fileInfos = await Promise.all(
      audioFiles.map((file) => getInfoAsync(`${AUDIO_DIR}${file}`))
    )

    for (const info of fileInfos) {
      if (info.exists && 'size' in info) {
        totalSize += info.size || 0
      }
    }

    return {
      count: audioFiles.length,
      sizeMB: totalSize / (1024 * 1024),
    }
  } catch (error) {
    log.error('audioCache', 'Failed to get audio storage usage', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function evictOldestAudio(targetSizeMB: number): Promise<number> {
  try {
    await ensureAudioDirectory()
    const files = await readDirectoryAsync(AUDIO_DIR)

    // Filter audio files (all supported formats)
    // Priority order: wav, mp3, aac, m4a
    const audioExtensions = ['.wav', '.mp3', '.aac', '.m4a']
    const audioFiles = files.filter((file) => audioExtensions.some((ext) => file.endsWith(ext)))

    if (audioFiles.length === 0) {
      return 0
    }

    // Get file info with modification times
    const fileInfos = await Promise.all(
      audioFiles.map(async (file) => {
        const info = await getInfoAsync(`${AUDIO_DIR}${file}`)
        // Extract feedbackId by removing extension
        const extensionMatch = file.match(/\.([^.]+)$/)
        const feedbackId = extensionMatch ? file.slice(0, -extensionMatch[0].length) : file
        return {
          file,
          feedbackId,
          path: `${AUDIO_DIR}${file}`,
          size: info.exists && 'size' in info ? info.size || 0 : 0,
          modificationTime:
            info.exists && 'modificationTime' in info ? info.modificationTime || 0 : 0,
        }
      })
    )

    // Calculate current total size
    const currentSizeMB = fileInfos.reduce((sum, info) => sum + info.size, 0) / (1024 * 1024)

    // If already below target, no eviction needed
    if (currentSizeMB <= targetSizeMB) {
      return 0
    }

    // Sort by modification time (oldest first)
    fileInfos.sort((a, b) => a.modificationTime - b.modificationTime)

    // Evict files until we're below target
    const targetSizeBytes = targetSizeMB * 1024 * 1024
    let currentSizeBytes = fileInfos.reduce((sum, info) => sum + info.size, 0)
    let evictedCount = 0

    for (const fileInfo of fileInfos) {
      if (currentSizeBytes <= targetSizeBytes) {
        break
      }

      try {
        await deleteAsync(fileInfo.path)
        currentSizeBytes -= fileInfo.size
        evictedCount++
        log.info('audioCache', 'Evicted audio file', {
          feedbackId: fileInfo.feedbackId,
          path: fileInfo.path,
          sizeMB: fileInfo.size / (1024 * 1024),
        })
      } catch (error) {
        log.warn('audioCache', 'Failed to evict audio file', {
          path: fileInfo.path,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return evictedCount
  } catch (error) {
    log.error('audioCache', 'Failed to evict oldest audio', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
