import { SignInScreen } from '@my/app/features/Auth'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'

/**
 * Sign In Route
 * Minimal route file that delegates to SignInScreen component
 */
export default function SignInRoute() {
  const router = useRouter()

  const handleSignInSuccess = () => {
    log.info('SignInRoute', 'Sign in successful, redirecting to home')
    router.replace('/')
  }

  const handleAlreadyAuthenticated = () => {
    log.info('SignInRoute', 'User already authenticated, redirecting to home')
    router.replace('/')
  }

  return (
    <SignInScreen
      onSignInSuccess={handleSignInSuccess}
      onAlreadyAuthenticated={handleAlreadyAuthenticated}
    />
  )
}
