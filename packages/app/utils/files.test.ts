// Mock fetch for tests
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock expo-file-system for tests
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}))

import { uriToBlob } from './files'

describe('files utils', () => {
  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear()

    // Default mock response for file:// URIs
    const mockBlob = new Blob(['mock video data'], { type: 'video/mp4' })
    mockFetch.mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(mockBlob),
    })
  })

  describe('uriToBlob', () => {
    it('should convert file:// URI to Blob on native platforms', async () => {
      const mockUri = 'file:///mock/video.mp4'
      const result = await uriToBlob(mockUri)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(0)
      expect(result.type).toBe('video/mp4')
      expect(mockFetch).toHaveBeenCalledWith(mockUri)
    })

    it('should handle different file formats', async () => {
      const testCases = [
        { uri: 'file:///mock/video.mp4', expectedType: 'video/mp4' },
        { uri: 'file:///mock/video.mov', expectedType: 'video/quicktime' },
        { uri: 'file:///mock/audio.mp3', expectedType: 'audio/mpeg' },
      ]

      for (const { uri, expectedType } of testCases) {
        // Configure mock for this specific URI
        const mockBlob = new Blob(['mock data'], { type: expectedType })
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: jest.fn().mockResolvedValue(mockBlob),
        })

        const result = await uriToBlob(uri)
        expect(result.type).toBe(expectedType)
      }
    })

    it('should validate input URI format', async () => {
      await expect(uriToBlob('invalid-uri')).rejects.toThrow('Unsupported URI format')
      await expect(uriToBlob('')).rejects.toThrow('Invalid URI provided')
      await expect(uriToBlob(null as any)).rejects.toThrow('Invalid URI provided')
    })

    it('should handle network errors gracefully', async () => {
      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const mockUri = 'file:///mock/video.mp4'
      await expect(uriToBlob(mockUri)).rejects.toThrow('Failed to convert URI to Blob')
    })

    it('should handle platform-specific blob conversion', async () => {
      const mockUri = 'file:///mock/video.mp4'
      const result = await uriToBlob(mockUri)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(0)
    })
  })
})
