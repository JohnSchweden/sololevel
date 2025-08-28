import { CameraRecordingScreen } from 'app/features/CameraRecording/CameraRecordingScreen'
import { Stack, useRouter } from 'expo-router'

export default function Screen() {
  const router = useRouter()

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Camera Recording',
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
      <CameraRecordingScreen
        onNavigateBack={() => router.back()}
        onOpenSideSheet={() => console.log('Open side sheet')}
        onTabChange={(tab) => console.log(`Tab changed to ${tab}`)}
      />
    </>
  )
}
