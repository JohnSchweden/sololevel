import { estimateFeedbackDuration } from './feedbackDuration'

describe('feedbackDuration', () => {
  describe('estimateFeedbackDuration', () => {
    // Arrange: Define test cases with expected durations
    const testCases = [
      {
        description: 'returns minimum duration for empty text',
        text: '',
        expectedMinMs: 2000,
        expectedMaxMs: 2000,
      },
      {
        description: 'returns minimum duration for null',
        text: null,
        expectedMinMs: 2000,
        expectedMaxMs: 2000,
      },
      {
        description: 'returns minimum duration for undefined',
        text: undefined,
        expectedMinMs: 2000,
        expectedMaxMs: 2000,
      },
      {
        description: 'returns minimum duration for short text (10 chars)',
        text: 'Good form!',
        expectedMinMs: 2000,
        expectedMaxMs: 2000,
      },
      {
        description: 'calculates duration for medium text (40 chars)',
        text: 'Your grip technique needs improvement.',
        expectedMinMs: 2000,
        expectedMaxMs: 3000,
      },
      {
        description: 'calculates duration for long text (100 chars)',
        text: 'Your grip technique needs improvement. Try adjusting your hand position for better club control.',
        expectedMinMs: 5000,
        expectedMaxMs: 6000,
      },
      {
        description: 'calculates duration for very long text (200 chars)',
        text: 'Your swing shows promise, but there are several areas for improvement. First, work on your grip - it should be firm but not tight. Second, focus on your posture and balance throughout the motion.',
        expectedMinMs: 10000,
        expectedMaxMs: 11000,
      },
    ]

    testCases.forEach(({ description, text, expectedMinMs, expectedMaxMs }) => {
      it(description, () => {
        // Act
        const result = estimateFeedbackDuration(text as string | null | undefined)

        // Assert
        expect(result).toBeGreaterThanOrEqual(expectedMinMs)
        expect(result).toBeLessThanOrEqual(expectedMaxMs)
      })
    })

    it('uses consistent formula (20 chars/sec + 500ms buffer)', () => {
      // Arrange: 60 character text
      const text = 'Your posture is excellent. Keep up the good work with it!'

      // Act
      const result = estimateFeedbackDuration(text)

      // Assert: 60 chars / 20 chars/sec = 3000ms + 500ms buffer = 3500ms
      expect(result).toBeGreaterThanOrEqual(3000)
      expect(result).toBeLessThanOrEqual(4000)
    })

    it('handles unicode and special characters', () => {
      // Arrange: Text with emojis and special chars
      const text = 'Great work! 🎉 Your technique is improving 👍'

      // Act
      const result = estimateFeedbackDuration(text)

      // Assert: Should count all characters (including emojis)
      expect(result).toBeGreaterThanOrEqual(2000)
      expect(result).toBeLessThanOrEqual(3500)
    })
  })
})
