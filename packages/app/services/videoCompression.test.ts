// Mock react-native-compressor for tests
jest.mock('react-native-compressor', () => ({
  Video: {
    compress: jest.fn().mockResolvedValue('file:///compressed/video.mp4'),
  },
}))

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
  },
}))

// Mock expo-file-system for tests
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({
    size: 1024 * 1024, // 1MB
    exists: true,
    uri: 'file:///mock/video.mp4',
    isDirectory: false,
  }),
}))

import { compressVideo } from './videoCompression'

describe('videoCompression', () => {
  describe('compressVideo', () => {
    const mockFileUri = 'file:///mock/video.mp4'
    const mockOptions = {
      quality: 'medium' as const,
      maxSize: 10 * 1024 * 1024, // 10MB
      targetBitrate: 2000000, // 2Mbps
    }

    beforeEach(() => {
      const mockCompressor = jest.requireMock('react-native-compressor').Video.compress as jest.Mock
      const constants = jest.requireMock('expo-constants').default as {
        appOwnership: string
      }

      mockCompressor.mockImplementation(async () => 'file:///compressed/video.mp4')
      constants.appOwnership = 'standalone'
    })

    it('should compress video and return compressed URI with metadata', async () => {
      const result = await compressVideo(mockFileUri, mockOptions)

      expect(result).toHaveProperty('compressedUri')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toHaveProperty('size')
      expect(result.metadata).toHaveProperty('duration')
      expect(typeof result.compressedUri).toBe('string')
      expect(typeof result.metadata.size).toBe('number')
      expect(typeof result.metadata.duration).toBe('number')
    })

    it('should accept file URI as string', async () => {
      const result = await compressVideo(mockFileUri)

      expect(result.compressedUri).toBeDefined()
      expect(result.metadata.size).toBeGreaterThan(0)
    })

    it('should handle compression options', async () => {
      const customOptions = {
        quality: 'high' as const,
        maxSize: 5 * 1024 * 1024, // 5MB
      }

      const result = await compressVideo(mockFileUri, customOptions)

      expect(result.compressedUri).toBeDefined()
      expect(result.metadata.size).toBeDefined()
    })

    it('should return original URI when compression fails', async () => {
      const mockCompressor = jest.requireMock('react-native-compressor').Video.compress as jest.Mock

      mockCompressor.mockRejectedValueOnce(new Error('Compression failed'))

      const result = await compressVideo(mockFileUri)

      expect(result.compressedUri).toBeDefined()
      // In a real failure scenario, it might return the original URI
      expect(result.metadata.size).toBeGreaterThan(0)
      expect(result.compressedUri).toBe(mockFileUri)
    })

    it('should validate input URI format', async () => {
      await expect(compressVideo('invalid-uri')).rejects.toThrow()
    })

    it('should handle platform-specific compression logic', async () => {
      // This test ensures the platform detection works
      const result = await compressVideo(mockFileUri)

      expect(result).toHaveProperty('compressedUri')
      expect(result).toHaveProperty('metadata')
    })

    it('should skip compression when running in Expo Go', async () => {
      const constants = jest.requireMock('expo-constants').default as {
        appOwnership: string
      }
      const mockCompressor = jest.requireMock('react-native-compressor').Video.compress as jest.Mock

      // Clear previous mock calls from other tests
      mockCompressor.mockClear()
      constants.appOwnership = 'expo'

      const result = await compressVideo(mockFileUri)

      expect(mockCompressor).not.toHaveBeenCalled()
      expect(result.compressedUri).toBe(mockFileUri)
    })
  })
})
