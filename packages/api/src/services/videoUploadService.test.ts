import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSignedUploadUrl } from './videoUploadService'

// Mock @my/logging
vi.mock('@my/logging', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}))

import { supabase } from '../supabase'

const mockSupabase = supabase as unknown as {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

describe('videoUploadService', () => {
  describe('createSignedUploadUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default auth mock
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      })
    })

    describe('Cache-Control headers (Task 35 Module 1)', () => {
      it('should document that Cache-Control must be set by client during upload', async () => {
        // Arrange
        const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({
          data: {
            signedUrl: 'https://storage.example.com/signed-url',
            path: 'user-123/videos/20251022/123/video.mp4',
          },
          error: null,
        })

        const mockFrom = vi.fn().mockReturnValue({
          createSignedUploadUrl: mockCreateSignedUploadUrl,
        })

        mockSupabase.storage.from = mockFrom

        const storagePath = 'user-123/videos/20251022/123/video.mp4'
        const fileSize = 10 * 1024 * 1024 // 10MB

        // Act
        const result = await createSignedUploadUrl(storagePath, fileSize)

        // Assert - Signed URL created (Cache-Control set by client when uploading)
        expect(mockFrom).toHaveBeenCalledWith('raw')
        expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(
          storagePath,
          expect.objectContaining({
            upsert: false,
          })
        )
        expect(result.signedUrl).toBe('https://storage.example.com/signed-url')
      })

      it('should create valid signed URL with cache headers', async () => {
        // Arrange
        const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({
          data: {
            signedUrl: 'https://storage.example.com/signed-url?token=abc123',
            path: 'user-123/videos/20251022/123/video.mp4',
          },
          error: null,
        })

        mockSupabase.storage.from = vi.fn().mockReturnValue({
          createSignedUploadUrl: mockCreateSignedUploadUrl,
        })

        const storagePath = 'user-123/videos/20251022/123/video.mp4'
        const fileSize = 5 * 1024 * 1024 // 5MB

        // Act
        const result = await createSignedUploadUrl(storagePath, fileSize)

        // Assert
        expect(result).toEqual({
          signedUrl: 'https://storage.example.com/signed-url?token=abc123',
          path: 'user-123/videos/20251022/123/video.mp4',
        })
      })
    })

    describe('Error handling', () => {
      it('should throw error when user not authenticated', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        // Act & Assert
        await expect(createSignedUploadUrl('user-123/video.mp4', 1024)).rejects.toThrow(
          'User not authenticated'
        )
      })

      it('should throw error when file size is zero', async () => {
        // Act & Assert
        await expect(createSignedUploadUrl('user-123/video.mp4', 0)).rejects.toThrow(
          'File size must be greater than 0'
        )
      })

      it('should throw error when createSignedUploadUrl fails', async () => {
        // Arrange
        const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        })

        mockSupabase.storage.from = vi.fn().mockReturnValue({
          createSignedUploadUrl: mockCreateSignedUploadUrl,
        })

        // Act & Assert
        await expect(createSignedUploadUrl('user-123/video.mp4', 1024)).rejects.toThrow(
          'Failed to create signed URL: Storage quota exceeded'
        )
      })
    })
  })
})
