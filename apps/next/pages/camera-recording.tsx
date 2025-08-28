import { CameraRecordingScreen } from '@app/features/CameraRecording/CameraRecordingScreen'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function CameraRecordingPage() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>Camera Recording - Solo:Level</title>
        <meta
          name="description"
          content="Record videos for AI analysis"
        />
      </Head>

      <CameraRecordingScreen
        onNavigateBack={() => router.back()}
        onOpenSideSheet={() => console.log('Open side sheet')}
        onTabChange={(tab) => console.log(`Tab changed to ${tab}`)}
      />
    </>
  )
}
