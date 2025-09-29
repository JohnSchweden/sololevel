// import { createAnalysisJob } from '../../_shared/db/analysis.ts'
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
import { analyzeVideoWithGemini } from '../gemini-llm-analysis.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from '../gemini-ssml-feedback.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handleWebhookStart({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    // Validate secret header
    const provided = req.headers.get('X-Db-Webhook-Secret') || ''
    const expected = (globalThis as any).Deno?.env?.get('DB_WEBHOOK_SECRET')
      || (globalThis as any).Deno?.env?.get('EDGE_DB_WEBHOOK_SECRET')

    if (!expected || provided !== expected) {
      logger.error('Webhook unauthorized or secret not configured')
      return createErrorResponse('Unauthorized', 401)
    }

    // Parse payload: support either explicit jobId or DB webhook shape for analysis_jobs INSERT
    let analysisJobId: number | undefined
    let body: any = {}
    try {
      body = await req.json()
    } catch (_e) {
      body = {}
    }

    if (typeof body?.analysisJobId === 'number') {
      analysisJobId = body.analysisJobId
    } else if (typeof body?.record?.id === 'number') {
      analysisJobId = body.record.id
    }

    if (!analysisJobId) {
      return createErrorResponse('Missing analysisJobId', 400)
    }

    // Load analysis job and validate queued status
    const { data: analysisJob, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('id, user_id, video_recording_id, status')
      .eq('id', analysisJobId)
      .single()

    if (jobError || !analysisJob) {
      logger.error('Analysis job lookup failed', { jobError, analysisJobId })
      return createErrorResponse('Analysis job not found', 404)
    }

    if (analysisJob.status !== 'queued') {
      logger.info('Job not in queued status; ignoring webhook', { analysisJobId, status: analysisJob.status })
      return new Response(JSON.stringify({ ignored: true, reason: 'not_queued' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Load video recording for pipeline
    const { data: recording, error: recError } = await supabase
      .from('video_recordings')
      .select('id, storage_path, duration_seconds')
      .eq('id', analysisJob.video_recording_id)
      .single()

    if (recError || !recording) {
      logger.error('Video recording lookup failed', { recError, videoRecordingId: analysisJob.video_recording_id })
      return createErrorResponse('Recording not found', 404)
    }

    // Instantiate services (mock mode if configured)
    const aiAnalysisMode = (globalThis as any).Deno?.env?.get?.('AI_ANALYSIS_MODE')
    const useMockServices = aiAnalysisMode === 'mock'

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

    // Kick off pipeline asynchronously
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
      return undefined
    })()

    processAIPipeline({
      supabase,
      logger,
      analysisId: analysisJobId,
      videoPath: recording.storage_path,
      videoSource: 'uploaded_video',
      timingParams: { duration: recording.duration_seconds },
      stages: resolvedStages,
      services,
    }).catch((error) => {
      logger.error('Webhook pipeline failed', { error, analysisId: analysisJobId })
    })

    return new Response(
      JSON.stringify({ analysisId: analysisJobId, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    logger.error('handleWebhookStart error', error)
    return createErrorResponse('Failed to process webhook', 500)
  }
}