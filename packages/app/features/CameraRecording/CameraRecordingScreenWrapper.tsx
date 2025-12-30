// import { useFeatureFlagsStore } from '../../stores/feature-flags'
import { CameraRecordingScreenProps } from './types'

/**
 * Wrapper component that handles feature flag routing BEFORE any hooks are called
 * This prevents Rules of Hooks violations by ensuring React never sees different hook structures
 */
export function CameraRecordingScreenWrapper({
  onVideoProcessed,
  onHeaderStateChange,
  onBackPress,
  onDevNavigate,
  resetToIdle,
}: CameraRecordingScreenProps) {
  // const { flags } = useFeatureFlagsStore()

  // Determine implementation at the top level, before any other hooks
  // if (flags.useVisionCamera) {
  //   // Dynamically import VisionCamera implementation
  //   const { CameraRecordingScreen: VisionCameraScreen } = require('./CameraRecordingScreen.vision')
  //   return (
  //     <VisionCameraScreen
  //       onVideoProcessed={onVideoProcessed}
  //       onHeaderStateChange={onHeaderStateChange}
  //       onBackPress={onBackPress}
  //       onDevNavigate={onDevNavigate}
  //       resetToIdle={resetToIdle}
  //     />
  //   )
  // }

  // INTENTIONAL: VisionCamera is hardcoded as the only implementation path
  // Feature flag logic is disabled - all users use VisionCamera regardless of flag state
  // ExpoCamera fallback (lines 44-54) is intentionally unreachable
  // Dynamically import VisionCamera implementation
  const { CameraRecordingScreen: VisionCameraScreen } = require('./CameraRecordingScreen.vision')
  return (
    <VisionCameraScreen
      onVideoProcessed={onVideoProcessed}
      onHeaderStateChange={onHeaderStateChange}
      onBackPress={onBackPress}
      onDevNavigate={onDevNavigate}
      resetToIdle={resetToIdle}
    />
  )

  // Dynamically import Expo Camera implementation
  // NOTE: This code is intentionally unreachable - VisionCamera is hardcoded above
  // const { CameraRecordingScreen: ExpoCameraScreen } = require('./CameraRecordingScreen.expo')
  // return (
  //   <ExpoCameraScreen
  //     onVideoProcessed={onVideoProcessed}
  //     onHeaderStateChange={onHeaderStateChange}
  //     onBackPress={onBackPress}
  //     onDevNavigate={onDevNavigate}
  //     resetToIdle={resetToIdle}
  //   />
  // )
}
