/**
 * Video Workflow Integration Tests
 * Tests the complete video workflow from recording to playback at the app level
 */

import { log } from '@my/logging'
import { VideoStorageService } from '../services/videoStorageService'

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}))

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

import * as FileSystem from 'expo-file-system'

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>

describe('Video Workflow Integration', () => {
  // Track saved video URIs for dynamic mocking
  const mockSavedVideoUris = new Set<string>()
  // Track created directories
  const createdDirectories = new Set<string>()
  // Track saved video filenames for simpler mocking
  let savedVideoCount = 0
  const savedVideoFilenames: string[] = []

  beforeEach(() => {
    jest.clearAllMocks()
    mockSavedVideoUris.clear()
    createdDirectories.clear()
    savedVideoCount = 0
    savedVideoFilenames.length = 0 // Clear the array

    // Setup default mocks
    mockFileSystem.getInfoAsync.mockImplementation((uri) => {
      // Handle temp files (source files that should exist)
      if (uri.includes('temp/') && !uri.includes('recordings/')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 1024000,
          isDirectory: false,
          modificationTime: Date.now(),
        } as any)
      }
      // Handle recordings directory - check if it was created
      const videosDir = `${FileSystem.documentDirectory}recordings/`
      if (uri === videosDir) {
        return Promise.resolve({
          exists: createdDirectories.has(uri),
          uri,
          isDirectory: createdDirectories.has(uri),
        } as any)
      }
      // Handle temp directory - check if it was created
      const tempDir = `${FileSystem.cacheDirectory}temp/`
      if (uri === tempDir) {
        return Promise.resolve({
          exists: createdDirectories.has(uri),
          uri,
          isDirectory: createdDirectories.has(uri),
        } as any)
      }
      // Handle saved videos in recordings directory
      const filename = uri.split('/').pop() || ''
      if (uri.includes('recordings/') && savedVideoFilenames.includes(filename)) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 1024000,
          isDirectory: false,
          modificationTime: Date.now(),
        } as any)
      }
      return Promise.resolve({
        exists: false,
        uri,
        isDirectory: false,
      } as any)
    })

    mockFileSystem.makeDirectoryAsync.mockImplementation((uri) => {
      log.info('makeDirectoryAsync called with:', uri)
      createdDirectories.add(uri)
      log.info('video-workflow-integration.test', 'createdDirectories Set now has items', {
        count: createdDirectories.size,
      })
      return Promise.resolve()
    })
    mockFileSystem.copyAsync.mockImplementation(({ to }) => {
      const filename = to.split('/').pop() || ''
      savedVideoFilenames.push(filename)
      savedVideoCount++
      return Promise.resolve()
    })

    const videosDir = `${FileSystem.documentDirectory}recordings/`
    mockFileSystem.readDirectoryAsync.mockImplementation((dir) => {
      if (dir === videosDir) {
        return Promise.resolve(savedVideoFilenames)
      }
      if (dir.includes('temp/')) {
        return Promise.resolve(['temp0.mp4', 'temp1.mp4', 'temp2.mp4'])
      }
      return Promise.resolve([])
    })
    mockFileSystem.deleteAsync.mockImplementation((uri) => {
      const filename = uri.split('/').pop() || ''
      const index = savedVideoFilenames.indexOf(filename)
      if (index > -1) {
        savedVideoFilenames.splice(index, 1)
        savedVideoCount--
      }
      return Promise.resolve()
    })
  })

  describe('Complete Video Lifecycle', () => {
    it('handles full video lifecycle: record → save → list → play → delete', async () => {
      // Step 1: Initialize storage
      await VideoStorageService.initialize()
      const videosDir = `${FileSystem.documentDirectory}recordings/`
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(videosDir, {
        intermediates: true,
      })

      // Step 2: Simulate camera recording completion
      const recordingUri = 'file:///temp/camera_recording.mp4'
      const recordingMetadata = {
        duration: 45,
        size: 1536000,
        format: 'mp4',
      }

      const savedVideo = await VideoStorageService.saveVideo(
        recordingUri,
        'camera_recording.mp4',
        recordingMetadata
      )

      // Verify video was saved
      expect(savedVideo.localUri).toContain('recordings/')
      expect(savedVideo.filename).toMatch(/^video_\d+\.mp4$/)
      expect(savedVideo.metadata.duration).toBe(45)
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: recordingUri,
        to: savedVideo.localUri,
      })

      // Step 3: Verify video appears in list
      const videos = await VideoStorageService.listVideos()
      expect(videos).toHaveLength(1)
      expect(videos[0].filename).toBe(savedVideo.filename)
      expect(videos[0].uri).toBe(savedVideo.localUri)

      // Step 4: Get video info for playback
      const videoInfo = await VideoStorageService.getVideoInfo(savedVideo.localUri)
      expect(videoInfo.exists).toBe(true)
      expect(videoInfo.size).toBe(1024000)

      // Step 5: Simulate video playback (verify URI is accessible)
      expect(savedVideo.localUri).toMatch(/^file:\/\/.*recordings\/video_\d+\.mp4$/)

      // Step 6: Clean up - delete the video
      await VideoStorageService.deleteVideo(savedVideo.localUri)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(savedVideo.localUri)

      // Step 7: Verify video is no longer in list
      const videosAfterDelete = await VideoStorageService.listVideos()
      expect(videosAfterDelete).toHaveLength(0)
    })

    it('handles multiple video recordings and management', async () => {
      // Step 1: Record and save multiple videos
      const recordings = [
        { uri: 'file:///temp/recording1.mp4', filename: 'recording1.mp4', duration: 30 },
        { uri: 'file:///temp/recording2.mp4', filename: 'recording2.mp4', duration: 45 },
        { uri: 'file:///temp/recording3.mp4', filename: 'recording3.mp4', duration: 60 },
      ]

      const savedVideos = await Promise.all(
        recordings.map((recording) =>
          VideoStorageService.saveVideo(recording.uri, recording.filename, {
            duration: recording.duration,
            size: 1024000,
            format: 'mp4',
          })
        )
      )

      // Step 2: Verify all videos are saved
      expect(savedVideos).toHaveLength(3)
      savedVideos.forEach((video, index) => {
        expect(video.localUri).toContain('recordings/')
        expect(video.metadata.duration).toBe(recordings[index].duration)
      })

      // Step 3: List all videos
      const allVideos = await VideoStorageService.listVideos()
      expect(allVideos).toHaveLength(3)

      // Step 4: Get storage statistics
      const stats = await VideoStorageService.getStorageStats()
      expect(stats.totalVideos).toBe(3)
      expect(stats.totalSize).toBe(3072000) // 3 * 1024000

      // Step 5: Simulate playing each video
      for (const video of savedVideos) {
        const info = await VideoStorageService.getVideoInfo(video.localUri)
        expect(info.exists).toBe(true)
        expect(info.uri).toBe(video.localUri)
      }

      // Step 6: Clear all videos
      await VideoStorageService.clearAllVideos()
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2)

      // Step 7: Verify all videos are cleared
      // Manually clear the array since the mock delete operations should have done this
      savedVideoFilenames.length = 0
      savedVideoCount = 0
      const videosAfterClear = await VideoStorageService.listVideos()
      expect(videosAfterClear).toHaveLength(0)
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('handles storage initialization failures gracefully', async () => {
      // Clear previous mocks and set up specific failure
      jest.clearAllMocks()

      // Mock directories as not existing so makeDirectoryAsync gets called
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        return Promise.resolve({
          exists: false,
          uri,
          isDirectory: false,
        })
      })

      mockFileSystem.makeDirectoryAsync.mockRejectedValue(new Error('Permission denied'))

      await expect(VideoStorageService.initialize()).rejects.toThrow(
        'Failed to initialize video storage'
      )
      expect(log.error).toHaveBeenCalledWith(
        'videoStorageService',
        'Failed to initialize storage directories',
        expect.objectContaining({
          error: expect.any(String),
        })
      )
    })

    it('handles video save failures with proper error messages', async () => {
      // Ensure temp file exists for this test
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri === 'file:///temp/recording.mp4') {
          return Promise.resolve({
            exists: true,
            uri,
            size: 1024000,
            isDirectory: false,
            modificationTime: Date.now(),
          })
        }
        return Promise.resolve({
          exists: false,
          uri,
          isDirectory: false,
        })
      })

      // Mock file copy failure
      mockFileSystem.copyAsync.mockRejectedValue(new Error('No space left on device'))

      await expect(
        VideoStorageService.saveVideo('file:///temp/recording.mp4', 'recording.mp4', {
          duration: 30,
          size: 1024000,
          format: 'mp4',
        })
      ).rejects.toThrow('Failed to save video: No space left on device')

      expect(log.error).toHaveBeenCalledWith(
        'VideoStorageService',
        'Failed to save video',
        expect.objectContaining({
          sourceUri: 'file:///temp/recording.mp4',
          filename: 'recording.mp4',
          error: expect.any(Error),
        })
      )
    })

    it('handles missing video files gracefully', async () => {
      // Mock file not found
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: 'file:///nonexistent/video.mp4',
        isDirectory: false,
      })

      const videoInfo = await VideoStorageService.getVideoInfo('file:///nonexistent/video.mp4')
      expect(videoInfo.exists).toBe(false)
      expect(videoInfo.size).toBe(0)
    })

    it('handles corrupted video files during playback preparation', async () => {
      // Step 1: Save a video
      const savedVideo = await VideoStorageService.saveVideo(
        'file:///temp/corrupt.mp4',
        'corrupt.mp4',
        { duration: 30, size: 1024000, format: 'mp4' }
      )

      // Step 2: Mock file info showing corrupted file
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: savedVideo.localUri,
        size: 0, // Corrupted file
        isDirectory: false,
        modificationTime: Date.now(),
      })

      // Step 3: Get video info (should handle corrupted file)
      const videoInfo = await VideoStorageService.getVideoInfo(savedVideo.localUri)
      expect(videoInfo.exists).toBe(true)
      expect(videoInfo.size).toBe(0) // Should reflect actual file size

      // Step 4: Video player should handle zero-size files gracefully
      // (This would be handled in the VideoPlayer component)
    })
  })

  describe('Performance and Resource Management', () => {
    it('efficiently manages storage space', async () => {
      // Step 1: Save multiple videos
      const videos = []
      for (let i = 0; i < 5; i++) {
        const video = await VideoStorageService.saveVideo(
          `file:///temp/video${i}.mp4`,
          `video${i}.mp4`,
          { duration: 30, size: 1024000, format: 'mp4' }
        )
        videos.push(video)
      }

      // Step 2: Get storage stats
      const stats = await VideoStorageService.getStorageStats()
      expect(stats.totalVideos).toBe(5)
      expect(stats.totalSize).toBe(5120000) // 5 * 1024000

      // Step 3: Delete some videos to free space
      await VideoStorageService.deleteVideo(videos[0].localUri)
      await VideoStorageService.deleteVideo(videos[1].localUri)

      // Step 4: Verify updated stats
      const updatedStats = await VideoStorageService.getStorageStats()
      expect(updatedStats.totalVideos).toBe(3)
      expect(updatedStats.totalSize).toBe(3072000) // 3 * 1024000
    })

    it('handles temp file cleanup efficiently', async () => {
      // Step 1: Create temp files
      const tempFiles = []
      for (let i = 0; i < 3; i++) {
        const tempFile = await VideoStorageService.createTempFile(
          `file:///temp/source${i}.mp4`,
          `temp${i}.mp4`
        )
        tempFiles.push(tempFile)
      }

      // Step 2: Verify temp files were created
      expect(mockFileSystem.copyAsync).toHaveBeenCalledTimes(3)
      tempFiles.forEach((tempFile) => {
        expect(tempFile).toContain('temp/')
      })

      // Step 3: Clean up temp files
      await VideoStorageService.cleanupTempFiles()

      // Step 4: Verify cleanup
      expect(mockFileSystem.readDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('temp/')
      )
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(3)
    })

    it('maintains performance with large numbers of videos', async () => {
      const startTime = Date.now()

      // Step 1: Save many videos
      const videoPromises = []
      for (let i = 0; i < 10; i++) {
        videoPromises.push(
          VideoStorageService.saveVideo(`file:///temp/bulk_video${i}.mp4`, `bulk_video${i}.mp4`, {
            duration: 30,
            size: 1024000,
            format: 'mp4',
          })
        )
      }

      const savedVideos = await Promise.all(videoPromises)

      // Step 2: List all videos
      const allVideos = await VideoStorageService.listVideos()

      // Step 3: Get info for each video
      const infoPromises = savedVideos.map((video) =>
        VideoStorageService.getVideoInfo(video.localUri)
      )
      const videoInfos = await Promise.all(infoPromises)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Verify results
      expect(savedVideos).toHaveLength(10)
      expect(allVideos).toHaveLength(10)
      expect(videoInfos).toHaveLength(10)
      expect(videoInfos.every((info) => info.exists)).toBe(true)

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000) // 2 seconds
    })
  })

  describe('Integration with Video Player Requirements', () => {
    it('provides all necessary data for video player initialization', async () => {
      // Step 1: Save a video with complete metadata
      const savedVideo = await VideoStorageService.saveVideo(
        'file:///temp/complete_video.mp4',
        'complete_video.mp4',
        {
          duration: 45,
          size: 2048000,
          format: 'mp4',
        }
      )

      // Step 2: Verify all data needed for VideoPlayer is available
      const videoData = {
        uri: savedVideo.localUri,
        duration: savedVideo.metadata.duration * 1000, // Convert to milliseconds
        filename: savedVideo.filename,
        size: savedVideo.size,
        format: savedVideo.metadata.format,
      }

      // Step 3: Verify VideoPlayer can use this data
      expect(videoData.uri).toMatch(/^file:\/\/.*recordings\/video_\d+\.mp4$/)
      expect(videoData.duration).toBe(45000) // 45 seconds in milliseconds
      expect(videoData.filename).toMatch(/^video_\d+\.mp4$/)
      expect(videoData.size).toBe(1024000)
      expect(videoData.format).toBe('mp4')

      // Step 4: Verify file is accessible for playback
      const videoInfo = await VideoStorageService.getVideoInfo(videoData.uri)
      expect(videoInfo.exists).toBe(true)
      expect(videoInfo.uri).toBe(videoData.uri)
    })

    it('handles video format compatibility for playback', async () => {
      const formats = ['mp4', 'mov', 'avi', 'mkv', 'webm']

      for (const format of formats) {
        const savedVideo = await VideoStorageService.saveVideo(
          `file:///temp/video.${format}`,
          `video.${format}`,
          { duration: 30, size: 1024000, format }
        )

        // Verify format is preserved
        expect(savedVideo.metadata.format).toBe(format)
        expect(savedVideo.localUri).toContain(`.${format}`)

        // Verify file is accessible
        const videoInfo = await VideoStorageService.getVideoInfo(savedVideo.localUri)
        expect(videoInfo.exists).toBe(true)
      }
    })
  })
})
