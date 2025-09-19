/**
 * Gemini SSML Feedback Generation for Speech Synthesis
 * Generates SSML markup from structured feedback items
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('gemini-ssml-feedback')

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

/**
 * Generate SSML from individual feedback messages
 * Uses structured feedback items instead of unstructured text
 */
export function generateSSMLFromFeedback(analysis: GeminiAnalysisResult): string {
  try {
    let ssmlContent = '<speak>'

    // Add overall performance summary
    if (analysis.metrics?.overall) {
      ssmlContent += `<prosody rate="slow" pitch="+2st">Overall performance: ${analysis.metrics.overall} out of 100.</prosody><break time="500ms"/>`
    }

    // Generate SSML from each feedback item
    if (analysis.feedback && Array.isArray(analysis.feedback)) {
      analysis.feedback.forEach((item: FeedbackItem, index: number) => {
        const message = item.message || 'Keep up the good work!'

        // Add emphasis based on impact score
        const emphasis = item.impact > 0.7 ? 'strong' : item.impact > 0.5 ? 'moderate' : 'reduced'
        const rate = item.confidence > 0.8 ? 'fast' : 'medium'

        ssmlContent += `<prosody rate="${rate}" volume="${emphasis}">${message}</prosody>`

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

    logger.info(`Generated SSML from ${analysis.feedback?.length || 0} feedback items`)
    return ssmlContent
  } catch (error) {
    logger.warn('Failed to generate SSML from feedback items, using fallback', error)

    // Fallback SSML generation
    return '<speak><prosody rate="medium">Analysis completed successfully.</prosody><break time="300ms"/><prosody volume="moderate">Keep up the great work!</prosody></speak>'
  }
}

/**
 * Generate basic SSML from text (fallback function)
 */
export function generateBasicSSML(text: string): string {
  try {
    logger.info(`Generating basic SSML from text: ${text.substring(0, 50)}...`)
    return `<speak><prosody rate="medium">${text}</prosody></speak>`
  } catch (error) {
    logger.error('Failed to generate basic SSML', error)
    return '<speak>Analysis completed.</speak>'
  }
}

/**
 * Validate feedback items structure
 */
export function validateFeedbackItems(feedback: FeedbackItem[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(feedback)) {
    errors.push('Feedback must be an array')
    return { isValid: false, errors }
  }

  feedback.forEach((item, index) => {
    if (!item.message || typeof item.message !== 'string') {
      errors.push(`Feedback item ${index}: missing or invalid message`)
    }
    if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
      errors.push(`Feedback item ${index}: invalid confidence (must be 0-1)`)
    }
    if (typeof item.impact !== 'number' || item.impact < 0 || item.impact > 1) {
      errors.push(`Feedback item ${index}: invalid impact (must be 0-1)`)
    }
  })

  return { isValid: errors.length === 0, errors }
}
