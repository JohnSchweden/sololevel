/**
 * SSML (Speech Synthesis Markup Language) generation prompts
 * Migrated from Python prompts.py with TypeScript types and validation
 */

import { createTemplateRenderer } from './templates'
import { SSMLGenerationParams, SSMLTemplateParams } from './types'

// SSML System Instructions
export const SSML_SYSTEM_INSTRUCTION = `You use modern US slang and deliver punchlines with perfect
comedic timing. Your purpose is to roast the user in a playful but biting manner.`

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

**CRITICAL:** First, rewrite this feedback text in a roast tone using modern US slang, playful insults, and comedic punchlines. Then wrap it in SSML markup.

Your task:
1. Rewrite the feedback text to roast the user - use slang, playful insults, and biting humor
2. Add SSML markup that enhances the roast delivery with:
   - Appropriate pauses and breaks for comedic timing
   - Emphasis on key words and phrases (especially the roast parts)
   - Prosody adjustments for sarcastic/comedic tone
   - Natural speech patterns that match a comedian's delivery

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
