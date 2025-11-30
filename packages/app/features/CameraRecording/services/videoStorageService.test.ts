/// <reference types="jest" />

// Use manual mock from __mocks__/expo-file-system.ts per @testing-unified.mdc
// No imports needed - jest-expo preset provides globals
import type { DownloadResumable } from 'expo-file-system'
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { VideoStorageService } from './videoStorageService'

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>
const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>

if (!mockFileSystem.createDownloadResumable) {
  mockFileSystem.createDownloadResumable = jest.fn() as any
}

const mockDownloadAsync = mockFileSystem.downloadAsync as jest.MockedFunction<
  typeof FileSystem.downloadAsync
>
const mockCreateDownloadResumable = mockFileSystem.createDownloadResumable as jest.MockedFunction<
  typeof FileSystem.createDownloadResumable
>

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
    mockDownloadAsync.mockResolvedValue({} as any)
    mockCreateDownloadResumable.mockImplementation((url: string, fileUri: string) => {
      const resumable = {
        downloadAsync: jest.fn(() => mockDownloadAsync(url, fileUri)),
        pauseAsync: jest.fn().mockResolvedValue({ url, fileUri }),
        resumeAsync: jest.fn(),
      }

      return resumable as unknown as DownloadResumable
    })
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
        .mockResolvedValueOnce({ exists: true, size: 2048000 } as any) // source file (checked first)
        .mockResolvedValueOnce({ exists: false } as any) // recordings dir (in initialize)
        .mockResolvedValueOnce({ exists: false } as any) // temp dir (in initialize)
        .mockResolvedValueOnce({ exists: true, size: 1024000 } as any) // saved file

      mockFileSystem.copyAsync.mockResolvedValueOnce(undefined)
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any)
      mockMediaLibrary.createAssetAsync.mockResolvedValueOnce({
        id: 'test-asset-id',
        uri: 'file:///gallery/video.mp4',
      } as any)

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
        skipFilesystem: false,
      })
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: expect.stringMatching(/^file:\/\/\/documents\/recordings\/video_\d+\.mp4$/),
      })
      // Gallery save should be called when video is kept
      expect(mockMediaLibrary.createAssetAsync).toHaveBeenCalled()
    })

    it('skips filesystem but saves to gallery when skipFilesystem is true', async () => {
      // Arrange
      const sourceUri = 'file:///source/video.mp4'
      const filename = 'test-video.mp4'
      const metadata = { duration: 30, format: 'mp4' }

      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        size: 2048000,
      } as any) // source file

      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any)
      mockMediaLibrary.createAssetAsync.mockResolvedValueOnce({
        id: 'test-asset-id',
        uri: 'file:///gallery/video.mp4',
      } as any)

      // Act
      const result = await VideoStorageService.saveVideo(sourceUri, filename, metadata, {
        skipFilesystem: true,
      })

      // Assert
      expect(result.localUri).toBeNull()
      expect(result.filename).toBe(filename) // Original filename preserved
      expect(result.size).toBe(2048000) // Source file size
      expect(result.metadata.skipFilesystem).toBe(true)
      // Filesystem operations should be skipped
      expect(mockFileSystem.copyAsync).not.toHaveBeenCalled()
      // Gallery save should still occur when discarding (using sourceUri)
      expect(mockMediaLibrary.createAssetAsync).toHaveBeenCalledWith(sourceUri)
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

  describe('downloadVideo', () => {
    it('should download video from signed URL and save to persistent directory', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 12345

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri.includes(`analysis_${analysisId}.mp4`)) {
          return Promise.resolve({
            exists: true,
            size: 10240000,
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockResolvedValue({} as any)

      // Act
      const result = await VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Assert
      expect(result).toMatch(/^file:\/\/\/documents\/recordings\/analysis_12345\.mp4$/)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(
        signedUrl,
        expect.stringMatching(/^file:\/\/\/documents\/recordings\/analysis_12345\.mp4$/)
      )
    })

    it('should handle download errors gracefully', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 99999
      const downloadError = new Error('Network timeout')

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockRejectedValue(downloadError)

      // Act & Assert
      await expect(VideoStorageService.downloadVideo(signedUrl, analysisId)).rejects.toThrow(
        'Failed to download video: Network timeout'
      )
    })

    it('should validate downloaded file exists and has content', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 11111

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri.includes(`analysis_${analysisId}.mp4`)) {
          return Promise.resolve({
            exists: true,
            size: 0, // Zero size - should warn
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockResolvedValue({} as any)

      // Act
      const result = await VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Assert
      expect(result).toBeDefined()
      // Verify file info was checked after download
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        expect.stringMatching(/^file:\/\/\/documents\/recordings\/analysis_11111\.mp4$/)
      )
    })

    it('should throw error if downloaded file does not exist', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 22222
      const persistentPath = `file:///documents/recordings/analysis_${analysisId}.mp4`

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings') && !uri.includes('analysis')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri === persistentPath) {
          return Promise.resolve({ exists: false } as any) // File doesn't exist after download
        }
        return Promise.resolve({ exists: true } as any)
      })
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockResolvedValue({} as any)

      // Act & Assert
      await expect(VideoStorageService.downloadVideo(signedUrl, analysisId)).rejects.toThrow(
        'Downloaded file does not exist'
      )
    })

    it('should deduplicate concurrent downloads for same analysisId', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 55555
      const persistentPath = `file:///documents/recordings/analysis_${analysisId}.mp4`

      // First call: file doesn't exist, download starts
      // Second call: should return same Promise (deduplication)
      let callCount = 0
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings') && !uri.includes('analysis')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri === persistentPath) {
          callCount++
          if (callCount === 1) {
            // First check: file doesn't exist yet
            return Promise.resolve({ exists: false } as any)
          }
          // After download: file exists
          return Promise.resolve({
            exists: true,
            size: 10240000,
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      // Mock download to be slow (simulate network delay)
      let downloadResolve: () => void
      const downloadPromise = new Promise<FileSystem.FileSystemDownloadResult>((resolve) => {
        downloadResolve = () => {
          resolve({} as FileSystem.FileSystemDownloadResult)
        }
      })
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockImplementation(() => downloadPromise)

      // Act: Start two concurrent downloads for same analysisId
      const download1 = VideoStorageService.downloadVideo(signedUrl, analysisId)
      const download2 = VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Complete download
      downloadResolve!()

      // Wait for both to complete
      const [result1, result2] = await Promise.all([download1, download2])

      // Assert: Both should return same path
      expect(result1).toBe(persistentPath)
      expect(result2).toBe(persistentPath)
      // Download should only be called ONCE (deduplication)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
    })

    it('should return immediately if file already exists with content', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 66666
      const persistentPath = `file:///documents/recordings/analysis_${analysisId}.mp4`

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings') && !uri.includes('analysis')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri === persistentPath) {
          // File already exists with content
          return Promise.resolve({
            exists: true,
            size: 10240000, // Non-zero size
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      // Act
      const result = await VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Assert: Should return immediately without downloading
      expect(result).toBe(persistentPath)
      expect(mockFileSystem.downloadAsync).not.toHaveBeenCalled()
    })

    it('should delete and retry if file exists but has zero size (partial download)', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 77777
      const persistentPath = `file:///documents/recordings/analysis_${analysisId}.mp4`

      let checkCount = 0
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings') && !uri.includes('analysis')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri === persistentPath) {
          checkCount++
          if (checkCount === 1) {
            // First check: partial file exists (zero size)
            return Promise.resolve({
              exists: true,
              size: 0, // Partial/corrupted file
              modificationTime: Date.now(),
            } as any)
          }
          // After retry: file has content
          return Promise.resolve({
            exists: true,
            size: 10240000,
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockResolvedValue({} as any)

      // Act
      const result = await VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Assert: Should delete partial file and retry download
      expect(result).toBe(persistentPath)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(persistentPath)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(signedUrl, persistentPath)
    })

    it('should cleanup in-flight tracker on download failure', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/raw/video.mp4?token=abc123'
      const analysisId = 88888
      const persistentPath = `file:///documents/recordings/analysis_${analysisId}.mp4`
      const downloadError = new Error('Network timeout')

      let fileCheckCount = 0
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('recordings') && !uri.includes('analysis')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        if (uri === persistentPath) {
          fileCheckCount++
          if (fileCheckCount === 1) {
            // First call - first check: file doesn't exist initially
            return Promise.resolve({ exists: false } as any)
          }
          if (fileCheckCount === 2) {
            // Second call - first check: file doesn't exist (cleanup worked, fresh start)
            return Promise.resolve({ exists: false } as any)
          }
          // After second download: file exists
          return Promise.resolve({
            exists: true,
            size: 10240000,
            modificationTime: Date.now(),
          } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      // First download fails
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockRejectedValueOnce(downloadError)

      // Act & Assert: First call should fail
      await expect(VideoStorageService.downloadVideo(signedUrl, analysisId)).rejects.toThrow(
        'Failed to download video: Network timeout'
      )

      // Second download succeeds (tracker was cleaned up, so new download starts)
      ;(
        mockFileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>
      ).mockResolvedValueOnce({} as any)

      // Act: Second call should start fresh (tracker cleaned up)
      const result = await VideoStorageService.downloadVideo(signedUrl, analysisId)

      // Assert: Retry should work (tracker was cleaned up)
      expect(result).toBe(persistentPath)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledTimes(2) // Initial failure + retry
    })
  })

  describe('getStorageUsage', () => {
    it('should calculate total storage usage for all videos', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        if (uri.includes('video_1.mp4')) {
          return Promise.resolve({ exists: true, size: 10485760, modificationTime: 1000 } as any) // 10 MB
        }
        if (uri.includes('video_2.mov')) {
          return Promise.resolve({ exists: true, size: 20971520, modificationTime: 2000 } as any) // 20 MB
        }
        if (uri.includes('analysis_123.mp4')) {
          return Promise.resolve({ exists: true, size: 15728640, modificationTime: 3000 } as any) // 15 MB
        }
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })
      mockFileSystem.readDirectoryAsync.mockResolvedValue([
        'video_1.mp4',
        'video_2.mov',
        'analysis_123.mp4',
      ])

      // Act
      const result = await VideoStorageService.getStorageUsage()

      // Assert
      expect(result.totalVideos).toBe(3)
      expect(result.totalSizeMB).toBeCloseTo(45.0, 1) // (10 + 20 + 15) MB
    })

    it('should return zero for empty storage', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      mockFileSystem.readDirectoryAsync.mockResolvedValue([])

      // Act
      const result = await VideoStorageService.getStorageUsage()

      // Assert
      expect(result.totalVideos).toBe(0)
      expect(result.totalSizeMB).toBe(0)
    })

    it('should handle storage errors gracefully', async () => {
      // Arrange
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      mockFileSystem.readDirectoryAsync.mockRejectedValue(new Error('Permission denied'))

      // Act & Assert
      await expect(VideoStorageService.getStorageUsage()).rejects.toThrow(
        'Failed to get storage usage: Failed to list videos: Permission denied'
      )
    })
  })

  describe('evictOldestVideos', () => {
    it('should evict oldest videos when target size is exceeded', async () => {
      // Arrange
      const videos = [
        { filename: 'video_old.mp4', size: 5000000, modificationTime: 1000 },
        { filename: 'video_mid.mp4', size: 6000000, modificationTime: 2000 },
        { filename: 'video_new.mp4', size: 7000000, modificationTime: 3000 },
      ]

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      mockFileSystem.readDirectoryAsync.mockResolvedValue(videos.map((v) => v.filename))

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        const video = videos.find((v) => uri.includes(v.filename))
        if (video) {
          return Promise.resolve({
            exists: true,
            size: video.size,
            modificationTime: video.modificationTime,
          } as any)
        }
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      mockFileSystem.deleteAsync.mockResolvedValue(undefined)

      // Act - Evict to get under 10MB (total is 18MB)
      const result = await VideoStorageService.evictOldestVideos(10)

      // Assert - Should delete oldest videos to get under 10MB
      expect(result).toBeGreaterThan(0)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled()
      // Oldest video should be deleted first
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('video_old.mp4')
      )
    })

    it('should not evict videos if quota is not exceeded', async () => {
      // Arrange
      const videos = [
        { filename: 'video_1.mp4', size: 2000000, modificationTime: 1000 },
        { filename: 'video_2.mp4', size: 3000000, modificationTime: 2000 },
      ]

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      mockFileSystem.readDirectoryAsync.mockResolvedValue(videos.map((v) => v.filename))

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        const video = videos.find((v) => uri.includes(v.filename))
        if (video) {
          return Promise.resolve({
            exists: true,
            size: video.size,
            modificationTime: video.modificationTime,
          } as any)
        }
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      // Act - Evict to get under 10MB (total is 5MB, well under)
      const result = await VideoStorageService.evictOldestVideos(10)

      // Assert - Should not delete anything
      expect(result).toBe(0)
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })

    it('should protect videos less than 7 days old', async () => {
      // Arrange
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000 // Just over 7 days
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000 // Less than 7 days

      const videos = [
        { filename: 'video_old.mp4', size: 10000000, modificationTime: sevenDaysAgo },
        { filename: 'video_new.mp4', size: 10000000, modificationTime: sixDaysAgo },
      ]

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as any)
      mockFileSystem.readDirectoryAsync.mockResolvedValue(videos.map((v) => v.filename))

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        const video = videos.find((v) => uri.includes(v.filename))
        if (video) {
          return Promise.resolve({
            exists: true,
            size: video.size,
            modificationTime: video.modificationTime,
          } as any)
        }
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })

      mockFileSystem.deleteAsync.mockResolvedValue(undefined)

      // Act - Evict to get under 15MB (total is 20MB)
      const result = await VideoStorageService.evictOldestVideos(15)

      // Assert - Should only delete old video, not protected new video
      expect(result).toBeGreaterThan(0)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('video_old.mp4')
      )
      // New video should NOT be deleted
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('video_new.mp4')
      )
    })

    it('should handle eviction errors gracefully', async () => {
      // Arrange - Old video (>7 days) that exceeds quota
      const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      const videos = [{ filename: 'video_old.mp4', size: 50000000, modificationTime: oldDate }]

      mockFileSystem.getInfoAsync.mockImplementation((uri) => {
        const video = videos.find((v) => uri.includes(v.filename))
        if (video) {
          return Promise.resolve({
            exists: true,
            size: video.size,
            modificationTime: video.modificationTime,
          } as any)
        }
        if (uri.includes('recordings')) {
          return Promise.resolve({ exists: true, isDirectory: true } as any)
        }
        return Promise.resolve({ exists: false } as any)
      })
      mockFileSystem.readDirectoryAsync.mockResolvedValue(videos.map((v) => v.filename))

      mockFileSystem.deleteAsync.mockRejectedValue(new Error('Permission denied'))

      // Act - Should continue despite deletion errors (error handling logs warning, continues)
      const result = await VideoStorageService.evictOldestVideos(10)

      // Assert - Should attempt eviction despite errors, logs warning but continues
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled()
      expect(result).toBeGreaterThanOrEqual(0) // May return 0 if error prevents tracking evictions
    })
  })
})
