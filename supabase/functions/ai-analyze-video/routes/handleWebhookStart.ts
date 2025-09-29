import { createAnalysisJob } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { processAIPipeline } from '../../_shared/pipeline/aiPipeline.ts'
import {
  GeminiSSMLService,
  GeminiTTSService,
  GeminiVideoAnalysisService//,
  //MockSSMLService,
  //MockTTSService,
  //MockVideoAnalysisService
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

    // Parse payload: support either explicit id or DB webhook shape
    let videoRecordingId: number | undefined
    let body: any = {}
    try {
      body = await req.json()
    } catch (_e) {
      body = {}
    }

    if (typeof body?.videoRecordingId === 'number') {
      videoRecordingId = body.videoRecordingId
    } else if (typeof body?.record?.id === 'number') {
      videoRecordingId = body.record.id
    }

    if (!videoRecordingId) {
      return createErrorResponse('Missing videoRecordingId', 400)
    }

    // Load recording and validate completed status
    const { data: recording, error: recError } = await supabase
      .from('video_recordings')
      .select('id, user_id, storage_path, duration_seconds, upload_status')
      .eq('id', videoRecordingId)
      .single()

    if (recError || !recording) {
      logger.error('Video recording lookup failed', { recError, videoRecordingId })
      return createErrorResponse('Recording not found', 404)
    }

    if (recording.upload_status !== 'completed') {
      logger.info('Recording not completed; ignoring webhook', { videoRecordingId, status: recording.upload_status })
      return new Response(JSON.stringify({ ignored: true, reason: 'not_completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Idempotent job creation
    const analysisJob = await createAnalysisJob(supabase, recording.user_id, recording.id, logger)

    // Instantiate real services (mocking removed)
    const services = {
      videoAnalysis: new GeminiVideoAnalysisService(analyzeVideoWithGemini),
      ssml: new GeminiSSMLService(geminiLLMFeedback),
      tts: new GeminiTTSService(),
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
      analysisId: analysisJob.id,
      videoPath: recording.storage_path,
      videoSource: 'uploaded_video',
      timingParams: { duration: recording.duration_seconds },
      stages: resolvedStages,
      services,
    }).catch((error) => {
      logger.error('Webhook pipeline failed', { error, analysisId: analysisJob.id })
    })

    return new Response(
      JSON.stringify({ analysisId: analysisJob.id, status: 'queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    logger.error('handleWebhookStart error', error)
    return createErrorResponse('Failed to process webhook', 500)
  }
}