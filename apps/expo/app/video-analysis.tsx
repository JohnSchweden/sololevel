import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { log } from '@my/logging'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

export default function VideoAnalysis() {
  const router = useRouter()
  const { videoUri, videoRecordingId, analysisJobId } = useLocalSearchParams<{
    videoUri: string
    videoRecordingId?: string
    analysisJobId?: string
  }>()

  const handleBack = () => {
    // Navigate back to camera with reset to idle state
    router.replace({
      pathname: '/',
      params: { resetToIdle: 'true' },
    })
  }

  const handleMenuPress = () => {
    // Handle menu press - could open a menu or settings
    log.info('VideoAnalysis', '🎛️ Menu pressed')
  }

  return (
    <AuthGate>
      <Stack.Screen
        options={{
          title: 'Video Analysis',
          headerShown: false, // Using AppHeader instead
        }}
      />
      <VideoAnalysisScreen
        analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
        videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
        videoUri={videoUri} // Pass the video URI from navigation params
        onBack={handleBack}
        onMenuPress={handleMenuPress}
      />
    </AuthGate>
  )
}
