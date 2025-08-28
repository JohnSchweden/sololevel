import { EnhancedCameraRecordingScreen } from '@app/features/CameraRecording/EnhancedCameraRecordingScreen'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function EnhancedCameraPage() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>Enhanced Camera - Solo:Level</title>
        <meta
          name="description"
          content="Enhanced camera recording with interactive controls"
        />
      </Head>

      <EnhancedCameraRecordingScreen
        onNavigateBack={() => router.back()}
        onOpenSideSheet={() => console.log('Open side sheet')}
        onTabChange={(tab: string) => console.log(`Tab changed to ${tab}`)}
      />
    </>
  )
}
