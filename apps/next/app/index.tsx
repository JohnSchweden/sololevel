// No need to import React explicitly with automatic JSX runtime
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { AuthGate } from '../components/AuthGate'

export default function Screen() {
  return (
    <AuthGate>
      <CameraRecordingScreen />
    </AuthGate>
  )
}
