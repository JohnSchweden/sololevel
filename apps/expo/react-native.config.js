/**
 * React Native configuration for Expo
 * Excludes post-MVP packages from autolinking
 */
module.exports = {
  dependencies: {
    // Exclude react-native-video-processing from autolinking (post-MVP feature)
    // It requires com.yqritc:android-scalablevideoview which is no longer available
    'react-native-video-processing': {
      platforms: {
        android: null, // Disable Android autolinking
        ios: null, // Disable iOS autolinking
      },
    },
  },
}
