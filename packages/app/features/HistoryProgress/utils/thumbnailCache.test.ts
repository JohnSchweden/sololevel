/// <reference types="jest" />

import { log } from '@my/logging'
// Use manual mock from __mocks__/expo-file-system.ts per @testing-unified.mdc
import * as FileSystem from 'expo-file-system'
import {
  ensureThumbnailDirectory,
  getCachedThumbnailPath,
  persistThumbnailFile,
} from './thumbnailCache'

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('thumbnailCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Set up default mock behaviors
    mockFileSystem.getInfoAsync.mockImplementation((uri) => {
      // Default: directory exists
      if (uri.includes('thumbnails')) {
        return Promise.resolve({
          exists: true,
          uri,
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        })
      }
      // Default: file exists
      return Promise.resolve({
        exists: true,
        uri,
        size: 50000,
        isDirectory: false,
        modificationTime: Date.now(),
      })
    })
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined)
    ;(
      mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
    ).mockResolvedValue({} as any)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('ensureThumbnailDirectory', () => {
    // ARRANGE: Test that directory creation works
    it('should create thumbnails directory if it does not exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        uri: 'file:///documents/thumbnails/',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      } as any)

      // Act
      await ensureThumbnailDirectory()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///documents/thumbnails/',
        { intermediates: true }
      )
      expect(log.info).toHaveBeenCalledWith('thumbnailCache', 'Created thumbnails directory', {
        THUMBNAIL_DIR: 'file:///documents/thumbnails/',
      })
    })

    // ARRANGE: Test that directory creation is skipped if it exists
    it('should not create thumbnails directory if it already exists', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/thumbnails/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)

      // Act
      await ensureThumbnailDirectory()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled()
    })

    // ARRANGE: Test error handling
    it('should handle errors when checking directory existence', async () => {
      // Arrange
      const error = new Error('File system error')
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)

      // Act & Assert
      await expect(ensureThumbnailDirectory()).rejects.toThrow('File system error')
    })
  })

  describe('getCachedThumbnailPath', () => {
    // ARRANGE: Test path generation
    it('should return correct path for video ID', () => {
      // Arrange
      const videoId = 123

      // Act
      const path = getCachedThumbnailPath(videoId)

      // Assert
      expect(path).toBe('file:///documents/thumbnails/123.jpg')
    })

    // ARRANGE: Test path generation for different video IDs
    it('should return correct path for different video IDs', () => {
      // Arrange & Act
      const path1 = getCachedThumbnailPath(1)
      const path2 = getCachedThumbnailPath(999)
      const path3 = getCachedThumbnailPath(1000)

      // Assert
      expect(path1).toBe('file:///documents/thumbnails/1.jpg')
      expect(path2).toBe('file:///documents/thumbnails/999.jpg')
      expect(path3).toBe('file:///documents/thumbnails/1000.jpg')
    })
  })

  describe('persistThumbnailFile', () => {
    // ARRANGE: Test successful thumbnail download and persistence
    it('should download and persist thumbnail from remote URL', async () => {
      // Arrange
      const videoId = 456
      const remoteUrl = 'https://example.com/thumb.jpg'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/thumbnails/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)

      // Act
      const result = await persistThumbnailFile(videoId, remoteUrl)

      // Assert
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(
        remoteUrl,
        'file:///documents/thumbnails/456.jpg'
      )
      expect(result).toBe('file:///documents/thumbnails/456.jpg')
      expect(log.info).toHaveBeenCalledWith('thumbnailCache', 'Thumbnail persisted to disk', {
        videoId: 456,
        path: 'file:///documents/thumbnails/456.jpg',
      })
    })

    // ARRANGE: Test directory creation before download
    it('should ensure directory exists before downloading', async () => {
      // Arrange
      const videoId = 789
      const remoteUrl = 'https://example.com/thumb.jpg'
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: false } as any) // Directory doesn't exist
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/thumbnails/',
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        } as any)

      // Act
      await persistThumbnailFile(videoId, remoteUrl)

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
    })

    // ARRANGE: Test error handling for download failures
    it('should throw error when download fails', async () => {
      // Arrange
      const videoId = 111
      const remoteUrl = 'https://example.com/thumb.jpg'
      const downloadError = new Error('Network error')
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/thumbnails/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)
      mockFileSystem.downloadAsync.mockRejectedValueOnce(downloadError)

      // Act & Assert
      await expect(persistThumbnailFile(videoId, remoteUrl)).rejects.toThrow('Network error')
      expect(log.error).toHaveBeenCalledWith('thumbnailCache', 'Failed to persist thumbnail', {
        videoId: 111,
        remoteUrl,
        error: 'Network error',
      })
    })

    // ARRANGE: Test error handling for directory creation failures
    it('should throw error when directory creation fails', async () => {
      // Arrange
      const videoId = 222
      const remoteUrl = 'https://example.com/thumb.jpg'
      const dirError = new Error('Permission denied')
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(dirError)

      // Act & Assert
      await expect(persistThumbnailFile(videoId, remoteUrl)).rejects.toThrow('Permission denied')
    })
  })
})
