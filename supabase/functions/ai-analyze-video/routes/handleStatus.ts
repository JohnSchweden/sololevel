import { corsHeaders } from '../../../shared/http/cors.ts'
import { createErrorResponse } from '../../../shared/http/responses.ts'
import { getEnhancedAnalysis } from '../../_shared/db/analysis.ts'

interface HandlerContext {
  url: URL
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handleStatus({ url, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    const analysisId = url.searchParams.get('id')
    if (!analysisId) {
      return createErrorResponse('Analysis ID is required', 400)
    }

    if (!supabase) {
      logger.error('Database connection not available')
      return createErrorResponse('Database connection failed', 500)
    }

    const result = await getEnhancedAnalysis(supabase, analysisId, logger)

    if (result.error) {
      return createErrorResponse(result.error, result.status || 404)
    }

    return new Response(
      JSON.stringify(result.data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('handleStatus error', error)
    return createErrorResponse('Failed to get analysis status', 500)
  }
}
