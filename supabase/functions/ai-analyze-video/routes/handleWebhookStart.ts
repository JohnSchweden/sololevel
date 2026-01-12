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

    // OPTIMIZATION: Batch queries - load analysis job AND video recording in single query
    // This reduces database roundtrips from 2 to 1, saving ~100-200ms
    const { data: analysisJobWithRecording, error: jobError } = await supabase
      .from('analysis_jobs')
      .select(`
        id, 
        user_id, 
        video_recording_id, 
        status,
        video_recordings!video_recording_id (
          id,
          storage_path,
          duration_seconds
        )
      `)
      .eq('id', analysisJobId)
      .single()

    if (jobError || !analysisJobWithRecording) {
      logger.error('Analysis job lookup failed', { jobError, analysisJobId })
      return createErrorResponse('Analysis job not found', 404)
    }

    // Extract nested video_recordings data (Supabase returns as array for relations)
    const recording = Array.isArray(analysisJobWithRecording.video_recordings)
      ? analysisJobWithRecording.video_recordings[0]
      : analysisJobWithRecording.video_recordings

    if (!recording) {
      logger.error('Video recording not found in batched query', { videoRecordingId: analysisJobWithRecording.video_recording_id })
      return createErrorResponse('Recording not found', 404)
    }

    // Extract analysis job fields (without nested relation)
    const analysisJob = {
      id: analysisJobWithRecording.id,
      user_id: analysisJobWithRecording.user_id,
      video_recording_id: analysisJobWithRecording.video_recording_id,
      status: analysisJobWithRecording.status,
    }

    if (analysisJob.status !== 'queued') {
      logger.info('Job not in queued status; ignoring webhook', { analysisJobId, status: analysisJob.status })
      return new Response(JSON.stringify({ ignored: true, reason: 'not_queued' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // OPTIMIZATION: Update status to 'processing' BEFORE starting pipeline
    // This ensures Realtime pushes status immediately, reducing perceived latency by ~200-500ms
    const { error: statusError } = await supabase
      .from('analysis_jobs')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', analysisJobId)

    if (statusError) {
      logger.error('Failed to update analysis status to processing', { statusError, analysisJobId })
      // Continue anyway - pipeline will update status
    } else {
      logger.info('Updated analysis status to processing', { analysisJobId })
    }

    // Instantiate services (mock mode if configured)
    const aiAnalysisMockServices = (globalThis as any).Deno?.env?.get?.('AI_ANALYSIS_MOCK_SERVICES')
    const useMockServices = aiAnalysisMockServices === 'true'

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
      userId: analysisJob.user_id, // Pass userId from analysis job for voice config lookup
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