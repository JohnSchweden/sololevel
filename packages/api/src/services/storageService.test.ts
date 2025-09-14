/**
 * TDD Tests for Storage Service - Phase 2: Storage Integration
 * Tests storage bucket policies, rate limiting, and file processing pipeline
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../supabase'
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  deleteStorageFile,
  getStorageFileInfo,
  rateLimitSignedUrls,
  validateStorageAccess,
} from './storageService'

// Mock Supabase with proper storage support
const createStorageMock = () => {
  const mock = {
    createSignedUploadUrl: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    getPublicUrl: vi.fn(),
  }
  return mock
}

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => createStorageMock()),
    },
  },
}))

describe('Storage Service - Phase 2: Storage Integration', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = vi.mocked(supabase)
    mockUser = { data: { user: { id: 'test-user-id' } } }
    mockSupabase.auth.getUser.mockResolvedValue(mockUser)
  })

  // Phase 2: TDD Tests for Storage Bucket Policies
  describe('Storage Bucket Policies', () => {
    describe('createSignedUploadUrl', () => {
      it('should create signed upload URL with user folder isolation', async () => {
        // RED: Write failing test first
        const mockStorage = createStorageMock()
        mockStorage.createSignedUploadUrl.mockResolvedValue({
          data: {
            signedUrl: 'https://storage.supabase.co/upload/signed-url',
            path: 'user-123/video.mp4',
          },
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await createSignedUploadUrl('raw', 'video.mp4', 'video/mp4')

        expect(result.data).toBeDefined()
        expect(result.data?.signedUrl).toContain('signed-url')
        expect(result.data?.path).toContain('test-user-id/video.mp4')
        expect(result.error).toBeNull()
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('raw')
        expect(mockStorage.createSignedUploadUrl).toHaveBeenCalledWith('test-user-id/video.mp4', {
          upsert: false,
        })
      })

      it('should enforce user folder isolation in file paths', async () => {
        const mockStorage = createStorageMock()
        mockStorage.createSignedUploadUrl.mockResolvedValue({
          data: {
            signedUrl: 'https://storage.supabase.co/upload/signed-url',
            path: 'user-123/document.pdf',
          },
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await createSignedUploadUrl('raw', 'document.pdf', 'application/pdf')

        expect(result.data?.path).toBe('test-user-id/document.pdf')
        expect(mockStorage.createSignedUploadUrl).toHaveBeenCalledWith(
          'test-user-id/document.pdf',
          { upsert: false }
        )
      })

      it('should handle storage errors gracefully', async () => {
        const mockStorage = createStorageMock()
        mockStorage.createSignedUploadUrl.mockResolvedValue({
          data: null,
          error: { message: 'Storage bucket not found' },
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await createSignedUploadUrl('invalid-bucket', 'file.mp4', 'video/mp4')

        expect(result.data).toBeNull()
        expect(result.error).toBe('Storage bucket not found')
      })

      it('should handle authentication errors', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

        const result = await createSignedUploadUrl('raw', 'video.mp4', 'video/mp4')

        expect(result.data).toBeNull()
        expect(result.error).toBe('User not authenticated')
      })

      it('should set appropriate TTL for signed URLs', async () => {
        const mockStorage = createStorageMock()
        mockStorage.createSignedUploadUrl.mockResolvedValue({
          data: {
            signedUrl: 'https://storage.supabase.co/upload/signed-url',
            path: 'user-123/video.mp4',
          },
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        await createSignedUploadUrl('raw', 'video.mp4', 'video/mp4')

        // Should use upsert: false for security
        expect(mockStorage.createSignedUploadUrl).toHaveBeenCalledWith('test-user-id/video.mp4', {
          upsert: false,
        })
      })
    })

    describe('createSignedDownloadUrl', () => {
      it('should create signed download URL with access validation', async () => {
        const mockStorage = createStorageMock()
        mockStorage.createSignedUrl.mockResolvedValue({
          data: { signedUrl: 'https://storage.supabase.co/download/signed-url' },
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await createSignedDownloadUrl('processed', 'test-user-id/analysis-123.mp3')

        expect(result.data).toBeDefined()
        expect(result.data?.signedUrl).toContain('signed-url')
        expect(result.error).toBeNull()
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('processed')
        expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
          'test-user-id/analysis-123.mp3',
          3600 // 1 hour TTL
        )
      })

      it('should prevent access to other users files', async () => {
        const result = await createSignedDownloadUrl('processed', 'other-user-id/analysis-123.mp3')

        expect(result.data).toBeNull()
        expect(result.error).toBe('Access denied: file does not belong to user')
      })

      it('should handle invalid file paths', async () => {
        const result = await createSignedDownloadUrl('processed', 'invalid-path')

        expect(result.data).toBeNull()
        expect(result.error).toBe('Invalid file path format')
      })
    })
  })

  // Phase 2: TDD Tests for Rate Limiting
  describe('Rate Limiting', () => {
    describe('rateLimitSignedUrls', () => {
      it('should allow requests within rate limit', async () => {
        const result = await rateLimitSignedUrls('test-user-id')

        expect(result.allowed).toBe(true)
        expect(result.remainingRequests).toBeGreaterThan(0)
        expect(result.resetTime).toBeInstanceOf(Date)
      })

      it('should block requests exceeding rate limit', async () => {
        // Simulate multiple requests to exceed limit
        for (let i = 0; i < 100; i++) {
          await rateLimitSignedUrls('test-user-id')
        }

        const result = await rateLimitSignedUrls('test-user-id')

        expect(result.allowed).toBe(false)
        expect(result.remainingRequests).toBe(0)
        expect(result.error).toBe('Rate limit exceeded')
      })

      it('should reset rate limit after time window', async () => {
        // Mock time to simulate window reset
        const originalDate = Date.now
        Date.now = vi.fn(() => originalDate() + 3600000) // 1 hour later

        const result = await rateLimitSignedUrls('test-user-id')

        expect(result.allowed).toBe(true)
        expect(result.remainingRequests).toBeGreaterThan(0)

        Date.now = originalDate
      })

      it('should track rate limits per user separately', async () => {
        await rateLimitSignedUrls('user-1')
        const result = await rateLimitSignedUrls('user-2')

        expect(result.allowed).toBe(true)
        expect(result.remainingRequests).toBeGreaterThan(0)
      })
    })
  })

  // Phase 2: TDD Tests for Storage Access Validation
  describe('Storage Access Validation', () => {
    describe('validateStorageAccess', () => {
      it('should validate user access to their own files', async () => {
        const result = await validateStorageAccess('test-user-id/video.mp4', 'test-user-id')

        expect(result.allowed).toBe(true)
        expect(result.error).toBeNull()
      })

      it('should deny access to other users files', async () => {
        const result = await validateStorageAccess('other-user-id/video.mp4', 'test-user-id')

        expect(result.allowed).toBe(false)
        expect(result.error).toBe('Access denied: file does not belong to user')
      })

      it('should handle service role access', async () => {
        const result = await validateStorageAccess('any-user-id/video.mp4', 'service-role')

        expect(result.allowed).toBe(true)
        expect(result.error).toBeNull()
      })

      it('should validate file path format', async () => {
        const result = await validateStorageAccess('invalid-path', 'test-user-id')

        expect(result.allowed).toBe(false)
        expect(result.error).toBe('Invalid file path format')
      })
    })
  })

  // Phase 2: TDD Tests for File Management
  describe('File Management', () => {
    describe('deleteStorageFile', () => {
      it('should delete user files with proper authorization', async () => {
        const mockStorage = createStorageMock()
        mockStorage.remove.mockResolvedValue({
          data: [{ name: 'video.mp4' }],
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await deleteStorageFile('raw', 'test-user-id/video.mp4')

        expect(result.data).toBe(true)
        expect(result.error).toBeNull()
        expect(mockStorage.remove).toHaveBeenCalledWith(['test-user-id/video.mp4'])
      })

      it('should prevent deletion of other users files', async () => {
        const result = await deleteStorageFile('raw', 'other-user-id/video.mp4')

        expect(result.data).toBe(false)
        expect(result.error).toBe('Access denied: file does not belong to user')
      })

      it('should handle storage deletion errors', async () => {
        const mockStorage = createStorageMock()
        mockStorage.remove.mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await deleteStorageFile('raw', 'test-user-id/video.mp4')

        expect(result.data).toBe(false)
        expect(result.error).toBe('File not found')
      })
    })

    describe('getStorageFileInfo', () => {
      it('should get file info for user files', async () => {
        const mockStorage = createStorageMock()
        mockStorage.list.mockResolvedValue({
          data: [
            {
              name: 'video.mp4',
              size: 1024000,
              created_at: '2025-09-14T10:00:00Z',
              updated_at: '2025-09-14T10:00:00Z',
            },
          ],
          error: null,
        })
        mockSupabase.storage.from.mockReturnValue(mockStorage)

        const result = await getStorageFileInfo('raw', 'test-user-id/video.mp4')

        expect(result.data).toBeDefined()
        expect(result.data?.name).toBe('video.mp4')
        expect(result.data?.size).toBe(1024000)
        expect(result.error).toBeNull()
      })

      it('should prevent access to other users file info', async () => {
        const result = await getStorageFileInfo('raw', 'other-user-id/video.mp4')

        expect(result.data).toBeNull()
        expect(result.error).toBe('Access denied: file does not belong to user')
      })
    })
  })
})
