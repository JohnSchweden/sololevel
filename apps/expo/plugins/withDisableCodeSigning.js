const { withXcodeProject } = require('@expo/config-plugins')

/**
 * Custom Expo config plugin to disable code signing and restrict to iPhone only
 *
 * NOTE: Previous version attempted to configure automatic code signing with team ID,
 * but it required APPLE_TEAM_ID environment variable which broke builds for developers
 * without it configured. Reverted to disabled code signing for optional development builds.
 *
 * Previous (commented out) version:
 * - Configured automatic code signing with team ID from APPLE_TEAM_ID env var
 * - Required APPLE_TEAM_ID to be set, throwing error if missing
 * - Used CODE_SIGN_STYLE: 'Automatic', CODE_SIGN_IDENTITY: 'Apple Development'
 */
function withDisableCodeSigning(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults

    // Use the safer addBuildProperty method
    xcodeProject.addBuildProperty('TARGETED_DEVICE_FAMILY', '1')
    xcodeProject.addBuildProperty('CODE_SIGN_IDENTITY', '""')
    xcodeProject.addBuildProperty('CODE_SIGN_STYLE', 'Manual')
    xcodeProject.addBuildProperty('DEVELOPMENT_TEAM', '""')
    xcodeProject.addBuildProperty('PROVISIONING_PROFILE_SPECIFIER', '""')
    xcodeProject.addBuildProperty('PROVISIONING_PROFILE', '""')
    xcodeProject.addBuildProperty('SUPPORTS_MACCATALYST', 'NO')

    // Previous version (commented out - required APPLE_TEAM_ID env var):
    // /**
    //  * Custom Expo config plugin to configure automatic code signing with team ID
    //  * and restrict to iPhone only
    //  *
    //  * Requires EXPO_APPLE_TEAM_ID environment variable to be set.
    //  * This prevents committing sensitive Team ID to version control.
    //  */
    // // Read Team ID from environment variable (required for security)
    // const appleTeamId = process.env.APPLE_TEAM_ID
    //
    // if (!appleTeamId) {
    //   throw new Error(
    //     'APPLE_TEAM_ID environment variable is required for iOS builds. ' +
    //       'Set it in your .env file or CI/CD environment. ' +
    //       'Get your Team ID from https://developer.apple.com/account'
    //   )
    // }
    //
    // xcodeProject.addBuildProperty('CODE_SIGN_IDENTITY', 'Apple Development')
    // xcodeProject.addBuildProperty('CODE_SIGN_STYLE', 'Automatic')
    // xcodeProject.addBuildProperty('DEVELOPMENT_TEAM', appleTeamId)
    // xcodeProject.addBuildProperty('PROVISIONING_PROFILE_SPECIFIER', '')
    // xcodeProject.addBuildProperty('PROVISIONING_PROFILE', '')

    return config
  })
}

module.exports = withDisableCodeSigning
