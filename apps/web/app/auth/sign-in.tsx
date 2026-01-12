import { hasUserSetVoicePreferences } from '@my/api'
import { initializeTestAuth } from '@my/app/auth/testAuthBootstrap'
import { useAuth } from '@my/app/hooks/useAuth'
import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { Button, H2, Input, Paragraph, YStack, useToastController } from '@my/ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'

export default function SignInScreen() {
  const { signIn, isAuthenticated } = useAuth()
  const user = useAuthStore((state) => state.user)
  const router = useRouter()
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>()
  const toast = useToastController()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize test auth on mount if enabled
  useEffect(() => {
    initializeTestAuth()
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = redirectTo || '/'
      log.debug('SignInScreen', 'User already authenticated, redirecting', {
        destination,
        userId: user?.id,
      })
      router.replace(destination as any)
    }
  }, [isAuthenticated, router, redirectTo, user?.id])

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.show('Please enter email and password', {
        type: 'error',
      })
      return
    }

    setLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        // Get fresh user from store (not from stale closure)
        const freshUser = useAuthStore.getState().user

        // Check if user has set voice preferences (first-login detection)
        if (freshUser?.id) {
          try {
            const hasPreferences = await hasUserSetVoicePreferences(freshUser.id)

            if (!hasPreferences) {
              log.info('SignInScreen', 'First login detected, redirecting to voice selection', {
                userId: freshUser.id,
              })
              router.replace('/onboarding/voice-selection' as any)
              return
            }
          } catch (error) {
            log.error('SignInScreen', 'Failed to check voice preferences, continuing to redirect', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId: freshUser.id,
            })
            // On error, continue with normal redirect
          }
        }

        const destination = redirectTo || '/'
        log.info('SignInScreen', 'Sign in successful, redirecting', {
          destination,
          userId: freshUser?.id,
        })
        router.replace(destination as any)
      } else {
        log.warn('SignInScreen', 'Sign in failed', {
          code: result.error.code,
          message: result.error.message,
        })

        toast.show(result.error.message, {
          type: 'error',
        })
      }
    } catch (error) {
      log.error('SignInScreen', 'Unexpected error during sign in', { error })
      toast.show('An unexpected error occurred', {
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      gap="$4"
      padding="$4"
      backgroundColor="$background"
      minHeight="100%"
    >
      <YStack
        gap="$2"
        alignItems="center"
      >
        <H2>Sign In</H2>
        <Paragraph color="$color10">Sign in to access your Solo:Level account</Paragraph>
      </YStack>

      <YStack
        gap="$3"
        width="100%"
        maxWidth={400}
      >
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Button
          onPress={handleSignIn}
          disabled={loading}
          backgroundColor="$blue10"
          color="white"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </YStack>

      {process.env.NODE_ENV === 'development' && (
        <YStack
          gap="$2"
          alignItems="center"
        >
          <Paragraph
            fontSize="$2"
            color="$color8"
          >
            Development Mode
          </Paragraph>
          <Paragraph
            fontSize="$1"
            color="$color8"
            textAlign="center"
          >
            Test auth will auto-sign you in if TEST_AUTH_ENABLED=true
          </Paragraph>
        </YStack>
      )}
    </YStack>
  )
}
