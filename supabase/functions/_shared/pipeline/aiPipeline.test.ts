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
  updateAnalysisResults: vi.fn().mockResolvedValue([1, 2, 3]), // Return feedback IDs
}))

vi.mock('../notifications.ts', () => ({
  notifyAnalysisComplete: vi.fn().mockResolvedValue(undefined),
}))

// Mock the worker functions that the pipeline now calls
vi.mock('../../ai-analyze-video/workers/ssmlWorker.ts', () => ({
  processSSMLJobs: vi.fn().mockResolvedValue({
    processedJobs: 1,
    enqueuedAudioJobs: 1,
    errors: 0,
    retriedJobs: 0,
  }),
}))

vi.mock('../../ai-analyze-video/workers/audioWorker.ts', () => ({
  processAudioJobs: vi.fn().mockResolvedValue({
    processedJobs: 1,
    errors: 0,
    retriedJobs: 0,
  }),
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

import { processAudioJobs } from '../../ai-analyze-video/workers/audioWorker.ts'
// Import the mocked worker functions
import { processSSMLJobs } from '../../ai-analyze-video/workers/ssmlWorker.ts'

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

    // Check that video analysis service was called
    expect(mockContext.services.videoAnalysis.analyze).toHaveBeenCalledTimes(1)

    // Check that worker functions were called (pipeline now delegates to workers)
    expect(processSSMLJobs).toHaveBeenCalledTimes(1)
    expect(processSSMLJobs).toHaveBeenCalledWith({
      supabase: {},
      logger: mockContext.logger,
      feedbackIds: [1, 2, 3], // Mock feedback IDs from updateAnalysisResults
    })

    expect(processAudioJobs).toHaveBeenCalledTimes(1)
    expect(processAudioJobs).toHaveBeenCalledWith({
      supabase: {},
      logger: mockContext.logger,
      feedbackIds: [1, 2, 3], // Mock feedback IDs from updateAnalysisResults
    })
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

  it('should skip audio generation when SSML processing has errors', async () => {
    // Mock processSSMLJobs to return errors
    const mockProcessSSMLJobs = vi.fn().mockResolvedValueOnce({
      processedJobs: 1,
      enqueuedAudioJobs: 0,
      errors: 2, // Simulate 2 errors
      retriedJobs: 0,
    })

    // Mock processAudioJobs to track if it gets called
    const mockProcessAudioJobs = vi.fn().mockResolvedValue({
      processedJobs: 0,
      errors: 0,
      retriedJobs: 0,
    })

    // Replace the mocked functions temporarily for this test
    vi.mocked(processSSMLJobs).mockImplementationOnce(mockProcessSSMLJobs)
    vi.mocked(processAudioJobs).mockImplementationOnce(mockProcessAudioJobs)

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
        ssml: { generate: vi.fn() },
        tts: { synthesize: vi.fn() },
      } as any,
    }

    await processAIPipeline(mockContext)

    // Verify SSML worker was called
    expect(mockProcessSSMLJobs).toHaveBeenCalledTimes(1)
    expect(mockProcessSSMLJobs).toHaveBeenCalledWith({
      supabase: {},
      logger: mockContext.logger,
      feedbackIds: [1, 2, 3], // Mock feedback IDs from updateAnalysisResults
    })

    // Verify audio worker was NOT called due to SSML errors
    expect(mockProcessAudioJobs).toHaveBeenCalledTimes(0)

    // Verify logger was called with skip message
    expect(mockContext.logger.info).toHaveBeenCalledWith(
      'Skipping audio generation due to SSML errors',
      {
        feedbackIds: [1, 2, 3],
        errors: 2,
      }
    )
  })

  it('should skip SSML generation when runSSML stage is false', async () => {
    // Mock processSSMLJobs to not be called
    const mockProcessSSMLJobs = vi.fn()
    vi.mocked(processSSMLJobs).mockImplementationOnce(mockProcessSSMLJobs)

    const mockContext: PipelineContext = {
      supabase: {},
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 123,
      videoPath: 'test-video.mp4',
      videoSource: 'uploaded_video',
      timingParams: { duration: 10, feedbackCount: 2 },
      stages: {
        runVideoAnalysis: true,
        runLLMFeedback: true, // Keep LLM feedback enabled so feedbackIds are generated
        runSSML: false, // Disable SSML generation
        runTTS: true,
      },
      services: {
        videoAnalysis: { analyze: vi.fn().mockResolvedValue({
          textReport: 'Test analysis report',
          feedback: [{ timestamp: 5, category: 'Posture', message: 'Test feedback', confidence: 0.9, impact: 0.7 }],
          metrics: { test_score: 0.8 },
          confidence: 0.85,
        }) },
        ssml: { generate: vi.fn() },
        tts: { synthesize: vi.fn() },
      } as any,
    }

    await processAIPipeline(mockContext)

    // SSML worker should not be called
    expect(mockProcessSSMLJobs).not.toHaveBeenCalled()

    // Logger should indicate SSML generation was skipped
    expect(mockContext.logger.info).toHaveBeenCalledWith(
      'Skipping SSML generation (SSML stage disabled)',
      { feedbackIds: [1, 2, 3] }
    )
  })


  // TODO: Add comprehensive tests after pipeline behavior is finalized
})
