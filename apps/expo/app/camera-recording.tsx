import { CameraRecordingScreen } from 'app/features/CameraRecording'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'

/**
 * Camera Recording Route
 * File-based routing for camera recording screen
 * Implements Expo Router navigation patterns
 */
export default function RecordScreen() {
  const router = useRouter()

  // Navigation handlers following Expo Router patterns
  const handleNavigateBack = useCallback(() => {
    router.back()
  }, [router])

  // Side sheet is now handled internally by CameraRecordingScreen

  const handleTabChange = useCallback(
    (tab: 'coach' | 'record' | 'insights') => {
      // Navigate to different tabs using Expo Router
      switch (tab) {
        case 'coach':
          router.push('/') // Navigate to home/coach tab
          break
        case 'record':
          // Already on record tab
          break
        case 'insights':
          router.push('/') // Navigate to home/insights tab - placeholder
          break
      }
    },
    [router]
  )

  return (
    <CameraRecordingScreen
      onNavigateBack={handleNavigateBack}
      onTabChange={handleTabChange}
    />
  )
}
