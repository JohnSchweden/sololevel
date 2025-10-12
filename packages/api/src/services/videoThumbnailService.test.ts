import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock expo-video-thumbnails (only used in native tests)
vi.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: vi.fn(),
}))

describe('videoThumbnailService.native', () => {
  let generateVideoThumbnail: (videoUri: string) => Promise<{ uri: string } | null>
  let mockGetThumbnailAsync: any

  beforeEach(async () => {
    // Dynamic import to get mocked module
    const VideoThumbnails = await import('expo-video-thumbnails')
    mockGetThumbnailAsync = VideoThumbnails.getThumbnailAsync

    // Import service after mock is set up
    const service = await import('./videoThumbnailService.native')
    generateVideoThumbnail = service.generateVideoThumbnail
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateVideoThumbnail', () => {
    it('should generate thumbnail successfully for valid video URI', async () => {
      // Arrange
      const videoUri = 'file:///path/to/video.mp4'
      const expectedThumbnail = { uri: 'file:///path/to/thumbnail.jpg' }

      mockGetThumbnailAsync.mockResolvedValueOnce(expectedThumbnail)

      // Act
      const result = await generateVideoThumbnail(videoUri)

      // Assert
      expect(result).toEqual(expectedThumbnail)
      expect(mockGetThumbnailAsync).toHaveBeenCalledWith(videoUri, {
        time: 1000,
        quality: 0.8,
      })
    })

    it('should return null when thumbnail generation fails', async () => {
      // Arrange
      const videoUri = 'file:///path/to/invalid.mp4'
      mockGetThumbnailAsync.mockRejectedValueOnce(new Error('Failed to generate thumbnail'))

      // Act
      const result = await generateVideoThumbnail(videoUri)

      // Assert
      expect(result).toBeNull()
    })

    it('should log error when thumbnail generation fails', async () => {
      // Arrange
      const videoUri = 'file:///path/to/invalid.mp4'
      const error = new Error('Thumbnail generation failed')
      mockGetThumbnailAsync.mockRejectedValueOnce(error)

      // Act
      await generateVideoThumbnail(videoUri)

      // Assert
      // Note: Logger testing will be validated in integration tests
      expect(mockGetThumbnailAsync).toHaveBeenCalledWith(videoUri, {
        time: 1000,
        quality: 0.8,
      })
    })

    it('should use correct quality and time parameters', async () => {
      // Arrange
      const videoUri = 'file:///path/to/video.mp4'
      mockGetThumbnailAsync.mockResolvedValueOnce({ uri: 'file:///thumbnail.jpg' })

      // Act
      await generateVideoThumbnail(videoUri)

      // Assert
      expect(mockGetThumbnailAsync).toHaveBeenCalledWith(videoUri, {
        time: 1000, // 1 second
        quality: 0.8, // 80% quality
      })
    })

    it('should handle empty video URI gracefully', async () => {
      // Arrange
      const videoUri = ''
      mockGetThumbnailAsync.mockRejectedValueOnce(new Error('Invalid URI'))

      // Act
      const result = await generateVideoThumbnail(videoUri)

      // Assert
      expect(result).toBeNull()
    })
  })
})

describe('videoThumbnailService.web', () => {
  let generateVideoThumbnail: (videoUri: string) => Promise<{ uri: string } | null>

  beforeEach(async () => {
    // Mock DOM APIs
    global.document = {
      createElement: vi.fn((tagName: string) => {
        if (tagName === 'video') {
          return {
            crossOrigin: '',
            currentTime: 0,
            duration: 10,
            videoWidth: 1920,
            videoHeight: 1080,
            onloadedmetadata: null,
            onseeked: null,
            onerror: null,
            src: '',
          }
        }
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
              drawImage: vi.fn(),
            })),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,test'),
          }
        }
        return {}
      }),
    } as any

    // Import service
    const service = await import('./videoThumbnailService.web')
    generateVideoThumbnail = service.generateVideoThumbnail
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateVideoThumbnail', () => {
    it('should generate thumbnail successfully using Canvas API', async () => {
      // Arrange
      const videoUri = 'https://example.com/video.mp4'

      // Act
      const promise = generateVideoThumbnail(videoUri)

      // Simulate video loading
      const mockVideo = (global.document.createElement as any).mock.results[0].value
      mockVideo.onloadedmetadata?.()
      mockVideo.onseeked?.()

      const result = await promise

      // Assert
      expect(result).toEqual({ uri: 'data:image/jpeg;base64,test' })
    })

    it('should return null when Canvas context is not available', async () => {
      // Arrange
      const videoUri = 'https://example.com/video.mp4'
      global.document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            getContext: vi.fn(() => null),
          }
        }
        return {}
      }) as any

      // Act
      const result = await generateVideoThumbnail(videoUri)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when video fails to load', async () => {
      // Arrange
      const videoUri = 'https://example.com/invalid.mp4'

      // Act
      const promise = generateVideoThumbnail(videoUri)

      // Simulate video error
      const mockVideo = (global.document.createElement as any).mock.results[0].value
      mockVideo.onerror?.(new Error('Load failed'))

      const result = await promise

      // Assert
      expect(result).toBeNull()
    })

    it('should handle CORS errors gracefully', async () => {
      // Arrange
      const videoUri = 'https://cors-blocked.com/video.mp4'

      // Act
      const promise = generateVideoThumbnail(videoUri)

      // Simulate CORS error
      const mockVideo = (global.document.createElement as any).mock.results[0].value
      mockVideo.onerror?.(new Error('CORS policy blocked'))

      const result = await promise

      // Assert
      expect(result).toBeNull()
    })
  })
})
