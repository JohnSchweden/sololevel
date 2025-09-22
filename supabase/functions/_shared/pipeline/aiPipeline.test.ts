/**
 * Unit tests for AIPipeline Orchestrator
 * Tests the basic functionality of the refactored pipeline
 */

import { describe, expect, it, vi } from 'vitest'
import { processAIPipeline } from './aiPipeline.ts'
import type { PipelineContext } from './aiPipeline.ts'

// Mock modules
vi.mock('../db/analysis.ts', () => ({
  updateAnalysisStatus: vi.fn().mockResolvedValue(undefined),
  updateAnalysisResults: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../notifications.ts', () => ({
  notifyAnalysisComplete: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/index.ts', () => ({
  GeminiVideoAnalysisService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      textReport: 'Test analysis report',
      feedback: [{ timestamp: 5, category: 'Posture', message: 'Test feedback', confidence: 0.9, impact: 0.7 }],
      metrics: { test_score: 0.8 },
      confidence: 0.85,
    }),
  })),
  GeminiSSMLService: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      ssml: '<speak><p>Test SSML</p></speak>',
      promptUsed: 'test prompt',
    }),
  })),
  GeminiTTSService: vi.fn().mockImplementation(() => ({
    synthesize: vi.fn().mockResolvedValue({
      audioUrl: 'https://test.com/audio.mp3',
      promptUsed: 'tts prompt',
    }),
  })),
}))

describe('AIPipeline Orchestrator - Basic Functionality', () => {
  it('should execute all stages when all flags are true', async () => {
    const mockContext: PipelineContext = {
      supabase: {},
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 123,
      videoPath: 'test-video.mp4',
      videoSource: 'uploaded_video',
      timingParams: { duration: 10, feedbackCount: 2 },
      stages: {
        runVideoAnalysis: true,
        runLLMFeedback: true,
        runSSML: true,
        runTTS: true,
      },
      services: {
        videoAnalysis: { analyze: vi.fn().mockResolvedValue({
          textReport: 'Test analysis report',
          feedback: [{ timestamp: 5, category: 'Posture', message: 'Test feedback', confidence: 0.9, impact: 0.7 }],
          metrics: { test_score: 0.8 },
          confidence: 0.85,
        }) },
        ssml: { generate: vi.fn().mockResolvedValue({
          ssml: '<speak><p>Test SSML</p></speak>',
          promptUsed: 'test prompt',
        }) },
        tts: { synthesize: vi.fn().mockResolvedValue({
          audioUrl: 'https://test.com/audio.mp3',
          promptUsed: 'tts prompt',
        }) },
      } as any,
    }

    await processAIPipeline(mockContext)

    expect(mockContext.services.videoAnalysis.analyze).toHaveBeenCalledTimes(1)
    expect(mockContext.services.ssml.generate).toHaveBeenCalledTimes(1)
    expect(mockContext.services.tts.synthesize).toHaveBeenCalledTimes(1)
  })

  it('should accept services via dependency injection', async () => {
    const mockVideoAnalyze = vi.fn().mockResolvedValue({
      textReport: 'Test analysis report',
      feedback: [],
      metrics: {},
      confidence: 0.8,
    })

    const mockContext: PipelineContext = {
      supabase: {},
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 123,
      videoPath: 'test-video.mp4',
      videoSource: 'uploaded_video',
      timingParams: { duration: 10, feedbackCount: 2 },
      stages: { runVideoAnalysis: true, runLLMFeedback: false, runSSML: false, runTTS: false },
      services: {
        videoAnalysis: { analyze: mockVideoAnalyze },
        ssml: { generate: vi.fn() },
        tts: { synthesize: vi.fn() },
      } as any,
    }

    await processAIPipeline(mockContext)

    expect(mockVideoAnalyze).toHaveBeenCalledWith({
      videoPath: 'test-video.mp4',
      analysisParams: { duration: 10, feedbackCount: 2 },
      progressCallback: expect.any(Function),
      supabase: {},
    })
  })

  // TODO: Add comprehensive tests after pipeline behavior is finalized
})
