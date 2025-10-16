// No need to import React explicitly with automatic JSX runtime
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

export default function Screen() {
  const router = useRouter()

  const handleTabChange = (tab: 'coach' | 'record' | 'insights') => {
    log.info('index', 'Tab changed', { tab })

    // Navigate to respective screens when tabs are changed
    if (tab === 'coach') {
      router.push('/coach' as any)
    } else if (tab === 'insights') {
      router.push('/insights' as any)
    }
    // 'record' tab stays on current screen (index)
  }

  return (
    <AuthGate>
      <CameraRecordingScreen onTabChange={handleTabChange} />
    </AuthGate>
  )
}
