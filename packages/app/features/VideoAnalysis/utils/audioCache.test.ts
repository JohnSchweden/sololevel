/// <reference types="jest" />

import { log } from '@my/logging'
// Use manual mock from __mocks__/expo-file-system.ts per @testing-unified.mdc
import * as FileSystem from 'expo-file-system'
import {
  checkCachedAudio,
  deleteCachedAudio,
  ensureAudioDirectory,
  evictOldestAudio,
  extractAudioExtension,
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

  describe('extractAudioExtension', () => {
    // ARRANGE: Test extracting extension from URLs with different formats
    it('should extract m4a extension from URL', () => {
      // Arrange & Act
      const ext1 = extractAudioExtension('https://example.com/audio.m4a')
      const ext2 = extractAudioExtension('https://storage.example.com/path/to/audio.m4a?token=abc')

      // Assert
      expect(ext1).toBe('m4a')
      expect(ext2).toBe('m4a')
    })

    it('should extract mp3 extension from URL', () => {
      // Arrange & Act
      const ext = extractAudioExtension('https://example.com/audio.mp3')

      // Assert
      expect(ext).toBe('mp3')
    })

    it('should extract wav extension from URL', () => {
      // Arrange & Act
      const ext = extractAudioExtension('https://example.com/audio.wav')

      // Assert
      expect(ext).toBe('wav')
    })

    it('should extract aac extension from storage path', () => {
      // Arrange & Act
      const ext = extractAudioExtension('user-123/videos/20251014/1234/audio/1069/0.aac')

      // Assert
      expect(ext).toBe('aac')
    })

    it('should default to wav when extension cannot be determined', () => {
      // Arrange & Act
      const ext1 = extractAudioExtension('https://example.com/audio')
      const ext2 = extractAudioExtension('https://example.com/audio.unknown')
      const ext3 = extractAudioExtension('user-123/videos/path')

      // Assert
      expect(ext1).toBe('wav')
      expect(ext2).toBe('wav') // unknown extension defaults to wav
      expect(ext3).toBe('wav')
    })

    it('should handle URLs with query parameters and fragments', () => {
      // Arrange & Act
      const ext1 = extractAudioExtension('https://example.com/audio.m4a?token=abc&expires=123')
      const ext2 = extractAudioExtension('https://example.com/audio.mp3#fragment')

      // Assert
      expect(ext1).toBe('m4a')
      expect(ext2).toBe('mp3')
    })
  })

  describe('getCachedAudioPath', () => {
    // ARRANGE: Test path generation with default extension
    it('should return correct path for feedback ID with default wav extension', () => {
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

    // ARRANGE: Test path generation with explicit extension
    it('should return correct path with explicit extension', () => {
      // Arrange & Act
      const path1 = getCachedAudioPath('123', 'mp3')
      const path2 = getCachedAudioPath('456', 'wav')
      const path3 = getCachedAudioPath('789', 'aac')

      // Assert
      expect(path1).toBe('file:///documents/feedback-audio/123.mp3')
      expect(path2).toBe('file:///documents/feedback-audio/456.wav')
      expect(path3).toBe('file:///documents/feedback-audio/789.aac')
    })
  })

  describe('checkCachedAudio', () => {
    // ARRANGE: Test when audio file exists with wav extension (default priority)
    it('should return true when cached audio file exists (wav)', async () => {
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

    // ARRANGE: Test when audio file exists with different extension (tries wav first, then mp3)
    it('should return true when cached audio file exists (mp3)', async () => {
      // Arrange
      const feedbackId = '456'
      // Priority order: wav, mp3, aac, m4a
      // First try wav (doesn't exist), then mp3 (exists)
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: false,
          uri: 'file:///documents/feedback-audio/456.wav',
        } as any)
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/456.mp3',
          size: 500000,
          isDirectory: false,
          modificationTime: Date.now(),
        } as any)

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(true)
    })

    // ARRANGE: Test when audio file does not exist (all extensions checked)
    it('should return false when cached audio file does not exist in any format', async () => {
      // Arrange
      const feedbackId = '456'
      // Mock all extensions to return false
      mockFileSystem.getInfoAsync.mockImplementation(() =>
        Promise.resolve({
          exists: false,
          uri: '',
          size: 0,
          isDirectory: false,
          modificationTime: 0,
        } as any)
      )

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(false)
      // Should check all 4 extensions in priority order: wav, mp3, aac, m4a
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledTimes(4)
    })

    // ARRANGE: Test error handling - continues to next extension
    it('should continue checking other extensions when one fails', async () => {
      // Arrange
      const feedbackId = '789'
      // First extension fails, second succeeds
      mockFileSystem.getInfoAsync
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/789.mp3',
          size: 500000,
          isDirectory: false,
          modificationTime: Date.now(),
        } as any)

      // Act
      const result = await checkCachedAudio(feedbackId)

      // Assert
      expect(result).toBe(true)
    })

    // ARRANGE: Test with extension hint
    it('should check extension hint first when provided', async () => {
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
      const result = await checkCachedAudio(feedbackId, 'wav')

      // Assert
      expect(result).toBe(true)
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        'file:///documents/feedback-audio/123.wav'
      )
      // Should only check once since hint was correct
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe('persistAudioFile', () => {
    // ARRANGE: Test successful audio download and persistence with wav
    it('should download and persist audio from remote URL (wav)', async () => {
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
        extension: 'wav',
      })
    })

    // ARRANGE: Test successful audio download with mp3
    it('should download and persist audio from remote URL (mp3)', async () => {
      // Arrange
      const feedbackId = '456'
      const remoteUrl = 'https://example.com/audio.mp3'
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
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(
        remoteUrl,
        'file:///documents/feedback-audio/456.mp3'
      )
      expect(result).toBe('file:///documents/feedback-audio/456.mp3')
      expect(log.info).toHaveBeenCalledWith('audioCache', 'Audio persisted to disk', {
        feedbackId: '456',
        path: 'file:///documents/feedback-audio/456.mp3',
        extension: 'mp3',
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
        extension: 'wav',
      })
    })

    // ARRANGE: Test when file does not exist in any format
    it('should not delete when file does not exist in any format', async () => {
      // Arrange
      const feedbackId = '456'
      // Mock all extensions to return false
      mockFileSystem.getInfoAsync.mockImplementation(() =>
        Promise.resolve({
          exists: false,
          uri: '',
          size: 0,
          isDirectory: false,
          modificationTime: 0,
        } as any)
      )

      // Act
      await deleteCachedAudio(feedbackId)

      // Assert
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
      // Should check all 4 extensions in priority order
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledTimes(4)
    })

    // ARRANGE: Test error handling - logs warning when all deletions fail
    it('should log warning when deletion fails for all extensions', async () => {
      // Arrange
      const feedbackId = '789'
      const deleteError = new Error('Permission denied')
      // wav exists but deletion fails, no other extensions exist
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          uri: 'file:///documents/feedback-audio/789.wav',
          size: 500000,
          isDirectory: false,
          modificationTime: Date.now(),
        } as any)
        .mockImplementation(() =>
          Promise.resolve({
            exists: false,
            uri: '',
            size: 0,
            isDirectory: false,
            modificationTime: 0,
          } as any)
        )
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
      expect(result.sizeMB).toBeCloseTo(0.953, 2)
      expect(result.count).toBe(3)
    })

    // ARRANGE: Test empty directory
    it('should return zero for empty directory', async () => {
      // Arrange
      mockFileSystem.readDirectoryAsync.mockResolvedValue([])

      // Act
      const result = await getAudioStorageUsage()

      // Assert
      expect(result.sizeMB).toBe(0)
      expect(result.count).toBe(0)
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
