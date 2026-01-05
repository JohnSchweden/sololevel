const { withGradleProperties } = require('@expo/config-plugins')

/**
 * Expo config plugin to disable Sentry sourcemap upload for Android local development
 *
 * This persists across `expo prebuild --clean` operations.
 * Sets SENTRY_DISABLE_AUTO_UPLOAD=true in gradle.properties for local builds.
 * Override to false in CI/CD where SENTRY_AUTH_TOKEN is available.
 *
 * NOTE: This plugin is Android-only. For iOS, use withDisableSentryUploadIOS.
 */
function withDisableSentryUpload(config) {
  return withGradleProperties(config, (config) => {
    // Remove any existing SENTRY_DISABLE_AUTO_UPLOAD setting
    const existingIndex = config.modResults.findIndex(
      (prop) => prop.type === 'property' && prop.key === 'SENTRY_DISABLE_AUTO_UPLOAD'
    )

    if (existingIndex !== -1) {
      config.modResults.splice(existingIndex, 1)
    }

    // Add SENTRY_DISABLE_AUTO_UPLOAD=true to gradle.properties
    // This disables Sentry upload for local development builds
    // CI/CD can override by setting SENTRY_DISABLE_AUTO_UPLOAD=false
    config.modResults.push({
      type: 'property',
      key: 'SENTRY_DISABLE_AUTO_UPLOAD',
      value: 'true',
    })

    return config
  })
}

module.exports = withDisableSentryUpload
