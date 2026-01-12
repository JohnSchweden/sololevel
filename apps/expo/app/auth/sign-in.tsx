import { hasUserSetVoicePreferences } from '@my/api'
import { SignInScreen } from '@my/app/features/Auth'
import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'

/**
 * Sign In Route
 * Minimal route file that delegates to SignInScreen component
 *
 * Note: Eager loaded (not lazy) because this is on the critical path
 * for unauthenticated users - they're redirected here immediately.
 */
export default function SignInRoute() {
  const router = useRouter()

  const redirectAfterAuth = async () => {
    const { user, markVoicePrefsChecked } = useAuthStore.getState()

    if (!user?.id) {
      log.error('SignInRoute', 'No user ID available for voice preference check')
      router.replace('/')
      return
    }

    try {
      const hasPreferences = await hasUserSetVoicePreferences(user.id)
      markVoicePrefsChecked() // Prevent AuthGate from re-checking

      const destination = hasPreferences ? '/' : '/onboarding/voice-selection'
      log.info('SignInRoute', hasPreferences ? 'User has preferences' : 'First login detected', {
        userId: user.id,
        destination,
      })
      router.replace(destination as any)
    } catch (error) {
      log.error('SignInRoute', 'Failed to check voice preferences, redirecting to home', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      })
      router.replace('/')
    }
  }

  return (
    <SignInScreen
      onSignInSuccess={redirectAfterAuth}
      onAlreadyAuthenticated={redirectAfterAuth}
    />
  )
}
