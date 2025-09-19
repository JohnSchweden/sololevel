/**
 * Centralized AI Prompt Management System
 * Main entry point for all prompt templates and utilities
 */

// Import logger utility
import { log } from '@my/logging'

// Export types (excluding ValidationResult to avoid naming conflicts)
export type {
  SSMLTemplateParams,
  SSMLGenerationParams,
  VideoAnalysisParams,
  GeminiAnalysisParams,
  QwenAnalysisParams,
  FallbackAnalysisParams,
  TemplateContext,
  PromptTemplate,
  PromptManagerConfig,
} from './types'

// Export template utilities
export * from './templates'

// Export prompt modules
export * from './ssml'
export * from './analysis'
export * from './fallback'

// Re-export commonly used functions for convenience
export {
  getSSMLGenerationPrompt,
  getSSMLTemplate,
  SSML_PROMPTS,
} from './ssml'

export {
  getGeminiAnalysisPrompt,
  getQwenAnalysisPrompt,
  getVideoAnalysisPrompt,
  ANALYSIS_PROMPTS,
} from './analysis'

export {
  getFallbackAnalysisPrompt,
  getBasicFallbackPrompt,
  FALLBACK_PROMPTS,
} from './fallback'

import { getGeminiAnalysisPrompt, getQwenAnalysisPrompt } from './analysis'
import { getFallbackAnalysisPrompt } from './fallback'
// Import all prompt functions for the manager
import { getSSMLGenerationPrompt } from './ssml'
import { PromptManagerConfig } from './types'

/**
 * Centralized Prompt Manager Class
 * Provides a unified interface for all AI prompt generation
 */
export class PromptManager {
  private config: PromptManagerConfig

  constructor(config: Partial<PromptManagerConfig> = {}) {
    this.config = {
      enableValidation: true,
      throwOnValidationError: true,
      logWarnings: true,
      ...config,
    }
  }

  /**
   * Generate SSML prompt for text-to-speech conversion
   */
  generateSSMLPrompt(feedbackText: string, customParams?: any) {
    try {
      return getSSMLGenerationPrompt({
        feedback_text: feedbackText,
        ...customParams,
      })
    } catch (error) {
      if (this.config.throwOnValidationError) {
        throw error
      }
      if (this.config.logWarnings) {
        log.warn('SSML Prompt generation failed', { error, feedbackText })
      }
      return this.getFallbackSSMLPrompt(feedbackText)
    }
  }

  /**
   * Generate video analysis prompt using Gemini
   */
  generateGeminiAnalysisPrompt(params: any) {
    try {
      return getGeminiAnalysisPrompt(params)
    } catch (error) {
      if (this.config.throwOnValidationError) {
        throw error
      }
      if (this.config.logWarnings) {
        log.warn('Gemini analysis prompt generation failed', { error, params })
      }
      return this.getFallbackAnalysisPrompt()
    }
  }

  /**
   * Generate video analysis prompt using Qwen
   */
  generateQwenAnalysisPrompt(params: any) {
    try {
      return getQwenAnalysisPrompt(params)
    } catch (error) {
      if (this.config.throwOnValidationError) {
        throw error
      }
      if (this.config.logWarnings) {
        log.warn('Qwen analysis prompt generation failed', { error, params })
      }
      return this.getFallbackAnalysisPrompt()
    }
  }

  /**
   * Generate fallback analysis prompt
   */
  private getFallbackAnalysisPrompt() {
    return getFallbackAnalysisPrompt()
  }

  /**
   * Generate basic SSML prompt as fallback
   */
  private getFallbackSSMLPrompt(text: string) {
    return `<speak>${text}</speak>`
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PromptManagerConfig>) {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Default prompt manager instance
 */
export const promptManager = new PromptManager()

/**
 * Convenience functions using the default manager
 */
export const Prompts = {
  // SSML generation
  ssml: (feedbackText: string, params?: any) =>
    promptManager.generateSSMLPrompt(feedbackText, params),

  // Video analysis
  geminiAnalysis: (params: any) => promptManager.generateGeminiAnalysisPrompt(params),

  qwenAnalysis: (params: any) => promptManager.generateQwenAnalysisPrompt(params),

  // Fallback
  fallback: () => getFallbackAnalysisPrompt(),
}

// Export version information
export const PROMPT_VERSION = '1.0.0'
export const MIGRATION_DATE = '2025-01-19'
