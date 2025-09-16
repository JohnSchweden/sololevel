import { CameraRecordingScreenWrapper } from './CameraRecordingScreenWrapper'
import { CameraRecordingScreenProps } from './types'

/**
 * Main Camera Recording Screen - delegates to wrapper for feature flag handling
 * This ensures Rules of Hooks compliance by avoiding conditional hook structures
 */
export function CameraRecordingScreen({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onTabChange,
}: CameraRecordingScreenProps) {
  return (
    <CameraRecordingScreenWrapper
      onNavigateBack={onNavigateBack}
      onNavigateToVideoAnalysis={onNavigateToVideoAnalysis}
      onTabChange={onTabChange}
    />
  )
}
