/**
 * Tests for Supabase Storage video download functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadVideo } from './download.ts'

// Mock fetch for HTTP URL testing
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock Supabase client
const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      download: vi.fn()
    }))
  }
}

describe('downloadVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('HTTP URL handling', () => {
    it('should download from HTTP URLs', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        headers: {
          get: vi.fn().mockReturnValue('video/mp4')
        }
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await downloadVideo(mockSupabase as any, 'https://example.com/video.mp4')

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4')
      expect(result.mimeType).toBe('video/mp4')
      expect(result.bytes).toBeInstanceOf(Uint8Array)
    })

    it('should reject invalid HTTP URLs', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Video not found')
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(downloadVideo(mockSupabase as any, 'https://example.com/missing.mp4'))
        .rejects
        .toThrow('Failed to fetch video URL: 404 Not Found Video not found')
    })

    it('should enforce file size limits for HTTP downloads', async () => {
      const largeBuffer = new ArrayBuffer(25 * 1024 * 1024) // 25MB
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(largeBuffer),
        headers: {
          get: vi.fn().mockReturnValue('video/mp4')
        }
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(downloadVideo(mockSupabase as any, 'https://example.com/large-video.mp4', 20))
        .rejects
        .toThrow('Video is too large (25.00MB). Maximum allowed size is 20MB.')
    })
  })

  describe('Supabase Storage handling', () => {
    it('should download from default raw bucket', async () => {
      const mockFileData = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        type: 'video/mp4'
      }

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: mockFileData, error: null })
      })

      const result = await downloadVideo(mockSupabase as any, 'test.mp4')

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('raw')
      expect(result.mimeType).toBe('video/mp4')
      expect(result.bytes).toBeInstanceOf(Uint8Array)
    })

    it('should handle bucket/object path format', async () => {
      const mockFileData = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        type: 'video/mp4'
      }

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: mockFileData, error: null })
      })

      const result = await downloadVideo(mockSupabase as any, 'custom-bucket/path/to/video.mp4')

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('custom-bucket')
      expect(result.mimeType).toBe('video/mp4')
    })

    it('should reject when storage download fails', async () => {
      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage error' } })
      })

      await expect(downloadVideo(mockSupabase as any, 'raw/test.mp4'))
        .rejects
        .toThrow('Failed to download video from storage (raw/test.mp4): Storage error')
    })

    it('should enforce file size limits for storage downloads', async () => {
      const largeBuffer = new ArrayBuffer(30 * 1024 * 1024) // 30MB
      const mockFileData = {
        arrayBuffer: vi.fn().mockResolvedValue(largeBuffer),
        type: 'video/mp4'
      }

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: mockFileData, error: null })
      })

      await expect(downloadVideo(mockSupabase as any, 'raw/large.mp4', 20))
        .rejects
        .toThrow('Video is too large (30.00MB). Maximum allowed size is 20MB.')
    })

    it('should use default MIME type when not provided', async () => {
      const mockFileData = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        type: undefined
      }

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: mockFileData, error: null })
      })

      const result = await downloadVideo(mockSupabase as any, 'raw/test.mp4')

      expect(result.mimeType).toBe('video/mp4')
    })
  })

  describe('Parameter validation', () => {
    it('should require supabase client', async () => {
      await expect(downloadVideo(null as any, 'test.mp4'))
        .rejects
        .toThrow('Cannot read properties of null')
    })

    it('should require video path', async () => {
      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: null, error: null })
      })

      await expect(downloadVideo(mockSupabase as any, ''))
        .rejects
        .toThrow('Failed to download video from storage')
    })

    it('should handle missing mime type gracefully', async () => {
      const mockFileData = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
        // type is missing
      }

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: mockFileData, error: null })
      })

      const result = await downloadVideo(mockSupabase as any, 'videos/test.mp4')

      expect(result.mimeType).toBe('video/mp4') // Should default
    })
  })

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(downloadVideo(mockSupabase as any, 'https://example.com/video.mp4'))
        .rejects
        .toThrow('Network error')
    })

    it('should handle storage errors gracefully', async () => {
      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockRejectedValue(new Error('Storage error'))
      })

      await expect(downloadVideo(mockSupabase as any, 'videos/test.mp4'))
        .rejects
        .toThrow('Storage error')
    })
  })
})
