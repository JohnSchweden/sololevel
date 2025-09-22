import { getCompleteAnalysisByJobId, storeAudioSegmentForFeedback } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { GeminiSSMLService, MockSSMLService } from '../../_shared/services/speech/SSMLService.ts'
import type { VideoAnalysisResult } from '../../_shared/services/video/VideoAnalysisService.ts'
import { generateSSMLFromFeedback } from '../gemini-ssml-feedback.ts'

interface HandlerContext {
  req: Request
  supabase: any
  logger: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void }
}

export interface TTSRequest {
  analysisId?: number
  ssml?: string
  text?: string
  perFeedbackItem?: boolean
}

export interface TTSResponse {
  audioUrl: string
  duration?: number
  format: 'mp3' | 'aac'
  segments?: Array<{
    feedbackId: number
    audioUrl: string
    duration?: number
    format: 'mp3' | 'aac'
  }>
}

export async function handleTTS({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    console.log('=== handleTTS START ===')
    const body: TTSRequest = await req.json()
    const { analysisId, ssml, text, perFeedbackItem = false } = body
    console.log('TTS request parsed:', { analysisId, ssml: !!ssml, text: !!text, perFeedbackItem })
    console.log('=== handleTTS END ===')

    // Handle analysis-based per-feedback-item generation
    if (analysisId && perFeedbackItem) {
      logger.info('Generating TTS per feedback item', { analysisId })

      // Load complete analysis data with feedback items
      const analysisData = await getCompleteAnalysisByJobId(supabase, analysisId, logger)

      if (!analysisData || !analysisData.feedback || analysisData.feedback.length === 0) {
        return new Response(JSON.stringify({
          error: 'No feedback data found',
          debug: {
            analysisDataExists: !!analysisData,
            analysisId: analysisData?.analysisId,
            feedbackExists: !!analysisData?.feedback,
            feedbackLength: analysisData?.feedback?.length || 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      logger.info(`Processing ${analysisData.feedback.length} feedback items`)

      const segments: TTSResponse['segments'] = []
      let totalDuration = 0

      // Initialize SSML service for unified generation
      const aiAnalysisMode = Deno.env.get('AI_ANALYSIS_MODE')
      const useMockServices = aiAnalysisMode === 'mock'
      const ssmlService = useMockServices
        ? new MockSSMLService()
        : new GeminiSSMLService(generateSSMLFromFeedback)

      logger.info(`Using ${useMockServices ? 'Mock' : 'Gemini'} SSML service for per-feedback generation`)

      // Generate SSML and audio for each feedback item
      for (const feedbackItem of analysisData.feedback) {
        try {
          // Create wrapper VideoAnalysisResult for single feedback item
          const singleItemAnalysis: VideoAnalysisResult = {
            textReport: feedbackItem.message,
            feedback: [{
              timestamp: feedbackItem.timestamp_seconds || 0,
              category: feedbackItem.category || 'General',
              message: feedbackItem.message,
              confidence: feedbackItem.confidence || 0.85,
              impact: feedbackItem.impact || 0.5,
            }],
            metrics: {},
            confidence: feedbackItem.confidence || 0.85,
          }

          // Generate SSML using the unified service (Gemini or mock)
          const ssmlResult = await ssmlService.generate({
            analysisResult: singleItemAnalysis,
            customParams: {
              voice: 'neutral',
              speed: undefined,
              pitch: undefined
            }
          })

          logger.info(`Generated SSML for feedback item ${feedbackItem.id}: ${ssmlResult.ssml.substring(0, 100)}...`)

          // Generate TTS audio for this SSML
          const ttsResult = await generateTTSPlaceholder(ssmlResult.ssml, analysisId, true, logger)

          // Store the audio segment in database
          try {
            const segmentId = await storeAudioSegmentForFeedback(
              supabase,
              analysisData.analysisId,
              feedbackItem.id,
              ssmlResult.ssml,
              ttsResult.audioUrl,
              {
                audioDurationMs: Math.ceil(ssmlResult.ssml.length / 50) * 1000, // Rough estimate
                audioFormat: 'mp3',
                ssmlPrompt: ssmlResult.promptUsed, // Full prompt from service
                audioPrompt: `Convert SSML to speech`
              },
              logger
            )

            if (segmentId) {
              segments.push({
                feedbackId: feedbackItem.id,
                audioUrl: ttsResult.audioUrl,
                duration: ttsResult.duration,
                format: ttsResult.format
              })
              totalDuration += ttsResult.duration || 0
            } else {
              logger.warn('Failed to store audio segment for feedback item', { feedbackId: feedbackItem.id })
            }
          } catch (storeError) {
            logger.error('Exception storing audio segment', { feedbackId: feedbackItem.id, error: storeError })
          }
        } catch (itemError) {
          logger.error('Failed to process feedback item', { feedbackId: feedbackItem.id, error: itemError })
          // Continue with other items
        }
      }

      return new Response(
        JSON.stringify({
          audioUrl: segments[0]?.audioUrl, // Primary audio URL (first segment)
          duration: totalDuration,
          format: 'mp3',
          segments: segments,
          debug: {
            feedbackProcessed: analysisData.feedback.length,
            segmentsCreated: segments.length,
            analysisId: analysisData.analysisId
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(JSON.stringify({ message: 'TTS endpoint - other case' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    logger.error('handleTTS error', error)
    return createErrorResponse('Failed to generate TTS audio', 500)
  }
}


/**
 * Placeholder TTS generation (replace with actual TTS API)
 */
async function generateTTSPlaceholder(
  ssml: string,
  analysisId?: number,
  perFeedbackItem: boolean = false,
  logger?: any
): Promise<TTSResponse> {
  // Simulate TTS processing time
  await new Promise(resolve => setTimeout(resolve, 100))

  const audioId = analysisId || Date.now()
  const format = 'mp3' as const

  logger.info('Generated placeholder TTS audio', { audioId, format, ssmlLength: ssml.length })

  // For MVP, return a single audio file
  // TODO: Implement per-feedback-item audio generation
  return {
    audioUrl: `https://placeholder-tts-audio.com/analysis_${audioId}.${format}`,
    duration: Math.ceil(ssml.length / 50), // Rough estimate based on text length
    format,
    segments: perFeedbackItem ? [{
      feedbackId: 1,
      audioUrl: `https://placeholder-tts-audio.com/analysis_${audioId}_segment_1.${format}`,
      duration: 5,
      format
    }] : undefined
  }
}

/**
 * Basic SSML validation
 */
function _isValidSSML(ssml: string): boolean {
  const trimmed = ssml.trim()
  return trimmed.startsWith('<speak>') && trimmed.endsWith('</speak>')
}

/**
 * Wrap content in speak tags if missing
 */
function _wrapInSpeakTags(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('<speak>')) {
    content = `<speak>${content}`
  }
  if (!trimmed.endsWith('</speak>')) {
    content = `${content}</speak>`
  }
  return content
}
