/**
 * Gemini Response Parsing and Metrics Extraction
 */

import { createLogger } from '../logger.ts'
import type { FeedbackItem } from './types.ts'
import { safeValidateFeedbackList } from './types.ts'

const logger = createLogger('gemini-parse')

/**
 * Extract metrics from text report or return defaults
 */
export function extractMetricsFromText(textReport: string): {
  posture: number
  movement: number
  overall: number
} {
  // Try to extract metrics from text report
  const postureMatch = textReport.match(/posture[^-0-9]*(-?[0-9]{1,3})/i)
  const movementMatch = textReport.match(/movement[^-0-9]*(-?[0-9]{1,3})/i)
  const overallMatch = textReport.match(/overall[^-0-9]*(-?[0-9]{1,3})/i)

  return {
    posture:
      postureMatch && postureMatch[1]
        ? Math.min(100, Math.max(0, Number.parseInt(postureMatch[1])))
        : 75,
    movement:
      movementMatch && movementMatch[1]
        ? Math.min(100, Math.max(0, Number.parseInt(movementMatch[1])))
        : 80,
    overall:
      overallMatch && overallMatch[1]
        ? Math.min(100, Math.max(0, Number.parseInt(overallMatch[1])))
        : 77,
  }
}

/**
 * Parse Gemini response containing both text report and JSON feedback
 */
export function parseDualOutput(responseText: string): {
  textReport: string
  feedback: FeedbackItem[]
  metrics: any
} {
  let textReport = ''
  let feedback: FeedbackItem[] = []
  let metrics: any = {}

  // Preferred format: === TEXT REPORT START/END ===
  const reportMatchNew = responseText.match(
    /===\s*TEXT REPORT START\s*===\s*([\s\S]*?)===\s*TEXT REPORT END\s*===/i
  )
  if (reportMatchNew && reportMatchNew[1]) {
    textReport = reportMatchNew[1].trim()
  } else {
    // Legacy format: --- ANALYSIS REPORT: ... FEEDBACK JSON:
    const reportMatchLegacy = responseText.match(
      /---\s*ANALYSIS REPORT:\s*([\s\S]*?)(?=FEEDBACK JSON:|$)/i
    )
    if (reportMatchLegacy && reportMatchLegacy[1]) {
      textReport = reportMatchLegacy[1].trim()
    } else {
      textReport = responseText.split('---')[0]?.trim() || responseText.trim()
    }
  }

  // Preferred feedback JSON block: === JSON DATA START/END === with fenced code
  const jsonBlockMatch = responseText.match(
    /===\s*JSON DATA START\s*===\s*([\s\S]*?)===\s*JSON DATA END\s*===/i
  )
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      const block = jsonBlockMatch[1].replace(/```json\s*|```/g, '').trim()
      const parsed = JSON.parse(block)
      const list = Array.isArray(parsed) ? parsed : parsed.feedback || []
      const validated = safeValidateFeedbackList(list)
      if (validated.length > 0) {
        feedback = validated
        logger.info(`Parsed feedback items (new format): ${feedback.length}`)
      }
    } catch (error) {
      logger.error('Failed to parse JSON DATA block', error)
    }
  } else {
    // Legacy feedback block: FEEDBACK JSON:
    const feedbackMatch = responseText.match(/FEEDBACK JSON:\s*([\s\S]*?)(?=METRICS JSON:|$)/i)
    if (feedbackMatch && feedbackMatch[1]) {
      try {
        const feedbackText = feedbackMatch[1].trim()
        const cleanJson = feedbackText.replace(/```json\s*|\s*```/g, '').trim()
        const jsonData = JSON.parse(cleanJson)
        const validatedFeedback = safeValidateFeedbackList(jsonData)
        if (validatedFeedback && validatedFeedback.length > 0) {
          feedback = validatedFeedback
          logger.info(
            `Successfully parsed ${feedback.length} feedback items from Gemini response (legacy)`
          )
        }
      } catch (error) {
        logger.error('Failed to parse feedback JSON (legacy)', error)
      }
    }
  }

  // Metrics optional: try to extract if present in either format
  const metricsMatch = responseText.match(/METRICS JSON:\s*([\s\S]*?)---/i)
  if (metricsMatch && metricsMatch[1]) {
    try {
      const metricsText = metricsMatch[1].trim()
      const cleanJson = metricsText.replace(/```json\s*|\s*```/g, '').trim()
      metrics = JSON.parse(cleanJson)
      logger.info('Successfully parsed metrics from Gemini response')
    } catch (error) {
      logger.error('Failed to parse metrics JSON', error)
    }
  }

  return { textReport, feedback, metrics }
}
