/**
 * TypeScript interfaces and types for AI prompt management
 * Centralized type definitions for all prompt parameters and configurations
 */

// SSML Generation Types
export interface SSMLTemplateParams {
  systemInstruction: string
  userPrompt: string
  feedbackText: string
}

export interface SSMLGenerationParams {
  system_instruction?: string
  user_prompt?: string
  feedback_text: string
}

// Video Analysis Types
export interface VideoAnalysisParams {
  duration: number
  start_time?: number
  end_time?: number
  feedback_count?: number
  target_timestamps?: number[]
  min_gap?: number
  first_timestamp?: number
}

export interface GeminiAnalysisParams extends VideoAnalysisParams {
  // Gemini-specific parameters can be added here
}

export interface QwenAnalysisParams extends VideoAnalysisParams {
  // Qwen-specific parameters can be added here
}

// Fallback Types
export interface FallbackAnalysisParams {
  categories?: string[]
}

// Template Rendering Types
export interface TemplateContext {
  [key: string]: any
}

export interface PromptTemplate {
  template: string
  defaults: Record<string, any>
  validate?: (params: any) => boolean
}

// Prompt Manager Types
export interface PromptManagerConfig {
  enableValidation: boolean
  throwOnValidationError: boolean
  logWarnings: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
