import { log } from '@ui/utils/logger'
import * as FileSystem from 'expo-file-system'

/**
 * Video Storage Service using expo-file-system
 * Handles local video file storage, retrieval, and management
 */
export class VideoStorageService {
  private static readonly VIDEOS_DIR = `${FileSystem.documentDirectory}recordings/`
  private static readonly TEMP_DIR = `${FileSystem.cacheDirectory}temp/`

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
      log.error('VideoStorageService', 'Failed to initialize storage directories', error)
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

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const extension = VideoStorageService.getFileExtension(filename) || 'mp4'
      const uniqueFilename = `video_${timestamp}.${extension}`
      const localUri = `${VideoStorageService.VIDEOS_DIR}${uniqueFilename}`

      // Copy file from source to local storage
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localUri,
      })

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localUri)
      if (!fileInfo.exists) {
        throw new Error('Failed to save video file')
      }

      const result = {
        localUri,
        filename: uniqueFilename,
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        metadata: {
          ...metadata,
          savedAt: new Date().toISOString(),
          originalFilename: filename,
        },
      }

      log.info('VideoStorageService', 'Video saved successfully', result)
      return result
    } catch (error) {
      log.error('VideoStorageService', 'Failed to save video', { sourceUri, filename, error })
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
      log.error('VideoStorageService', 'Failed to list videos', error)
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
      log.error('VideoStorageService', 'Failed to clear videos', error)
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
      log.error('VideoStorageService', 'Failed to get storage stats', error)
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
      log.error('VideoStorageService', 'Failed to cleanup temp files', error)
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
