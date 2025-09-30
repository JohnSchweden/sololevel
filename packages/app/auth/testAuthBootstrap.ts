import { authClient } from '@my/api'
import { log } from '@my/logging'

/**
 * Result of test auth bootstrap operation
 */
export interface TestAuthBootstrapResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Build-time guard to prevent test auth in production
 */
function validateEnvironment(): TestAuthBootstrapResult {
  // Check if we're in production build
  const nodeEnv = process.env.NODE_ENV
  const expoEnv = process.env.EXPO_PUBLIC_ENV
  const nextEnv = process.env.NEXT_PUBLIC_ENV

  // Allow in test, development, or when NODE_ENV is undefined
  const isAllowedEnv = !nodeEnv || nodeEnv === 'test' || nodeEnv === 'development'
  const isProductionBuild = expoEnv === 'production' || nextEnv === 'production'

  if (!isAllowedEnv || isProductionBuild) {
    const error = `Test auth bootstrap is disabled in production builds (NODE_ENV: ${nodeEnv}, EXPO_PUBLIC_ENV: ${expoEnv}, NEXT_PUBLIC_ENV: ${nextEnv})`
    log.error('testAuthBootstrap', error)
    return {
      success: false,
      message: '',
      error,
    }
  }

  return { success: true, message: 'Environment validation passed' }
}

/**
 * Check if test auth is enabled via environment variables
 * Reads platform-aware env vars with fallback to generic TEST_AUTH_ENABLED
 */
function isTestAuthEnabled(): boolean {
  // Try platform-specific env vars first, then fallback to generic
  const enabled =
    process.env.EXPO_PUBLIC_TEST_AUTH_ENABLED ||
    process.env.NEXT_PUBLIC_TEST_AUTH_ENABLED ||
    process.env.TEST_AUTH_ENABLED

  const result = enabled === 'true' || enabled === '1'

  // Log resolved values for debugging
  log.info('testAuthBootstrap', 'Resolved TEST_AUTH_ENABLED', {
    expoPublic: process.env.EXPO_PUBLIC_TEST_AUTH_ENABLED,
    nextPublic: process.env.NEXT_PUBLIC_TEST_AUTH_ENABLED,
    generic: process.env.TEST_AUTH_ENABLED,
    resolved: enabled,
    enabled: result,
  })

  return result
}

/**
 * Get test auth credentials from environment variables
 * Reads platform-aware env vars with fallback to generic TEST_AUTH_*
 */
function getTestAuthCredentials(): { email: string; password: string } | null {
  // Try platform-specific env vars first, then fallback to generic
  const email =
    process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL ||
    process.env.NEXT_PUBLIC_TEST_AUTH_EMAIL ||
    process.env.TEST_AUTH_EMAIL

  const password =
    process.env.EXPO_PUBLIC_TEST_AUTH_PASSWORD ||
    process.env.NEXT_PUBLIC_TEST_AUTH_PASSWORD ||
    process.env.TEST_AUTH_PASSWORD

  // Log resolved values for debugging (mask password)
  log.info('testAuthBootstrap', 'Resolved test auth credentials', {
    emailResolved: email ? 'present' : 'missing',
    passwordResolved: password ? 'present' : 'missing',
    expoEmail: process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL ? 'present' : 'missing',
    nextEmail: process.env.NEXT_PUBLIC_TEST_AUTH_EMAIL ? 'present' : 'missing',
    genericEmail: process.env.TEST_AUTH_EMAIL ? 'present' : 'missing',
  })

  if (!email || !password) {
    return null
  }

  return { email, password }
}

/**
 * Test Auth Bootstrap
 *
 * Automatically signs in with test credentials when:
 * - TEST_AUTH_ENABLED=true
 * - TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD are set
 * - User is not already authenticated
 * - Not in production build
 *
 * This enables seamless development and testing workflows.
 */
export async function testAuthBootstrap(): Promise<TestAuthBootstrapResult> {
  const correlationId = `test_auth_${Date.now()}_${Math.random().toString(36).slice(2)}`

  log.info('testAuthBootstrap', 'Starting test auth bootstrap', { correlationId })

  // Build-time guard: prevent usage in production
  const envValidation = validateEnvironment()
  if (!envValidation.success) {
    return envValidation
  }

  // Check if test auth is enabled
  if (!isTestAuthEnabled()) {
    log.info('testAuthBootstrap', 'Test auth not enabled', { correlationId })
    return {
      success: true,
      message: 'Test auth not enabled',
    }
  }

  // Get test credentials
  const credentials = getTestAuthCredentials()
  if (!credentials) {
    const error = 'Test auth enabled but TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD are not set'
    log.error('testAuthBootstrap', error, { correlationId })
    return {
      success: false,
      message: '',
      error,
    }
  }

  try {
    // Check if user is already authenticated
    const currentUserId = await authClient.getCurrentUserId()
    if (currentUserId) {
      log.info('testAuthBootstrap', 'User already authenticated', {
        correlationId,
        userId: currentUserId,
      })
      return {
        success: true,
        message: 'User already authenticated',
      }
    }

    // Attempt to sign in with test credentials
    log.info('testAuthBootstrap', 'Attempting test user sign in', {
      correlationId,
      email: credentials.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
    })

    const signInResult = await authClient.signInWithPassword(
      credentials.email,
      credentials.password
    )

    if (signInResult.success) {
      log.info('testAuthBootstrap', 'Test auth bootstrap successful', {
        correlationId,
        userId: signInResult.data.user.id,
      })

      return {
        success: true,
        message: 'Test auth bootstrap completed successfully',
      }
    }

    const error = `Test auth sign in failed: ${signInResult.error.message}`
    log.error('testAuthBootstrap', error, {
      correlationId,
      errorCode: signInResult.error.code,
    })

    return {
      success: false,
      message: '',
      error,
    }
  } catch (error) {
    const errorMessage = `Test auth bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    log.error('testAuthBootstrap', errorMessage, { correlationId, error })

    return {
      success: false,
      message: '',
      error: errorMessage,
    }
  }
}

/**
 * Initialize test auth bootstrap on app start
 * Call this in your app's initialization code
 */
export async function initializeTestAuth(): Promise<void> {
  if (!isTestAuthEnabled()) {
    return
  }

  log.info('testAuthBootstrap', 'Initializing test auth on app start')

  const result = await testAuthBootstrap()

  if (!result.success && result.error) {
    // Log error but don't throw - app should still start
    log.error('testAuthBootstrap', 'Failed to initialize test auth', {
      error: result.error,
    })
  }
}
