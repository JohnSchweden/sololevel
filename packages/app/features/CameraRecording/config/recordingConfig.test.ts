/**
 * Tests for recordingConfig
 *
 * Tests configuration reading: environment variable and default fallback
 * Following testing philosophy: focus on user-visible behavior
 */

describe('recordingConfig', () => {
  const originalEnv = process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS = originalEnv
    } else {
      delete process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS
    }
    // Clear module cache to re-import with new env
    jest.resetModules()
  })

  it('should read from environment variable when set', () => {
    // 🧪 ARRANGE: Set environment variable
    process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS = '60'

    // 🎬 ACT: Import config (module cache cleared in afterEach)
    const { MAX_RECORDING_DURATION_SECONDS } = require('./recordingConfig')

    // ✅ ASSERT: Should use env value
    expect(MAX_RECORDING_DURATION_SECONDS).toBe(60)
  })

  it('should fall back to default when environment variable is not set', () => {
    // 🧪 ARRANGE: Remove environment variable
    delete process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS

    // 🎬 ACT: Import config
    const { MAX_RECORDING_DURATION_SECONDS } = require('./recordingConfig')

    // ✅ ASSERT: Should use default value (30 seconds)
    expect(MAX_RECORDING_DURATION_SECONDS).toBe(30)
  })
})
