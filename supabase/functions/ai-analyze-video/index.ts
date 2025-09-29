// Simplified AI Analysis Edge Function for testing

import { corsHeaders } from '../_shared/http/cors.ts'
import { createErrorResponse } from '../_shared/http/responses.ts'
// Import centralized logger for Edge Functions
import { createLogger, enableNetworkLogging } from '../_shared/logger.ts'
import { createServiceClientFromEnv } from '../_shared/supabase/client.ts'

import { handleStartAnalysis } from './routes/handleStartAnalysis.ts'
import { handleStatus } from './routes/handleStatus.ts'
import { handleTTS } from './routes/handleTTS.ts'
// Import route handlers
import { handleTestEnv } from './routes/handleTestEnv.ts'
import { handleWebhookStart } from './routes/handleWebhookStart.ts'

// Import Gemini modules for pipeline injection
import { analyzeVideoWithGemini as _analyzeVideoWithGemini } from './gemini-llm-analysis.ts'

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
      return handleTTS({ req, supabase, logger })
    }

    // Route: POST /ai-analyze-video/webhook - DB webhook auto-pickup endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video/webhook') {
      return handleWebhookStart({ req, supabase, logger })
    }

    // Route: POST /ai-analyze-video/upload-test - Test file upload endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video/upload-test') {
      try {
        logger.info('Upload test endpoint called')

        // For simplicity, accept JSON with base64 encoded file
        const body = await req.json()
        const { fileName, fileData, contentType, bucket = 'processed' } = body

        if (!fileName || !fileData || !contentType) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: fileName, fileData, contentType'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        // Decode base64 file data
        const fileBytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))

        // Import and use the upload function
        const { uploadProcessedArtifact } = await import('../_shared/storage/upload.ts')

        let uploadResult

        // Use appropriate upload function based on bucket
        if (bucket === 'processed') {
          // Use the standard upload function for processed bucket (audio files)
          uploadResult = await uploadProcessedArtifact(
            supabase,
            fileName,
            fileBytes,
            contentType,
            bucket
          )
        } else if (bucket === 'raw') {
          // For raw bucket (video files), use the same function but with raw bucket validation
          uploadResult = await uploadProcessedArtifact(
            supabase,
            fileName,
            fileBytes,
            contentType,
            bucket
          )
        } else {
          throw new Error(`Unsupported bucket: ${bucket}`)
        }

        logger.info('Upload test successful', { fileName, size: fileBytes.length })

        return new Response(JSON.stringify({
          success: true,
          uploadResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      } catch (error) {
        logger.error('Upload test failed', error)
        return new Response(JSON.stringify({
          error: 'Upload test failed',
          message: error instanceof Error ? error.message : String(error)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
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
  2. Run `yarn supabase functions serve ai-analyze-video --env-file .env`
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
