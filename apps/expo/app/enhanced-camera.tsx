import { EnhancedCameraRecordingScreen } from 'app/features/CameraRecording/EnhancedCameraRecordingScreen'
import { Stack, useRouter } from 'expo-router'

export default function Screen() {
  const router = useRouter()

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Enhanced Camera',
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
      <EnhancedCameraRecordingScreen
        onNavigateBack={() => router.back()}
        onOpenSideSheet={() => console.log('Open side sheet')}
        onTabChange={(tab) => console.log(`Tab changed to ${tab}`)}
      />
    </>
  )
}
