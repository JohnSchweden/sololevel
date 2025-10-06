/// <reference types="jest" />

// Use manual mock from __mocks__/expo-file-system.ts per @testing-unified.mdc
// No imports needed - jest-expo preset provides globals
import * as FileSystem from 'expo-file-system'
import { VideoStorageService } from './videoStorageService'

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>

describe('VideoStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Set up default mock behaviors
    mockFileSystem.getInfoAsync.mockImplementation((uri) => {
      // Return different values based on the file being checked
      if (uri.includes('video1.mp4')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 1000,
          isDirectory: false,
          modificationTime: 1000,
        })
      }
      if (uri.includes('video2.mov')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 2000,
          isDirectory: false,
          modificationTime: 2000,
        })
      }
      if (uri.includes('video.mp4')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 1000,
          isDirectory: false,
          modificationTime: 1000,
        })
      }
      if (uri.includes('another.mov')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 2000,
          isDirectory: false,
          modificationTime: 2000,
        })
      }
      if (uri.includes('cache')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 5000000,
          isDirectory: true,
          modificationTime: 0,
        })
      }
      return Promise.resolve({
        exists: true,
        uri,
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      })
    })
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined)
    mockFileSystem.readDirectoryAsync.mockResolvedValue([])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('initialize', () => {
    it('creates directories if they do not exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: false } as any) // recordings dir
        .mockResolvedValueOnce({ exists: false } as any) // temp dir

      // Act
      await VideoStorageService.initialize()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(2)
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///documents/recordings/',
        { intermediates: true }
      )
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith('file:///cache/temp/', {
        intermediates: true,
      })
    })

    it('does not create directories if they already exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true } as any) // temp dir

      // Act
      await VideoStorageService.initialize()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled()
    })

    it('throws error when directory creation fails', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false } as any)
      mockFileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'))

      // Act & Assert
      await expect(VideoStorageService.initialize()).rejects.toThrow(
        'Failed to initialize video storage'
      )
    })
  })

  describe('saveVideo', () => {
    it('saves video file successfully', async () => {
      // Arrange
      const sourceUri = 'file:///source/video.mp4'
      const filename = 'test-video.mp4'
      const metadata = { duration: 30, format: 'mp4' }

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: false } as any) // recordings dir
        .mockResolvedValueOnce({ exists: false } as any) // temp dir
        .mockResolvedValueOnce({ exists: true, size: 2048000 } as any) // source file
        .mockResolvedValueOnce({ exists: true, size: 1024000 } as any) // saved file

      mockFileSystem.copyAsync.mockResolvedValueOnce(undefined)

      // Act
      const result = await VideoStorageService.saveVideo(sourceUri, filename, metadata)

      // Assert
      expect(result.filename).toMatch(/^video_\d+\.mp4$/)
      expect(result.localUri).toMatch(/^file:\/\/\/documents\/recordings\/video_\d+\.mp4$/)
      expect(result.size).toBe(1024000)
      expect(result.metadata).toEqual({
        ...metadata,
        savedAt: expect.any(String),
        originalFilename: filename,
        sourcePath: sourceUri,
        sourceSize: 2048000,
      })
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: expect.stringMatching(/^file:\/\/\/documents\/recordings\/video_\d+\.mp4$/),
      })
    })

    it('throws error when file copy fails', async () => {
      // Arrange
      const sourceUri = 'file:///source/video.mp4'
      const filename = 'test-video.mp4'

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true } as any) // temp dir

      mockFileSystem.copyAsync.mockRejectedValueOnce(new Error('Copy failed'))

      // Act & Assert
      await expect(VideoStorageService.saveVideo(sourceUri, filename)).rejects.toThrow(
        'Failed to save video: Copy failed'
      )
    })

    it('throws error when saved file does not exist', async () => {
      // Arrange
      const sourceUri = 'file:///source/video.mp4'
      const filename = 'test-video.mp4'

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true } as any) // temp dir
        .mockResolvedValueOnce({ exists: true, size: 2048000 } as any) // source file
        .mockResolvedValueOnce({ exists: false } as any) // saved file

      mockFileSystem.copyAsync.mockResolvedValueOnce(undefined)

      // Act & Assert
      await expect(VideoStorageService.saveVideo(sourceUri, filename)).rejects.toThrow(
        'Failed to copy video file to'
      )
    })
  })

  describe('getVideoInfo', () => {
    it('returns video info for existing file', async () => {
      // Arrange
      const localUri = 'file:///documents/recordings/video.mp4'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        size: 2048000,
        modificationTime: 1234567890,
      } as any)

      // Act
      const result = await VideoStorageService.getVideoInfo(localUri)

      // Assert
      expect(result).toEqual({
        exists: true,
        size: 2048000,
        uri: localUri,
        modificationTime: 1234567890,
      })
    })

    it('returns zero size for non-existent file', async () => {
      // Arrange
      const localUri = 'file:///documents/recordings/nonexistent.mp4'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
      } as any)

      // Act
      const result = await VideoStorageService.getVideoInfo(localUri)

      // Assert
      expect(result).toEqual({
        exists: false,
        size: 0,
        uri: localUri,
        modificationTime: undefined,
      })
    })
  })

  describe('listVideos', () => {
    it('returns list of video files sorted by modification time', async () => {
      // Arrange
      const files = ['video1.mp4', 'video2.mov', 'not-a-video.txt']

      // Clear mocks to avoid interference from beforeEach
      jest.clearAllMocks()

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true, size: 1000, modificationTime: 1000 } as any) // video1.mp4
        .mockResolvedValueOnce({ exists: true, size: 2000, modificationTime: 2000 } as any) // video2.mov

      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(files)

      // Act
      const result = await VideoStorageService.listVideos()

      // Assert
      expect(result).toHaveLength(2)
      // Service sorts by modification time (newest first)
      const video1 = result.find((v) => v.filename === 'video1.mp4')
      const video2 = result.find((v) => v.filename === 'video2.mov')
      expect(video1).toBeDefined()
      expect(video2).toBeDefined()
      expect(video1!.size).toBe(1000)
      expect(video2!.size).toBe(2000)
      // video2 should come first due to higher modification time
      expect(result[0].filename).toBe('video2.mov')
      expect(result[1].filename).toBe('video1.mp4')
    })

    it('returns empty array when recordings directory does not exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false } as any)

      // Act
      const result = await VideoStorageService.listVideos()

      // Assert
      expect(result).toEqual([])
    })

    it('filters out non-video files', async () => {
      // Arrange
      const files = ['video.mp4', 'document.pdf', 'image.jpg', 'another.mov']

      // Clear mocks to avoid interference from beforeEach
      jest.clearAllMocks()

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true, size: 1000, modificationTime: 1000 } as any) // video.mp4
        .mockResolvedValueOnce({ exists: true, size: 2000, modificationTime: 2000 } as any) // another.mov

      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(files)

      // Act
      const result = await VideoStorageService.listVideos()

      // Assert
      expect(result).toHaveLength(2)
      // Service sorts by modification time (newest first)
      // another.mov (modTime: 2000) should come before video.mp4 (modTime: 1000)
      expect(result.map((v) => v.filename)).toEqual(['another.mov', 'video.mp4'])
    })
  })

  describe('deleteVideo', () => {
    it('deletes existing video file', async () => {
      // Arrange
      const localUri = 'file:///documents/recordings/video.mp4'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true } as any)

      // Act
      await VideoStorageService.deleteVideo(localUri)

      // Assert
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(localUri)
    })

    it('does not throw error when file does not exist', async () => {
      // Arrange
      const localUri = 'file:///documents/recordings/nonexistent.mp4'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false } as any)

      // Act & Assert
      await expect(VideoStorageService.deleteVideo(localUri)).resolves.not.toThrow()
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })
  })

  describe('clearAllVideos', () => {
    it('deletes all video files in recordings directory', async () => {
      // Arrange
      const files = ['video1.mp4', 'video2.mov', 'document.pdf']
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true } as any) // video1.mp4
        .mockResolvedValueOnce({ exists: true } as any) // video2.mov

      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(files)

      // Act
      await VideoStorageService.clearAllVideos()

      // Assert
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/recordings/video1.mp4'
      )
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/recordings/video2.mov'
      )
    })
  })

  describe('getStorageStats', () => {
    it('returns storage statistics', async () => {
      // Arrange
      const files = ['video1.mp4', 'video2.mov']

      // Clear mocks to avoid interference from beforeEach
      jest.clearAllMocks()

      // Set up specific mock sequence for this test
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true, size: 1000, modificationTime: 1000 } as any) // video1.mp4
        .mockResolvedValueOnce({ exists: true, size: 2000, modificationTime: 2000 } as any) // video2.mov
        .mockResolvedValueOnce({ exists: true, size: 5000000 } as any) // cache info

      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(files)

      // Act
      const result = await VideoStorageService.getStorageStats()

      // Assert
      expect(result).toEqual({
        totalVideos: 2,
        totalSize: 5002000,
        availableSpace: 5000000,
      })
    })
  })

  describe('createTempFile', () => {
    it('creates temporary file successfully', async () => {
      // Arrange
      const sourceUri = 'file:///source/video.mp4'
      const filename = 'temp-video.mp4'

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // recordings dir
        .mockResolvedValueOnce({ exists: true } as any) // temp dir

      mockFileSystem.copyAsync.mockResolvedValueOnce(undefined)

      // Act
      const result = await VideoStorageService.createTempFile(sourceUri, filename)

      // Assert
      expect(result).toBe('file:///cache/temp/temp-video.mp4')
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: 'file:///cache/temp/temp-video.mp4',
      })
    })
  })

  describe('cleanupTempFiles', () => {
    it('deletes all files in temp directory', async () => {
      // Arrange
      const files = ['temp1.mp4', 'temp2.mov']
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true } as any)
      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(files)

      // Act
      await VideoStorageService.cleanupTempFiles()

      // Assert
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/temp/temp1.mp4')
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/temp/temp2.mov')
    })

    it('does not throw error when temp directory does not exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false } as any)

      // Act & Assert
      await expect(VideoStorageService.cleanupTempFiles()).resolves.not.toThrow()
    })
  })
})
