/**
 * Unit tests for TTSService
 * Tests the text-to-speech service interface and implementations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GeminiTTSService,
  ITTSService,
  MockTTSService,
  type TTSContext
} from './TTSService.ts'

// Mock the Gemini functions
vi.mock('../../../ai-analyze-video/gemini-tts-audio.ts', () => ({
  generateTTSFromSSML: vi.fn(),
}))
import { generateTTSFromSSML } from '../../../ai-analyze-video/gemini-tts-audio.ts'

describe('TTSService', () => {
  let mockContext: TTSContext

  beforeEach(() => {
    mockContext = {
      ssml: '<speak><p>Test SSML content for TTS</p></speak>',
      customParams: {
        voice: 'en-US-Neural2-F',
        speed: 'medium',
        format: 'mp3',
      },
    }

    vi.clearAllMocks()
  })

  describe('MockTTSService', () => {
    let service: ITTSService

    beforeEach(() => {
      service = new MockTTSService()
    })

    it('should return mock TTS result', async () => {
      const result = await service.synthesize(mockContext)

      expect(result).toEqual(
        expect.objectContaining({
          audioUrl: 'https://mock-tts-audio.example.com/generated-audio.mp3',
          duration: 3.7,
          format: 'mp3',
          promptUsed: 'mock-tts-prompt',
        })
      )
    })
  })

  describe('GeminiTTSService', () => {
    let service: ITTSService

    beforeEach(() => {
      service = new GeminiTTSService()
    })

    it('should call Gemini function with correct parameters', async () => {
      const mockResult = {
        bytes: new Uint8Array([1, 2, 3, 4, 5]),
        contentType: 'audio/mpeg',
        prompt: 'Test TTS prompt',
        duration: 2.5
      }
      vi.mocked(generateTTSFromSSML).mockResolvedValue(mockResult)

      const result = await service.synthesize(mockContext)

      expect(generateTTSFromSSML).toHaveBeenCalledWith(mockContext.ssml, {
        voice: 'en-US-Neural2-F',
        speed: 'medium',
        pitch: 0,
        format: 'mp3',
      })
      expect(result.audioUrl).toMatch(/^data:audio\/mpeg;base64,/)
      expect(result.promptUsed).toBe(mockResult.prompt)
      expect(result.format).toBe('mp3')
    })

    it('should handle TTS result with prompt', async () => {
      const mockTTSWithPrompt = {
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'audio/mpeg',
        prompt: 'TTS generation prompt',
        duration: 1.5
      }
      vi.mocked(generateTTSFromSSML).mockResolvedValue(mockTTSWithPrompt)

      const result = await service.synthesize(mockContext)

      expect(result.audioUrl).toMatch(/^data:audio\/mpeg;base64,/)
      expect(result.promptUsed).toBe(mockTTSWithPrompt.prompt)
      expect(result.format).toBe('mp3')
    })

    it('should handle TTS bytes result', async () => {
      const mockResult = {
        bytes: new Uint8Array([1, 2, 3, 4]),
        contentType: 'audio/mpeg',
        prompt: 'Mock prompt text',
        duration: 2.0
      }
      vi.mocked(generateTTSFromSSML).mockResolvedValue(mockResult)

      const result = await service.synthesize(mockContext)

      expect(result.audioUrl).toMatch(/^data:audio\/mpeg;base64,/)
      expect(result.promptUsed).toBe('Mock prompt text')
      expect(result.format).toBe('mp3')
    })

    it('should handle empty SSML', async () => {
      const emptyContext: TTSContext = {
        ssml: '',
      }

      const mockResult = {
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'audio/mpeg',
        prompt: 'Test prompt',
        duration: 1.0
      }
      vi.mocked(generateTTSFromSSML).mockResolvedValue(mockResult)

      const result = await service.synthesize(emptyContext)

      expect(result.audioUrl).toMatch(/^data:audio\/mpeg;base64,/)
      expect(result.format).toBe('mp3')
    })

    it('should throw error when Gemini function fails', async () => {
      const error = new Error('TTS synthesis failed')
      vi.mocked(generateTTSFromSSML).mockImplementation(() => {
        throw error
      })

      await expect(service.synthesize(mockContext)).rejects.toThrow('TTS synthesis failed')
    })
  })

  describe('Service Interface Compliance', () => {
    it('should implement ITTSService interface', () => {
      const mockService: ITTSService = {
        synthesize: vi.fn().mockResolvedValue({
          audioUrl: 'https://test.com/audio.m4a',
          format: 'aac',
        }),
      }

      expect(typeof mockService.synthesize).toBe('function')
    })

    it('should return TTSResult structure', async () => {
      const service = new MockTTSService()
      const result = await service.synthesize(mockContext)

      expect(result).toHaveProperty('audioUrl')
      expect(typeof result.audioUrl).toBe('string')
      expect(result.audioUrl.length).toBeGreaterThan(0)
      expect(result.audioUrl.startsWith('https://')).toBe(true)
    })

    it('should accept TTSContext with optional customParams', async () => {
      const service = new MockTTSService()

      const contextWithoutCustom: TTSContext = {
        ssml: mockContext.ssml,
      }

      const result = await service.synthesize(contextWithoutCustom)
      expect(result.audioUrl).toBeDefined()
    })

    it('should handle different custom parameter combinations', async () => {
      const service = new MockTTSService()

      const contexts = [
        { ssml: '<speak>test</speak>' },
        { ssml: '<speak>test</speak>', customParams: { voice: 'test' } },
        { ssml: '<speak>test</speak>', customParams: { speed: 'fast' as const } },
        { ssml: '<speak>test</speak>', customParams: { format: 'wav' as const } },
        { ssml: '<speak>test</speak>', customParams: { format: 'mp3' as const } },
      ]

      for (const context of contexts) {
        const result = await service.synthesize(context)
        expect(result.audioUrl).toBeDefined()
      }
    })
  })
})
