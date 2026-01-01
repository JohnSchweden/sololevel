const { withAppBuildGradle } = require('@expo/config-plugins')

/**
 * Expo config plugin to disable Sentry upload tasks in build.gradle
 *
 * This modifies app/build.gradle to disable Sentry upload tasks when
 * SENTRY_DISABLE_AUTO_UPLOAD=true is set in gradle.properties.
 *
 * Persists across `expo prebuild --clean` operations.
 */
function withDisableSentryUploadGradle(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents

    // Check if Sentry disable code already exists
    if (buildGradle.includes('SENTRY_DISABLE_AUTO_UPLOAD')) {
      return config
    }

    // Sentry disable code to inject after Sentry plugin is applied
    // Note: Using string concatenation to avoid template literal interpretation
    const sentryDisableCode = `
// Sentry Configuration - disable upload for local development builds
// Reads SENTRY_DISABLE_AUTO_UPLOAD from gradle.properties
// When "true": skips upload entirely (no auth token needed)
// When "false": uploads sourcemaps (requires SENTRY_AUTH_TOKEN in CI/CD)
def sentryUploadDisabled = (findProperty('SENTRY_DISABLE_AUTO_UPLOAD') ?: "false") == "true"

// Disable Sentry upload tasks after plugin creates them
afterEvaluate {
    if (sentryUploadDisabled) {
        tasks.matching { it.name.contains("SentryUpload") && !it.name.contains("CleanUp") }.configureEach { task ->
            enabled = false
            logger.warn("Sentry upload disabled (SENTRY_DISABLE_AUTO_UPLOAD=true). Task disabled.")
        }
    }
}
`

    // Find where Sentry plugin is applied and insert our code after it
    const sentryPluginPattern = /(apply from:.*sentry\.gradle)/
    if (sentryPluginPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        sentryPluginPattern,
        `$1${sentryDisableCode}`
      )
    } else {
      // If Sentry plugin pattern not found, append before android block
      const androidBlockPattern = /(android\s*\{)/
      if (androidBlockPattern.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          androidBlockPattern,
          `${sentryDisableCode}\n$1`
        )
      }
    }

    return config
  })
}

module.exports = withDisableSentryUploadGradle
