const { withXcodeProject } = require('@expo/config-plugins')

/**
 * Custom Expo config plugin to disable code signing and restrict to iPhone only
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

    return config
  })
}

module.exports = withDisableCodeSigning
