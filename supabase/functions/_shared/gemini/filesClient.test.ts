/**
 * Tests for Gemini Files API client
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeminiConfig } from './config.ts'
import { pollFileActive, uploadToGemini } from './filesClient.ts'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('uploadToGemini', () => {
  const mockConfig: GeminiConfig = {
    apiBase: 'https://generativelanguage.googleapis.com',
    apiKey: 'test-api-key',
    mmModel: 'gemini-1.5-pro',
    llmModel: 'gemini-2.5-flash',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
    mmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    llmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    ttsGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    filesMaxMb: 20,
    analysisMode: 'real',
    defaultVoiceName: 'Sadachbia'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should upload file successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        name: 'files/test-file-123',
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file-123'
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const fileBytes = new Uint8Array([1, 2, 3, 4])
    const result = await uploadToGemini(fileBytes, 'video/mp4', 'test-video.mp4', mockConfig)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.name).toBe('files/test-file-123')
    expect(result.uri).toBe('https://generativelanguage.googleapis.com/v1beta/files/test-file-123')
    expect(result.mimeType).toBe('video/mp4')
  })

  it('should handle API errors', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Invalid request')
    }
    mockFetch.mockResolvedValue(mockResponse)

    const fileBytes = new Uint8Array([1, 2, 3])
    await expect(uploadToGemini(fileBytes, 'video/mp4', 'test.mp4', mockConfig))
      .rejects
      .toThrow('Gemini Files upload failed: 400 - Invalid request')
  })

  it('should handle missing file name in response', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        uri: 'https://example.com/file'
        // name is missing
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const fileBytes = new Uint8Array([1, 2, 3])
    await expect(uploadToGemini(fileBytes, 'video/mp4', 'test.mp4', mockConfig))
      .rejects
      .toThrow('No file name returned from Gemini Files API')
  })

  it('should construct correct multipart payload', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        name: 'files/test-123'
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const fileBytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    await uploadToGemini(fileBytes, 'text/plain', 'test.txt', mockConfig)

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]

    expect(url).toContain('?key=test-api-key&uploadType=multipart')
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['Content-Type']).toContain('multipart/related')
    expect(options.body).toBeInstanceOf(ReadableStream)
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network timeout'))

    const fileBytes = new Uint8Array([1, 2, 3])
    await expect(uploadToGemini(fileBytes, 'video/mp4', 'test.mp4', mockConfig))
      .rejects
      .toThrow('Network timeout')
  })
})

describe('pollFileActive', () => {
  const mockConfig: GeminiConfig = {
    apiBase: 'https://generativelanguage.googleapis.com',
    apiKey: 'test-api-key',
    mmModel: 'gemini-1.5-pro',
    llmModel: 'gemini-2.5-flash',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
    mmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    llmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    ttsGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    filesMaxMb: 20,
    analysisMode: 'real',
    defaultVoiceName: 'Sadachbia'
  }

  beforeEach(() => {
    mockFetch.mockReset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Tests that need fake timers for async polling behavior
  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should resolve when file becomes ACTIVE', async () => {
      const responses = [
        { ok: false, status: 404 }, // File not ready
        { ok: false, status: 404 }, // Still not ready
        {
          ok: true,
          json: vi.fn().mockResolvedValue({ state: 'ACTIVE' })
        }
      ]

      responses.forEach(response => {
        mockFetch.mockResolvedValueOnce(response)
      })

      const promise = pollFileActive('files/test-123', mockConfig)

      // Fast-forward timers to simulate polling
      await vi.advanceTimersByTimeAsync(3000)

      await expect(promise).resolves.toBeUndefined()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle API errors during polling', async () => {
      const responses = [
        { ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') },
        { ok: true, json: vi.fn().mockResolvedValue({ state: 'ACTIVE' }) }
      ]

      responses.forEach(response => {
        mockFetch.mockResolvedValueOnce(response)
      })

      const promise = pollFileActive('files/test-123', mockConfig)

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(2000)

      await expect(promise).resolves.toBeUndefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle network errors during polling', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ state: 'ACTIVE' })
      })

      const promise = pollFileActive('files/test-123', mockConfig)

      // Fast-forward timers enough for network error retry + success
      await vi.advanceTimersByTimeAsync(4000)

      await expect(promise).resolves.toBeUndefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
    })

    it('should handle files/ prefix correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ state: 'ACTIVE' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await pollFileActive('files/test-123', mockConfig)

      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/files/test-123?key=test-api-key')
    })

    it('should add files/ prefix when missing', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ state: 'ACTIVE' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await pollFileActive('test-123', mockConfig)

      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/files/test-123?key=test-api-key')
    })

    it('should reject when file processing fails', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ state: 'FAILED' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(pollFileActive('files/test-123', mockConfig))
        .rejects
        .toThrow('File processing failed: files/test-123')
    })

    it('should timeout after maximum attempts', async () => {
      // Mock responses that will cause the function to keep polling until timeout
      const mockResponse = { ok: false, status: 404 }
      mockFetch.mockResolvedValue(mockResponse) // Return the same response for all calls

      // Test with shorter polling parameters for faster test execution
      await expect(pollFileActive('files/test-123', mockConfig, {
        maxAttempts: 3, // Only 3 attempts
        pollInterval: 10 // 10ms between attempts
      })).rejects.toThrow('File did not become ACTIVE within 0.03 seconds')
    })
  })
