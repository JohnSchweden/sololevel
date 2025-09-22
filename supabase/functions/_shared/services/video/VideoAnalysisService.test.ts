/**
 * Unit tests for VideoAnalysisService
 * Tests the video analysis service interface and implementations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GeminiVideoAnalysisService,
  IVideoAnalysisService,
  MockVideoAnalysisService,
  type VideoAnalysisContext
} from './VideoAnalysisService.ts'

// Mock the Gemini functions
const mockAnalyzeVideoWithGemini = vi.fn()
vi.mock('../gemini/llm-analysis.ts', () => ({
  analyzeVideoWithGemini: mockAnalyzeVideoWithGemini,
}))

describe('VideoAnalysisService', () => {
  let mockContext: VideoAnalysisContext

  beforeEach(() => {
    mockContext = {
      supabase: {} as any,
      videoPath: 'test-video.mp4',
      analysisParams: {
        duration: 10,
        feedbackCount: 2,
      },
      progressCallback: vi.fn(),
    }

    vi.clearAllMocks()
  })

  describe('MockVideoAnalysisService', () => {
    let service: IVideoAnalysisService

    beforeEach(() => {
      service = new MockVideoAnalysisService()
    })

    it('should return mock analysis result', async () => {
      const result = await service.analyze(mockContext)

      expect(result).toEqual({
        textReport: "Mock analysis completed successfully",
        feedback: [{
          timestamp: 0,
          category: 'Movement',
          message: 'Mock feedback item',
          confidence: 0.85,
          impact: 0.5,
        }],
        metrics: { mock_metric: 1.0 },
        confidence: 0.85,
      })
    })

    it('should call progress callback during analysis', async () => {
      const progressCallback = vi.fn()
      mockContext.progressCallback = progressCallback

      await service.analyze(mockContext)

      expect(progressCallback).toHaveBeenCalledTimes(4)
      expect(progressCallback).toHaveBeenNthCalledWith(1, 20)
      expect(progressCallback).toHaveBeenNthCalledWith(2, 40)
      expect(progressCallback).toHaveBeenNthCalledWith(3, 55)
      expect(progressCallback).toHaveBeenNthCalledWith(4, 70)
    })
  })

  describe('GeminiVideoAnalysisService', () => {
    let service: IVideoAnalysisService

    beforeEach(() => {
      service = new GeminiVideoAnalysisService(mockAnalyzeVideoWithGemini)
    })

    it('should call Gemini function with correct parameters', async () => {
      const mockGeminiResult = {
        textReport: 'Gemini analysis result',
        feedback: [{
          timestamp: 5,
          category: 'Posture',
          message: 'Improve your posture',
          confidence: 0.9,
          impact: 0.7,
        }],
        metrics: { posture_score: 0.8 },
        confidence: 0.85,
        rawResponse: { test: 'data' },
      }

      mockAnalyzeVideoWithGemini.mockResolvedValue(mockGeminiResult)

      const result = await service.analyze(mockContext)

      expect(mockAnalyzeVideoWithGemini).toHaveBeenCalledWith(
        mockContext.supabase,
        mockContext.videoPath,
        mockContext.analysisParams,
        mockContext.progressCallback
      )

      expect(result).toEqual({
        textReport: 'Gemini analysis result',
        feedback: [{
          timestamp: 5,
          category: 'Posture',
          message: 'Improve your posture',
          confidence: 0.9,
          impact: 0.7,
        }],
        metrics: { posture_score: 0.8 },
        confidence: 0.85,
        rawResponse: { test: 'data' },
      })
    })

    it('should handle empty feedback array', async () => {
      const mockGeminiResult = {
        textReport: 'Analysis without feedback',
        feedback: [],
        metrics: {},
        confidence: 0.8,
      }

      mockAnalyzeVideoWithGemini.mockResolvedValue(mockGeminiResult)

      const result = await service.analyze(mockContext)

      expect(result.feedback).toEqual([])
    })

    it('should handle missing optional properties', async () => {
      const mockGeminiResult = {
        textReport: 'Basic analysis',
        feedback: [{
          timestamp: 0,
          category: 'Test',
          message: 'Test feedback',
          confidence: 0.8,
          impact: 0.5,
        }],
      }

      mockAnalyzeVideoWithGemini.mockResolvedValue(mockGeminiResult)

      const result = await service.analyze(mockContext)

      expect(result).toEqual({
        textReport: 'Basic analysis',
        feedback: [{
          timestamp: 0,
          category: 'Test',
          message: 'Test feedback',
          confidence: 0.8,
          impact: 0.5,
        }],
        metrics: {},
        confidence: 0.85, // default value
      })
    })

    it('should throw error when Gemini function fails', async () => {
      const error = new Error('Gemini API error')
      mockAnalyzeVideoWithGemini.mockRejectedValue(error)

      await expect(service.analyze(mockContext)).rejects.toThrow('Gemini API error')
    })
  })

  describe('Service Interface Compliance', () => {
    it('should implement IVideoAnalysisService interface', () => {
      const mockService: IVideoAnalysisService = {
        analyze: vi.fn().mockResolvedValue({
          textReport: 'test',
          feedback: [],
          metrics: {},
          confidence: 0.8,
        }),
      }

      expect(typeof mockService.analyze).toBe('function')
    })

    it('should return VideoAnalysisResult structure', async () => {
      const service = new MockVideoAnalysisService()
      const result = await service.analyze(mockContext)

      expect(result).toHaveProperty('textReport')
      expect(result).toHaveProperty('feedback')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('confidence')
      expect(Array.isArray(result.feedback)).toBe(true)
      expect(typeof result.textReport).toBe('string')
      expect(typeof result.confidence).toBe('number')
    })
  })
})
