import { useFeatureFlagsStore } from '../../stores/feature-flags'
import { CameraRecordingScreenProps } from './types'

/**
 * Wrapper component that handles feature flag routing BEFORE any hooks are called
 * This prevents Rules of Hooks violations by ensuring React never sees different hook structures
 */
export function CameraRecordingScreenWrapper({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onNavigateToHistory,
  onTabChange,
  resetToIdle,
}: CameraRecordingScreenProps) {
  const { flags } = useFeatureFlagsStore()

  // Determine implementation at the top level, before any other hooks
  if (flags.useVisionCamera) {
    // Dynamically import VisionCamera implementation
    const { CameraRecordingScreen: VisionCameraScreen } = require('./CameraRecordingScreen.vision')
    return (
      <VisionCameraScreen
        onNavigateBack={onNavigateBack}
        onNavigateToVideoAnalysis={onNavigateToVideoAnalysis}
        onNavigateToHistory={onNavigateToHistory}
        onTabChange={onTabChange}
        resetToIdle={resetToIdle}
      />
    )
  }

  // Dynamically import Expo Camera implementation
  const { CameraRecordingScreen: ExpoCameraScreen } = require('./CameraRecordingScreen.expo')
  return (
    <ExpoCameraScreen
      onNavigateBack={onNavigateBack}
      onNavigateToVideoAnalysis={onNavigateToVideoAnalysis}
      onNavigateToHistory={onNavigateToHistory}
      onTabChange={onTabChange}
      resetToIdle={resetToIdle}
    />
  )
}
