/**
 * Tests for Gemini content generation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeminiConfig } from './config.ts'
import { generateContent, generateTextOnlyContent } from './generate.ts'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('generateContent', () => {
  const mockConfig: GeminiConfig = {
    apiBase: 'https://generativelanguage.googleapis.com',
    apiKey: 'test-api-key',
    mmModel: 'gemini-2.5-flash',
    llmModel: 'gemini-2.5-flash-lite',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
    mmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    llmGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    ttsGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    filesMaxMb: 20,
    analysisMode: 'real',
    defaultVoiceName: 'Sadachbia'
  }

  const mockFileRef = {
    name: 'files/test-video-123',
    uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-video-123',
    mimeType: 'video/mp4'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should generate content successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: 'This is the generated analysis text.'
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Analyze this video for posture and movement.'
    }

    const result = await generateContent(request, mockConfig)

    expect(result.text).toBe('This is the generated analysis text.')
    expect(result.prompt).toBe('Analyze this video for posture and movement.')
    expect(result.rawResponse).toBeDefined()
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(mockConfig.mmGenerateUrl + '?key=test-api-key')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('should use custom generation parameters', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: 'Generated with custom params.'
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Analyze this video.',
      temperature: 0.8,
      topK: 50,
      topP: 0.9,
      maxOutputTokens: 1000
    }

    await generateContent(request, mockConfig)

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    // generationConfig should be included when parameters are provided
    expect(body.generationConfig).toBeDefined()
    expect(body.generationConfig).toMatchObject({
      temperature: 0.8,
      topK: 50,
      topP: 0.9,
      maxOutputTokens: 1000
    })
  })

  it('should use default generation parameters when not specified', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: 'Generated with defaults.'
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Analyze this video.'
    }

    await generateContent(request, mockConfig)

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    // generationConfig is currently commented out in the implementation
    expect(body.generationConfig).toBeUndefined()
  })

  it('should construct correct request body', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: 'Response text.'
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await generateContent(request, mockConfig)

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body.contents).toHaveLength(1)
    expect(body.contents[0].parts).toHaveLength(2)
    expect(body.contents[0].parts[0].text).toBe('Test prompt')
    expect(body.contents[0].parts[1].fileData.fileUri).toBe(mockFileRef.uri)
    expect(body.contents[0].parts[1].fileData.mimeType).toBe(mockFileRef.mimeType)
  })

  it('should handle API errors', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: vi.fn().mockResolvedValue('Rate limit exceeded')
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('Gemini generate error: 429 Too Many Requests - Rate limit exceeded')
  })

  it('should handle malformed API response', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              // Missing text field
            ]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('No response generated from Gemini API')
  })

  it('should handle missing candidates in response', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        // Missing candidates array
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('No response generated from Gemini API')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Connection timeout'))

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('Connection timeout')
  })

  it('should handle empty response text', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: ''
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('No response generated from Gemini API')
  })

  it('should handle null response text', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: null
            }]
          }
        }]
      })
    }
    mockFetch.mockResolvedValue(mockResponse)

    const request = {
      fileRef: mockFileRef,
      prompt: 'Test prompt'
    }

    await expect(generateContent(request, mockConfig))
      .rejects
      .toThrow('No response generated from Gemini API')
  })

  describe('generateTextOnlyContent', () => {
    it('should generate text-only content successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'This is text-only generated content.'
              }]
            }
          }]
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const request = {
        prompt: 'Generate SSML from this feedback.',
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }

      const result = await generateTextOnlyContent(request, mockConfig)

      expect(result.text).toBe('This is text-only generated content.')
      expect(result.prompt).toBe('Generate SSML from this feedback.')
      expect(result.rawResponse).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(mockConfig.llmGenerateUrl + '?key=test-api-key')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
    })

    it('should construct correct request body for text-only generation', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'SSML content generated.'
              }]
            }
          }]
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const request = {
        prompt: 'Generate SSML markup.',
        temperature: 0.8,
        topK: 50,
        topP: 0.9,
        maxOutputTokens: 512
      }

      await generateTextOnlyContent(request, mockConfig)

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.contents).toHaveLength(1)
      expect(body.contents[0].parts).toHaveLength(1)
      expect(body.contents[0].parts[0].text).toBe('Generate SSML markup.')
      expect(body.contents[0].parts[0].fileData).toBeUndefined()
      // generationConfig is currently commented out in the implementation
      expect(body.generationConfig).toBeUndefined()
    })

    it('should handle API errors for text-only generation', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid prompt')
      }
      mockFetch.mockResolvedValue(mockResponse)

      const request = {
        prompt: 'Invalid prompt'
      }

      await expect(generateTextOnlyContent(request, mockConfig))
        .rejects
        .toThrow('Gemini generate error: 400 Bad Request - Invalid prompt')
    })

    it('should handle malformed response for text-only generation', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{}]
            }
          }]
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const request = {
        prompt: 'Test prompt'
      }

      await expect(generateTextOnlyContent(request, mockConfig))
        .rejects
        .toThrow('No response generated from Gemini API')
    })
  })
})
