/**
 * Gemini SSML Generation for Text-to-Speech
 * Generates SSML markup from structured analysis feedback
 */

import { createLogger } from '../logger.ts'
import { createValidatedGeminiConfig } from './config.ts'
import { type GenerateTextOnlyRequest, generateTextOnlyContent } from './generate.ts'

const logger = createLogger('gemini-ssml')

export interface FeedbackItem {
  timestamp: number
  category: 'Movement' | 'Posture' | 'Speech' | 'Vocal Variety'
  message: string
  confidence: number
  impact: number
}

export interface GeminiAnalysisResult {
  textReport: string
  feedback: FeedbackItem[]
  metrics?: {
    posture: number
    movement: number
    overall: number
  }
  confidence: number
}

export interface SSMLGenerationOptions {
  voice?: 'male' | 'female' | 'neutral'
  speed?: 'slow' | 'medium' | 'fast'
  emphasis?: 'strong' | 'moderate' | 'reduced'
  prompt?: string
}

/**
 * Generate SSML markup from structured feedback using Gemini
 * Returns both the SSML and the prompt used
 */
export async function generateSSMLFromStructuredFeedback(
  analysis: GeminiAnalysisResult,
  options: SSMLGenerationOptions = {}
): Promise<{ ssml: string; prompt: string }> {
  const config = createValidatedGeminiConfig()

  if (config.analysisMode === 'mock') {
    logger.info('SSML generation: mock mode - using fallback formatter')
    const ssml = generateSSMLFallback(analysis, options)
    return { ssml, prompt: 'mock-mode-no-prompt' }
  }

  try {
    const prompt = buildSSMLPrompt(analysis, options)

    const request: GenerateTextOnlyRequest = {
      prompt,
      temperature: 0.3, // Lower temperature for more consistent SSML structure
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }

    const generationResult = await generateTextOnlyContent(request, config)

    // Validate the generated SSML
    if (!isValidSSML(generationResult.text)) {
      logger.warn('Generated SSML is invalid, using fallback')
      const ssml = generateSSMLFallback(analysis, options)
      return { ssml, prompt }
    }

    logger.info(`Generated SSML: ${generationResult.text.length} characters`)
    return { ssml: generationResult.text, prompt }
  } catch (error) {
    logger.error('SSML generation failed, using fallback', error)
    const ssml = generateSSMLFallback(analysis, options)
    const prompt = buildSSMLPrompt(analysis, options)
    return { ssml, prompt }
  }
}

/**
 * Build prompt for SSML generation
 */
function buildSSMLPrompt(analysis: GeminiAnalysisResult, options: SSMLGenerationOptions): string {
  const { voice = 'neutral', speed = 'medium', emphasis = 'moderate', prompt: customPrompt } = options

  // Use custom prompt if provided (e.g., from prompts-local.ts)
  if (customPrompt) {
    return customPrompt
  }

  let generatedPrompt = `Generate SSML markup for text-to-speech from the following exercise analysis feedback.

Requirements:
- Use <speak> as root element
- Include <prosody> tags for rate, pitch, and volume adjustments
- Use <break> tags for natural pauses between feedback items
- Match voice characteristics: ${voice}
- Overall speed: ${speed}
- Emphasis level: ${emphasis}

Analysis Data:
`

  if (analysis.metrics) {
    generatedPrompt += `- Overall performance: ${analysis.metrics.overall}/100\n`
    generatedPrompt += `- Posture score: ${analysis.metrics.posture}/100\n`
    generatedPrompt += `- Movement score: ${analysis.metrics.movement}/100\n`
  }

  generatedPrompt += `\nFeedback items:\n`
  analysis.feedback.forEach((item, index) => {
    generatedPrompt += `${index + 1}. [${item.category}] ${item.message} (confidence: ${item.confidence}, impact: ${item.impact})\n`
  })

  generatedPrompt += `

Generate only the SSML markup, no explanations. Start with <speak> and end with </speak>.`

  return generatedPrompt
}

/**
 * Validate SSML structure
 */
function isValidSSML(ssml: string): boolean {
  try {
    // Basic validation - check for required elements
    const trimmed = ssml.trim()
    return trimmed.startsWith('<speak>') && trimmed.endsWith('</speak>')
  } catch {
    return false
  }
}

/**
 * Fallback SSML generation (same as existing gemini-ssml-feedback.ts)
 */
function generateSSMLFallback(
  analysis: GeminiAnalysisResult,
  options: SSMLGenerationOptions = {}
): string {
  const { speed = 'medium', emphasis: _emphasis = 'moderate' } = options

  try {
    let ssmlContent = '<speak>'

    // Add overall performance summary
    if (analysis.metrics?.overall) {
      const rate = speed === 'slow' ? 'slow' : speed === 'fast' ? 'fast' : 'medium'
      ssmlContent += `<prosody rate="${rate}" pitch="+2st">Overall performance: ${analysis.metrics.overall} out of 100.</prosody><break time="500ms"/>`
    }

    // Generate SSML from each feedback item
    if (analysis.feedback && Array.isArray(analysis.feedback)) {
      analysis.feedback.forEach((item: FeedbackItem, index: number) => {
        const message = item.message || 'Keep up the good work!'

        // Adjust prosody based on confidence and impact
        const rate = item.confidence > 0.8 ? 'fast' : 'medium'
        const volume = item.impact > 0.7 ? 'loud' : item.impact > 0.5 ? 'medium' : 'soft'

        ssmlContent += `<prosody rate="${rate}" volume="${volume}">${message}</prosody>`

        // Add pause between items (except for the last one)
        if (index < analysis.feedback.length - 1) {
          ssmlContent += '<break time="300ms"/>'
        }
      })
    } else {
      // Fallback for old format
      ssmlContent += 'Great analysis completed! Keep practicing for better results.'
    }

    ssmlContent += '</speak>'

    logger.info(`Generated fallback SSML from ${analysis.feedback?.length || 0} feedback items`)
    return ssmlContent
  } catch (error) {
    logger.warn('Failed to generate fallback SSML', error)

    // Ultimate fallback
    return '<speak><prosody rate="medium">Analysis completed successfully.</prosody><break time="300ms"/><prosody volume="moderate">Keep up the great work!</prosody></speak>'
  }
}
