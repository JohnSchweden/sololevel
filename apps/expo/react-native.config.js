/**
 * React Native configuration for Expo
 * Excludes post-MVP packages from autolinking
 *
 * POST-MVP: react-native-video-processing removed (pose detection feature)
 * This exclusion is kept for reference but package is no longer in dependencies
 */
module.exports = {
  dependencies: {
    // POST-MVP: react-native-video-processing removed (pose detection feature)
    // Exclusion kept for reference - package no longer in dependencies
    // 'react-native-video-processing': {
    //   platforms: {
    //     android: null,
    //     ios: null,
    //   },
    // },
  },
}
