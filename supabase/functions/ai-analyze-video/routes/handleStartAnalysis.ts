import { createAnalysisJob, findOrCreateVideoRecording } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { processAIPipeline } from '../../_shared/pipeline/aiPipeline.ts'
import {
  GeminiSSMLService,
  GeminiTTSService,
  GeminiVideoAnalysisService,
  MockSSMLService,
  MockTTSService,
  MockVideoAnalysisService
} from '../../_shared/services/index.ts'
import { type VideoProcessingRequest, parseVideoProcessingRequest } from '../../_shared/types/ai-analyze-video.ts'

// Import Gemini functions for service instantiation
import { analyzeVideoWithGemini } from '../gemini-llm-analysis.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from '../gemini-ssml-feedback.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handleStartAnalysis({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    const requestData: VideoProcessingRequest = parseVideoProcessingRequest(await req.json())
    const {
      videoPath,
      userId,
      videoSource = 'uploaded_video',
      frameData,
      existingPoseData,
      // Extract timing parameters
      startTime,
      endTime,
      duration,
      feedbackCount,
      targetTimestamps,
      minGap,
      firstTimestamp,
      // Extract pipeline stages
      stages,
    } = requestData

    // Validate required fields (now handled by parseVideoProcessingRequest)
    logger.info('Processing analysis request', { videoPath, userId, videoSource })

    if (!supabase) {
      logger.error('Database connection not available')
      return createErrorResponse('Database connection failed', 500)
    }

    // For testing, use a mock user ID to bypass auth requirements
    const testUserId = '00000000-0000-0000-0000-000000000000' // Mock UUID for testing

    logger.info('Attempting to create analysis job', { userId: testUserId, videoPath })

    // Find or create video recording for testing
    const videoRecordingId = await findOrCreateVideoRecording(supabase, testUserId, logger)

    const analysisJob = await createAnalysisJob(supabase, testUserId, videoRecordingId, logger)

  // Create service instances based on configuration
  const aiAnalysisMode = Deno.env.get('AI_ANALYSIS_MODE')
  const useMockServices = aiAnalysisMode === 'mock'

  logger.info(`AI_ANALYSIS_MODE: ${aiAnalysisMode}, using mock services: ${useMockServices}`)

  const services = {
    videoAnalysis: useMockServices
      ? new MockVideoAnalysisService()
      : new GeminiVideoAnalysisService(analyzeVideoWithGemini),
    ssml: useMockServices
      ? new MockSSMLService()
      : new GeminiSSMLService(geminiLLMFeedback),
    tts: useMockServices
      ? new MockTTSService()
      : new GeminiTTSService(),
  }

  logger.info(`Service types: videoAnalysis=${useMockServices ? 'Mock' : 'Gemini'}, ssml=${useMockServices ? 'Mock' : 'Gemini'}, tts=${useMockServices ? 'Mock' : 'Gemini'}`)

  // Start AI pipeline processing in background
  processAIPipeline({
    supabase,
    logger,
    analysisId: analysisJob.id,
    videoPath,
    videoSource,
    frameData,
    existingPoseData,
    timingParams: {
      startTime,
      endTime,
      duration,
      feedbackCount,
      targetTimestamps,
      minGap,
      firstTimestamp,
    },
    stages,
    services
  }).catch(
      (error) => {
        logger.error('AI Pipeline processing failed', error)
        // Error handling is done inside processAIPipeline
      }
    )

    return new Response(
      JSON.stringify({
        analysisId: analysisJob.id,
        status: 'queued',
        message: 'Analysis job created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('handleStartAnalysis error', error)
    return createErrorResponse('Failed to process analysis request', 500)
  }
}
