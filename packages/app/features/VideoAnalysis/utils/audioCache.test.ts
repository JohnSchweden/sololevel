/// <reference types="jest" />

import { log } from '@my/logging'
// Use manual mock from __mocks__/expo-file-system.ts per @testing-unified.mdc
import * as FileSystem from 'expo-file-system'
import {
  checkCachedAudio,
  deleteCachedAudio,
  ensureAudioDirectory,
  evictOldestAudio,
  getAudioStorageUsage,
  getCachedAudioPath,
  persistAudioFile,
} from './audioCache'

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

describe('audioCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Set up default mock behaviors
    mockFileSystem.getInfoAsync.mockImplementation((uri) => {
      // Default: directory exists
      if (uri.includes('feedback-audio')) {
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
        size: 500000, // 500KB audio file
        isDirectory: false,
        modificationTime: Date.now(),
      })
    })
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined)
    ;(
      mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
    ).mockResolvedValue({} as any)
    ;(
      mockFileSystem.deleteAsync as jest.MockedFunction<typeof FileSystem.deleteAsync>
    ).mockResolvedValue(undefined)
    ;(
      mockFileSystem.readDirectoryAsync as jest.MockedFunction<typeof FileSystem.readDirectoryAsync>
    ).mockResolvedValue([])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('ensureAudioDirectory', () => {
    // ARRANGE: Test that directory creation works
    it('should create feedback-audio directory if it does not exist', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        uri: 'file:///documents/feedback-audio/',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      } as any)

      // Act
      await ensureAudioDirectory()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/',
        { intermediates: true }
      )
      expect(log.info).toHaveBeenCalledWith('audioCache', 'Created feedback audio directory', {
        AUDIO_DIR: 'file:///documents/feedback-audio/',
      })
    })

    // ARRANGE: Test that directory creation is skipped if it exists
    it('should not create feedback-audio directory if it already exists', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)

      // Act
      await ensureAudioDirectory()

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled()
    })

    // ARRANGE: Test error handling
    it('should handle errors when checking directory existence', async () => {
      // Arrange
      const error = new Error('File system error')
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)

      // Act & Assert
      await expect(ensureAudioDirectory()).rejects.toThrow('File system error')
    })
  })

  describe('getCachedAudioPath', () => {
    // ARRANGE: Test path generation
    it('should return correct path for feedback ID', () => {
      // Arrange
      const feedbackId = '123'

      // Act
      const path = getCachedAudioPath(feedbackId)

      // Assert
      expect(path).toBe('file:///documents/feedback-audio/123.wav')
    })

    // ARRANGE: Test path generation for different feedback IDs
    it('should return correct path for different feedback IDs', () => {
      // Arrange & Act
      const path1 = getCachedAudioPath('1')
      const path2 = getCachedAudioPath('999')
      const path3 = getCachedAudioPath('feedback-456')

      // Assert
      expect(path1).toBe('file:///documents/feedback-audio/1.wav')
      expect(path2).toBe('file:///documents/feedback-audio/999.wav')
      expect(path3).toBe('file:///documents/feedback-audio/feedback-456.wav')
    })
  })

  describe('checkCachedAudio', () => {
    // ARRANGE: Test when audio file exists
    it('should return true when cached audio file exists', async () => {
      // Arrange
      const feedbackId = '123'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/123.wav',
        size: 500000,
        isDirectory: false,
        modificationTime: Date.now(),
      } as any)

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(true)
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/123.wav'
      )
    })

    // ARRANGE: Test when audio file does not exist
    it('should return false when cached audio file does not exist', async () => {
      // Arrange
      const feedbackId = '456'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        uri: 'file:///documents/feedback-audio/456.wav',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      } as any)

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(false)
    })

    // ARRANGE: Test error handling
    it('should return false and log warning when file check fails', async () => {
      // Arrange
      const feedbackId = '789'
      const error = new Error('Permission denied')
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(false)
      expect(log.warn).toHaveBeenCalledWith('audioCache', 'Failed to check cached audio', {
        feedbackId: '789',
        error: 'Permission denied',
      })
    })
  })

  describe('persistAudioFile', () => {
    // ARRANGE: Test successful audio download and persistence
    it('should download and persist audio from remote URL', async () => {
      // Arrange
      const feedbackId = '123'
      const remoteUrl = 'https://example.com/audio.wav'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)

      // Act
      const result = await persistAudioFile(feedbackId, remoteUrl)

      // Assert
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(
        remoteUrl,
        'file:///documents/feedback-audio/123.wav'
      )
      expect(result).toBe('file:///documents/feedback-audio/123.wav')
      expect(log.info).toHaveBeenCalledWith('audioCache', 'Audio persisted to disk', {
        feedbackId: '123',
        path: 'file:///documents/feedback-audio/123.wav',
      })
    })

    // ARRANGE: Test directory creation before download
    it('should ensure directory exists before downloading', async () => {
      // Arrange
      const feedbackId = '456'
      const remoteUrl = 'https://example.com/audio.wav'
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: false } as any) // Directory doesn't exist
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/',
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        } as any)

      // Act
      await persistAudioFile(feedbackId, remoteUrl)

      // Assert
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
    })

    // ARRANGE: Test error handling for download failures
    it('should throw error when download fails', async () => {
      // Arrange
      const feedbackId = '789'
      const remoteUrl = 'https://example.com/audio.wav'
      const downloadError = new Error('Network error')
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/',
        size: 0,
        isDirectory: true,
        modificationTime: 0,
      } as any)
      mockFileSystem.downloadAsync.mockRejectedValueOnce(downloadError)

      // Act & Assert
      await expect(persistAudioFile(feedbackId, remoteUrl)).rejects.toThrow('Network error')
      expect(log.error).toHaveBeenCalledWith('audioCache', 'Failed to persist audio', {
        feedbackId: '789',
        remoteUrl,
        error: 'Network error',
      })
    })

    // ARRANGE: Test error handling for directory creation failures
    it('should throw error when directory creation fails', async () => {
      // Arrange
      const feedbackId = '999'
      const remoteUrl = 'https://example.com/audio.wav'
      const dirError = new Error('Permission denied')
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(dirError)

      // Act & Assert
      await expect(persistAudioFile(feedbackId, remoteUrl)).rejects.toThrow('Permission denied')
    })
  })

  describe('deleteCachedAudio', () => {
    // ARRANGE: Test successful deletion
    it('should delete cached audio file when it exists', async () => {
      // Arrange
      const feedbackId = '123'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/123.wav',
        size: 500000,
        isDirectory: false,
        modificationTime: Date.now(),
      } as any)

      // Act
      await deleteCachedAudio(feedbackId)

      // Assert
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/123.wav'
      )
      expect(log.info).toHaveBeenCalledWith('audioCache', 'Cached audio deleted', {
        feedbackId: '123',
        path: 'file:///documents/feedback-audio/123.wav',
      })
    })

    // ARRANGE: Test when file does not exist
    it('should not delete when file does not exist', async () => {
      // Arrange
      const feedbackId = '456'
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        uri: 'file:///documents/feedback-audio/456.wav',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      } as any)

      // Act
      await deleteCachedAudio(feedbackId)

      // Assert
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })

    // ARRANGE: Test error handling
    it('should log warning and not throw when deletion fails', async () => {
      // Arrange
      const feedbackId = '789'
      const deleteError = new Error('Permission denied')
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: 'file:///documents/feedback-audio/789.wav',
        size: 500000,
        isDirectory: false,
        modificationTime: Date.now(),
      } as any)
      mockFileSystem.deleteAsync.mockRejectedValueOnce(deleteError)

      // Act
      await deleteCachedAudio(feedbackId)

      // Assert
      expect(log.warn).toHaveBeenCalledWith('audioCache', 'Failed to delete cached audio', {
        feedbackId: '789',
        error: 'Permission denied',
      })
    })
  })

  describe('getAudioStorageUsage', () => {
    // ARRANGE: Test storage usage calculation
    it('should calculate total storage usage correctly', async () => {
      // Arrange
      mockFileSystem.readDirectoryAsync.mockResolvedValue(['123.wav', '456.wav', '789.wav'])
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/',
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        } as any) // Directory check from ensureAudioDirectory
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/123.wav',
          size: 500000, // 500KB
          isDirectory: false,
          modificationTime: 1000,
        } as any)
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/456.wav',
          size: 300000, // 300KB
          isDirectory: false,
          modificationTime: 2000,
        } as any)
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/789.wav',
          size: 200000, // 200KB
          isDirectory: false,
          modificationTime: 3000,
        } as any)

      // Act
      const result = await getAudioStorageUsage()

      // Assert
      // 500KB + 300KB + 200KB = 1000KB = ~0.953MB (1000000 / 1048576)
      expect(result.totalSizeMB).toBeCloseTo(0.953, 2)
      expect(result.fileCount).toBe(3)
    })

    // ARRANGE: Test empty directory
    it('should return zero for empty directory', async () => {
      // Arrange
      mockFileSystem.readDirectoryAsync.mockResolvedValue([])

      // Act
      const result = await getAudioStorageUsage()

      // Assert
      expect(result.totalSizeMB).toBe(0)
      expect(result.fileCount).toBe(0)
    })

    // ARRANGE: Test error handling
    it('should handle errors when reading directory', async () => {
      // Arrange
      const error = new Error('Directory read error')
      mockFileSystem.readDirectoryAsync.mockRejectedValueOnce(error)

      // Act & Assert
      await expect(getAudioStorageUsage()).rejects.toThrow('Directory read error')
    })
  })

  describe('evictOldestAudio', () => {
    // ARRANGE: Test LRU eviction
    it('should evict oldest files to reach target size', async () => {
      // Arrange
      const files = ['oldest.wav', 'middle.wav', 'newest.wav']
      mockFileSystem.readDirectoryAsync.mockResolvedValue(files)
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/',
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        } as any) // Directory check from ensureAudioDirectory
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/oldest.wav',
          size: 500000, // 500KB (oldest, modificationTime: 1000)
          isDirectory: false,
          modificationTime: 1000,
        } as any)
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/middle.wav',
          size: 300000, // 300KB (middle, modificationTime: 2000)
          isDirectory: false,
          modificationTime: 2000,
        } as any)
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/newest.wav',
          size: 200000, // 200KB (newest, modificationTime: 3000)
          isDirectory: false,
          modificationTime: 3000,
        } as any)

      // Act: Target 0.4MB (400KB), need to evict 600KB (oldest + middle)
      const evictedCount = await evictOldestAudio(0.4)

      // Assert
      expect(evictedCount).toBe(2) // oldest.wav and middle.wav
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/oldest.wav'
      )
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/middle.wav'
      )
      // newest.wav should not be deleted
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalledWith(
        'file:///documents/feedback-audio/newest.wav'
      )
    })

    // ARRANGE: Test no eviction needed
    it('should not evict when storage is below target', async () => {
      // Arrange
      const files = ['file1.wav']
      mockFileSystem.readDirectoryAsync.mockResolvedValue(files)
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/',
          size: 0,
          isDirectory: true,
          modificationTime: 0,
        } as any) // Directory check from ensureAudioDirectory
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/file1.wav',
          size: 100000, // 100KB
          isDirectory: false,
          modificationTime: 1000,
        } as any)

      // Act: Target 1MB, current is 0.1MB
      const evictedCount = await evictOldestAudio(1.0)

      // Assert
      expect(evictedCount).toBe(0)
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })

    // ARRANGE: Test error handling
    it('should handle errors during eviction gracefully', async () => {
      // Arrange
      mockFileSystem.readDirectoryAsync.mockRejectedValueOnce(new Error('Read error'))

      // Act & Assert
      await expect(evictOldestAudio(0.5)).rejects.toThrow('Read error')
    })
  })
})
