/**
 * Local prompts module for Edge Functions
 * Contains full implementation of prompts-edge package for development
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
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
  })
  return result
}



// Gemini Analysis Prompt Template (migrated from Python)
export const GEMINI_ANALYSIS_PROMPT_TEMPLATE: string = `
**Role:** World-class Performance Coach (Ruthless/Sharp Insight).
**Voice:** "Roast me, motherfuckaaa!!!" Use playful insults and biting humour (Brutal, memorable, transformative).
**Context:** Video Duration: **{duration}s**

**Task**
Analyze the segment and provide **2 to 4** high-impact feedback points.

**Timing Constraints**
1. **Lead-in:** First timestamp must be **> 5.0s**.
2. **Reactionary:** Place timestamps **0.5s–1.5s AFTER** the specific error occurs.
3. **Spacing:** Maintain a **> 5.0s gap** between feedback points. 
4. **Priority:** If spacing prevents the next item, provide only one superior point.

**Output Format**
Return two blocks: **TEXT FEEDBACK** and **JSON DATA**.

=== TEXT FEEDBACK START ===
**Title Start**
[Humorous Roast Title - max 60 chars]
**Title End**

**Big Picture**
[Provide a brief, overarching summary of the core theme and issues]

**Analysis**
[Provide a very brief detailed analysis of good and poor actions]

**Format: Table**
* Timestamp: [s.t]
* Category: [Movement, Posture, Speech, Vocal Variety]
* Feedback: [Concise roast/correction describing the preceding action]
* Confidence: [0.7-1.0]
* Impact: [0.30]
*(Repeat for next item if applicable)*

**Bonus**
[One specific 5-min drill for the #1 issue]
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
\`\`\`json
{
  "feedback": [
    {
      "timestamp": 0.0,
      "category": "String",
      "message": "String",
      "confidence": 0.0,
      "impact": 0.0
    }
  ]
}
\`\`\`
=== JSON DATA END ===`




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
export const SSML_SYSTEM_INSTRUCTION = ``
// `You use modern US slang and deliver punchlines with perfect
// comedic timing. Your purpose is to roast the user in a playful but biting manner.
// `

export const SSML_SYSTEM_INSTRUCTION_DEFAULT: string = `You are a professional, sarcastic comedian with a sharp wit and a laid-back,
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




// TTS Generation Prompt Template
export const TTS_GENERATION_PROMPT_TEMPLATE = `
${SSML_SYSTEM_INSTRUCTION}
Enhances this feedback with:
- Appropriate pauses and breaks for comedic timing
- Emphasis on key words and phrases
- Prosody adjustments for sarcastic tone
- Natural speech patterns`




// Default values for analysis prompts
const GEMINI_DEFAULTS = {
  duration: 6.3,
  // Unused variables (commented out - new prompt template only uses duration):
  // start_time: 0,
  // end_time: 6.3,
  // feedback_count: 1,
  // target_timestamps: [5],
  // min_gap: 5,
  // first_timestamp: 5,
}

const QWEN_DEFAULTS = {
  duration: 6.3,
  start_time: 0,
  end_time: 6.3,
  feedback_count: 1,
  target_timestamps: [5],
  min_gap: 5,
  first_timestamp: 5,
}

const SSML_DEFAULTS = {
  system_instruction: SSML_SYSTEM_INSTRUCTION_DEFAULT,
  user_prompt: '',
}

// Template rendering functions
function applyDefaults<T extends Record<string, unknown>>(params: T, defaults: Record<string, unknown>): T & Record<string, unknown> {
  const result = { ...params }
  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (!(key in result) || result[key] === undefined || result[key] === null) {
      (result as Record<string, unknown>)[key] = defaultValue
    }
  })
  return result as T & Record<string, unknown>
}

/**
 * Generate Gemini analysis prompt with parameters
 */
export function getGeminiAnalysisPrompt(params: GeminiAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, GEMINI_DEFAULTS)
  // Note: New prompt template only uses {duration}, so no special array processing needed
  return renderTemplate(GEMINI_ANALYSIS_PROMPT_TEMPLATE, mergedParams)
}

/**
 * Generate Qwen analysis prompt with parameters
 */
export function getQwenAnalysisPrompt(params: QwenAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, QWEN_DEFAULTS)
  // Handle array parameters specially for template rendering
  const processedParams = {
    ...mergedParams,
    target_timestamps: mergedParams.target_timestamps?.join(', ') || '5, 15, 25'
  }
  return renderTemplate(QWEN_ANALYSIS_PROMPT_TEMPLATE, processedParams)
}


/**
 * Generate SSML generation prompt with custom or default parameters
 */
export function getSSMLGenerationPrompt(params: SSMLGenerationParams): string {
  const mergedParams = applyDefaults(params, SSML_DEFAULTS)
  return renderTemplate(SSML_GENERATION_PROMPT_TEMPLATE, mergedParams)
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
    obj.confidence >= 0 && obj.confidence <= 1 &&
    obj.impact >= 0 && obj.impact <= 1
  )
}

export function safeValidateFeedbackList(feedback: unknown[]): PromptItem[] {
  return feedback.filter(validatePromptItem)
}
