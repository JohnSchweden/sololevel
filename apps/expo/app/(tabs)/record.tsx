import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { AuthGate } from '../../components/AuthGate'

export default function RecordTab() {
  const router = useRouter()
  const { resetToIdle } = useLocalSearchParams<{ resetToIdle?: string }>()

  const handleNavigateToVideoAnalysis = (videoUri: string) => {
    router.push({
      pathname: '/video-analysis',
      params: { videoUri },
    })
  }

  const handleNavigateToHistory = () => {
    router.push('/history-progress')
  }

  // Reset to idle state when navigating back from video analysis
  useEffect(() => {
    if (resetToIdle === 'true') {
      router.setParams({ resetToIdle: undefined })
    }
  }, [resetToIdle, router])

  return (
    <AuthGate>
      <CameraRecordingScreen
        onNavigateToVideoAnalysis={handleNavigateToVideoAnalysis}
        onNavigateToHistory={handleNavigateToHistory}
        resetToIdle={resetToIdle === 'true'}
      />
    </AuthGate>
  )
}
