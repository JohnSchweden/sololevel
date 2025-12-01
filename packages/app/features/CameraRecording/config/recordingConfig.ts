/**
 * Recording Configuration
 * Centralized configuration for recording duration limits
 * Reads from environment variable with fallback to default
 */

/**
 * Maximum recording duration in seconds
 * Can be overridden via EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS environment variable
 */
export const MAX_RECORDING_DURATION_SECONDS: number = (() => {
  const envValue = process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 30 // Default: 30 seconds
})()

/**
 * Maximum recording duration in milliseconds
 */
export const MAX_RECORDING_DURATION_MS: number = MAX_RECORDING_DURATION_SECONDS * 1000
