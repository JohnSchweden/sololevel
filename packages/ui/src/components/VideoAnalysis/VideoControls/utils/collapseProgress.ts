/**
 * Sanitizes collapse progress values to ensure they are valid numbers in the 0-1 range.
 * Handles NaN, Infinity, and out-of-range values.
 *
 * Used to prevent render loops and animation glitches from invalid progress values.
 *
 * @param value - The collapse progress value to sanitize
 * @returns A valid number between 0 and 1, or 0 if input is invalid
 */
export function sanitizeCollapseProgress(value: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value)) // Clamp to 0-1 range
  }
  return 0
}

/**
 * Checks if a value is a SharedValue without accessing its .value property.
 * Avoids Reanimated warnings during render-phase type checks.
 *
 * @param value - The value to check
 * @returns true if value is a SharedValue-like object
 */
export function isSharedValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'value' in value && !Array.isArray(value)
}
