import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

export default function RecordTab() {
  const router = useRouter()

  const handleNavigateToHistory = () => {
    router.push('/history-progress')
  }

  return (
    <AuthGate>
      <CameraRecordingScreen onNavigateToHistory={handleNavigateToHistory} />
    </AuthGate>
  )
}
