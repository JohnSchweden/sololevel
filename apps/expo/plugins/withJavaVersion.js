const { withGradleProperties } = require('@expo/config-plugins')

/**
 * Expo config plugin to set Java 17 for Gradle builds (local macOS only)
 *
 * This ensures that Gradle uses Java 17 instead of the system default (Java 25),
 * which is required for Gradle 8.13 compatibility on local macOS builds.
 *
 * For EAS builds, this plugin removes any Java home setting to let EAS use its default Java.
 * The setting persists across `expo prebuild --clean` operations.
 */
function withJavaVersion(config) {
  return withGradleProperties(config, (config) => {
    // Remove any existing java.home setting first
    const existingIndex = config.modResults.findIndex(
      (prop) => prop.type === 'property' && prop.key === 'org.gradle.java.home'
    )

    if (existingIndex !== -1) {
      config.modResults.splice(existingIndex, 1)
    }

    // Only set Java home for local macOS builds
    // EAS builds run on Linux and have their own Java setup
    const isEASBuild = process.env.EAS_BUILD === 'true' || process.env.EAS_BUILD_ID
    const isMacOS = process.platform === 'darwin'

    if (!isEASBuild && isMacOS) {
      // Set Java 17 home for local macOS builds
      // This path is for Homebrew-installed OpenJDK 17 on macOS
      const java17Path = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home'

      // Add Java 17 home setting
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.java.home',
        value: java17Path,
      })
    }
    // For EAS builds, we intentionally don't set Java home - let EAS use its default

    return config
  })
}

module.exports = withJavaVersion
