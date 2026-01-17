/**
 * Unit tests for AIPipeline Orchestrator
 * Tests the basic functionality of the refactored pipeline
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('../db/voiceConfig.ts', () => ({
  getUserVoicePreferences: vi.fn().mockResolvedValue({
    coachGender: 'male',
    coachMode: 'zen',
  }),
  getVoiceConfig: vi.fn().mockResolvedValue({
    id: 'test-voice-config-id',
    gender: 'male',
    mode: 'zen',
    promptVoice: 'Test voice',
    promptPersonality: 'Test personality',
    ssmlSystemInstruction: 'Test instruction',
    voiceName: 'test-voice',
    avatarAssetKey: 'test-avatar',
  }),
  updateAnalysisJobVoiceSnapshot: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../ai-analyze-video/prompts-local.ts', () => ({
  buildPromptFromConfig: vi.fn().mockReturnValue('Custom test prompt'),
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
  // Clear mock call history before each test to prevent cross-test pollution
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute video analysis and set analysis_complete status', async () => {
    // REFACTORED: Pipeline now only does video analysis, SSML/Audio moved to /post-analyze
    // Mock supabase query for analysis_jobs and analyses
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'test-analysis-uuid' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: 'queued' },
          error: null,
        }),
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
    }

    const mockContext: PipelineContext = {
      supabase: mockSupabase as any,
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 123,
      userId: 'test-user-id',
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
      } as any,
    }

    await processAIPipeline(mockContext)

    // Check that video analysis service was called
    expect(mockContext.services.videoAnalysis.analyze).toHaveBeenCalledTimes(1)

    // IMPORTANT: SSML/Audio workers should NOT be called - they run in /post-analyze
    expect(processSSMLJobs).not.toHaveBeenCalled()
    expect(processAudioJobs).not.toHaveBeenCalled()

    // Verify status was set to analysis_complete (not completed)
    expect(mockContext.logger.info).toHaveBeenCalledWith(
      'Video analysis complete, SSML/Audio will be triggered by UPDATE webhook',
      expect.objectContaining({
        analysisId: 123,
        feedbackIds: expect.any(Number),
      })
    )
  })

  it('should accept services via dependency injection', async () => {
    // REFACTORED: ssml/tts services now optional since SSML/Audio moved to /post-analyze
    const mockVideoAnalyze = vi.fn().mockResolvedValue({
      textReport: 'Test analysis report',
      feedback: [],
      metrics: {},
      confidence: 0.8,
    })

    // Mock supabase query for analysis_jobs and analyses
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'test-analysis-uuid' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: 'queued' },
          error: null,
        }),
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
    }

    const mockContext: PipelineContext = {
      supabase: mockSupabase as any,
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 123,
      userId: 'test-user-id',
      videoPath: 'test-video.mp4',
      videoSource: 'uploaded_video',
      timingParams: { duration: 10, feedbackCount: 2 },
      stages: { runVideoAnalysis: true, runLLMFeedback: false, runSSML: false, runTTS: false },
      services: {
        videoAnalysis: { analyze: mockVideoAnalyze },
      } as any,
    }

    await processAIPipeline(mockContext)

    expect(mockVideoAnalyze).toHaveBeenCalledWith({
      videoPath: 'test-video.mp4',
      analysisParams: { duration: 10, feedbackCount: 2 },
      progressCallback: expect.any(Function),
      supabase: mockSupabase,
      customPrompt: expect.anything(), // customPrompt is added by pipeline (string or undefined)
      dbLogger: expect.any(Object), // dbLogger is now passed to video analysis
    })
  })

  it('should set status to analysis_complete after video analysis', async () => {
    // ARRANGE: Mock updateAnalysisStatus to track calls
    const { updateAnalysisStatus } = await import('../db/analysis.ts')
    const updateStatusSpy = vi.mocked(updateAnalysisStatus)

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'test-analysis-uuid' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: 'queued' },
          error: null,
        }),
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
    }

    const mockContext: PipelineContext = {
      supabase: mockSupabase as any,
      logger: { info: vi.fn(), error: vi.fn() },
      analysisId: 456,
      userId: 'test-user-id',
      videoPath: 'test-video.mp4',
      videoSource: 'uploaded_video',
      timingParams: { duration: 10 },
      stages: { runVideoAnalysis: true },
      services: {
        videoAnalysis: { analyze: vi.fn().mockResolvedValue({
          textReport: 'Test report',
          feedback: [],
          metrics: {},
          confidence: 0.8,
        }) },
      } as any,
    }

    // ACT
    await processAIPipeline(mockContext)

    // ASSERT: Should call updateAnalysisStatus with 'analysis_complete' (not 'completed')
    expect(updateStatusSpy).toHaveBeenCalledWith(
      mockSupabase,
      456,
      'analysis_complete',
      null,
      80,
      expect.any(Object) // logger
    )
  })

  // REMOVED: Tests for SSML/Audio fire-and-forget - moved to /post-analyze endpoint
  // See handlePostAnalyze.test.ts for SSML/Audio processing tests
})
