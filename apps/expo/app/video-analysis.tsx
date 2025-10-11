import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { log } from '@my/logging'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import { YStack } from 'tamagui'
import { AuthGate } from '../components/AuthGate'

export default function VideoAnalysis() {
  const router = useRouter()
  const navigation = useNavigation()
  const [controlsVisible, setControlsVisible] = useState(true)
  const headerHeight = useHeaderHeight()
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

  // Set header props for Video Analysis mode
  useLayoutEffect(() => {
    navigation.setOptions({
      // @ts-ignore: custom appHeaderProps not in base type
      appHeaderProps: {
        mode: 'videoSettings',
        onBackPress: handleBack,
        onMenuPress: handleMenuPress,
      },
      headerShown: controlsVisible,
    })
  }, [navigation, controlsVisible])

  return (
    <AuthGate>
      <YStack
        flex={1}
        paddingTop={headerHeight - 60}
        backgroundColor="$background"
      >
        <VideoAnalysisScreen
          analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
          videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
          videoUri={videoUri} // Pass the video URI from navigation params
          onBack={handleBack}
          onControlsVisibilityChange={setControlsVisible}
        />
      </YStack>
    </AuthGate>
  )
}
