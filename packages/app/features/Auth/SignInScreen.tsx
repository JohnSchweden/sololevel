import { useAuth } from '@app/hooks/useAuth'
import { initializeTestAuth } from '@my/app/auth/testAuthBootstrap'
import { log } from '@my/logging'
import {
  GlassBackground,
  GlassButton,
  H2,
  Input,
  Paragraph,
  YStack,
  useToastController,
} from '@my/ui'
import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { SignInScreenProps } from './types'

/**
 * Sign In Screen - Framework-agnostic authentication screen
 *
 * **Navigation Pattern:**
 * - Screen is framework-agnostic, NO navigation imports
 * - onSignInSuccess callback for navigation (route file handles router.replace('/'))
 * - onAlreadyAuthenticated callback for redirect (route file handles router.replace('/'))
 */
export function SignInScreen({ onSignInSuccess, onAlreadyAuthenticated }: SignInScreenProps = {}) {
  const { signIn, isAuthenticated } = useAuth()
  const toast = useToastController()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize test auth on mount if enabled
  useEffect(() => {
    initializeTestAuth()
  }, [])

  // Notify parent if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      log.info('SignInScreen', 'User already authenticated')
      onAlreadyAuthenticated?.()
    }
  }, [isAuthenticated, onAlreadyAuthenticated])

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
        log.info('SignInScreen', 'Sign in successful')
        onSignInSuccess?.()
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
    <GlassBackground
      backgroundColor="$color3"
      testID="sign-in-screen"
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          gap="$6"
          paddingHorizontal="$6"
          paddingVertical="$8"
        >
          {/* Header Section */}
          <YStack
            gap="$3"
            alignItems="center"
          >
            <H2
              fontSize={24}
              fontWeight="600"
              color="$color12"
              textAlign="center"
            >
              Welcome Back
            </H2>
            <Paragraph
              fontSize="$4"
              color="$color11"
              textAlign="center"
              maxWidth={280}
            >
              Sign in to continue your journey with Solo:Level
            </Paragraph>
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
            />

            <GlassButton
              onPress={handleSignIn}
              disabled={loading}
              testID="sign-in-button"
              accessibilityLabel="Sign in"
              minHeight={44}
              minWidth="100%"
              borderRadius="$4"
              borderWidth={1.1}
              borderColor="$color12"
              blurIntensity={0}
              blurTint="light"
              variant="variant2"
              overlayOpacity={0.2}
            >
              <Paragraph
                fontSize="$3"
                fontWeight="400"
                color="$color12"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Paragraph>
            </GlassButton>
          </YStack>

          {__DEV__ && (
            <YStack
              gap="$2"
              alignItems="center"
            >
              <Paragraph
                fontSize="$3"
                color="$color10"
              >
                Development Mode
              </Paragraph>
              <Paragraph
                fontSize="$1"
                color="$color10"
                textAlign="center"
              >
                Test auth will auto-sign you in if TEST_AUTH_ENABLED=true
              </Paragraph>
            </YStack>
          )}
        </YStack>
      </SafeAreaView>
    </GlassBackground>
  )
}
