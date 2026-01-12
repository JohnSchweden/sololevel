/**
 * Gemini LLM Analysis Types and Validation
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../logger.ts'
import type { VoiceConfigPromptParams } from '../types/voice-config.ts'

const _logger = createLogger('gemini-types')

/**
 * Feedback item structure
 */
export interface FeedbackItem {
  timestamp: number
  category: 'Movement' | 'Posture' | 'Speech' | 'Vocal Variety'
  message: string
  confidence: number
  impact: number
}

/**
 * Gemini video analysis result structure
 */
export interface GeminiVideoAnalysisResult {
  textReport: string // Big Picture + Table + Bonus
  feedback: FeedbackItem[] // Structured feedback items
  metrics?: {
    posture: number
    movement: number
    overall: number
  }
  confidence: number
  rawResponse?: Record<string, unknown> // For debugging
  rawText?: string // Raw text output from the LLM
  promptUsed?: string // The actual prompt string sent to the LLM
  jsonData?: any // Parsed JSON block from JSON DATA START/END
  title?: string // Concise roast title for the analysis (max 60 characters)
}

/**
 * Analysis parameters for video processing
 */
export interface VideoAnalysisParams {
  duration?: number
  startTime?: number
  endTime?: number
  feedbackCount?: number
  targetTimestamps?: number[]
  minGap?: number
  firstTimestamp?: number
  /** Optional voice configuration for dynamic prompt injection */
  voiceConfig?: VoiceConfigPromptParams
}

/**
 * Safe validation for feedback list
 * Filters out invalid items and ensures type safety
 */
export function safeValidateFeedbackList(feedback: unknown[]): FeedbackItem[] {
  return feedback
    .filter((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const obj = item as Record<string, unknown>
      return (
        typeof obj.timestamp === 'number' &&
        typeof obj.category === 'string' &&
        typeof obj.message === 'string' &&
        typeof obj.confidence === 'number' &&
        typeof obj.impact === 'number' &&
        obj.confidence >= 0 &&
        obj.confidence <= 1 &&
        obj.impact >= 0 &&
        obj.impact <= 1
      )
    })
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        timestamp: obj.timestamp as number,
        category: obj.category as FeedbackItem['category'],
        message: obj.message as string,
        confidence: obj.confidence as number,
        impact: obj.impact as number,
      }
    })
}

/**
 * Validate a single feedback item
 */
export function validateFeedbackItem(item: unknown): item is FeedbackItem {
  if (typeof item !== 'object' || item === null) return false

  const obj = item as Record<string, unknown>
  return (
    typeof obj.timestamp === 'number' &&
    typeof obj.category === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.confidence === 'number' &&
    typeof obj.impact === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1 &&
    obj.impact >= 0 &&
    obj.impact <= 1 &&
    ['Movement', 'Posture', 'Speech', 'Vocal Variety'].includes(obj.category)
  )
}

/**
 * Validate GeminiVideoAnalysisResult
 */
export function validateGeminiVideoAnalysisResult(
  result: unknown
): result is GeminiVideoAnalysisResult {
  if (typeof result !== 'object' || result === null) return false

  const obj = result as Record<string, unknown>
  return (
    typeof obj.textReport === 'string' &&
    Array.isArray(obj.feedback) &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1 &&
    obj.feedback.every(validateFeedbackItem) &&
    (!obj.metrics ||
      (typeof obj.metrics === 'object' &&
        typeof (obj.metrics as any).posture === 'number' &&
        typeof (obj.metrics as any).movement === 'number' &&
        typeof (obj.metrics as any).overall === 'number'))
  )
}
