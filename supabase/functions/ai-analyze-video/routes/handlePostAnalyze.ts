import { updateAnalysisStatus } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import {
  GeminiSSMLService,
  GeminiTTSService,
  MockSSMLService,
  MockTTSService,
} from '../../_shared/services/index.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from '../gemini-ssml-feedback.ts'
import { processAudioJobs } from '../workers/audioWorker.ts'
import { processSSMLJobs } from '../workers/ssmlWorker.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handlePostAnalyze({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    // Validate webhook secret
    const provided = req.headers.get('X-Db-Webhook-Secret') || ''
    const expected = (globalThis as any).Deno?.env?.get('DB_WEBHOOK_SECRET')
      || (globalThis as any).Deno?.env?.get('EDGE_DB_WEBHOOK_SECRET')

    if (!expected || provided !== expected) {
      logger.error('Post-analyze webhook unauthorized')
      return createErrorResponse('Unauthorized', 401)
    }

    // Parse payload - DB webhook sends { record: { id, ... } }
    let jobId: number | undefined
    try {
      const body = await req.json()
      jobId = body?.record?.id || body?.analysisJobId
    } catch {
      return createErrorResponse('Invalid payload', 400)
    }

    if (!jobId) {
      return createErrorResponse('Missing job ID', 400)
    }

    logger.info('Post-analyze webhook received', { jobId })

    // Parse PIPELINE_STAGES configuration
    const resolvedStages = (() => {
      try {
        const pipelineStagesEnv = (globalThis as any).Deno?.env?.get('PIPELINE_STAGES')
        if (pipelineStagesEnv) {
          return JSON.parse(pipelineStagesEnv)
        }
      } catch (error) {
        logger.error('Failed to parse PIPELINE_STAGES environment variable', { error })
      }
      // Default: run all stages if not configured
      return { runVideoAnalysis: true, runLLMFeedback: true, runSSML: true, runTTS: true }
    })()

    logger.info('Post-analyze stages configuration', { 
      jobId,
      runSSML: resolvedStages.runSSML,
      runTTS: resolvedStages.runTTS
    })

    // Early exit if both SSML and TTS disabled
    if (!resolvedStages.runSSML && !resolvedStages.runTTS) {
      logger.info('SSML and TTS stages disabled, marking as completed', { jobId })
      await updateAnalysisStatus(supabase, jobId, 'completed', null, 100, logger)
      return new Response(JSON.stringify({ 
        status: 'completed', 
        message: 'SSML/TTS stages skipped per configuration' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Get analysis UUID and feedback IDs for this job
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id')
      .eq('job_id', jobId)
      .single()

    if (analysisError || !analysis) {
      logger.error('Analysis not found for job', { jobId, error: analysisError })
      return createErrorResponse('Analysis not found', 404)
    }

    // Get feedback items that need SSML processing
    const { data: feedbackItems, error: feedbackError } = await supabase
      .from('analysis_feedback')
      .select('id')
      .eq('analysis_id', analysis.id)
      .eq('ssml_status', 'queued')

    if (feedbackError) {
      logger.error('Failed to fetch feedback items', { error: feedbackError })
      return createErrorResponse('Failed to fetch feedback', 500)
    }

    const feedbackIds = feedbackItems?.map((f: { id: number }) => f.id) || []

    if (feedbackIds.length === 0) {
      logger.info('No feedback items to process', { jobId })
      await updateAnalysisStatus(supabase, jobId, 'completed', null, 100, logger)
      return new Response(JSON.stringify({ status: 'completed', message: 'No feedback to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    logger.info('Processing SSML/Audio for feedback items', { jobId, count: feedbackIds.length })

    // Instantiate services (mock mode if configured)
    const useMockServices = (globalThis as any).Deno?.env?.get('AI_ANALYSIS_MOCK_SERVICES') === 'true'

    const ssmlService = useMockServices
      ? new MockSSMLService()
      : new GeminiSSMLService(geminiLLMFeedback)
    const ttsService = useMockServices
      ? new MockTTSService()
      : new GeminiTTSService()

    logger.info('Services instantiated', { 
      useMockServices,
      ssml: ssmlService.constructor.name,
      tts: ttsService.constructor.name
    })

    // Create DB logger for detailed logging
    const { createDatabaseLogger } = await import('../../_shared/db/logging.ts')
    const dbLogger = createDatabaseLogger('ai-analyze-video', 'post-analyze', supabase, {
      jobId,
      analysisId: analysis.id,
    })

    // Process SSML (blocking) - conditional based on PIPELINE_STAGES
    let ssmlResult: { processedJobs: number; enqueuedAudioJobs: number; errors: number; retriedJobs: number } = { 
      processedJobs: 0, 
      enqueuedAudioJobs: 0, 
      errors: 0, 
      retriedJobs: 0 
    }
    if (resolvedStages.runSSML) {
      ssmlResult = await processSSMLJobs({ 
        supabase, 
        logger: dbLogger.child('ssml-worker'), 
        feedbackIds, 
        analysisId: analysis.id,
        ssmlService
      })
    } else {
      logger.info('SSML stage disabled, skipping SSML processing', { jobId })
    }

    // Process Audio if SSML succeeded and TTS enabled - conditional based on PIPELINE_STAGES
    if (resolvedStages.runTTS && ssmlResult.errors === 0) {
      await processAudioJobs({ 
        supabase, 
        logger: dbLogger.child('audio-worker'), 
        feedbackIds, 
        analysisId: analysis.id,
        startTime: Date.now(),
        ttsService
      })
    } else if (!resolvedStages.runTTS) {
      logger.info('TTS stage disabled, skipping audio processing', { jobId })
    } else {
      logger.error('SSML processing had errors, skipping audio', { errors: ssmlResult.errors })
    }

    // Mark job as completed
    await updateAnalysisStatus(supabase, jobId, 'completed', null, 100, logger)

    return new Response(JSON.stringify({ 
      status: 'completed',
      feedbackProcessed: feedbackIds.length,
      stagesExecuted: {
        ssml: resolvedStages.runSSML,
        tts: resolvedStages.runTTS
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    logger.error('Post-analyze failed', error)
    return createErrorResponse('Post-analyze failed', 500)
  }
}
