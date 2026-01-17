import { createAnalysisJob, findOrCreateVideoRecording } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { type VideoProcessingRequest, parseVideoProcessingRequest } from '../../_shared/types/ai-analyze-video.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void }
}

export async function handleStartAnalysis({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    // Extract user ID from JWT token in Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('Missing or invalid Authorization header')
      return createErrorResponse('Authentication required', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token and extract user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('Invalid or expired token', { error: authError })
      return createErrorResponse('Invalid authentication token', 401)
    }

    const userId = user.id
    logger.info('Authenticated user', { userId })

    const requestData: VideoProcessingRequest = parseVideoProcessingRequest(await req.json())
    const {
      videoPath,
      videoRecordingId,
      videoSource = 'uploaded_video',
    } = requestData

    // Validate required fields (now handled by parseVideoProcessingRequest)
    logger.info('Processing analysis request', { 
      videoPath, 
      videoRecordingId, 
      userId, 
      videoSource,
      inputMode: videoRecordingId ? 'videoRecordingId' : 'videoPath'
    })

    if (!supabase) {
      logger.error('Database connection not available')
      return createErrorResponse('Database connection failed', 500)
    }

    // Determine video path and recording ID based on input mode
    let finalVideoPath: string
    let finalVideoRecordingId: number

    if (videoRecordingId) {
      // New mode: lookup video_recordings by ID
      logger.info('Looking up video recording', { videoRecordingId })
      
      const { data: videoRecord, error } = await supabase
        .from('video_recordings')
        .select('id, storage_path, duration_seconds, user_id')
        .eq('id', videoRecordingId)
        .eq('user_id', userId) // Ensure user can only access their own videos
        .single()

      if (error || !videoRecord) {
        logger.error('Video recording not found or access denied', { videoRecordingId, userId, error })
        return createErrorResponse('Video recording not found or access denied', 404)
      }

      // Additional security check (should be redundant due to RLS, but good practice)
      if (videoRecord.user_id !== userId) {
        logger.error('Access denied: user does not own video recording', { 
          videoRecordingId, 
          userId, 
          videoOwnerId: videoRecord.user_id 
        })
        return createErrorResponse('Access denied', 403)
      }

      finalVideoPath = videoRecord.storage_path
      finalVideoRecordingId = videoRecord.id
      
      logger.info('Found video recording', { 
        videoRecordingId: finalVideoRecordingId, 
        storagePath: finalVideoPath,
        duration: videoRecord.duration_seconds
      })
    } else if (videoPath) {
      // Legacy mode: use provided videoPath, find or create recording
      finalVideoPath = videoPath
      
      logger.info('Creating analysis job (legacy mode)', { userId, videoPath: finalVideoPath })
      finalVideoRecordingId = await findOrCreateVideoRecording(supabase, userId, logger)
    } else {
      // This should not happen due to parseVideoProcessingRequest validation
      return createErrorResponse('Either videoPath or videoRecordingId must be provided', 400)
    }

    const analysisJob = await createAnalysisJob(supabase, userId, finalVideoRecordingId, logger)

    // Pipeline is triggered automatically by INSERT webhook
    // No direct processAIPipeline() call needed - the INSERT trigger will invoke /webhook
    logger.info('Analysis job created, INSERT trigger will start pipeline', { 
      analysisId: analysisJob.id,
      userId,
      videoSource
    })

    return new Response(
      JSON.stringify({
        analysisId: analysisJob.id,
        status: 'queued',
        message: 'Analysis job created, processing will start automatically',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('handleStartAnalysis error', error)
    
    // Handle validation errors with 400 status
    if (error instanceof Error && error.message.includes('must be provided')) {
      return createErrorResponse(error.message, 400)
    }
    
    return createErrorResponse('Failed to process analysis request', 500)
  }
}
