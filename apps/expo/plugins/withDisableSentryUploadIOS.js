const { withXcodeProject } = require('@expo/config-plugins')

/**
 * Expo config plugin to disable Sentry sourcemap upload for iOS local development
 *
 * Sets SENTRY_DISABLE_AUTO_UPLOAD=true as a build setting in Xcode project.
 * This disables Sentry upload for local development builds.
 * CI/CD can override by setting SENTRY_DISABLE_AUTO_UPLOAD=false in build environment.
 *
 * This persists across `expo prebuild --clean` operations.
 */
function withDisableSentryUploadIOS(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults

    // Set SENTRY_DISABLE_AUTO_UPLOAD=true as a build setting
    // This environment variable is read by sentry-cli during build phases
    // Defaults to "true" for local builds, CI/CD can override to "false"
    xcodeProject.addBuildProperty('SENTRY_DISABLE_AUTO_UPLOAD', 'true')

    return config
  })
}

module.exports = withDisableSentryUploadIOS
