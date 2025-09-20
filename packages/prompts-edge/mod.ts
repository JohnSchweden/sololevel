/**
 * Edge-Safe Prompts Package for Supabase Edge Functions
 * Complete Deno-compatible prompts for AI analysis
 */

// Types for Edge Functions
export interface PromptItem {
  timestamp: number
  category: 'Movement' | 'Posture' | 'Speech' | 'Vocal Variety'
  message: string
  confidence: number
  impact: number
}

// Additional types for template parameters
export interface GeminiAnalysisParams extends Record<string, unknown> {
  duration?: number
  start_time?: number
  end_time?: number
  feedback_count?: number
  target_timestamps?: number[]
  min_gap?: number
  first_timestamp?: number
}

export interface QwenAnalysisParams extends Record<string, unknown> {
  duration?: number
  start_time?: number
  end_time?: number
  feedback_count?: number
  target_timestamps?: number[]
  min_gap?: number
  first_timestamp?: number
}

export interface SSMLGenerationParams extends Record<string, unknown> {
  feedback_text: string
  system_instruction?: string
  user_prompt?: string
}

// Simple template renderer for Deno (no external dependencies)
function renderTemplate(template: string, params: Record<string, unknown>): string {
  let result = template
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    result = result.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(value)
    )
  })
  return result
}

// Gemini Analysis Prompt Template (migrated from Python)
export const GEMINI_ANALYSIS_PROMPT_TEMPLATE: string = `
**Role**
A world-class analysis coach known for his sharp and memorable insights.

**Goal**
Level up my performance to reach the NEXT LEVEL and become the BEST!

**Task**
Provide nuanced and insightful feedback with ultimate aim to transform.

**Voice of Tone**
Roast me, motherfuckaaa!!!

**Video Duration: {duration} seconds**
**Chunk Window: {start_time}s → {end_time}s**

**Constraints**
- Identify the most crucial and impactful factors
- This segment duration: {duration} seconds
- Produce exactly: {feedback_count} feedback items for THIS segment
- Allowed timestamp range: [{start_time}s, {end_time}s]
- Do NOT place the first timestamp before {first_timestamp}s
- Prefer placing timestamps near these seconds within the chunk: {target_timestamps}
- Maintain a minimum spacing of {min_gap}s between consecutive items
- All timestamps MUST stay within [{start_time}s, {end_time}s]

**Output Format**
Create two distinct outputs with clear separators:

**=== TEXT REPORT START ===
[Your detailed analysis here]

**Big Picture**
Provide a brief, overarching summary of the core theme to tie all the feedback together.

**Format: Table**
    * Timestamp: s.t (The estimated time of the observation, within 0-{duration}s)
    * Category: "[Movement, Posture, Speech, Vocal Variety]",
    * Feedback: "[Concise and Actionable],
    * Confidence: <0.7-1.0> (Your certainty that this is the correct analysis),
    * Impact: 0.30 (The estimated percentage improvement this single change would have on the overall effectiveness)

**Bonus**
Suggest **one specific, practical drill** I can practice for 5 minutes a day this week to improve on the #1 highest-impact feedback point.
=== TEXT REPORT END ===**

**=== JSON DATA START ===
\`\`\`json
{{
    "feedback": [
        {{
            "timestamp": s.t (Place within {start_time}-{end_time}s, not before {first_timestamp}s),
            "category": "[Movement, Posture, Speech, Vocal Variety]",
            "message": "[Concise and Actionable],
            "confidence": 0.7-1.0 (Your certainty that this is the correct analysis),
            "impact": 0.30 (The estimated percentage improvement this single change would have on the overall effectiveness)
        }}
    ]
}}
\`\`\`
=== JSON DATA END ===**

**Important**: Output EXACTLY {feedback_count} items. All timestamps must be between {start_time} and {end_time} seconds.`

// Qwen Analysis Prompt Template
export const QWEN_ANALYSIS_PROMPT_TEMPLATE: string = `You are an expert presentation coach analyzing a video segment.

**Your Role:**
- Provide specific, actionable feedback
- Focus on presentation skills, body language, and communication
- Be direct and constructive

**Analysis Guidelines:**
- Identify 2-3 key improvement areas
- Provide specific, actionable advice
- Consider timing and context
- Focus on high-impact changes

**Categories to analyze:**
- **Posture**: Body positioning, confidence indicators
- **Movement**: Gestures, positioning, engagement
- **Speech**: Clarity, pace, tone
- **General**: Overall presentation effectiveness

Provide feedback in this exact JSON format:
{{
    "feedback": [
        {{
            "timestamp": s.t,
            "category": "posture|movement|speech|general",
            "message": "One specific, actionable tip (max 50 words)",
            "confidence": <0.7-1.0>,
            "impact": 0.30
        }}
    ]
}}

Guidelines:
- Segment duration: {duration} seconds (from {start_time}s to {end_time}s)
- Produce exactly {feedback_count} feedback items for THIS segment
- Use timestamps within [{start_time}s, {end_time}s]; do NOT place the first timestamp before {first_timestamp}s
- Maintain a minimum spacing of {min_gap}s between consecutive items
- Prefer placing timestamps near these seconds within the chunk: {target_timestamps}
- Keep messages short and specific
- Vary confidence scores based on certainty
- Focus on actionable improvements

Analyze this video chunk from {start_time}s to {end_time}s (duration: {duration}s):`

// SSML System Instructions
export const SSML_SYSTEM_INSTRUCTION: string = `You use modern US slang and deliver punchlines with perfect
comedic timing. Your purpose is to roast the user in a playful but biting manner.`

export const SSML_SYSTEM_INSTRUCTION_DEFAULT: string = `You are a professional, sarcastic comedian with a sharp wit and a laid-back,
confident US accent. ${SSML_SYSTEM_INSTRUCTION}`

// SSML Generation Template
export const SSML_GENERATION_TEMPLATE: string = `
{system_instruction}

{user_prompt}

Feedback text to convert to SSML:
"{feedback_text}"

Please generate SSML markup that enhances this feedback with:
- Appropriate pauses and breaks for comedic timing
- Emphasis on key words and phrases
- Prosody adjustments for sarcastic tone
- Natural speech patterns

Return only the SSML content, starting with <speak> and ending with </speak>.`

// Default values for analysis prompts
const GEMINI_DEFAULTS = {
  duration: 30,
  start_time: 0,
  end_time: 30,
  feedback_count: 3,
  target_timestamps: [5, 15, 25],
  min_gap: 5,
  first_timestamp: 0,
}

const QWEN_DEFAULTS = {
  duration: 30,
  start_time: 0,
  end_time: 30,
  feedback_count: 3,
  target_timestamps: [5, 15, 25],
  min_gap: 5,
  first_timestamp: 0,
}

const SSML_DEFAULTS = {
  system_instruction: SSML_SYSTEM_INSTRUCTION_DEFAULT,
  user_prompt: '',
}

// Template rendering functions
function applyDefaults<T extends Record<string, unknown>>(
  params: T,
  defaults: Record<string, unknown>
): T & Record<string, unknown> {
  const result = { ...params }
  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (!(key in result) || result[key] === undefined || result[key] === null) {
      ;(result as Record<string, unknown>)[key] = defaultValue
    }
  })
  return result as T & Record<string, unknown>
}

/**
 * Generate Gemini analysis prompt with parameters
 */
export function getGeminiAnalysisPrompt(params: GeminiAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, GEMINI_DEFAULTS)
  // Handle array parameters specially for template rendering
  const processedParams = {
    ...mergedParams,
    target_timestamps: mergedParams.target_timestamps?.join(', ') || '5, 15, 25',
  }
  return renderTemplate(GEMINI_ANALYSIS_PROMPT_TEMPLATE, processedParams)
}

/**
 * Generate Qwen analysis prompt with parameters
 */
export function getQwenAnalysisPrompt(params: QwenAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, QWEN_DEFAULTS)
  // Handle array parameters specially for template rendering
  const processedParams = {
    ...mergedParams,
    target_timestamps: mergedParams.target_timestamps?.join(', ') || '5, 15, 25',
  }
  return renderTemplate(QWEN_ANALYSIS_PROMPT_TEMPLATE, processedParams)
}

/**
 * Generate SSML generation prompt with custom or default parameters
 */
export function getSSMLGenerationPrompt(params: SSMLGenerationParams): string {
  const mergedParams = applyDefaults(params, SSML_DEFAULTS)
  return renderTemplate(SSML_GENERATION_TEMPLATE, mergedParams)
}

/**
 * Generate SSML template with full control over all parameters
 */
export function getSSMLTemplate(params: SSMLGenerationParams): string {
  return getSSMLGenerationPrompt(params)
}

// Validation helpers
export function validatePromptItem(item: unknown): item is PromptItem {
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
}

export function safeValidateFeedbackList(feedback: unknown[]): PromptItem[] {
  return feedback.filter(validatePromptItem)
}
