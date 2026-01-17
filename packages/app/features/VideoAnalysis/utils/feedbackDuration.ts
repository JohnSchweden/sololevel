/**
 * Text-based duration estimation for feedback without audio.
 *
 * Calculates how long to display feedback based on text length and reading speed.
 * Used as fallback when audio generation fails or is unavailable.
 */

const MIN_FALLBACK_DURATION_MS = 2000 // Minimum 2 seconds
const CHARS_PER_SECOND = 20 // ~240 wpm (conservative for comprehension)
const PROCESSING_BUFFER_MS = 500 // Cognitive processing time

/**
 * Estimates display duration based on feedback text length.
 *
 * Formula:
 * - Reading time = (text length / 20 chars per second) * 1000ms
 * - Add 500ms processing buffer
 * - Minimum 2 seconds (even for short text)
 *
 * @param text - Feedback text to estimate duration for
 * @returns Duration in milliseconds
 *
 * @example
 * estimateFeedbackDuration('Good form!') // ~2000ms (minimum)
 * estimateFeedbackDuration('Your grip technique needs improvement. Try adjusting...') // ~3250ms
 */
export function estimateFeedbackDuration(text: string | null | undefined): number {
  const textLength = text?.length ?? 0

  if (textLength === 0) {
    return MIN_FALLBACK_DURATION_MS
  }

  const readingTimeMs = (textLength / CHARS_PER_SECOND) * 1000
  const totalDurationMs = readingTimeMs + PROCESSING_BUFFER_MS

  return Math.max(MIN_FALLBACK_DURATION_MS, totalDurationMs)
}
