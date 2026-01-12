import { VoiceSelectionScreen } from '@my/app/features/Onboarding'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'

/**
 * Voice Selection Route (Web)
 * First-login onboarding screen for selecting coach preferences
 *
 * Note: Shown only when user's coach_mode is NULL (first login)
 * Navigation interception happens in sign-in route
 */
export default function VoiceSelectionRoute() {
  const router = useRouter()

  const handleContinue = () => {
    log.info('VoiceSelectionRoute', 'User completed voice selection, navigating to home')
    router.replace('/')
  }

  return <VoiceSelectionScreen onContinue={handleContinue} />
}
