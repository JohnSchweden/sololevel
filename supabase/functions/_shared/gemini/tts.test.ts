/**
 * TDD Tests for Gemini TTS Client
 * Tests the shared TTS API call functionality
 */

import { expect, vi } from 'vitest'

// Mock fetch BEFORE importing the module
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import type { GeminiConfig } from './config.ts'
// Now import the TTS module after mocks are set up
import { generateTTSAudio } from './tts.ts'

// Test constants
const validConfig: GeminiConfig = {
  apiBase: 'https://generativelanguage.googleapis.com',
  apiKey: 'test-api-key',
  model: 'gemini-1.5-pro',
  ttsModel: 'gemini-2.5-flash-preview-tts',
  filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
  generateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  ttsGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
  filesMaxMb: 20,
  analysisMode: 'real',
  defaultVoiceName: 'Sadachbia'
}

const validRequest = {
  ssml: '<speak><prosody rate="medium">Test audio content</prosody></speak>',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 1.0,
  pitch: 0,
  responseMimeType: 'audio/mpeg'
}

describe('generateTTSAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate TTS audio successfully', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'audio/mpeg',
                data: btoa('mock-audio-bytes')
              }
            }]
          }
        }]
      })
    }

    mockFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await generateTTSAudio(validRequest, validConfig)

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      validConfig.ttsGenerateUrl,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': 'test-api-key',
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"responseModalities":["AUDIO"]')
      }
    )

    expect(result).toEqual({
      bytes: expect.any(Uint8Array), // WAV header + PCM data (44 + 16 bytes)
      contentType: 'audio/wav',
      prompt: expect.stringContaining('Gemini TTS synthesis')
    })
  })

  it('should handle API errors', async () => {
    // Arrange
    const mockResponse = {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn().mockResolvedValue('Invalid request')
    }

    mockFetch.mockResolvedValue(mockResponse)

    // Act & Assert
    await expect(generateTTSAudio(validRequest, validConfig)).rejects.toThrow(
      'Gemini TTS API error: 400 Bad Request - Invalid request'
    )
  })

  it('should handle missing audio data', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: 'No audio generated'
            }]
          }
        }]
      })
    }

    mockFetch.mockResolvedValue(mockResponse)

    // Act & Assert
    await expect(generateTTSAudio(validRequest, validConfig)).rejects.toThrow(
      'No audio data found in Gemini TTS response'
    )
  })

  it('should use default values when not provided', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'audio/mpeg',
                data: btoa('default-test')
              }
            }]
          }
        }]
      })
    }

    mockFetch.mockResolvedValue(mockResponse)

    const requestWithDefaults = {
      ssml: '<speak>Test</speak>'
      // No other options provided
    }

    // Act
    await generateTTSAudio(requestWithDefaults, validConfig)

    // Assert
    const callArgs = mockFetch.mock.calls[0]
    const requestBody = JSON.parse(callArgs[1].body)

    expect(requestBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName)
      .toBe('Sadachbia') // defaultVoiceName from config
    // Note: speakingRate and pitch removed per web research examples
  })

  it('should handle network errors', async () => {
    // Arrange
    mockFetch.mockRejectedValue(new Error('Network error'))

    // Act & Assert
    await expect(generateTTSAudio(validRequest, validConfig)).rejects.toThrow('Network error')
  })

  it('should require API key', async () => {
    // Arrange
    const configWithoutKey = { ...validConfig, apiKey: undefined }

    // Temporarily restore global fetch to avoid mock interference
    const originalFetch = globalThis.fetch
    delete (globalThis as any).fetch

    try {
      // Act & Assert
      await expect(generateTTSAudio(validRequest, configWithoutKey as any)).rejects.toThrow(
        'Gemini API key not configured'
      )
    } finally {
      // Restore mock fetch
      globalThis.fetch = originalFetch
    }
  })
})
