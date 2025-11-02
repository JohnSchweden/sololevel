import { log } from '@my/logging'
import * as FileSystem from 'expo-file-system'
import { recordEviction } from '../../HistoryProgress/utils/cacheMetrics'

/**
 * Video Storage Service using expo-file-system
 * Handles local video file storage, retrieval, and management
 */

export class VideoStorageService {
  private static readonly VIDEOS_DIR = `${FileSystem.documentDirectory}recordings/`
  private static readonly TEMP_DIR = `${FileSystem.cacheDirectory}temp/`
  static readonly MAX_VIDEO_STORAGE_MB = 500
  private static readonly PROTECTION_DAYS = 7 // Don't evict videos less than 7 days old

  // Track in-flight downloads by analysisId for deduplication
  private static inFlightDownloads = new Map<number, Promise<string>>()

  /**
   * Initialize storage directories
   */
  static async initialize(): Promise<void> {
    try {
      // Create recordings directory if it doesn't exist
      const recordingsDirInfo = await FileSystem.getInfoAsync(VideoStorageService.VIDEOS_DIR)
      if (!recordingsDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VideoStorageService.VIDEOS_DIR, { intermediates: true })
        log.info('VideoStorageService', 'Created recordings directory', {
          path: VideoStorageService.VIDEOS_DIR,
        })
      }

      // Create temp directory if it doesn't exist
      const tempDirInfo = await FileSystem.getInfoAsync(VideoStorageService.TEMP_DIR)
      if (!tempDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VideoStorageService.TEMP_DIR, { intermediates: true })
        log.info('VideoStorageService', 'Created temp directory', {
          path: VideoStorageService.TEMP_DIR,
        })
      }
    } catch (error) {
      log.error('videoStorageService', 'Failed to initialize storage directories', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error('Failed to initialize video storage')
    }
  }

  /**
   * Save video file to local storage
   */
  static async saveVideo(
    sourceUri: string,
    filename: string,
    metadata?: {
      duration?: number
      size?: number
      format?: string
    }
  ): Promise<{
    localUri: string
    filename: string
    size: number
    metadata: any
  }> {
    try {
      await VideoStorageService.initialize()

      // Validate source file exists
      log.info('VideoStorageService', 'Validating source file', { sourceUri })
      const sourceInfo = await FileSystem.getInfoAsync(sourceUri)
      if (!sourceInfo.exists) {
        throw new Error(`Source file does not exist: ${sourceUri}`)
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const extension = VideoStorageService.getFileExtension(filename) || 'mp4'
      const uniqueFilename = `video_${timestamp}.${extension}`
      const localUri = `${VideoStorageService.VIDEOS_DIR}${uniqueFilename}`

      log.info('VideoStorageService', 'Copying file', {
        from: sourceUri,
        to: localUri,
        sourceExists: sourceInfo.exists,
        sourceSize: sourceInfo.size,
        videosDir: VideoStorageService.VIDEOS_DIR,
      })

      // Copy file from source to local storage
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localUri,
      })

      // Verify the copy was successful
      const copiedInfo = await FileSystem.getInfoAsync(localUri)
      if (!copiedInfo.exists) {
        throw new Error(`Failed to copy video file to: ${localUri}`)
      }

      // Verify file size is reasonable
      if (!copiedInfo.size || copiedInfo.size === 0) {
        log.warn('VideoStorageService', 'Copied file has zero size', { localUri, copiedInfo })
      }

      const result = {
        localUri,
        filename: uniqueFilename,
        size: copiedInfo.size || 0,
        metadata: {
          ...metadata,
          savedAt: new Date().toISOString(),
          originalFilename: filename,
          sourcePath: sourceUri,
          sourceSize: sourceInfo.size,
        },
      }

      log.info('VideoStorageService', 'Video saved successfully', result)
      return result
    } catch (error) {
      log.error('VideoStorageService', 'Failed to save video', {
        sourceUri,
        filename,
        localUri: `${VideoStorageService.VIDEOS_DIR}video_${Date.now()}.mp4`,
        videosDir: VideoStorageService.VIDEOS_DIR,
        tempDir: VideoStorageService.TEMP_DIR,
        error,
      })
      throw new Error(
        `Failed to save video: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get video file info
   */
  static async getVideoInfo(localUri: string): Promise<{
    exists: boolean
    size: number
    uri: string
    modificationTime?: number
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri)
      return {
        exists: fileInfo.exists,
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0,
        uri: localUri,
        modificationTime:
          fileInfo.exists && 'modificationTime' in fileInfo ? fileInfo.modificationTime : undefined,
      }
    } catch (error) {
      log.error('VideoStorageService', 'Failed to get video info', { localUri, error })
      throw new Error(
        `Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * List all stored videos
   */
  static async listVideos(): Promise<
    Array<{
      filename: string
      uri: string
      size: number
      modificationTime?: number
    }>
  > {
    try {
      await VideoStorageService.initialize()

      const dirInfo = await FileSystem.getInfoAsync(VideoStorageService.VIDEOS_DIR)
      if (!dirInfo.exists) {
        return []
      }

      const files = await FileSystem.readDirectoryAsync(VideoStorageService.VIDEOS_DIR)
      const videos = []

      for (const filename of files) {
        if (VideoStorageService.isVideoFile(filename)) {
          const uri = `${VideoStorageService.VIDEOS_DIR}${filename}`
          const fileInfo = await FileSystem.getInfoAsync(uri)

          if (fileInfo.exists && 'size' in fileInfo) {
            videos.push({
              filename,
              uri,
              size: fileInfo.size || 0,
              modificationTime:
                'modificationTime' in fileInfo ? fileInfo.modificationTime : undefined,
            })
          }
        }
      }

      // Sort by modification time (newest first)
      videos.sort((a, b) => (b.modificationTime || 0) - (a.modificationTime || 0))

      log.info('VideoStorageService', 'Listed videos', { count: videos.length })
      return videos
    } catch (error) {
      log.error('videoStorageService', 'Failed to list videos', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to list videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete video file
   */
  static async deleteVideo(localUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri)
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri)
        log.info('VideoStorageService', 'Video deleted', { localUri })
      }
    } catch (error) {
      log.error('VideoStorageService', 'Failed to delete video', { localUri, error })
      throw new Error(
        `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clear all videos
   */
  static async clearAllVideos(): Promise<void> {
    try {
      await VideoStorageService.initialize()

      const files = await FileSystem.readDirectoryAsync(VideoStorageService.VIDEOS_DIR)
      for (const filename of files) {
        if (VideoStorageService.isVideoFile(filename)) {
          await FileSystem.deleteAsync(`${VideoStorageService.VIDEOS_DIR}${filename}`)
        }
      }

      log.info('VideoStorageService', 'All videos cleared')
    } catch (error) {
      log.error('videoStorageService', 'Failed to clear videos', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to clear videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalVideos: number
    totalSize: number
    availableSpace: number
  }> {
    try {
      const videos = await VideoStorageService.listVideos()
      const totalSize = videos.reduce((sum, video) => sum + video.size, 0)

      // Get available space (approximate)
      const cacheInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory || '')
      const availableSpace = cacheInfo.exists ? cacheInfo.size || 0 : 0

      return {
        totalVideos: videos.length,
        totalSize,
        availableSpace,
      }
    } catch (error) {
      log.error('videoStorageService', 'Failed to get storage stats', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Create a temporary file for processing
   */
  static async createTempFile(sourceUri: string, filename: string): Promise<string> {
    try {
      await VideoStorageService.initialize()

      const tempUri = `${VideoStorageService.TEMP_DIR}${filename}`
      await FileSystem.copyAsync({
        from: sourceUri,
        to: tempUri,
      })

      log.info('VideoStorageService', 'Temp file created', { tempUri })
      return tempUri
    } catch (error) {
      log.error('VideoStorageService', 'Failed to create temp file', { sourceUri, filename, error })
      throw new Error(
        `Failed to create temp file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFiles(): Promise<void> {
    try {
      const tempDirInfo = await FileSystem.getInfoAsync(VideoStorageService.TEMP_DIR)
      if (tempDirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(VideoStorageService.TEMP_DIR)
        for (const filename of files) {
          await FileSystem.deleteAsync(`${VideoStorageService.TEMP_DIR}${filename}`)
        }
        log.info('VideoStorageService', 'Temp files cleaned up')
      }
    } catch (error) {
      log.error('videoStorageService', 'Failed to cleanup temp files', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Download video from signed URL and save to persistent directory
   *
   * Features:
   * - Deduplication: Multiple concurrent calls for same analysisId share one download
   * - File existence check: Returns immediately if file already downloaded
   * - Partial file cleanup: Deletes and retries if file exists but has zero size
   * - Error cleanup: Removes from in-flight tracker on failure
   *
   * @param signedUrl - Cloud storage signed URL
   * @param analysisId - Analysis ID for filename generation
   * @returns Local file URI of downloaded video
   */
  static async downloadVideo(signedUrl: string, analysisId: number): Promise<string> {
    const persistentPath = `${VideoStorageService.VIDEOS_DIR}analysis_${analysisId}.mp4`

    // 1. Check if download already in progress (deduplication)
    const existingDownload = VideoStorageService.inFlightDownloads.get(analysisId)
    if (existingDownload) {
      log.debug('VideoStorageService', 'Download already in progress, reusing promise', {
        analysisId,
      })
      return existingDownload // Return same Promise for all concurrent callers
    }

    // 2. Check if file already exists with content (fast path)
    try {
      const existingFile = await FileSystem.getInfoAsync(persistentPath)
      if (existingFile.exists && 'size' in existingFile && existingFile.size > 0) {
        log.debug('VideoStorageService', 'File already downloaded', {
          analysisId,
          persistentPath,
          size: existingFile.size,
        })
        return persistentPath
      }

      // 3. Check if file exists but has zero size (partial download)
      if (existingFile.exists && 'size' in existingFile && existingFile.size === 0) {
        log.warn('VideoStorageService', 'Partial file detected, deleting before retry', {
          analysisId,
          persistentPath,
        })
        await FileSystem.deleteAsync(persistentPath)
      }
    } catch (error) {
      log.warn('VideoStorageService', 'Failed to check existing file, proceeding with download', {
        analysisId,
        persistentPath,
        error: error instanceof Error ? error.message : String(error),
      })
      // Continue with download if file check fails
    }

    // 4. Create new download Promise and track it
    const downloadPromise = (async () => {
      try {
        await VideoStorageService.initialize()

        log.info('VideoStorageService', 'Downloading video from cloud', {
          signedUrl,
          analysisId,
          persistentPath,
        })

        // Download from signed URL to persistent path
        await FileSystem.downloadAsync(signedUrl, persistentPath)

        // Validate downloaded file exists and has content
        const fileInfo = await FileSystem.getInfoAsync(persistentPath)
        if (!fileInfo.exists) {
          throw new Error(`Downloaded file does not exist: ${persistentPath}`)
        }

        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size === 0) {
          log.warn('VideoStorageService', 'Downloaded file has zero size', {
            persistentPath,
            fileInfo,
          })
        }

        log.info('VideoStorageService', 'Video downloaded successfully', {
          analysisId,
          persistentPath,
          size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        })

        return persistentPath
      } catch (error) {
        log.error('VideoStorageService', 'Failed to download video', {
          signedUrl,
          analysisId,
          error: error instanceof Error ? error.message : String(error),
        })
        throw new Error(
          `Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } finally {
        // Always remove from in-flight tracker when done (success or failure)
        VideoStorageService.inFlightDownloads.delete(analysisId)
      }
    })()

    // Store Promise for deduplication
    VideoStorageService.inFlightDownloads.set(analysisId, downloadPromise)

    return downloadPromise
  }

  /**
   * Get storage usage statistics in MB
   * @returns Storage usage with video count and total size in MB
   */
  static async getStorageUsage(): Promise<{
    totalVideos: number
    totalSizeMB: number
  }> {
    try {
      const videos = await VideoStorageService.listVideos()
      const totalSize = videos.reduce((sum, video) => sum + video.size, 0)
      const totalSizeMB = totalSize / (1024 * 1024)

      return {
        totalVideos: videos.length,
        totalSizeMB,
      }
    } catch (error) {
      log.error('VideoStorageService', 'Failed to get storage usage', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to get storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Evict oldest videos to get under target size (MB)
   * Protects videos less than 7 days old
   * @param targetSizeMB - Target storage size in MB
   * @returns Number of videos evicted
   */
  static async evictOldestVideos(targetSizeMB: number): Promise<number> {
    try {
      const videos = await VideoStorageService.listVideos()

      // Calculate total size in MB
      const totalSizeMB = videos.reduce((sum, video) => sum + video.size, 0) / (1024 * 1024)

      // If already under target, no eviction needed
      if (totalSizeMB <= targetSizeMB) {
        log.debug('VideoStorageService', 'Storage under quota, no eviction needed', {
          totalSizeMB,
          targetSizeMB,
        })
        return 0
      }

      // Filter videos older than protection period
      const now = Date.now()
      const protectedThreshold = now - VideoStorageService.PROTECTION_DAYS * 24 * 60 * 60 * 1000

      const evictableVideos = videos.filter(
        (video) => (video.modificationTime || 0) < protectedThreshold
      )

      // Sort by modification time (oldest first)
      evictableVideos.sort((a, b) => (a.modificationTime || 0) - (b.modificationTime || 0))

      // Evict oldest videos until under target
      let evictedCount = 0
      let currentSizeMB = totalSizeMB

      for (const video of evictableVideos) {
        if (currentSizeMB <= targetSizeMB) {
          break
        }

        try {
          await VideoStorageService.deleteVideo(video.uri)
          currentSizeMB -= video.size / (1024 * 1024)
          evictedCount++
          recordEviction('video')

          log.info('VideoStorageService', 'Evicted old video', {
            filename: video.filename,
            sizeMB: video.size / (1024 * 1024),
            remainingSizeMB: currentSizeMB,
          })
        } catch (error) {
          log.warn('VideoStorageService', 'Failed to evict video', {
            filename: video.filename,
            error: error instanceof Error ? error.message : String(error),
          })
          // Continue evicting other videos despite failure
        }
      }

      log.info('VideoStorageService', 'Eviction complete', {
        evictedCount,
        finalSizeMB: currentSizeMB,
        targetSizeMB,
      })

      return evictedCount
    } catch (error) {
      log.error('VideoStorageService', 'Failed to evict videos', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to evict videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Helper: Get file extension
   */
  private static getFileExtension(filename: string): string | null {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  }

  /**
   * Helper: Check if file is a video
   */
  private static isVideoFile(filename: string): boolean {
    const extension = VideoStorageService.getFileExtension(filename)
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm']
    return extension ? videoExtensions.includes(extension) : false
  }
}

/**
 * Hook for using VideoStorageService
 */
export function useVideoStorage() {
  return {
    saveVideo: VideoStorageService.saveVideo,
    getVideoInfo: VideoStorageService.getVideoInfo,
    listVideos: VideoStorageService.listVideos,
    deleteVideo: VideoStorageService.deleteVideo,
    clearAllVideos: VideoStorageService.clearAllVideos,
    getStorageStats: VideoStorageService.getStorageStats,
    createTempFile: VideoStorageService.createTempFile,
    cleanupTempFiles: VideoStorageService.cleanupTempFiles,
    initialize: VideoStorageService.initialize,
  }
}
