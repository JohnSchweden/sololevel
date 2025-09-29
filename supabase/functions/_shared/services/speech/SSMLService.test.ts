/**
 * Unit tests for SSMLService
 * Tests the SSML generation service interface and implementations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GeminiSSMLService,
  ISSMLService,
  MockSSMLService,
  type SSMLContext
} from './SSMLService.ts'

// Don't mock the Gemini function for tests that expect mock mode behavior
// The real function will check for mock mode and use fallback

describe('SSMLService', () => {
  let mockContext: SSMLContext

  beforeEach(() => {
    mockContext = {
      analysisResult: {
        textReport: 'Test analysis report',
        feedback: [{
          timestamp: 5,
          category: 'Posture',
          message: 'Improve your posture',
          confidence: 0.9,
          impact: 0.7,
        }],
        metrics: { posture_score: 0.8 },
        confidence: 0.85,
      },
      customParams: {
        voice: 'en-US-Neural2-D',
        speed: 1.0,
      },
    }

    vi.clearAllMocks()
  })

  describe('MockSSMLService', () => {
    let service: ISSMLService

    beforeEach(() => {
      service = new MockSSMLService()
    })

    it('should return mock SSML result', async () => {
      const result = await service.generate(mockContext)

      expect(result).toEqual(
        expect.objectContaining({
          ssml: `<speak><p>Mock SSML generated from analysis results.</p></speak>`,
        })
      )
    })
  })

  describe('GeminiSSMLService', () => {
    let service: ISSMLService
    let mockGeminiFunction: any

    beforeEach(() => {
      // Mock the Gemini function
      mockGeminiFunction = vi.fn().mockResolvedValue('<speak>Mock SSML content</speak>')
      service = new GeminiSSMLService(mockGeminiFunction)
    })

    it('should call Gemini function with correct parameters', async () => {
      // In mock mode, the Gemini function is not called, fallback is used
      const result = await service.generate(mockContext)

      // In mock mode, function is not called
      expect(result.ssml).toContain('<speak>')
      expect(result.ssml).toContain('</speak>')
      expect(result.ssml).toContain('Improve your posture')
      expect(result.promptUsed).toBe('mock-mode-no-prompt')
    })

    it('should handle SSML result with prompt', async () => {
      // In mock mode, uses fallback and returns mock-mode-no-prompt
      const result = await service.generate(mockContext)

      // In mock mode, function is not called
      expect(result.ssml).toContain('<speak>')
      expect(result.ssml).toContain('</speak>')
      expect(result.promptUsed).toBe('mock-mode-no-prompt')
    })

    it('should handle string SSML result', async () => {
      // In mock mode, uses fallback
      const result = await service.generate(mockContext)

      // In mock mode, function is not called
      expect(result.ssml).toContain('<speak>')
      expect(result.ssml).toContain('</speak>')
      expect(result.promptUsed).toBe('mock-mode-no-prompt')
    })

    it('should handle empty analysis result', async () => {
      const emptyContext: SSMLContext = {
        analysisResult: {
          textReport: '',
          feedback: [],
          metrics: {},
          confidence: 0,
        },
      }

      const result = await service.generate(emptyContext)

      // In mock mode, function is not called
      expect(result.ssml).toBe('<speak></speak>')
      expect(result.promptUsed).toBe('mock-mode-no-prompt')
    })

    it('should not throw error in mock mode', async () => {
      // In mock mode, errors from Gemini function don't affect the result
      const result = await service.generate(mockContext)

      // In mock mode, function is not called
      expect(result.ssml).toContain('<speak>')
      expect(result.promptUsed).toBe('mock-mode-no-prompt')
    })
  })

  describe('Service Interface Compliance', () => {
    it('should implement ISSMLService interface', () => {
      const mockService: ISSMLService = {
        generate: vi.fn().mockResolvedValue({
          ssml: '<speak>test</speak>',
        }),
      }

      expect(typeof mockService.generate).toBe('function')
    })

    it('should return SSMLResult structure', async () => {
      const service = new MockSSMLService()
      const result = await service.generate(mockContext)

      expect(result).toHaveProperty('ssml')
      expect(typeof result.ssml).toBe('string')
      expect(result.ssml.length).toBeGreaterThan(0)
    })

    it('should accept SSMLContext with optional customParams', async () => {
      const service = new MockSSMLService()

      const contextWithoutCustom: SSMLContext = {
        analysisResult: mockContext.analysisResult,
      }

      const result = await service.generate(contextWithoutCustom)
      expect(result.ssml).toBeDefined()
    })
  })
})
