import { log } from '@my/logging'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { mapAuthError as mapAuthErrorNew } from './authErrorMapping'

/**
 * Typed authentication result for successful operations
 */
export interface AuthSuccess<T = unknown> {
  success: true
  data: T
}

/**
 * Typed authentication result for failed operations
 */
export interface AuthFailure {
  success: false
  error: {
    code: string
    message: string
    originalError?: AuthError
  }
}

/**
 * Union type for authentication results
 */
export type AuthResult<T = unknown> = AuthSuccess<T> | AuthFailure

/**
 * Sign-in response data
 */
export interface SignInData {
  session: Session
  user: User
}

/**
 * Auth state change callback type
 */
export type AuthStateChangeCallback = (session: Session | null) => void

/**
 * Supabase authentication client wrapper with typed results and logging
 */
export const authClient = {
  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResult<SignInData>> {
    const correlationId = `signin_${Date.now()}_${Math.random().toString(36).slice(2)}`

    log.info('authClient', 'Attempting sign in', {
      correlationId,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
    })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error: mapAuthErrorNew(error),
        }
      }

      if (!data.session || !data.user) {
        log.error('authClient', 'Sign in returned no session or user', { correlationId })
        return {
          success: false,
          error: {
            code: 'no_session',
            message: 'Authentication failed. Please try again',
          },
        }
      }

      log.info('authClient', 'Sign in successful', {
        correlationId,
        userId: data.user.id,
      })

      return {
        success: true,
        data: {
          session: data.session,
          user: data.user,
        },
      }
    } catch (error) {
      log.error('authClient', 'Unexpected error during sign in', {
        correlationId,
        error,
      })

      return {
        success: false,
        error: {
          code: 'unexpected_error',
          message: 'An unexpected error occurred. Please try again',
        },
      }
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResult<void>> {
    const correlationId = `signout_${Date.now()}_${Math.random().toString(36).slice(2)}`

    log.info('authClient', 'Attempting sign out', { correlationId })

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          success: false,
          error: mapAuthErrorNew(error),
        }
      }

      log.info('authClient', 'Sign out successful', { correlationId })

      return {
        success: true,
        data: undefined,
      }
    } catch (error) {
      log.error('authClient', 'Unexpected error during sign out', {
        correlationId,
        error,
      })

      return {
        success: false,
        error: {
          code: 'unexpected_error',
          message: 'An unexpected error occurred during sign out',
        },
      }
    }
  },

  /**
   * Get current session
   */
  async getSession(): Promise<AuthResult<Session | null>> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        return {
          success: false,
          error: mapAuthErrorNew(error),
        }
      }

      return {
        success: true,
        data: data.session,
      }
    } catch (error) {
      log.error('authClient', 'Unexpected error getting session', { error })

      return {
        success: false,
        error: {
          code: 'unexpected_error',
          message: 'Failed to get session',
        },
      }
    }
  },

  /**
   * Get current user ID from session
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        return null
      }

      return data.session.user.id
    } catch (error) {
      log.error('authClient', 'Error getting current user ID', { error })
      return null
    }
  },

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const correlationId = `auth_listener_${Date.now()}_${Math.random().toString(36).slice(2)}`

    log.info('authClient', 'Setting up auth state listener', { correlationId })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      log.info('authClient', 'Auth state changed', {
        correlationId,
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      })

      callback(session)
    })

    // Return cleanup function
    return () => {
      log.info('authClient', 'Cleaning up auth state listener', { correlationId })
      subscription.unsubscribe()
    }
  },
}
