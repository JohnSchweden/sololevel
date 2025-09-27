import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

export default function VideoAnalysis() {
  const router = useRouter()
  const { videoUri } = useLocalSearchParams<{ videoUri: string }>()

  const handleBack = () => {
    // Navigate back to camera with reset to idle state
    router.replace({
      pathname: '/',
      params: { resetToIdle: 'true' },
    })
  }

  const handleMenuPress = () => {
    // Handle menu press - could open a menu or settings
    console.log('Menu pressed')
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
        analysisJobId={1} // This would come from route params in a real implementation
        videoUri={videoUri} // Pass the video URI from navigation params
        onBack={handleBack}
        onMenuPress={handleMenuPress}
      />
    </AuthGate>
  )
}
