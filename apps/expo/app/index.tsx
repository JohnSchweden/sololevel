import { Button } from '@my/ui'
import { Camera, Video } from '@tamagui/lucide-icons'
import { HomeScreen } from 'app/features/home/screen'
import { Link, Stack, useRouter } from 'expo-router'

export default function Screen() {
  const router = useRouter()

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Home',
        }}
      />
      <HomeScreen
        linkComponent={
          <Link
            href="/user/nate"
            asChild
          >
            <Button>Link to user</Button>
          </Link>
        }
        demoLinkComponent={
          <Link
            href="/demo"
            asChild
          >
            <Button theme="blue">🧪 Demo & Test</Button>
          </Link>
        }
        cameraRecordingLinkComponent={
          <Button
            icon={Camera}
            size="$5"
            onPress={() => router.push('/camera-recording' as any)}
          >
            Basic Camera
          </Button>
        }
        enhancedCameraRecordingLinkComponent={
          <Button
            icon={Video}
            size="$5"
            onPress={() => router.push('/enhanced-camera' as any)}
          >
            Enhanced Camera
          </Button>
        }
      />
    </>
  )
}
