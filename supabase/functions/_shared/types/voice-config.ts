/**
 * Voice Configuration Types for Edge Functions
 * Deno-compatible types for voice/personality prompt injection
 */

/**
 * Voice configuration prompt parameters
 * Contains only the variable parts for prompt template injection
 * Structural parts (task, timing, format) remain in code
 */
export interface VoiceConfigPromptParams {
  /** Voice directive for feedback generation (e.g., "Roast me!!! Use playful insults...") */
  promptVoice: string
  
  /** Personality description for LLM (e.g., "Ruthless/Sharp Insight with...") */
  promptPersonality: string
  
  /** SSML formatting instruction for speech synthesis (e.g., "Use comedic timing...") */
  ssmlSystemInstruction: string
}

