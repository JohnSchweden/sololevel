import { ProfilerWrapper } from '@ui/components/Performance'
import { useFeatureFlagsStore } from '../../stores/feature-flags'
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
  const { flags } = useFeatureFlagsStore()

  // Determine implementation at the top level, before any other hooks
  if (flags.useVisionCamera) {
    // Dynamically import VisionCamera implementation
    const { CameraRecordingScreen: VisionCameraScreen } = require('./CameraRecordingScreen.vision')
    return (
      <ProfilerWrapper
        id="CameraRecordingScreen"
        logToConsole={__DEV__}
      >
        <VisionCameraScreen
          onVideoProcessed={onVideoProcessed}
          onHeaderStateChange={onHeaderStateChange}
          onBackPress={onBackPress}
          onDevNavigate={onDevNavigate}
          resetToIdle={resetToIdle}
        />
      </ProfilerWrapper>
    )
  }

  // Dynamically import Expo Camera implementation
  const { CameraRecordingScreen: ExpoCameraScreen } = require('./CameraRecordingScreen.expo')
  return (
    <ProfilerWrapper
      id="CameraRecordingScreen"
      logToConsole={__DEV__}
    >
      <ExpoCameraScreen
        onVideoProcessed={onVideoProcessed}
        onHeaderStateChange={onHeaderStateChange}
        onBackPress={onBackPress}
        onDevNavigate={onDevNavigate}
        resetToIdle={resetToIdle}
      />
    </ProfilerWrapper>
  )
}
