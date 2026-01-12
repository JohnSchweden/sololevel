import { supabase } from '@my/api'
import { log, logBreadcrumb } from '@my/logging'
import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Lazy import query client to avoid circular dependencies
let getQueryClient: (() => any) | null = null
function lazyGetQueryClient() {
  if (!getQueryClient) {
    const { getQueryClient: imported } = require('../provider/QueryProvider')
    getQueryClient = imported
  }
  return getQueryClient?.()
}

/**
 * Clear all user-specific cached data across the application
 * This includes TanStack Query cache and feature-specific Zustand stores
 */
function clearAllUserData(): void {
  log.info('auth.ts', 'Clearing all user-specific cached data')

  // 1. Clear TanStack Query cache (server data, API responses)
  try {
    const queryClient = lazyGetQueryClient()
    if (queryClient) {
      queryClient.clear()
      log.debug('auth.ts', 'TanStack Query cache cleared')
    }
  } catch (cacheError) {
    log.warn('auth.ts', 'Failed to clear query cache', { error: cacheError })
  }

  // 2. Clear feature-specific Zustand stores
  try {
    // Video History cache (already has subscription-based cleanup, but clear explicitly)
    const { useVideoHistoryStore } = require('../features/HistoryProgress/stores/videoHistory')
    useVideoHistoryStore.getState().clearCache()
    log.debug('auth.ts', 'Video history cache cleared')
  } catch (error) {
    log.warn('auth.ts', 'Failed to clear video history cache', { error })
  }

  try {
    // Video Analysis stores - REMOVED: useAnalysisStatusStore migrated to TanStack Query
    // TanStack Query cache clears automatically on logout, no explicit reset needed
    log.debug('auth.ts', 'Analysis status store reset (migrated to TanStack Query)')
  } catch (error) {
    log.warn('auth.ts', 'Failed to reset analysis status', { error })
  }

  try {
    // Upload progress
    const { useUploadProgressStore } = require('../features/VideoAnalysis/stores/uploadProgress')
    useUploadProgressStore.getState().clearAll()
    log.debug('auth.ts', 'Upload progress store cleared')
  } catch (error) {
    log.warn('auth.ts', 'Failed to clear upload progress', { error })
  }

  try {
    // Feedback status
    const { useFeedbackStatusStore } = require('../features/VideoAnalysis/stores/feedbackStatus')
    useFeedbackStatusStore.getState().reset()
    log.debug('auth.ts', 'Feedback status store reset')
  } catch (error) {
    log.warn('auth.ts', 'Failed to reset feedback status', { error })
  }

  try {
    // Feedback audio store (session state and persisted audio paths)
    const { useFeedbackAudioStore } = require('../features/VideoAnalysis/stores/feedbackAudio')
    useFeedbackAudioStore.getState().reset()
    log.debug('auth.ts', 'Feedback audio store reset')
  } catch (error) {
    log.warn('auth.ts', 'Failed to reset feedback audio store', { error })
  }

  try {
    // Voice preferences store (user's coach gender/mode selections)
    const { useVoicePreferencesStore } = require('./voicePreferences')
    useVoicePreferencesStore.getState().reset()
    log.debug('auth.ts', 'Voice preferences store reset')
  } catch (error) {
    log.warn('auth.ts', 'Failed to reset voice preferences store', { error })
  }

  // Note: Keep theme and feature flags (not user-specific)
  log.info('auth.ts', 'User data cleanup completed')
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

export interface AuthActions {
  setAuth: (user: User | null, session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  cleanup: () => void
}

export type AuthStore = AuthState & AuthActions

// Store the auth subscription reference outside the store for cleanup
let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    user: null,
    session: null,
    loading: true, // Start as true - we haven't checked auth yet, show loading until initialized
    initialized: false,

    // Actions
    setAuth: (user, session) => {
      set({ user, session, loading: false })
    },

    setLoading: (loading) => {
      set({ loading })
    },

    setInitialized: (initialized) => {
      set({ initialized })
    },

    signOut: async () => {
      set({ loading: true })
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          log.error('auth.ts', 'Sign out error', { error: error.message })
          set({ loading: false })
        } else {
          log.info('auth.ts', 'Sign out successful')
          logBreadcrumb('auth', 'User signed out', {
            userId: get().user?.id,
          })

          // Clear all user-specific cached data
          clearAllUserData()

          // Clear auth state (triggers additional cleanup via subscriptions)
          set({ user: null, session: null, loading: false })
          log.debug('auth.ts', 'Auth state cleared')
        }
      } catch (_error) {
        log.error('auth.ts', 'Exception during sign out', { error: _error })
        set({ loading: false })
      }
    },

    initialize: async (): Promise<void> => {
      if (get().initialized) {
        return
      }

      // CRITICAL FIX: Check cached session first (synchronous, <100ms)
      // This prevents 2.07s blocking delay before UI becomes interactive
      // Fast path: Use cached session immediately, validate in background
      // NOTE: URL mismatch check happens synchronously in supabase.ts before client creation
      try {
        const {
          data: { session: cachedSession },
        } = await supabase.auth.getSession()

        if (cachedSession) {
          // STALE TOKEN FIX: Check if token is expired BEFORE trusting it
          // expires_at is Unix timestamp in seconds, add 60s buffer for clock skew
          const expiresAtMs = cachedSession.expires_at ? cachedSession.expires_at * 1000 : 0
          const bufferMs = 60 * 1000 // 60 second safety buffer
          const isExpired = expiresAtMs > 0 && expiresAtMs - bufferMs < Date.now()

          if (isExpired) {
            // Token expired - skip fast path, force full validation
            log.warn('auth.ts', 'Cached session expired, skipping fast path', {
              expiresAt: new Date(expiresAtMs).toISOString(),
              now: new Date().toISOString(),
              expiredByMs: Date.now() - expiresAtMs,
            })
            // Fall through to slow path below
          } else {
            // Token valid - use fast path
            set({
              session: cachedSession,
              user: cachedSession.user,
              loading: false,
              initialized: true,
            })

            log.info('auth.ts', 'Using cached session (fast path)', {
              userId: cachedSession.user.id,
              expiresIn: Math.round((expiresAtMs - Date.now()) / 1000),
            })

            // Validate session with SERVER (not cache) in background
            // CRITICAL: Use getUser() not getSession() - getUser() validates with server
            // This catches tokens that are valid by timestamp but revoked server-side
            supabase.auth
              .getUser()
              .then(async ({ data: { user }, error }) => {
                // Detect URL/server mismatch (e.g., switching from remote to local)
                // "invalid kid" means token was signed by different server - clear session silently
                const isUrlMismatch =
                  error?.message?.includes('invalid kid') ||
                  error?.message?.includes('unable to parse or verify signature') ||
                  error?.message?.includes('token is unverifiable')

                if (isUrlMismatch) {
                  // URL/server changed - clear session directly without signOut
                  // This avoids triggering MMKV delete errors and handles URL changes gracefully
                  log.warn(
                    'auth.ts',
                    'Session from different server (URL changed), clearing session',
                    {
                      error: error?.message,
                    }
                  )
                  set({ session: null, user: null })
                  return
                }

                // Only sign out on EXPLICIT auth errors, not network failures
                // Network errors should NOT log users out - that's terrible UX
                const isAuthError =
                  error?.message?.includes('invalid') ||
                  error?.message?.includes('expired') ||
                  error?.message?.includes('revoked') ||
                  error?.message?.includes('401') ||
                  error?.status === 401

                if (isAuthError) {
                  // Token genuinely invalid on server - sign out
                  log.warn('auth.ts', 'Session invalid on server, signing out', {
                    error: error?.message,
                  })
                  await supabase.auth.signOut()
                  set({ session: null, user: null })
                } else if (error) {
                  // Network error or transient failure - keep session, don't log out
                  log.warn('auth.ts', 'Session validation failed (network?), keeping session', {
                    error: error?.message,
                  })
                } else if (!user) {
                  // No user but no error - weird state, sign out
                  log.warn('auth.ts', 'No user returned from getUser, signing out')
                  await supabase.auth.signOut()
                  set({ session: null, user: null })
                } else if (user.id !== cachedSession.user.id) {
                  // Different user - this shouldn't happen, but handle it
                  log.warn('auth.ts', 'User mismatch, signing out')
                  await supabase.auth.signOut()
                  set({ session: null, user: null })
                } else {
                  log.debug('auth.ts', 'Cached session validated with server')
                }
              })
              .catch((err) => {
                // Network error - absolutely do NOT sign out
                log.warn(
                  'auth.ts',
                  'Background session validation failed (network), keeping session',
                  {
                    error: err instanceof Error ? err.message : String(err),
                    errorType: err?.constructor?.name,
                    errorStack: err instanceof Error ? err.stack : undefined,
                  }
                )
              })

            // Setup auth listener in background
            setTimeout(() => {
              if (!authSubscription) {
                authSubscription = supabase.auth.onAuthStateChange((event, session) => {
                  if (__DEV__) {
                    log.debug('auth.ts', 'Auth state changed', { event, hasSession: !!session })
                  }
                  set({ user: session?.user ?? null, session })
                })
              }
            }, 500)

            return // Exit early - UI is already interactive
          }
        }
      } catch (cacheError) {
        log.warn('auth.ts', 'Failed to get cached session, proceeding with full initialization', {
          error: cacheError,
        })
      }

      // Slow path: No cached session, do full initialization
      set({ loading: true })
      log.info('auth.ts', 'No cached session, full initialization required')

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          log.error('auth.ts', 'Error getting session', { error: error.message })
          set({ loading: false, initialized: true })
        } else {
          set({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          })
        }

        // Listen for auth changes - store subscription for cleanup
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          if (__DEV__) {
            log.debug('auth.ts', 'Auth state changed', { event, hasSession: !!session })
          }

          // Track sign in events with breadcrumbs
          if (event === 'SIGNED_IN' && session?.user) {
            logBreadcrumb('auth', 'User signed in', {
              userId: session.user.id,
              email: session.user.email,
            })
          }

          set({
            user: session?.user ?? null,
            session,
            loading: false,
          })
        })
      } catch (_error) {
        log.error('auth.ts', 'Exception in initialize()', { error: _error })
        set({ loading: false, initialized: true })
      }
    },

    cleanup: () => {
      // Unsubscribe from auth changes
      if (authSubscription) {
        authSubscription.data.subscription.unsubscribe()
        authSubscription = null
      }

      // Reset state
      set({
        user: null,
        session: null,
        loading: false,
        initialized: false,
      })
    },
  }))
)

// Note: Initialize auth in the app provider, not here to avoid SSR issues
