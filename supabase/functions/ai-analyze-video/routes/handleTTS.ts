import { getCompleteAnalysisByJobId, storeAudioSegmentForFeedback, updateAnalysisResults } from '../../_shared/db/analysis.ts'
import { getUserVoicePreferences, getVoiceConfig } from '../../_shared/db/voiceConfig.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { AudioFormat, resolveAudioFormat } from '../../_shared/media/audio.ts'
import { GeminiSSMLService, MockSSMLService } from '../../_shared/services/speech/SSMLService.ts'
import { GeminiTTSService, MockTTSService } from '../../_shared/services/speech/TTSService.ts'
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
  format?: AudioFormat // Preferred audio format
  preferredFormats?: AudioFormat[] // Ordered list of preferred formats
}

export interface TTSResponse {
  audioUrl: string
  duration?: number
  format: AudioFormat // Audio format from central configuration
  segments?: Array<{
    feedbackId: number
    audioUrl: string
    duration?: number
    format: AudioFormat // Audio format from central configuration
  }>
}

/**
 * Helper function to fetch user ID from analysis job ID
 */
async function fetchUserIdForAnalysis(supabase: any, analysisId: number, _logger: any): Promise<string> {
  const { data, error } = await supabase
    .from('analysis_jobs')
    .select(`
      video_recordings!inner(
        user_id
      )
    `)
    .eq('id', analysisId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch user ID for analysis: ${error?.message || 'No data'}`)
  }

  return data.video_recordings.user_id
}

export async function handleTTS({ req, supabase, logger }: HandlerContext): Promise<Response> {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        status: 200,
      })
    }

    logger.info('Starting handleTTS request')
    const body: TTSRequest = await req.json()
    const { analysisId, ssml, text, perFeedbackItem = false, format, preferredFormats } = body
    logger.info('TTS request parsed:', { analysisId, ssml: !!ssml, text: !!text, perFeedbackItem, format, preferredFormats })

    // Debug: log current environment defaults
    const { getEnvDefaultFormat } = await import('../../_shared/media/audio.ts')
    logger.info('Environment TTS defaults:', { defaultFormat: getEnvDefaultFormat() })

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

      // Fetch user voice preferences and resolve voice config
      const userId = await fetchUserIdForAnalysis(supabase, analysisId, logger)
      const prefs = await getUserVoicePreferences(supabase, userId)
      logger.info('Fetched voice preferences', { userId, prefs })

      const voiceConfig = await getVoiceConfig(supabase, prefs.coachGender, prefs.coachMode)
      logger.info('Resolved voice config for per-feedback TTS', {
        voiceName: voiceConfig.voiceName,
        ttsSystemInstruction: voiceConfig.ttsSystemInstruction 
          ? voiceConfig.ttsSystemInstruction.substring(0, 50) + '...'
          : '(empty)',
        gender: prefs.coachGender,
        mode: prefs.coachMode,
      })

      const segments: TTSResponse['segments'] = []
      let totalDuration = 0

      // Initialize SSML service for unified generation
      const aiAnalysisMode = Deno.env.get('AI_ANALYSIS_MODE')
      const useMockServices = aiAnalysisMode === 'mock'
      const ssmlService = useMockServices
        ? new MockSSMLService()
        : new GeminiSSMLService(generateSSMLFromFeedback)

      // Resolve format once for consistency across all segments
      const resolvedFormat = resolveAudioFormat(preferredFormats || (format ? [format] : undefined), 'gemini')

      logger.info(`Using ${useMockServices ? 'Mock' : 'Gemini'} SSML service for per-feedback generation, format: ${resolvedFormat}`)

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
              pitch: undefined,
              ssmlSystemInstruction: voiceConfig.ssmlSystemInstruction
            }
          })

          logger.info(`Generated SSML for feedback item ${feedbackItem.id}: ${ssmlResult.ssml.substring(0, 100)}...`)

          // Generate TTS audio for this SSML using Gemini TTS (or mock in test mode)
          const ttsService = useMockServices
            ? new MockTTSService()
            : new GeminiTTSService()
          const ttsResult = await ttsService.synthesize({
            ssml: ssmlResult.ssml,
            supabase,
            analysisId,
            customParams: {
              voice: voiceConfig.voiceName,
              format: resolvedFormat,
              ttsSystemInstruction: voiceConfig.ttsSystemInstruction
            }
          })

          // Store the audio segment in database
          try {
            const segmentId = await storeAudioSegmentForFeedback(
              supabase,
              feedbackItem.id,
              ttsResult.audioUrl,
              {
                durationMs: Math.ceil(ssmlResult.ssml.length / 50) * 1000, // Rough estimate
                format: ttsResult.format || resolvedFormat,
                prompt: ttsResult.promptUsed || `Convert SSML to speech`
              },
              logger
            )

            if (segmentId) {
              segments.push({
                feedbackId: feedbackItem.id,
                audioUrl: ttsResult.audioUrl,
                duration: ttsResult.duration,
                format: ttsResult.format || resolvedFormat
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
          format: resolvedFormat, // Use resolved format from negotiation
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

    // Validate required parameters
    if (!analysisId && !text && !ssml) {
      return new Response(JSON.stringify({
        error: 'analysisId, text, or ssml is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Check for database connection
    if (!supabase) {
      return new Response(JSON.stringify({
        error: 'Database connection failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Handle different input types
    let finalSSML: string
    let sourceType: 'analysis' | 'text' | 'ssml' = 'text'
    let voiceName: string | undefined
    let ttsSystemInstruction: string | undefined
    let ssmlSystemInstruction: string | undefined

    if (analysisId && !perFeedbackItem) {
      // Load analysis data and generate SSML from feedback
      logger.info('Generating TTS from analysis data', { analysisId })
      const analysisData = await getCompleteAnalysisByJobId(supabase, analysisId, logger)

      if (!analysisData || !analysisData.feedback || analysisData.feedback.length === 0) {
        return new Response(JSON.stringify({
          error: 'Analysis not found or no feedback data available'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      // Fetch user voice preferences and resolve voice config
      const userId = await fetchUserIdForAnalysis(supabase, analysisId, logger)
      const prefs = await getUserVoicePreferences(supabase, userId)
      logger.info('Fetched voice preferences', { userId, prefs })

      const voiceConfig = await getVoiceConfig(supabase, prefs.coachGender, prefs.coachMode)
      logger.info('Resolved voice config', {
        voiceName: voiceConfig.voiceName,
        ttsSystemInstruction: voiceConfig.ttsSystemInstruction,
        ssmlSystemInstruction: voiceConfig.ssmlSystemInstruction,
        gender: prefs.coachGender,
        mode: prefs.coachMode,
      })

      voiceName = voiceConfig.voiceName
      ttsSystemInstruction = voiceConfig.ttsSystemInstruction
      ssmlSystemInstruction = voiceConfig.ssmlSystemInstruction

      // Generate SSML from analysis feedback
      const aiAnalysisMode = Deno.env.get('AI_ANALYSIS_MODE')
      const useMockServices = aiAnalysisMode === 'mock'
      const ssmlService = useMockServices
        ? new MockSSMLService()
        : new GeminiSSMLService(generateSSMLFromFeedback)

      const ssmlResult = await ssmlService.generate({
        analysisResult: analysisData as unknown as VideoAnalysisResult,
        customParams: {
          ssmlSystemInstruction
        }
      })

      finalSSML = ssmlResult.ssml
      sourceType = 'analysis'

    } else if (ssml) {
      // Use provided SSML directly
      logger.info('Using provided SSML for TTS')
      finalSSML = _isValidSSML(ssml) ? ssml : `<speak>${ssml}</speak>`
      sourceType = 'ssml'

    } else if (text) {
      // Generate SSML from text
      logger.info('Generating SSML from text input')
      finalSSML = `<speak>${text}</speak>`
      sourceType = 'text'

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid request parameters'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Generate TTS audio
    logger.info('Generating TTS audio', { sourceType, ssmlLength: finalSSML.length, voiceName, hasTtsInstruction: !!ttsSystemInstruction })
    const ttsService = new GeminiTTSService()
    const ttsResult = await ttsService.synthesize({
      ssml: finalSSML,
      supabase,
      analysisId: analysisId && !perFeedbackItem ? analysisId : undefined,
      customParams: {
        voice: voiceName,
        format: resolveAudioFormat(preferredFormats || (format ? [format] : undefined), 'gemini'),
        ttsSystemInstruction
      }
    })

    // Store results in database if analysisId was provided
    if (analysisId && !perFeedbackItem) {
      try {
        // Update analysis results
        await updateAnalysisResults(
          supabase,
          analysisId,
          {
            text_feedback: finalSSML,
            feedback: [],
            summary_text: `TTS generated from ${sourceType}`,
            processing_time: Date.now(),
            video_source: 'tts_generation'
          },
          null,
          Date.now(),
          'tts',
          logger
        )

        // Store audio segment to persist prompts (SSML and audio prompts)
        // For non-per-feedback TTS, create a synthetic feedback item for the entire analysis
        try {
          const segmentId = await storeAudioSegmentForFeedback(
            supabase,
            -1, // Use -1 to indicate this is the full analysis TTS, not tied to a specific feedback item
            ttsResult.audioUrl,
            {
              durationMs: Math.ceil(finalSSML.length / 50) * 1000, // Rough estimate
              format: ttsResult.format || 'wav',
              prompt: ttsResult.promptUsed || `Convert SSML to speech` // Store the TTS system instruction
            },
            logger
          )

          if (segmentId) {
            logger.info('Stored TTS audio segment for full analysis', { segmentId, analysisId })
          } else {
            logger.warn('Failed to store TTS audio segment for full analysis', { analysisId })
          }
        } catch (segmentError) {
          logger.warn('Failed to store TTS audio segment for full analysis', { analysisId, error: segmentError })
          // Don't fail the request for segment storage errors
        }
      } catch (dbError) {
        logger.warn('Failed to update analysis with TTS results', { analysisId, error: dbError })
        // Don't fail the request for database errors
      }
    }

    return new Response(
      JSON.stringify({
        audioUrl: ttsResult.audioUrl,
        duration: ttsResult.duration,
        format: ttsResult.format,
        sourceType,
        promptUsed: ttsResult.promptUsed, // Include prompt for consistency with other stages
        debug: {
          ssmlLength: finalSSML.length,
          analysisId: analysisId || null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('handleTTS error', error)
    return createErrorResponse('Failed to generate TTS audio', 500)
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
