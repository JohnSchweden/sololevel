// Simplified AI Analysis Edge Function for testing

import { corsHeaders } from '../../shared/http/cors.ts'
import { createErrorResponse } from '../../shared/http/responses.ts'
// Import centralized logger for Edge Functions
import { createLogger, enableNetworkLogging } from '../../shared/logger.ts'
import { createServiceClientFromEnv } from '../../shared/supabase/client.ts'

import { handleStartAnalysis } from './routes/handleStartAnalysis.ts'
import { handleStatus } from './routes/handleStatus.ts'
import { handleTTS } from './routes/handleTTS.ts'
// Import route handlers
import { handleTestEnv } from './routes/handleTestEnv.ts'

// Import Gemini modules for pipeline injection
import { analyzeVideoWithGemini as _analyzeVideoWithGemini } from './gemini-llm-analysis.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from './gemini-ssml-feedback.ts'
import { generateTTSFromSSML as geminiTTS20 } from './gemini-tts-audio.ts'

// Inject dependencies into pipeline for testability
import { injectGeminiDependencies } from '../_shared/pipeline/aiPipeline.ts'

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  stdout: { write(data: Uint8Array): void }
  stderr: { write(data: Uint8Array): void }
}

const logger = createLogger('ai-analyze-video')
// Enable lightweight network logging to capture external fetch failures
enableNetworkLogging()

// Initialize Supabase client from environment
const supabase = createServiceClientFromEnv(logger)

// Inject Gemini dependencies into pipeline
injectGeminiDependencies(_analyzeVideoWithGemini, geminiLLMFeedback, geminiTTS20)

// deno-lint-ignore require-await
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  try {
    // Route: GET /ai-analyze-video/test-env - Environment test endpoint
    if (req.method === 'GET' && path === '/ai-analyze-video/test-env') {
      return handleTestEnv({ logger })
    }

    // Route: POST /ai-analyze-video - Main AI analysis endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video') {
      return handleStartAnalysis({ req, supabase, logger })
    }

    // Route: GET /ai-analyze-video/status - Analysis status endpoint
    if (req.method === 'GET' && path.startsWith('/ai-analyze-video/status')) {
      return handleStatus({ url, supabase, logger })
    }

    // Route: POST /ai-analyze-video/tts - TTS generation endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video/tts') {
      return handleTTS({ req, logger })
    }

    // Route: GET /ai-analyze-video/health - Health check
    if (req.method === 'GET' && path === '/ai-analyze-video/health') {
      return new Response(
        JSON.stringify({
          status: supabase ? 'ok' : 'warning',
          timestamp: new Date().toISOString(),
          service: 'ai-analyze-video',
          version: '1.0.0',
          message: supabase ? 'Function running with database connection' : 'Function running but no database connection',
          env: {
            supabaseUrl: !!Deno.env.get('SUPABASE_URL') || !!Deno.env.get('EDGE_SUPABASE_URL'),
            supabaseServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || !!Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: supabase ? 200 : 206,
        }
      )
    }

    // 404 for unmatched routes
    return createErrorResponse('Not Found', 404)
  } catch (error) {
    logger.error('AI Analysis Function Error', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start`
  2. Run `supabase functions serve ai-analyze-video`
  3. Make HTTP requests:

  # Health check
  curl http://127.0.0.1:54321/functions/v1/ai-analyze-video/health

  # Start analysis
  curl -X POST http://127.0.0.1:54321/functions/v1/ai-analyze-video \
    -H "Content-Type: application/json" \
    -d '{
      "videoPath": "/path/to/video.mp4",
      "userId": "user-123",
      "videoSource": "uploaded_video",
      "frameData": ["base64frame1", "base64frame2"]
    }'

  # Check status
  curl http://127.0.0.1:54321/functions/v1/ai-analyze-video/status?id=1

  # Generate TTS
  curl -X POST http://127.0.0.1:54321/functions/v1/ai-analyze-video/tts \
    -H "Content-Type: application/json" \
    -d '{"text": "Great job!", "analysisId": "1"}'

*/
