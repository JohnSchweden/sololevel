import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { GeminiTTSService, MockTTSService } from '../../_shared/services/index.ts'
import { processAudioJobs } from '../workers/audioWorker.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handleRetryAudio({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    let body: { analysisId?: string; feedbackIds?: number[] }
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON payload', 400)
    }

    const { analysisId, feedbackIds } = body

    if (!analysisId || typeof analysisId !== 'string') {
      return createErrorResponse('Missing or invalid analysisId', 400)
    }

    if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return createErrorResponse('Missing or empty feedbackIds array', 400)
    }

    if (!feedbackIds.every((id) => typeof id === 'number' && Number.isInteger(id))) {
      return createErrorResponse('feedbackIds must be an array of integers', 400)
    }

    logger.info('Retry audio request received', { analysisId, feedbackIds })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Missing or invalid Authorization header', 401)
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      logger.error('Authentication failed', { error: authError })
      return createErrorResponse('Unauthorized', 401)
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, job_id, analysis_jobs(user_id)')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      logger.error('Analysis not found', { analysisId, error: analysisError })
      return createErrorResponse('Analysis not found', 404)
    }

    const analysisUserId = (analysis.analysis_jobs as any)?.user_id
    if (!analysisUserId || analysisUserId !== user.id) {
      logger.error('Analysis does not belong to user', { analysisId, userId: user.id })
      return createErrorResponse('Forbidden', 403)
    }

    const { data: feedbackItems, error: feedbackError } = await supabase
      .from('analysis_feedback')
      .select('id, analysis_id')
      .in('id', feedbackIds)

    if (feedbackError) {
      logger.error('Failed to fetch feedback items', { error: feedbackError })
      return createErrorResponse('Failed to fetch feedback items', 500)
    }

    if (!feedbackItems || feedbackItems.length === 0) {
      return createErrorResponse('No feedback items found', 404)
    }

    const invalidFeedback = feedbackItems.filter((item: any) => item.analysis_id !== analysisId)
    if (invalidFeedback.length > 0) {
      logger.error('Feedback items do not belong to analysis', {
        analysisId,
        invalidIds: invalidFeedback.map((item: any) => item.id),
      })
      return createErrorResponse('Feedback items do not belong to specified analysis', 400)
    }

    const { error: updateError } = await supabase
      .from('analysis_feedback')
      .update({
        audio_status: 'queued',
        audio_last_error: null,
        audio_attempts: 0,
        audio_updated_at: new Date().toISOString(),
      })
      .in('id', feedbackIds)

    if (updateError) {
      logger.error('Failed to update feedback status', { error: updateError })
      return createErrorResponse('Failed to update feedback status', 500)
    }

    logger.info('Updated feedback status to queued', { feedbackIds })

    const ttsService =
      (globalThis as any).Deno?.env?.get('AI_ANALYSIS_MOCK_SERVICES') === 'true'
        ? new MockTTSService()
        : new GeminiTTSService()

    logger.info('TTS service instantiated', {
      serviceName: ttsService.constructor.name,
    })

    const { createDatabaseLogger } = await import('../../_shared/db/logging.ts')
    const dbLogger = createDatabaseLogger('ai-analyze-video', 'retry-audio', supabase, {
      analysisId,
    })

    const result = await processAudioJobs({
      supabase,
      logger: dbLogger,
      feedbackIds,
      analysisId,
      startTime: Date.now(),
      ttsService,
    })

    logger.info('Audio retry processing completed', {
      analysisId,
      feedbackIds,
      result,
    })

    return new Response(
      JSON.stringify({
        status: 'completed',
        processedJobs: result.processedJobs,
        errors: result.errors,
        retriedJobs: result.retriedJobs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('Retry audio failed', error)
    return createErrorResponse('Retry audio failed', 500)
  }
}
