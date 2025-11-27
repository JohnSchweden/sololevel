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
  const user = useAuthStore((state) => state.user)

  const handleSignInSuccess = () => {
    log.info('SignInRoute', 'Sign in successful, redirecting to home', {
      userId: user?.id,
    })
    router.replace('/')
  }

  const handleAlreadyAuthenticated = () => {
    log.debug('SignInRoute', 'User already authenticated, redirecting to home', {
      userId: user?.id,
    })
    router.replace('/')
  }

  return (
    <SignInScreen
      onSignInSuccess={handleSignInSuccess}
      onAlreadyAuthenticated={handleAlreadyAuthenticated}
    />
  )
}
