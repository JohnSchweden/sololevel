import { authClient } from '@my/api'
import { log } from '@my/logging'

// Module-level singleton promise to ensure bootstrap runs exactly once
let bootstrapPromise: Promise<TestAuthBootstrapResult> | null = null

/**
 * Reset the bootstrap singleton - FOR TESTING ONLY
 * @internal
 */
export function _resetBootstrapForTesting(): void {
  bootstrapPromise = null
}

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

  // Allow in test, development, or when NODE_ENV is undefined
  const isAllowedEnv = !nodeEnv || nodeEnv === 'test' || nodeEnv === 'development'
  const isProductionBuild = expoEnv === 'production'

  if (!isAllowedEnv || isProductionBuild) {
    const error = `Test auth bootstrap is disabled in production builds (NODE_ENV: ${nodeEnv}, EXPO_PUBLIC_ENV: ${expoEnv})`
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
 * Uses EXPO_PUBLIC_ for both web and native (Metro bundler)
 */
function isTestAuthEnabled(): boolean {
  // Both web and native use EXPO_PUBLIC_ (Metro bundler)
  const enabled = process.env.EXPO_PUBLIC_TEST_AUTH_ENABLED || process.env.TEST_AUTH_ENABLED

  return enabled === 'true' || enabled === '1'
}

/**
 * Get test auth credentials from environment variables
 * Reads platform-aware env vars with fallback to generic TEST_AUTH_*
 * Uses EXPO_PUBLIC_ for both web and native (Metro bundler)
 */
function getTestAuthCredentials(): { email: string; password: string } | null {
  // Both web and native use EXPO_PUBLIC_ (Metro bundler)
  const email = process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL || process.env.TEST_AUTH_EMAIL
  const password = process.env.EXPO_PUBLIC_TEST_AUTH_PASSWORD || process.env.TEST_AUTH_PASSWORD

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
 *
 * Uses singleton pattern: Multiple concurrent calls return the same promise.
 */
export async function testAuthBootstrap(): Promise<TestAuthBootstrapResult> {
  // Return existing promise if bootstrap already in progress or completed
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  // Create and store the bootstrap promise
  bootstrapPromise = executeBootstrap()
  return bootstrapPromise
}

/**
 * Internal bootstrap execution function
 * Separated from testAuthBootstrap() to enable singleton pattern
 */
async function executeBootstrap(): Promise<TestAuthBootstrapResult> {
  const correlationId = `test_auth_${Date.now()}_${Math.random().toString(36).slice(2)}`

  try {
    log.info('testAuthBootstrap', 'Starting test auth bootstrap', { correlationId })

    // Build-time guard: prevent usage in production
    const envValidation = validateEnvironment()
    if (!envValidation.success) {
      return envValidation
    }

    // Check if test auth is enabled
    if (!isTestAuthEnabled()) {
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

      // Note: Navigation after auto-sign-in is handled by the calling component
      // (e.g., sign-in screen's useEffect that watches isAuthenticated)
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
 *
 * Safe to call multiple times - uses singleton pattern internally
 */
export async function initializeTestAuth(): Promise<void> {
  if (!isTestAuthEnabled()) {
    return
  }

  const result = await testAuthBootstrap()

  if (!result.success && result.error) {
    // Log error but don't throw - app should still start
    log.error('testAuthBootstrap', 'Failed to initialize test auth', {
      error: result.error,
    })
  }
}
