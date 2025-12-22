/**
 * Video analysis prompts for AI coaching
 * Includes Gemini 2.5 and Qwen analysis templates
 * Migrated from Python prompts.py with enhanced TypeScript support
 */

import { createTemplateRenderer } from './templates'
import { GeminiAnalysisParams, QwenAnalysisParams, VideoAnalysisParams } from './types'

// Gemini Analysis Prompt Template (migrated from Python)
export const GEMINI_ANALYSIS_PROMPT_TEMPLATE = `
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

// Qwen Analysis Prompt Template (migrated from Python)
export const QWEN_ANALYSIS_PROMPT_TEMPLATE = `You are an expert presentation coach analyzing a video segment.

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

// Template renderers with validation
const geminiTemplateRenderer = createTemplateRenderer(
  GEMINI_ANALYSIS_PROMPT_TEMPLATE,
  GEMINI_DEFAULTS,
  ['duration'], // duration is required
  true // Enable validation
)

const qwenTemplateRenderer = createTemplateRenderer(
  QWEN_ANALYSIS_PROMPT_TEMPLATE,
  QWEN_DEFAULTS,
  ['duration'], // duration is required
  true // Enable validation
)

/**
 * Generate Gemini analysis prompt with parameters
 */
export function getGeminiAnalysisPrompt(params: GeminiAnalysisParams): string {
  return geminiTemplateRenderer(params)
}

/**
 * Generate Qwen analysis prompt with parameters
 */
export function getQwenAnalysisPrompt(params: QwenAnalysisParams): string {
  return qwenTemplateRenderer(params)
}

/**
 * Generate generic video analysis prompt (fallback to Gemini)
 */
export function getVideoAnalysisPrompt(params: VideoAnalysisParams): string {
  return getGeminiAnalysisPrompt(params)
}

// Export templates and defaults for flexibility
export const ANALYSIS_PROMPTS = {
  GEMINI_TEMPLATE: GEMINI_ANALYSIS_PROMPT_TEMPLATE,
  QWEN_TEMPLATE: QWEN_ANALYSIS_PROMPT_TEMPLATE,
  GEMINI_DEFAULTS,
  QWEN_DEFAULTS,
} as const
