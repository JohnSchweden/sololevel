import { useAuth } from '@app/hooks/useAuth'
import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { initializeTestAuth } from '@my/app/auth/testAuthBootstrap'
import { log } from '@my/logging'
import { GlassBackground, GlassButton, H2, Input, Paragraph, Text, YStack } from '@my/ui'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { SignInScreenProps } from './types'

/**
 * Validates email format using a battle-tested regex pattern
 * Matches RFC 5322 compliant email addresses
 */
function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false
  }

  // Battle-tested email regex pattern (RFC 5322 compliant)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Sign In Screen - Framework-agnostic authentication screen
 *
 * **Navigation Pattern:**
 * - Screen is framework-agnostic, NO navigation imports
 * - onSignInSuccess callback for navigation (route file handles router.replace('/'))
 * - onAlreadyAuthenticated callback for redirect (route file handles router.replace('/'))
 */
export function SignInScreen({ onSignInSuccess, onAlreadyAuthenticated }: SignInScreenProps = {}) {
  const authResult = useAuth()
  const { signIn, isAuthenticated } = authResult
  const insets = useSafeArea()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const passwordInputRef = useRef<any>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  // Random roast message selection
  const roastMessages = [
    "Sign in. Or scroll away. We don't care.",
    "Sign in. You're not getting past this screen without it.",
    'Sign in to continue your journey with Solo:Level\n(Yes, "journey" is cringe. We know.)',
    'Sign in. Try at least.\n(We know you forgot your password.)',
    'Sign in\n(You know what to do.)',
    "Sign in. We both know you're going to anyway.",
    "Sign in. Or don't. We're not your parents.",
    "Sign in. The form's right there. Use it.",
    "Sign in. This screen isn't going anywhere.",
    "Sign in. Your videos are waiting.\n(They're not, but sign in anyway.)",
    "Sign in\n(It's not that hard.)",
    'Sign in. You came here for a reason.',
    'Sign in. Stop reading this and do it.',
    'Sign in. The button works. We tested it.',
    "Sign in. You're already here. Just do it.",
    "Sign in. Or close the app. Your choice.\n(It's not really a choice.)",
    "Sign in. We're not going to beg.",
    'Sign in\n(You know the drill.)',
  ]

  const [subtitleMessage] = useState(() => {
    return roastMessages[Math.floor(Math.random() * roastMessages.length)]
  })

  // Initialize test auth on mount if enabled
  useEffect(() => {
    initializeTestAuth()
  }, [])

  // Notify parent if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Route will log with redirect context, no need to duplicate here
      onAlreadyAuthenticated?.()
    }
  }, [isAuthenticated, onAlreadyAuthenticated])

  const handleSignIn = async () => {
    // Clear previous errors
    setEmailError(null)
    setPasswordError(null)
    setAuthError(null)

    // Validate fields
    let hasErrors = false
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setEmailError('Please enter your email')
      hasErrors = true
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      hasErrors = true
    }

    if (!password || password.trim() === '') {
      setPasswordError('Please enter your password')
      hasErrors = true
    }

    if (hasErrors) {
      return
    }

    setLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        log.info('SignInScreen', 'Sign in successful')
        // Clear any errors on success
        setEmailError(null)
        setPasswordError(null)
        setAuthError(null)
        // Clear fields on successful sign in
        setEmail('')
        setPassword('')
        onSignInSuccess?.()
      } else {
        log.warn('SignInScreen', 'Sign in failed', {
          code: result.error.code,
          message: result.error.message,
        })

        // Battle-tested pattern: Keep email, clear password for security
        // This allows users to correct password without re-typing email
        setPassword('')
        setAuthError(result.error.message)

        // Focus password field after clearing (better UX)
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          passwordInputRef.current?.focus?.()
        }, 100)
      }
    } catch (error) {
      log.error('SignInScreen', 'Unexpected error during sign in', { error })
      // Battle-tested pattern: Keep email, clear password for security
      setPassword('')
      setAuthError('An unexpected error occurred. Please try again.')

      // Focus password field after clearing
      setTimeout(() => {
        passwordInputRef.current?.focus?.()
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    // Clear email error when user starts typing
    if (emailError) {
      setEmailError(null)
    }
    // Clear auth error when user starts typing
    if (authError) {
      setAuthError(null)
    }
  }

  const handleEmailBlur = () => {
    // Validate email format when user leaves the field (if field is not empty)
    const trimmedEmail = email.trim()
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    // Clear password error when user starts typing
    if (passwordError) {
      setPasswordError(null)
    }
    // Clear auth error when user starts typing
    if (authError) {
      setAuthError(null)
    }
  }

  const handleInputFocus = (): void => {
    // Scroll to input when focused to ensure it's visible above keyboard
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="sign-in-screen"
    >
      <SafeAreaView
        edges={[]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              gap="$6"
              paddingHorizontal="$6"
              paddingTop={insets.top}
              paddingBottom={insets.bottom}
              overflow="visible"
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
                  letterSpacing={-0.85}
                >
                  Welcome to Solo:Level
                </H2>
                <Paragraph
                  fontSize="$4"
                  color="$color11"
                  textAlign="center"
                  maxWidth={280}
                >
                  {subtitleMessage}
                </Paragraph>
              </YStack>

              <YStack
                gap="$3"
                paddingHorizontal="$4"
              >
                {/* Auth Error Message */}
                {authError && (
                  <YStack
                    backgroundColor="$red2"
                    borderColor="$red6"
                    borderWidth={1}
                    borderRadius="$3"
                    padding="$3"
                    gap="$1"
                  >
                    <Text
                      fontSize="$3"
                      fontWeight="500"
                      color="$red11"
                      testID="auth-error-message"
                    >
                      {authError}
                    </Text>
                  </YStack>
                )}

                {/* Email Field */}
                <YStack gap="$1">
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={handleEmailChange}
                    onBlur={handleEmailBlur}
                    onFocus={handleInputFocus}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus?.()}
                    borderColor={emailError ? '$red8' : undefined}
                    testID="email-input"
                  />
                  {emailError && (
                    <Text
                      fontSize="$2"
                      color="$red10"
                      paddingLeft="$2"
                      testID="email-error-message"
                    >
                      {emailError}
                    </Text>
                  )}
                </YStack>

                {/* Password Field */}
                <YStack gap="$1">
                  <Input
                    ref={passwordInputRef}
                    placeholder="Password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={handleInputFocus}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    onSubmitEditing={handleSignIn}
                    returnKeyType="done"
                    borderColor={passwordError ? '$red8' : undefined}
                    testID="password-input"
                  />
                  {passwordError && (
                    <Text
                      fontSize="$2"
                      color="$red10"
                      paddingLeft="$2"
                      testID="password-error-message"
                    >
                      {passwordError}
                    </Text>
                  )}
                </YStack>

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
                  backgroundColor="transparent"
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  )
}
