/**
 * SSML (Speech Synthesis Markup Language) generation prompts
 * Migrated from Python prompts.py with TypeScript types and validation
 */

import { createTemplateRenderer } from './templates'
import { SSMLGenerationParams, SSMLTemplateParams } from './types'

// SSML System Instructions
export const SSML_SYSTEM_INSTRUCTION = ``
// `You use modern US slang and deliver punchlines with perfect
// comedic timing. Your purpose is to roast the user in a playful but biting manner.
// `

export const SSML_SYSTEM_INSTRUCTION_DEFAULT = `You are a professional, sarcastic comedian with a sharp wit and a laid-back,
confident US accent. ${SSML_SYSTEM_INSTRUCTION}`

// SSML User Prompts
export const SSML_USER_PROMPT_DEFAULT = ``
// `Generate an SSML text with wider ranges for pitch and rate to emphasise key words
// and phrases, use natural speech patterns, add appropriate pauses and breaks for
// comedic timing, and more dynamic changes in volume.`

// SSML Generation PromptTemplate
export const SSML_GENERATION_PROMPT_TEMPLATE = `
{system_instruction}

{user_prompt}

Feedback text to convert to SSML:
"{feedback_text}"

**CRITICAL:** Convert the provided feedback text to SSML. **DO NOT** rewrite, summarize, or change the words.

Your task:
1. Use the text exactly as provided.
2. Add SSML markup that enhances the delivery with:
   - Appropriate pauses (<break>) for comedic timing
   - Emphasis (<emphasis>) on key roast words
   - Prosody (<prosody>) adjustments for sarcasm and speed

Return only the SSML content with Max 200 characters, starting with <speak> and ending with </speak>.`

// Template renderer with defaults
const ssmlTemplateRenderer = createTemplateRenderer(
  SSML_GENERATION_PROMPT_TEMPLATE,
  {
    system_instruction: SSML_SYSTEM_INSTRUCTION_DEFAULT,
    user_prompt: SSML_USER_PROMPT_DEFAULT,
  },
  ['feedback_text'], // Required fields
  true // Enable validation
)

/**
 * Generate SSML generation prompt with custom or default parameters
 */
export function getSSMLGenerationPrompt(params: SSMLGenerationParams): string {
  return ssmlTemplateRenderer(params)
}

/**
 * Generate SSML template with full control over all parameters
 */
export function getSSMLTemplate(params: SSMLTemplateParams): string {
  return ssmlTemplateRenderer(params)
}

// Export individual components for flexibility
export const SSML_PROMPTS = {
  SYSTEM_INSTRUCTION: SSML_SYSTEM_INSTRUCTION,
  SYSTEM_INSTRUCTION_DEFAULT: SSML_SYSTEM_INSTRUCTION_DEFAULT,
  USER_PROMPT_DEFAULT: SSML_USER_PROMPT_DEFAULT,
  GENERATION_TEMPLATE: SSML_GENERATION_PROMPT_TEMPLATE,
} as const
