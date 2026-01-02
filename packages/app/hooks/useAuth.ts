import { type AuthResult, type SignInData, authClient } from '@my/api'
import { log } from '@my/logging'
import { useCallback, useEffect, useMemo } from 'react'
import { useAuthStore } from '../stores/auth'

/**
 * Auth hook that provides authentication state and actions
 * Uses the new typed authClient and integrates with Zustand store
 *
 * NOTE: Auth state listener is set up in the auth store's initialize() method.
 * This hook only provides convenient access to store state and actions.
 */
export function useAuth() {
  const { user, session, loading, initialized, setAuth, setLoading, setInitialized } =
    useAuthStore()

  /**
   * Initialize auth state and set up listeners
   * Delegates to the auth store's initialize() method
   */
  const initialize = useCallback(async () => {
    if (initialized) return

    log.info('useAuth', 'Initializing auth state')
    setLoading(true)

    try {
      // Get initial session using our typed auth client
      const sessionResult = await authClient.getSession()

      if (sessionResult.success && sessionResult.data) {
        setAuth(sessionResult.data.user, sessionResult.data)
        log.info('useAuth', 'Found existing session', {
          userId: sessionResult.data.user.id,
        })
      } else {
        setAuth(null, null)
        log.info('useAuth', 'No existing session found')
      }

      // NOTE: Auth state listener is set up in auth store initialize()
      // We don't set up a duplicate listener here

      setInitialized(true)
      setLoading(false)

      // No cleanup function needed - auth store manages the listener
      return undefined
    } catch (error) {
      log.error('useAuth', 'Failed to initialize auth', { error })
      setAuth(null, null)
      setInitialized(true)
      setLoading(false)
      return undefined
    }
  }, [initialized, setAuth, setLoading, setInitialized])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult<SignInData>> => {
      log.info('useAuth', 'Attempting sign in', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
      })

      setLoading(true)

      const result = await authClient.signInWithPassword(email, password)

      if (result.success) {
        // Auth state will be updated via the listener
        // BUT: We should also set it immediately to avoid race conditions
        // The listener is async and may fire after navigation
        setAuth(result.data.user, result.data.session)
        log.info('useAuth', 'Sign in successful', {
          userId: result.data.user.id,
        })
      } else {
        log.warn('useAuth', 'Sign in failed', {
          code: result.error.code,
          message: result.error.message,
        })
      }

      setLoading(false)
      return result
    },
    [setAuth, setLoading]
  )

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<AuthResult<void>> => {
    log.info('useAuth', 'Attempting sign out')
    setLoading(true)

    const result = await authClient.signOut()

    if (result.success) {
      // Auth state will be updated via the listener
      log.info('useAuth', 'Sign out successful')
    } else {
      log.warn('useAuth', 'Sign out failed', {
        code: result.error.code,
        message: result.error.message,
      })
    }

    setLoading(false)
    return result
  }, [setLoading])

  /**
   * Get current user ID (convenience method)
   */
  const userId = user?.id ?? null

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user && !!session

  // Initialize on mount - no cleanup needed (auth store handles listener)
  useEffect(() => {
    initialize()
  }, [initialize])

  // Memoize return object to prevent unnecessary re-renders in consumers
  // This ensures stable reference when dependencies haven't changed
  return useMemo(
    () => ({
      // State
      user,
      session,
      loading,
      initialized,
      userId,
      isAuthenticated,

      // Actions
      signIn,
      signOut,
      initialize,
    }),
    [user, session, loading, initialized, userId, isAuthenticated, signIn, signOut, initialize]
  )
}
