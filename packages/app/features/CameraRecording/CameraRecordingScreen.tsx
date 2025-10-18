import { CameraRecordingScreenWrapper } from './CameraRecordingScreenWrapper'
import { CameraRecordingScreenProps } from './types'

/**
 * Main Camera Recording Screen - delegates to wrapper for feature flag handling
 * This ensures Rules of Hooks compliance by avoiding conditional hook structures
 *
 * **Navigation Pattern (Expo Router Native - Option C):**
 * - Screen is framework-agnostic, NO navigation imports
 * - onHeaderStateChange callback communicates header state to route file
 * - Route file owns navigation logic and updates header via navigation.setOptions()
 * - onVideoProcessed callback for data flow (route file handles navigation)
 */
export function CameraRecordingScreen({
  onVideoProcessed,
  onHeaderStateChange,
  onBackPress,
  onDevNavigate,
  resetToIdle,
}: CameraRecordingScreenProps) {
  return (
    <CameraRecordingScreenWrapper
      onVideoProcessed={onVideoProcessed}
      onHeaderStateChange={onHeaderStateChange}
      onBackPress={onBackPress}
      onDevNavigate={onDevNavigate}
      resetToIdle={resetToIdle}
    />
  )
}
