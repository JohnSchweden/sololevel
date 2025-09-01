import { CameraRecordingScreen } from '@app/features/CameraRecording'
import Head from 'next/head'

export default function Page() {
  return (
    <>
      <Head>
        <title>Camera Recording - App</title>
        <meta
          name="description"
          content="Camera recording app with cross-platform functionality"
        />
      </Head>
      <CameraRecordingScreen />
    </>
  )
}
