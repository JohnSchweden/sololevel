/**
 * Video analysis prompts for AI coaching
 * Includes Gemini 2.5 and Qwen analysis templates
 * Migrated from Python prompts.py with enhanced TypeScript support
 */

import { createTemplateRenderer } from './templates'
import { GeminiAnalysisParams, QwenAnalysisParams, VideoAnalysisParams } from './types'

// Gemini Analysis Prompt Template (migrated from Python)
export const GEMINI_ANALYSIS_PROMPT_TEMPLATE = `
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
