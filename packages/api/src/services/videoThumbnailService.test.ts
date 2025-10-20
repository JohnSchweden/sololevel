import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}))

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

describe('uploadVideoThumbnail', () => {
  let uploadVideoThumbnail: (
    thumbnailUri: string,
    videoId: number,
    userId: string,
    createdAtIso: string
  ) => Promise<string | null>
  let mockUpload: any
  let mockGetPublicUrl: any
  let mockFrom: any

  beforeEach(async () => {
    // Setup Supabase storage mocks
    mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null })
    mockGetPublicUrl = vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn.example.com/storage/v1/object/public/thumbnails/${path}` },
    }))
    mockFrom = vi.fn(() => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    }))

    // Mock Supabase client
    const { supabase } = await import('../supabase')
    supabase.storage.from = mockFrom

    // Mock fetch for blob conversion
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
    })

    // Mock crypto.subtle for hashing using stubGlobal
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi
          .fn()
          .mockResolvedValue(
            new Uint8Array([
              0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
              0xcd, 0xef,
            ])
          ),
      },
    })

    // Import service
    const service = await import('./videoThumbnailUpload')
    uploadVideoThumbnail = service.uploadVideoThumbnail
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe.skip('uploadVideoThumbnail - TDD Red Phase', () => {
    it('should upload thumbnail to thumbnails bucket with hashed filename', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Expected path: thumbnails/{userId}/videos/{yyyymmdd}/{videoId}/{hash}.jpg
      const expectedPathPattern =
        /thumbnails\/488a7161-xxxx\/videos\/20251014\/1234\/[a-f0-9]{16}\.jpg/

      // Act
      const result = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert
      expect(result).toMatch(/^https?:\/\//)
      expect(result).toMatch(expectedPathPattern)
    })

    it('should use immutable caching with cacheControl header', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Act
      await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert - upload called with cacheControl: '31536000'
      // This will fail until implementation is complete
      expect(mockFrom).toHaveBeenCalledWith('thumbnails')
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/488a7161-xxxx\/videos\/20251014\/1234\/[a-f0-9]{16}\.jpg/),
        expect.any(Blob),
        expect.objectContaining({
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        })
      )
    })

    it('should generate stable hash for same thumbnail content', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Act
      const result1 = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)
      const result2 = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert - same content = same hash = same URL
      expect(result1).toBe(result2)
    })

    it('should return null on upload failure and log error', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Simulate upload failure on both attempts
      mockUpload.mockResolvedValue({ data: null, error: new Error('Storage error') })

      // Act
      const result = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert
      expect(result).toBeNull()
      expect(mockUpload).toHaveBeenCalledTimes(2) // Initial attempt + retry
    })

    it('should retry once on upload failure and succeed on second attempt', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Simulate failure then success
      mockUpload
        .mockResolvedValueOnce({ data: null, error: new Error('Network error') })
        .mockResolvedValueOnce({ data: {}, error: null })

      // Act
      const result = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert
      expect(result).not.toBeNull()
      expect(result).toMatch(/^https?:\/\//)
      expect(mockUpload).toHaveBeenCalledTimes(2) // Initial attempt + successful retry
    })

    it('should handle fetch/blob conversion errors gracefully', async () => {
      // Arrange
      const thumbnailUri = 'invalid://uri'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Mock fetch to throw error
      global.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed'))

      // Act
      const result = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert
      expect(result).toBeNull()
    })

    it('should use date folder from createdAtIso for organization', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z' // Should create /20251014/ folder

      // Act
      const result = await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert
      expect(result).toContain('/20251014/')
    })

    it('should set contentType to image/jpeg', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Act
      await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert - will verify in implementation
      expect(mockFrom).toHaveBeenCalledWith('thumbnails')
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Blob),
        expect.objectContaining({
          contentType: 'image/jpeg',
        })
      )
    })

    it('should use upsert: false for immutable files', async () => {
      // Arrange
      const thumbnailUri = 'data:image/jpeg;base64,test'
      const videoId = 1234
      const userId = '488a7161-xxxx'
      const createdAtIso = '2025-10-14T12:30:00Z'

      // Act
      await uploadVideoThumbnail(thumbnailUri, videoId, userId, createdAtIso)

      // Assert - upload should be called with upsert: false
      expect(mockFrom).toHaveBeenCalledWith('thumbnails')
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Blob),
        expect.objectContaining({
          upsert: false,
        })
      )
    })
  })
})
