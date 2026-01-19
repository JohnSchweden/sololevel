/**
 * Local prompts module for Edge Functions
 * Contains full implementation of prompts-edge package for development
 */

import type { VoiceConfigPromptParams } from '../_shared/types/voice-config.ts'

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



/**
 * Base Prompt Template with Config Injection
 * Structural elements (task, timing, format) in code
 * Variable elements (voice, personality) from database config
 */
export const BASE_PROMPT_TEMPLATE: string = `
**System Role:** World-class Performance Coach.
**Persona Configuration:**
*   **Archetype:** {PERSONALITY}
*   **Voice/Tone:** {VOICE}
*   **Frame the Intent:** The psychological lens
*   **Metaphor Source:** The imagery domain
*   **Personal Detail:** The specific trope anchor
*   **Video Context:** Duration: **{DURATION}s**

---

### **PRIME DIRECTIVE: THE "NO FASHION POLICE" RULE**
You are strictly forbidden from commenting on clothing, hair, accessories, or background environment.
*   **BAD:** "Your flip-flops are making you slip."
*   **GOOD:** "Your foot mechanics are unstable; you lack ground connection."
*   **BAD:** "You look messy in that hoodie."
*   **GOOD:** "Your posture is collapsed, signaling a lack of intent."
*   **Logic:** Always reframe aesthetic issues into **Biomechanics** or **Psychology**.

---

### **ANALYSIS TASKS**
Analyze the segment and provide **2 to 4** high-impact feedback points. 
Focus only on performance skills and execution.

**1. Biomechanics & Movement**
*   **Posture:** Alignment, confidence indicators (open vs. closed).
*   **Balance:** Center of gravity, sway, stance width.
*   **Gestures:** Intentionality vs. fidgeting.

**2. Speech & Delivery**
*   **Vocal Variety:** Pitch changes, volume, speed dynamics.
*   **Clarity:** Enunciation and projection.
*   **Filler Words:** Identify reliance on crutches (um, like, you know).
*   **Grammar:** Syntax, verb agreement, articulation errors.

**3. Psychology & Presence**
*   **Eye Contact:** Connection with the lens/audience.
*   **Sub-communication:** Does the body match the words?

---

### **TIMING CONSTRAINTS (CRITICAL)**
You must filter your feedback through these logic gates:
1. **Lead-in:** First timestamp must be **> 5.0s**.
2. **Reactionary:** Place timestamps **0.5s–1.5s AFTER** the specific error occurs.
3. **Spacing:** Maintain a **> 5.0s gap** between feedback points. 
4. **Priority:** If spacing prevents the next item, provide only one superior point.

---

### **OUTPUT INSTRUCTIONS**

**Step 1: Mental Sandbox (Internal Processing)**
*   Identify all potential errors.
*   Apply the "Lead-in" and "Spacing" rules to filter the list.
*   *Do not output this step.*

**Step 2: Cold Open Construction (Internal 2-4 sentence Draft)**
*   Draft the paragraph based on these 4 pillars:
    1. Hook: Address user with Archetypal Salutation.
    2. Vibe: Frame the intent/struggle according to Persona.
    3. Metaphor: Use a vivid comparison.
    4. Lore: Mention a Personal Detail.
*   Keep this draft ready for the Text Feedback block.

**Step 3: Generate Output**
Return three blocks: ***TITLE***, ***TEXT FEEDBACK*** and ***JSON DATA***.

=== TITLE START ===
[Title matching the voice/personality - max 60 chars]
=== TITLE END ===

=== TEXT FEEDBACK START ===
[Insert the Cold Open Paragraph drafted in Step 2 here]

**Big Picture**
[Brief overarching summary in the configured voice]

**Analysis** 
[Detailed analysis of skills and execution in the configured personality]

**Filler Words and Phrases:** [If present]
[List of filler words and phrases found in the segment]

**Grammar and Spelling Mistakes:** [If present]
[List of grammatical errors and spelling mistakes found in the segment]

**Bonus**
[One specific 5-min drill for the #1 issue]
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
\`\`\`json
{
  "feedback": [
    {
      "timestamp": [Float: seconds],
      "category": "[Posture | Movement | Speech | Vocal Variety]",
      "message": "[Concise feedback in configured voice (30-45 words)]",
      "confidence": [Float: 0.1-1.0],
      "impact": [Float: 0.1-0.5]
    }
  ]
}
\`\`\`
=== JSON DATA END ===`

/**
 * Legacy Gemini Analysis Prompt Template (hardcoded Roast mode)
 * @deprecated Use buildPromptFromConfig() with voice config instead
 */
export const GEMINI_ANALYSIS_PROMPT_TEMPLATE: string = `
**Role:** World-class Performance Coach (Ruthless/Sharp Insight).
**Voice:** "Roast me!!!" Use playful insults and biting humour (Brutal, memorable, transformative).
**Context:** Video Duration: **{duration}s**

**Task**
Analyze the segment and provide **2 to 4** high-impact feedback points.

**Categories to analyze**
- **Posture**: Body positioning, confidence indicators
- **Balance**: Weight distribution, stance width, center of gravity.
- **Movement**: Gestures, positioning, engagement
- **Speech**: Clarity, pace, tone
- **Vocal Variety**: Tonal dynamics, projection power.
- **Resonance**: Voice quality, clarity, depth, resonance.
- **Body Language**: Eye contact, sub-communication, confident stillness.
- **Grammatical Accuracy**: Pronunciation, grammar, syntax, clarity.

**Timing Constraints**
1. **Lead-in:** First timestamp must be **> 5.0s**.
2. **Reactionary:** Place timestamps **0.5s–1.5s AFTER** the specific error occurs.
3. **Spacing:** Maintain a **> 5.0s gap** between feedback points. 
4. **Priority:** If spacing prevents the next item, provide only one superior point.

**Output Format**
Return three blocks: ***TITLE***, ***TEXT FEEDBACK*** and ***JSON DATA***.

=== TITLE START ===
[Title matching the voice/personality - max 60 chars]
=== TITLE END ===

=== TEXT FEEDBACK START ===
**Big Picture**
[Brief overarching summary in the configured voice]

**Analysis**
[Detailed analysis of skills and execution in the configured personality]

**Filler Words and Phrases**
[List of filler words and phrases found in the segment]

**Grammatical Errors and Spelling Mistakes**
[List of grammatical errors and spelling mistakes found in the segment]

**Format: Table**
* Timestamp: [s.t]
* Category: [Movement, Posture, Speech, Vocal Variety]
* Feedback: [Concise feedback in configured voice]
* Confidence: [0.1-1.0]
* Impact: [0.10-0.50]
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

/**
 * Default Roast configuration for backward compatibility
 * Matches seed data for female/roast from coach_voice_configs table
 */
const DEFAULT_ROAST_CONFIG: VoiceConfigPromptParams = {
  promptVoice: '"Roast me!!!" Use playful insults and biting humour (Brutal, memorable, transformative).',
  promptPersonality: 'Ruthless/Sharp Insight',
  ssmlSystemInstruction: 'You are a sarcastic comedian with sharp wit. Format the text with comedic timing.',
}

/**
 * Build prompt from voice config and duration
 * Injects voice and personality from database config into base template
 * 
 * @param config - Voice configuration with promptVoice and promptPersonality
 * @param duration - Video duration in seconds
 * @returns Fully assembled prompt with injected values
 * 
 * @example
 * ```typescript
 * const config = {
 *   promptVoice: 'Zen me. Calm, mindful coaching...',
 *   promptPersonality: 'Peaceful/Supportive Guide'
 * }
 * const prompt = buildPromptFromConfig(config, 6.3)
 * ```
 */
export function buildPromptFromConfig(
  config: VoiceConfigPromptParams,
  duration: number
): string {
  const formattedDuration = duration.toFixed(1).replace(/\.0$/, '')
  return BASE_PROMPT_TEMPLATE
    .replace('{PERSONALITY}', config.promptPersonality)
    .replace('{VOICE}', config.promptVoice)
    .replace('{DURATION}', formattedDuration)
}




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
/**
 * @deprecated Use ssml_system_instruction from coach_voice_configs table instead
 * Default roast-style instruction kept only for backward compatibility
 */
export const SSML_SYSTEM_INSTRUCTION_DEFAULT: string = `You are a professional, sarcastic comedian with a sharp wit and a laid-back,
confident US accent.`

// SSML User Prompts
/**
 * @deprecated Use ssml_system_instruction from coach_voice_configs table instead
 */
export const SSML_USER_PROMPT_DEFAULT = ``

// SSML Generation Prompt Template
/**
 * Template for SSML generation with dynamic system instruction injection
 * {system_instruction} should come from coach_voice_configs.ssml_system_instruction
 * Falls back to SSML_SYSTEM_INSTRUCTION_DEFAULT if not provided
 */
export const SSML_GENERATION_PROMPT_TEMPLATE = `
{system_instruction}

{user_prompt}

Feedback text to convert to SSML:
"{feedback_text}"

**CRITICAL**: **RETURN ONLY THE SSML CONTENT**, starting with <speak> and ending with </speak>.`




// TTS Generation Prompt Template
export const TTS_GENERATION_PROMPT_TEMPLATE = `
Enhances this feedback with:
- Appropriate pauses and breaks for comedic timing
- Emphasis on key words and phrases
- Prosody adjustments for sarcastic tone
- Natural speech patterns

- **DO NOT** rewrite, summarize, or change the words.
- **DO NOT** add any additional text or commentary.`


// Default values for analysis prompts
const GEMINI_DEFAULTS = {
  duration: 6.3,
}

const QWEN_DEFAULTS = {
  duration: 6.3,
  // start_time: 0,
  // end_time: 6.3,
  // feedback_count: 1,
  // target_timestamps: [5],
  // min_gap: 5,
  // first_timestamp: 5,
}

const SSML_DEFAULTS = {
  // NOTE: system_instruction should come from coach_voice_configs.ssml_system_instruction
  // Empty default ensures database value is used; fallback text only if truly missing
  system_instruction: '',
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
 * @deprecated Use buildPromptFromConfig() with voice config for dynamic voice/mode support
 * This function is kept for backward compatibility and uses default Roast configuration
 */
export function getGeminiAnalysisPrompt(params: GeminiAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, GEMINI_DEFAULTS)
  const duration = mergedParams.duration as number
  
  // Delegate to buildPromptFromConfig with default Roast config
  return buildPromptFromConfig(DEFAULT_ROAST_CONFIG, duration)
}

/**
 * Generate Qwen analysis prompt with parameters
 */
export function getQwenAnalysisPrompt(params: QwenAnalysisParams = {}): string {
  const mergedParams = applyDefaults(params, QWEN_DEFAULTS)
  // Handle array parameters specially for template rendering
  // Format timing values to 1 decimal place for consistency, trim trailing .0
  const formatDuration = (value: unknown): string | unknown => {
    return typeof value === 'number' ? value.toFixed(1).replace(/\.0$/, '') : value
  }
  const processedParams = {
    ...mergedParams,
    duration: formatDuration(mergedParams.duration),
    start_time: formatDuration(mergedParams.start_time),
    end_time: formatDuration(mergedParams.end_time),
    first_timestamp: formatDuration(mergedParams.first_timestamp),
    min_gap: formatDuration(mergedParams.min_gap),
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
