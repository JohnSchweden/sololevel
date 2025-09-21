import { getEnhancedAnalysis, updateAnalysisResults } from '../../_shared/db/analysis.ts'
import { corsHeaders } from '../../_shared/http/cors.ts'
import { createErrorResponse } from '../../_shared/http/responses.ts'
import { type GeminiAnalysisResult, generateSSMLFromFeedback } from '../gemini-ssml-feedback.ts'

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
    const body: TTSRequest = await req.json()
    const { analysisId, ssml, text, perFeedbackItem = false } = body

    // Validation
    if (!analysisId && !text && !ssml) {
      return createErrorResponse('analysisId, text, or ssml is required', 400)
    }

    if (!supabase) {
      logger.error('Database connection not available')
      return createErrorResponse('Database connection failed', 500)
    }

    let finalSSML = ssml
    let analysisData: GeminiAnalysisResult | null = null

    // Load analysis data if analysisId provided
    if (analysisId) {
      logger.info('Loading analysis data', { analysisId })

      const analysisResult = await getEnhancedAnalysis(supabase, analysisId.toString())
      if (analysisResult.error) {
        return createErrorResponse(`Analysis not found: ${analysisResult.error}`, analysisResult.status || 404)
      }

      const data = analysisResult.data
      if (!data) {
        return createErrorResponse('Analysis data not found', 404)
      }

      analysisData = {
        textReport: data.fullReport,
        feedback: data.feedback || [],
        metrics: data.metrics,
        confidence: 0.8 // Default confidence, not available in the current schema
      }
    }

    // Generate SSML if not provided
    if (!finalSSML) {
      if (analysisData) {
        logger.info('Generating SSML from analysis data')
        try {
          finalSSML = await generateSSMLFromFeedback(analysisData)
        } catch (ssmlError) {
          logger.warn('SSML generation failed, using fallback', ssmlError)
          // Use fallback SSML generation
          const { generateBasicSSML } = await import('../gemini-ssml-feedback.ts')
          finalSSML = generateBasicSSML(analysisData.textReport || 'Analysis completed successfully')
        }
      } else if (text) {
        logger.info('Generating basic SSML from text')
        // Import the basic SSML generator
        const { generateBasicSSML } = await import('../gemini-ssml-feedback.ts')
        finalSSML = generateBasicSSML(text)
      } else {
        return createErrorResponse('Cannot generate SSML: no analysis data or text provided', 400)
      }
    }

    // Validate SSML before TTS
    if (!isValidSSML(finalSSML)) {
      logger.warn('Invalid SSML provided, attempting to fix', { ssml: finalSSML.substring(0, 100) })
      finalSSML = wrapInSpeakTags(finalSSML)
    }

    logger.info('SSML prepared for TTS', { ssmlLength: finalSSML.length })

    // TODO: Implement actual TTS API call
    // For now, simulate TTS generation
    const ttsResult = await generateTTSPlaceholder(finalSSML, analysisId, perFeedbackItem, logger)

    // Store results in database
    if (analysisId) {
      try {
        await updateAnalysisResults(supabase, analysisId, {
          text_report: analysisData?.textReport || 'TTS generation completed',
          feedback: analysisData?.feedback || [],
          summary_text: 'Audio feedback generated',
          ssml: finalSSML,
          audio_url: ttsResult.audioUrl,
          processing_time: 0,
          video_source: 'tts_generation'
        }, null, 0, 'tts', logger)
        logger.info('Stored TTS results in database', { analysisId })
      } catch (dbError) {
        logger.error('Failed to store TTS results', dbError)
        // Continue - TTS was successful even if DB update failed
      }
    }

    return new Response(
      JSON.stringify(ttsResult),
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
function isValidSSML(ssml: string): boolean {
  const trimmed = ssml.trim()
  return trimmed.startsWith('<speak>') && trimmed.endsWith('</speak>')
}

/**
 * Wrap content in speak tags if missing
 */
function wrapInSpeakTags(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('<speak>')) {
    content = `<speak>${content}`
  }
  if (!trimmed.endsWith('</speak>')) {
    content = `${content}</speak>`
  }
  return content
}
