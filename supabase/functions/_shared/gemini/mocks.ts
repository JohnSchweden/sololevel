/**
 * Mock responses for Gemini analysis testing
 */

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
 */
export function getMockTTSResult(format: AudioFormat = 'wav'): { bytes: Uint8Array; contentType: string; prompt: string; duration: number } {
  log.info('🎭 getMockTTSResult called', { format })

  const formatConfig = AUDIO_FORMATS[format]
  if (!formatConfig) {
    throw new Error(`Unsupported audio format: ${format}`)
  }

  const bytes = format === 'wav' ? MOCK_TTS_WAV_BYTES : MOCK_TTS_MP3_BYTES
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
 * Prepared mock response for MVP testing - maintains full pipeline flow
 */
export const PREPARED_GEMINI_MOCK_RESPONSE = `=== TEXT FEEDBACK START ===
**Big Picture**: Your presentation was well-structured with good pacing and clear communication. You maintained good eye contact and used appropriate hand gestures to emphasize key points.

**Detailed Analysis**:

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

**Bonus Tip**: Great job with your introduction! The confident opening set a positive tone for your entire presentation.
=== TEXT FEEDBACK END ===

=== JSON DATA START ===
{
  "feedback": [
    {
      "timestamp": 2.5,
      "category": "Posture",
      "message": "Great upright posture - keep that confident stance!",
      "confidence": 0.92,
      "impact": 0.7
    },
    {
      "timestamp": 4.1,
      "category": "Movement",
      "message": "Nice hand gesture to emphasize your main point",
      "confidence": 0.88,
      "impact": 0.6
    },
    {
      "timestamp": 6.8,
      "category": "Speech",
      "message": "Clear articulation and good pacing throughout",
      "confidence": 0.85,
      "impact": 0.65
    }
  ]
}
=== JSON DATA END ===`

/**
 * Get mock analysis result for testing
 */
export function getMockAnalysisResult(): GeminiVideoAnalysisResult {
  return {
    textReport: `**Big Picture**: Your presentation was well-structured with good pacing and clear communication. You maintained good eye contact and used appropriate hand gestures to emphasize key points.

**Detailed Analysis**:

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

**Bonus Tip**: Great job with your introduction! The confident opening set a positive tone for your entire presentation.`,
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
      {
        timestamp: 6.8,
        category: 'Speech',
        message: 'Clear articulation and good pacing throughout',
        confidence: 0.85,
        impact: 0.65,
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
