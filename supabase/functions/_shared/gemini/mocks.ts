/**
 * Mock responses for Gemini analysis testing
 */

import { getMockAudioBytes } from '../assets/mock-audio-assets.ts'
import { createLogger } from '../logger.ts'
import { AUDIO_FORMATS, type AudioFormat } from '../media/audio.ts'
import type { GeminiVideoAnalysisResult } from './types.ts'

const log = createLogger('GeminiMocks')

/**
 * Mock TTS audio data for testing (minimal MP3-like bytes)
 */
export const MOCK_TTS_MP3_BYTES = new Uint8Array([
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
])

/**
 * Mock WAV audio data for testing (minimal RIFF header)
 */
export const MOCK_TTS_WAV_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // Chunk size (36 bytes total)
  0x57, 0x41, 0x56, 0x45, // "WAVE"
  0x66, 0x6D, 0x74, 0x20, // "fmt "
  0x10, 0x00, 0x00, 0x00, // Subchunk1 size (16)
  0x01, 0x00,             // Audio format (PCM)
  0x01, 0x00,             // Num channels (mono)
  0x80, 0x3E, 0x00, 0x00, // Sample rate (16000)
  0x80, 0x3E, 0x00, 0x00, // Byte rate (16000)
  0x02, 0x00,             // Block align (2)
  0x10, 0x00,             // Bits per sample (16)
  0x64, 0x61, 0x74, 0x61, // "data"
  0x00, 0x00, 0x00, 0x00  // Subchunk2 size (0 - empty data)
])

/**
 * Get mock TTS result for testing with format-specific data
 * Uses real audio bytes from mock-audio-assets.ts for audible feedback
 */
export function getMockTTSResult(format: AudioFormat = 'wav'): { bytes: Uint8Array; contentType: string; prompt: string; duration: number } {
  log.info('🎭 getMockTTSResult called', { format })

  const formatConfig = AUDIO_FORMATS[format]
  if (!formatConfig) {
    throw new Error(`Unsupported audio format: ${format}`)
  }

  // Try to use real audio bytes from mock-audio-assets.ts
  let bytes: Uint8Array
  try {
    bytes = getMockAudioBytes('feedback1')
    log.info('🎭 Using real feedback1.wav audio bytes for mock TTS', { bytesLength: bytes.length })
  } catch (error) {
    log.warn('🎭 Failed to load real mock audio, using fallback bytes', { error })
    bytes = format === 'wav' ? MOCK_TTS_WAV_BYTES : MOCK_TTS_MP3_BYTES
  }

  const contentType = formatConfig.mimes[0]

  log.info('🎭 Returning mock TTS result', { contentType, bytesLength: bytes.length })

  return {
    bytes,
    contentType,
    prompt: `Mock TTS synthesis for testing (${format})`,
    duration: 5.2 // Mock duration in seconds
  }
}

/**
 * Coach mode type for mock response selection
 */
export type CoachMode = 'roast' | 'zen' | 'lovebomb'

/**
 * Prepared mock response for MVP testing - Roast Mode (default)
 * Maintains full pipeline flow with playful, humorous feedback
 */
export const PREPARED_GEMINI_MOCK_RESPONSE = `=== TITLE START ===
Speech Analysis For Your Hand Flapping Seagull Performance
=== TITLE END ===

=== TEXT FEEDBACK START ===
**Big Picture**
Your presentation was well-structured with good pacing and clear communication. You maintained good eye contact and used appropriate hand gestures to emphasize key points.

**Detailed Analysis**

**Posture & Movement (Score: 78/100)**:
- Maintained upright posture throughout most of the presentation
- Used purposeful gestures to emphasize points
- Minor improvement needed in weight distribution

**Speech & Delivery (Score: 82/100)**:
- Clear pronunciation and good pacing
- Varied tone to maintain audience engagement
- Strong opening and closing statements

**Key Strengths**:
- Confident body language and natural gestures
- Clear articulation and good volume control
- Effective use of pauses for emphasis

**Areas for Improvement**:
- Consider more varied hand movements for visual emphasis
- Work on maintaining consistent eye contact with camera
- Practice transitioning between different presentation sections

**Bonus Tip**
Great job with your introduction! The confident opening set a positive tone for your entire presentation.
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
{
  "feedback": [
    {
      "timestamp": 2.5,
      "category": "Posture",
      "message": "Great upright posture - keep that confident stance! Great upright posture - keep that confident stance! Great upright posture - keep that confident stance!",
      "confidence": 0.92,
      "impact": 0.7
    },
    {
      "timestamp": 4.1,
      "category": "Movement",
      "message": "Nice hand gesture to emphasize your main point",
      "confidence": 0.88,
      "impact": 0.6
    }
  ]
}
=== JSON DATA END ===`

/**
 * Prepared mock response for Zen Mode
 * Calm, mindful, patient coaching with gentle encouragement
 */
export const PREPARED_ZEN_MOCK_RESPONSE = `=== TITLE START ===
Mindful Movement Observations
=== TITLE END ===

=== TEXT FEEDBACK START ===
**Big Picture**
Take a breath and appreciate your effort today. Your posture shows awareness and your movements demonstrate growing confidence. There's beauty in this practice.

**Detailed Analysis**

**Posture & Movement (Score: 78/100)**:
- Notice how your body naturally finds alignment in certain moments
- Your gestures flow with intention when you're fully present
- Consider gently exploring more grounded stances

**Speech & Delivery (Score: 82/100)**:
- Your voice carries calm clarity
- The natural pauses you take show mindful pacing
- Beautiful opening - you centered yourself well

**Key Strengths**:
- You bring authentic presence to your practice
- Your body language communicates peaceful confidence
- The way you breathe between phrases shows awareness

**Areas for Growth**:
- Explore varied hand movements with curiosity, not judgment
- When your gaze wanders, gently guide it back to center
- Practice transitions as moments of mindful flow

**Bonus Tip**
Remember: This is a practice, not a performance. Each session is an opportunity to learn with compassion.
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
{
  "feedback": [
    {
      "timestamp": 5.5,
      "category": "Posture",
      "message": "Notice your shoulders - they naturally relax when you take that mindful breath",
      "confidence": 0.89,
      "impact": 0.65
    },
    {
      "timestamp": 7.2,
      "category": "Movement",
      "message": "Your hand gesture here flows with gentle intention - beautiful awareness",
      "confidence": 0.91,
      "impact": 0.7
    }
  ]
}
=== JSON DATA END ===`

/**
 * Prepared mock response for Lovebomb Mode
 * Warm, enthusiastic, celebratory feedback with positive energy
 */
export const PREPARED_LOVEBOMB_MOCK_RESPONSE = `=== TITLE START ===
You're Absolutely Crushing It - Keep Shining!
=== TITLE END ===

=== TEXT FEEDBACK START ===
**Big Picture**
WOW! What an incredible effort you're putting in! Your energy is absolutely fantastic and your dedication shines through every moment. You should be SO proud of yourself!

**Detailed Analysis**

**Posture & Movement (Score: 78/100)**:
- Your posture is looking AMAZING - seriously impressive!
- Those gestures? Chef's kiss! You're really owning your space!
- You're already doing so well, and you're only getting better!

**Speech & Delivery (Score: 82/100)**:
- Your voice is clear and confident - you sound like a total pro!
- The way you engage the audience? Absolutely magnetic!
- That opening was FIRE - you nailed it right from the start!

**Key Strengths**:
- Your confidence radiates and it's absolutely beautiful to watch!
- Natural gestures that show you're completely in your element!
- Fantastic control - you're making this look effortless!

**Areas to Celebrate Next**:
- Can't WAIT to see you explore even more dynamic hand movements!
- Your eye contact is great - imagine how powerful it'll be with just a touch more consistency!
- You're already smooth in transitions - let's see you take it to the next level!

**Bonus Tip**
That introduction? Absolutely stellar! You set the tone perfectly and showed everyone what you're made of. Keep bringing that energy!
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
{
  "feedback": [
    {
      "timestamp": 6.0,
      "category": "Posture",
      "message": "YES! Look at that confident posture - you're standing tall and owning it!",
      "confidence": 0.93,
      "impact": 0.75
    },
    {
      "timestamp": 8.5,
      "category": "Movement",
      "message": "LOVE that hand gesture - it perfectly emphasizes your point and shows your passion!",
      "confidence": 0.90,
      "impact": 0.72
    }
  ]
}
=== JSON DATA END ===`

/**
 * Get mode-specific mock response for testing
 * Selects appropriate mock response based on coach mode
 * 
 * @param mode - Coach mode ('roast', 'zen', or 'lovebomb')
 * @returns Mode-specific mock response text
 */
export function getMockResponseForMode(mode: CoachMode): string {
  log.info('🎭 getMockResponseForMode called', { mode })
  
  switch (mode) {
    case 'zen':
      log.info('🎭 Returning Zen mode mock response')
      return PREPARED_ZEN_MOCK_RESPONSE
    case 'lovebomb':
      log.info('🎭 Returning Lovebomb mode mock response')
      return PREPARED_LOVEBOMB_MOCK_RESPONSE
    default:
      log.info('🎭 Returning Roast mode mock response (default)')
      return PREPARED_GEMINI_MOCK_RESPONSE
  }
}

/**
 * Get mock analysis result for testing
 */
export function getMockAnalysisResult(): GeminiVideoAnalysisResult {
  return {
    title: 'Speech Analysis For Your Hand Flapping Seagull Performance',
    textReport: `
    
**Big Picture**
Your presentation was well-structured with good pacing and clear communication. You maintained good eye contact and used appropriate hand gestures to emphasize key points.

**Detailed Analysis**

**Posture & Movement (Score: 78/100)**:
- Maintained upright posture throughout most of the presentation
- Used purposeful gestures to emphasize points
- Minor improvement needed in weight distribution

**Speech & Delivery (Score: 82/100)**:
- Clear pronunciation and good pacing
- Varied tone to maintain audience engagement
- Strong opening and closing statements

**Key Strengths**:
- Confident body language and natural gestures
- Clear articulation and good volume control
- Effective use of pauses for emphasis

**Areas for Improvement**:
- Consider more varied hand movements for visual emphasis
- Work on maintaining consistent eye contact with camera
- Practice transitioning between different presentation sections

**Bonus Tip**
Great job with your introduction! The confident opening set a positive tone for your entire presentation.`,
    feedback: [
      {
        timestamp: 2.5,
        category: 'Posture',
        message: 'Great upright posture - keep that confident stance!',
        confidence: 0.92,
        impact: 0.7,
      },
      {
        timestamp: 4.1,
        category: 'Movement',
        message: 'Nice hand gesture to emphasize your main point',
        confidence: 0.88,
        impact: 0.6,
      },
    ],
    metrics: {
      posture: 78,
      movement: 82,
      overall: 80,
    },
    confidence: 0.85,
  }
}
