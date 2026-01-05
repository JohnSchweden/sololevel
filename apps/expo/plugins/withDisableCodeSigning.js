const { withXcodeProject } = require('@expo/config-plugins')

/**
 * Custom Expo config plugin for conditional code signing
 *
 * Behavior:
 * - If APPLE_TEAM_ID environment variable is set: enables automatic code signing for physical device builds
 * - If APPLE_TEAM_ID is NOT set: disables code signing (simulator-only builds)
 *
 * This allows developers without Apple Developer accounts to build for simulator,
 * while enabling physical device builds for those with credentials configured.
 */
function withDisableCodeSigning(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const appleTeamId = process.env.APPLE_TEAM_ID

    // Restrict to iPhone only (no iPad, no macCatalyst)
    xcodeProject.addBuildProperty('TARGETED_DEVICE_FAMILY', '1')
    xcodeProject.addBuildProperty('SUPPORTS_MACCATALYST', 'NO')

    if (appleTeamId) {
      // Enable automatic code signing for physical device builds
      console.log(
        `[withDisableCodeSigning] Using automatic code signing with Team ID: ${appleTeamId}`
      )
      xcodeProject.addBuildProperty('CODE_SIGN_STYLE', 'Automatic')
      xcodeProject.addBuildProperty('CODE_SIGN_IDENTITY', '"Apple Development"')
      xcodeProject.addBuildProperty('DEVELOPMENT_TEAM', appleTeamId)
      xcodeProject.addBuildProperty('PROVISIONING_PROFILE_SPECIFIER', '""')
      xcodeProject.addBuildProperty('PROVISIONING_PROFILE', '""')
    } else {
      // Disable code signing for simulator-only builds
      console.log(
        '[withDisableCodeSigning] No APPLE_TEAM_ID set - disabling code signing (simulator only)'
      )
      xcodeProject.addBuildProperty('CODE_SIGN_IDENTITY', '""')
      xcodeProject.addBuildProperty('CODE_SIGN_STYLE', 'Manual')
      xcodeProject.addBuildProperty('DEVELOPMENT_TEAM', '""')
      xcodeProject.addBuildProperty('PROVISIONING_PROFILE_SPECIFIER', '""')
      xcodeProject.addBuildProperty('PROVISIONING_PROFILE', '""')
    }

    return config
  })
}

module.exports = withDisableCodeSigning
