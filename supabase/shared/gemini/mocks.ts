/**
 * Mock responses for Gemini analysis testing
 */

import type { GeminiVideoAnalysisResult } from './types.ts'

/**
 * Prepared mock response for MVP testing - maintains full pipeline flow
 */
export const PREPARED_GEMINI_MOCK_RESPONSE = `=== TEXT REPORT START ===
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
=== TEXT REPORT END ===

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
      "impact": 0.5
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
        impact: 0.5,
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
