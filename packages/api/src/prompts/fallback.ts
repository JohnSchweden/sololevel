/**
 * Fallback analysis prompts for error handling and basic analysis
 * Migrated from Python prompts.py with TypeScript types
 */

import { createTemplateRenderer } from './templates'
import { FallbackAnalysisParams } from './types'

// Fallback Analysis Template (migrated from Python)
export const FALLBACK_ANALYSIS_TEMPLATE = `Analyze this video presentation and provide constructive feedback on:
{analysis_categories}

Provide {feedback_count} specific, actionable tips in JSON format.`

// Default categories for fallback analysis
export const DEFAULT_ANALYSIS_CATEGORIES = [
  '1. Body language and posture',
  '2. Speech clarity and pacing',
  '3. Overall presentation effectiveness',
]

// Default fallback parameters
const FALLBACK_DEFAULTS = {
  analysis_categories: DEFAULT_ANALYSIS_CATEGORIES.map((cat) => `- ${cat}`).join('\n'),
  feedback_count: 3,
}

// Template renderer with validation
const fallbackTemplateRenderer = createTemplateRenderer(
  FALLBACK_ANALYSIS_TEMPLATE,
  FALLBACK_DEFAULTS,
  [], // No required fields - all have defaults
  true // Enable validation
)

/**
 * Generate fallback analysis prompt with custom categories
 */
export function getFallbackAnalysisPrompt(params: FallbackAnalysisParams = {}): string {
  // Format categories if provided
  const formattedParams: any = { ...params }
  if (params.categories && params.categories.length > 0) {
    formattedParams.analysis_categories = params.categories.map((cat) => `- ${cat}`).join('\n')
  }

  return fallbackTemplateRenderer(formattedParams)
}

/**
 * Generate basic fallback prompt with default categories
 */
export function getBasicFallbackPrompt(): string {
  return getFallbackAnalysisPrompt()
}

/**
 * Generate fallback prompt with custom feedback count
 */
export function getFallbackPromptWithCount(_feedbackCount: number): string {
  // Note: feedbackCount parameter reserved for future use
  return getFallbackAnalysisPrompt({ categories: DEFAULT_ANALYSIS_CATEGORIES })
}

// Export templates and defaults
export const FALLBACK_PROMPTS = {
  TEMPLATE: FALLBACK_ANALYSIS_TEMPLATE,
  DEFAULT_CATEGORIES: DEFAULT_ANALYSIS_CATEGORIES,
  DEFAULTS: FALLBACK_DEFAULTS,
} as const
