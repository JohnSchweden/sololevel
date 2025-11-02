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

export async function ensureAudioDirectory() {
  const info = await getInfoAsync(AUDIO_DIR)
  if (!info.exists) {
    await makeDirectoryAsync(AUDIO_DIR, { intermediates: true })
    log.info('audioCache', 'Created feedback audio directory', { AUDIO_DIR })
  }
}

export function getCachedAudioPath(feedbackId: string): string {
  return `${AUDIO_DIR}${feedbackId}.wav`
}

export async function checkCachedAudio(feedbackId: string): Promise<boolean> {
  try {
    const path = getCachedAudioPath(feedbackId)
    const info = await getInfoAsync(path)
    return info.exists
  } catch (error) {
    log.warn('audioCache', 'Failed to check cached audio', {
      feedbackId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export async function persistAudioFile(feedbackId: string, remoteUrl: string): Promise<string> {
  try {
    await ensureAudioDirectory()
    const target = getCachedAudioPath(feedbackId)

    await downloadAsync(remoteUrl, target)

    log.info('audioCache', 'Audio persisted to disk', { feedbackId, path: target })
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

export async function deleteCachedAudio(feedbackId: string): Promise<void> {
  try {
    const path = getCachedAudioPath(feedbackId)
    const info = await getInfoAsync(path)

    if (info.exists) {
      await deleteAsync(path)
      log.info('audioCache', 'Cached audio deleted', { feedbackId, path })
    }
  } catch (error) {
    log.warn('audioCache', 'Failed to delete cached audio', {
      feedbackId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function getAudioStorageUsage(): Promise<{
  totalSizeMB: number
  fileCount: number
}> {
  try {
    await ensureAudioDirectory()
    const files = await readDirectoryAsync(AUDIO_DIR)

    // Filter only .wav files
    const audioFiles = files.filter((file) => file.endsWith('.wav'))

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
      totalSizeMB: totalSize / (1024 * 1024),
      fileCount: audioFiles.length,
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

    // Filter only .wav files
    const audioFiles = files.filter((file) => file.endsWith('.wav'))

    if (audioFiles.length === 0) {
      return 0
    }

    // Get file info with modification times
    const fileInfos = await Promise.all(
      audioFiles.map(async (file) => {
        const info = await getInfoAsync(`${AUDIO_DIR}${file}`)
        return {
          file,
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
          feedbackId: fileInfo.file.replace('.wav', ''),
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
