const { withXcodeProject } = require('@expo/config-plugins')

/**
 * Expo config plugin to generate Hermes framework dSYM for iOS archives
 *
 * With static frameworks (useFrameworks: "static"), the Hermes framework dSYM
 * is not automatically included in the archive, causing App Store validation warnings.
 * This plugin adds a build phase that generates the dSYM using dsymutil.
 *
 * This persists across `expo prebuild --clean` operations.
 */
function withHermesDSYM(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const projectName = config.modRequest.projectName

    // Find the main app target by name
    const targets = xcodeProject.hash.project.objects.PBXNativeTarget || {}
    const targetUuid = Object.keys(targets).find((uuid) => {
      const target = targets[uuid]
      return target && target.name === projectName
    })

    if (!targetUuid) {
      return config
    }

    // Script to generate Hermes dSYM
    const script = `set -euo pipefail

# Path of the Hermes binary that was linked into your app
HERMES_BIN="\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/hermes.framework/hermes"

# Where Xcode expects the dSYM for this build configuration
HERMES_DSYM="\${DWARF_DSYM_FOLDER_PATH}/hermes.framework.dSYM"

# Only run dsymutil if the dSYM isn't there yet
if [ -e "$HERMES_BIN" ] && [ ! -e "$HERMES_DSYM" ]; then
  echo "🛠  Generating dSYM for Hermes..."
  /usr/bin/dsymutil "$HERMES_BIN" -o "$HERMES_DSYM"
fi`

    // Check if build phase already exists
    const buildPhases = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase || {}
    const existingPhase = Object.values(buildPhases).find(
      (phase) =>
        phase.name === 'Generate Hermes dSYM' ||
        (phase.shellScript && phase.shellScript.includes('hermes.framework.dSYM'))
    )

    if (!existingPhase) {
      // Generate UUID for the build phase
      const phaseUuid = xcodeProject.generateUuid()

      // Create the build phase object manually
      const phase = {
        isa: 'PBXShellScriptBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        inputPaths: [],
        name: 'Generate Hermes dSYM',
        outputPaths: [],
        runOnlyForDeploymentPostprocessing: 0,
        shellPath: '/bin/sh',
        shellScript: script,
        showEnvVarsInLog: 0,
      }

      // Add to project objects
      if (!xcodeProject.hash.project.objects.PBXShellScriptBuildPhase) {
        xcodeProject.hash.project.objects.PBXShellScriptBuildPhase = {}
      }
      xcodeProject.hash.project.objects.PBXShellScriptBuildPhase[phaseUuid] = phase

      // Add to target's buildPhases array
      const target = targets[targetUuid]
      if (target && target.buildPhases) {
        target.buildPhases.push({
          value: phaseUuid,
          comment: 'Generate Hermes dSYM',
        })
      }
    }

    return config
  })
}

module.exports = withHermesDSYM
