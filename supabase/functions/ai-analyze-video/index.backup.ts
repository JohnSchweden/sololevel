// AI Analysis Edge Function with Video Processing Support

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  stdout: { write(data: Uint8Array): void }
  stderr: { write(data: Uint8Array): void }
}

declare function createClient(
  url: string,
  key: string
): any

// Import Gemini modules
import { generateSSMLFromFeedback as geminiLLMFeedback } from './gemini-ssml-feedback.ts'
import { generateTTSFromSSML as geminiTTS20 } from './gemini-tts-audio.ts'

// Import Gemini 2.5 integration
import { type GeminiVideoAnalysisResult, analyzeVideoWithGemini as _analyzeVideoWithGemini, validateGeminiConfig as _validateGeminiConfig } from './gemini-llm-analysis.ts'

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('ai-analyze-video')

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Types for video processing
interface VideoProcessingRequest {
  videoPath: string
  userId: string
  videoSource?: 'live_recording' | 'uploaded_video'
  frameData?: string[] // Base64 encoded frames for uploaded videos
  existingPoseData?: PoseDetectionResult[] // For live recordings
}

interface PoseDetectionResult {
  timestamp: number
  joints: Joint[]
  confidence: number
  metadata?: {
    source: 'live_recording' | 'uploaded_video'
    processingMethod: 'vision_camera' | 'video_processing'
    frameIndex?: number
    originalTimestamp?: number
  }
}

interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

export interface AnalysisJob {
  id: number
  user_id: string
  video_recording_id: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  processing_started_at?: string
  processing_completed_at?: string
  error_message?: string
  results: Record<string, unknown>
  pose_data: PoseDetectionResult[] | Record<string, unknown>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  try {
    // Route: POST /ai-analyze-video - Main AI analysis endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video') {
      return await handleAIAnalyzeVideo(req)
    }

    // Route: GET /ai-analyze-video/status - Analysis status endpoint
    if (req.method === 'GET' && path.startsWith('/ai-analyze-video/status')) {
      const analysisId = url.searchParams.get('id')
      if (!analysisId) {
        return createErrorResponse('Analysis ID is required', 400)
      }
      return await handleAnalysisStatus(analysisId)
    }

    // Route: POST /ai-analyze-video/tts - TTS generation endpoint
    if (req.method === 'POST' && path === '/ai-analyze-video/tts') {
      return await handleTTSGeneration(req)
    }

    // Route: GET /ai-analyze-video/health - Health check
    if (req.method === 'GET' && path === '/ai-analyze-video/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'ai-analyze-video',
          version: '1.0.0',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 404 for unmatched routes
    return createErrorResponse('Not Found', 404)
  } catch (error) {
    logger.error('AI Analysis Function Error', error)
    return createErrorResponse('Internal server error', 500)
  }
})

async function handleAIAnalyzeVideo(req: Request): Promise<Response> {
  try {
    const requestData: VideoProcessingRequest = await req.json()
    const {
      videoPath,
      userId,
      videoSource = 'uploaded_video',
      frameData,
      existingPoseData,
    } = requestData

    // Validate required fields
    if (!videoPath || !userId) {
      return createErrorResponse('videoPath and userId are required', 400)
    }

    // For testing, create a mock analysis job without video recording dependency
    const mockAnalysisJob = {
      id: Date.now(), // Use timestamp as mock ID
      user_id: userId,
      video_recording_id: 1,
      status: 'queued',
      progress_percentage: 0,
      results: {},
      pose_data: {},
      created_at: new Date().toISOString(),
    }

    // Skip database creation for now and use mock data
    const analysisJob = mockAnalysisJob
    const createError = null

    if (createError) {
      logger.error('Failed to create analysis job', createError)
      return createErrorResponse('Failed to create analysis job', 500)
    }

    // Start AI pipeline processing in background
    processAIPipeline(analysisJob.id, videoPath, videoSource, frameData, existingPoseData).catch(
      (error) => {
        logger.error('AI Pipeline processing failed', error)
        updateAnalysisStatus(
          analysisJob.id,
          'failed',
          error instanceof Error ? error.message : String(error)
        )
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
    logger.error('handleAIAnalyzeVideo error', error)
    return createErrorResponse('Failed to process analysis request', 500)
  }
}

async function handleAnalysisStatus(analysisId: string): Promise<Response> {
  try {
    // Use enhanced query function to get structured feedback and metrics
    const { data: analysisData, error } = await supabase.rpc('get_enhanced_analysis_with_feedback', {
      analysis_job_id: Number.parseInt(analysisId)
    })

    if (error || !analysisData || analysisData.length === 0) {
      // Fallback to basic query if enhanced function fails
      const { data: analysisJob, error: fallbackError } = await supabase
        .from('analysis_jobs')
        .select(
          'id, status, progress_percentage, error_message, results, pose_data, created_at, processing_started_at, processing_completed_at, full_report_text, summary_text, ssml, audio_url, processing_time_ms, video_source_type'
        )
        .eq('id', analysisId)
        .single()

      if (fallbackError || !analysisJob) {
        return createErrorResponse('Analysis not found', 404)
      }

      return new Response(
        JSON.stringify({
          id: analysisJob.id,
          status: analysisJob.status,
          progress: analysisJob.progress_percentage,
          error: analysisJob.error_message,
          results: analysisJob.results,
          poseData: analysisJob.pose_data,
          fullReport: analysisJob.full_report_text,
          summary: analysisJob.summary_text,
          ssml: analysisJob.ssml,
          audioUrl: analysisJob.audio_url,
          processingTimeMs: analysisJob.processing_time_ms,
          videoSourceType: analysisJob.video_source_type,
          timestamps: {
            created: analysisJob.created_at,
            started: analysisJob.processing_started_at,
            completed: analysisJob.processing_completed_at,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Return enhanced data with structured feedback and metrics
    const analysis = analysisData[0]
    return new Response(
      JSON.stringify({
        id: analysis.analysis_id,
        status: analysis.status,
        progress: analysis.progress_percentage,
        error: null, // Would need to query separately if needed
        results: analysis.metrics, // Legacy compatibility
        poseData: null, // Would need to query separately if needed
        fullReport: analysis.full_report_text,
        summary: analysis.summary_text,
        ssml: analysis.ssml,
        audioUrl: analysis.audio_url,
        processingTimeMs: analysis.processing_time_ms,
        videoSourceType: analysis.video_source_type,
        feedback: analysis.feedback,
        metrics: analysis.metrics,
        timestamps: {
          created: analysis.created_at,
          updated: analysis.updated_at,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('handleAnalysisStatus error', error)
    return createErrorResponse('Failed to get analysis status', 500)
  }
}

async function handleTTSGeneration(req: Request): Promise<Response> {
  try {
    const { text, ssml, analysisId } = await req.json()

    if (!text && !ssml) {
      return createErrorResponse('text or ssml is required', 400)
    }

    // TODO: Implement TTS generation with Gemini 2.0
    // For now, return a placeholder response
    const audioUrl = `https://placeholder-tts-audio.com/${analysisId}.mp3`

    return new Response(
      JSON.stringify({
        audioUrl,
        duration: 30, // seconds
        format: 'mp3',
        size: 480000, // bytes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('handleTTSGeneration error', error)
    return createErrorResponse('Failed to generate TTS audio', 500)
  }
}

async function processAIPipeline(
  analysisId: number,
  videoPath: string,
  videoSource: string,
  _frameData?: string[],
  _existingPoseData?: PoseDetectionResult[]
): Promise<void> {
  const startTime = Date.now()

  try {
    // Update status to processing
    await updateAnalysisStatus(analysisId, 'processing', null, 10)

    // 1. Video Source Detection (No pose data needed for AI analysis)
    // Pose data is stored in database for UI purposes only
    // AI analysis uses video content directly
    await updateAnalysisStatus(analysisId, 'processing', null, 20)

    // 2. Gemini 2.5 Video Analysis (per TRD) - analyzes video content directly
    const analysis = await gemini25VideoAnalysis(videoPath)
    await updateAnalysisStatus(analysisId, 'processing', null, 70)

    // 3. Gemini LLM SSML Generation (per TRD)
    const ssml = await geminiLLMFeedback(analysis)
    await updateAnalysisStatus(analysisId, 'processing', null, 85)

    // 4. Gemini TTS 2.0 Audio Generation (per TRD)
    const audioUrl = await geminiTTS20(ssml)
    await updateAnalysisStatus(analysisId, 'processing', null, 95)

    // 5. Store results and update status
    const results = {
      text_report: analysis.textReport, // Full text analysis report
      feedback: analysis.feedback, // Structured feedback items
      summary_text: analysis.textReport.substring(0, 500), // Backward compatibility
      ssml: ssml,
      audio_url: audioUrl,
      processing_time: Date.now() - startTime,
      video_source: videoSource,
    }

    // Note: Pose data is stored separately in analysis_jobs.pose_data for UI purposes
    // AI analysis results don't include pose data
    await updateAnalysisResults(
      analysisId,
      results,
      null,
      Date.now() - startTime,
      videoSource
    )
    await updateAnalysisStatus(analysisId, 'completed', null, 100)

    // 6. Real-time notification (per TRD)
    await notifyAnalysisComplete(analysisId)
  } catch (error) {
    logger.error('AI Pipeline failed', error)
    await updateAnalysisStatus(
      analysisId,
      'failed',
      error instanceof Error ? error.message : String(error)
    )
  }
}

// Client-side pose integration strategy (inline implementation)

// Helper functions (database integration approach)
export function runMoveNetLightning(
  frames: string[],
  _options: Record<string, unknown>
): PoseDetectionResult[] {
  // DATABASE INTEGRATION STRATEGY:
  // Pose detection is performed on the client side and stored in the database
  // in the same format as live recording (analysis_jobs.pose_data JSONB field).
  // This Edge Function reads the pose data from the database when needed.

  logger.info(`MoveNet Lightning: Using database integration strategy for ${frames.length} frames`)

  // For uploaded videos, pose detection should be done on client side:
  // 1. Client extracts frames using react-native-video-processing
  // 2. Client runs pose detection using existing useMVPPoseDetection hooks
  // 3. Client saves pose data to database in same format as live recording
  // 4. Edge Function reads pose data from database for AI analysis

  // Generate mock data for development/testing
  // In production, pose data should be read from analysis_jobs.pose_data
  const mockPoseData = Array.from({ length: frames.length }, (_, index) => ({
    timestamp: Date.now() + index * 33.33, // 30fps spacing
    joints: [
      'nose',
      'left_eye',
      'right_eye',
      'left_ear',
      'right_ear',
      'left_shoulder',
      'right_shoulder',
      'left_elbow',
      'right_elbow',
      'left_wrist',
      'right_wrist',
      'left_hip',
      'right_hip',
      'left_knee',
      'right_knee',
      'left_ankle',
      'right_ankle',
    ].map((name) => ({
      id: name,
      x: 0.3 + Math.sin(Date.now() * 0.001 + index) * 0.3,
      y: 0.3 + Math.cos(Date.now() * 0.001 + index) * 0.3,
      confidence: 0.7 + Math.random() * 0.3,
      connections: [],
    })),
    confidence: 0.8,
    metadata: {
      source: 'uploaded_video' as const,
      processingMethod: 'video_processing' as const,
      frameIndex: index,
      originalTimestamp: Date.now() + index * 33.33,
    },
  }))

  logger.info(
    `Generated mock pose data for ${mockPoseData.length} frames (database integration recommended)`
  )
  return mockPoseData
}

export function unifyPoseDataFormat(
  poseData: PoseDetectionResult[],
  videoSource: string
): PoseDetectionResult[] {
  return poseData.map((frame) => ({
    ...frame,
    metadata: {
      ...frame.metadata,
      source: videoSource as 'live_recording' | 'uploaded_video',
      processingMethod:
        videoSource === 'live_recording'
          ? ('vision_camera' as const)
          : ('video_processing' as const),
    },
  }))
}

function gemini25VideoAnalysis(videoPath: string): GeminiVideoAnalysisResult {
  // TODO: Implement real Gemini 2.5 integration
  // Temporarily using placeholder for debugging
  logger.info(`Analyzing video with Gemini 2.5: ${videoPath}`)

  // Return structure that matches GeminiVideoAnalysisResult interface
  return {
    textReport:
      'Video analysis completed using AI-powered assessment. Maintain proper posture throughout the movement. Focus on controlled eccentric phase. Ensure full range of motion without compensation.',
    feedback: [
      {
        timestamp: 2.5,
        category: 'Posture' as const,
        message: 'Maintain proper posture throughout the movement',
        confidence: 0.85,
        impact: 0.8,
      },
      {
        timestamp: 7.8,
        category: 'Movement' as const,
        message: 'Focus on controlled eccentric phase',
        confidence: 0.9,
        impact: 0.7,
      },
      {
        timestamp: 12.3,
        category: 'Movement' as const,
        message: 'Ensure full range of motion without compensation',
        confidence: 0.8,
        impact: 0.6,
      },
    ],
    metrics: { posture: 82, movement: 85, overall: 83 },
    confidence: 0.85,
  }
}

async function updateAnalysisStatus(
  analysisId: number,
  status: AnalysisJob['status'],
  errorMessage?: string | null,
  progress?: number
): Promise<void> {
  const updateData: Partial<Pick<AnalysisJob, 'status' | 'progress_percentage' | 'processing_started_at' | 'processing_completed_at' | 'error_message'>> = { status }

  if (progress !== undefined) {
    updateData.progress_percentage = progress
  }

  if (status === 'processing' && !errorMessage) {
    updateData.processing_started_at = new Date().toISOString()
  }

  if (status === 'completed' || status === 'failed') {
    updateData.processing_completed_at = new Date().toISOString()
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  const { error } = await supabase.from('analysis_jobs').update(updateData).eq('id', analysisId)

  if (error) {
    logger.error('Failed to update analysis status', error)
  }
}

async function updateAnalysisResults(
  analysisId: number,
  results: Record<string, unknown>,
  poseData: PoseDetectionResult[] | null,
  processingTimeMs?: number,
  videoSourceType?: string
): Promise<void> {
  // Extract data for enhanced storage
  const fullReportText = results.text_report
  const summaryText = results.summary_text
  const ssml = results.ssml
  const audioUrl = results.audio_url
  const feedback = results.feedback || []
  const metrics = results.metrics || {}

  // Use enhanced storage function
  const { error } = await supabase.rpc('store_enhanced_analysis_results', {
    analysis_job_id: analysisId,
    p_full_report_text: fullReportText,
    p_summary_text: summaryText,
    p_ssml: ssml,
    p_audio_url: audioUrl,
    p_processing_time_ms: processingTimeMs,
    p_video_source_type: videoSourceType,
    p_feedback: feedback,
    p_metrics: metrics
  })

  if (error) {
    logger.error('Failed to update enhanced analysis results', error)
    // Fallback to basic update if enhanced function fails
    await supabase
      .from('analysis_jobs')
      .update({
        results,
        pose_data: poseData,
        full_report_text: fullReportText,
        summary_text: summaryText,
        ssml: ssml,
        audio_url: audioUrl,
        processing_time_ms: processingTimeMs,
        video_source_type: videoSourceType,
      })
      .eq('id', analysisId)
  }
}

function notifyAnalysisComplete(analysisId: number): void {
  // TODO: Implement real-time notification via Supabase Realtime
  logger.info(`Analysis ${analysisId} completed - notification sent`)
}

export function calculateAverageConfidence(poseData: PoseDetectionResult[]): number {
  if (poseData.length === 0) return 0
  const totalConfidence = poseData.reduce((sum, pose) => sum + pose.confidence, 0)
  return totalConfidence / poseData.length
}

export function mockJoints(): Joint[] {
  return [
    { id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: ['left_eye', 'right_eye'] },
    { id: 'left_eye', x: 0.45, y: 0.28, confidence: 0.85, connections: ['nose'] },
    { id: 'right_eye', x: 0.55, y: 0.28, confidence: 0.85, connections: ['nose'] },
  ]
}

function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

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
