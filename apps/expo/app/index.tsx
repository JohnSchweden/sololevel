// No need to import React explicitly with automatic JSX runtime
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useRouter } from 'expo-router'

export default function Screen() {
  const router = useRouter()

  const handleNavigateToVideoAnalysis = (videoUri: string) => {
    // Navigate to video analysis screen with the video URI as a parameter
    router.push({
      pathname: '/video-analysis',
      params: { videoUri },
    })
  }

  return <CameraRecordingScreen onNavigateToVideoAnalysis={handleNavigateToVideoAnalysis} />
}
