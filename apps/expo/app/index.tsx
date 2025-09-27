// No need to import React explicitly with automatic JSX runtime
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { AuthGate } from '../components/AuthGate'

export default function Screen() {
  const router = useRouter()
  const { resetToIdle } = useLocalSearchParams<{ resetToIdle?: string }>()

  const handleNavigateToVideoAnalysis = (videoUri: string) => {
    // Navigate to video analysis screen with the video URI as a parameter
    router.push({
      pathname: '/video-analysis',
      params: { videoUri },
    })
  }

  // Reset to idle state when navigating back from video analysis
  useEffect(() => {
    if (resetToIdle === 'true') {
      // Clear the parameter to prevent repeated resets
      router.setParams({ resetToIdle: undefined })
    }
  }, [resetToIdle, router])

  return (
    <AuthGate>
      <CameraRecordingScreen
        onNavigateToVideoAnalysis={handleNavigateToVideoAnalysis}
        resetToIdle={resetToIdle === 'true'}
      />
    </AuthGate>
  )
}
