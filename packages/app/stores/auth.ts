import { supabase } from '@my/api'
import { log } from '@my/logging'
import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

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
    loading: true,
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
          set({ loading: false })
        } else {
          set({ user: null, session: null, loading: false })
        }
      } catch (_error) {
        set({ loading: false })
      }
    },

    initialize: async (): Promise<void> => {
      log.debug('auth.ts', 'initialize() called, checking if already initialized')
      if (get().initialized) {
        log.debug('auth.ts', 'Already initialized, returning early')
        return
      }

      log.debug('auth.ts', 'Setting loading=true, initialized=false')
      set({ loading: true })

      try {
        log.debug('auth.ts', 'Calling supabase.auth.getSession()')
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        log.debug('auth.ts', 'getSession() completed', {
          hasSession: !!session,
          hasError: !!error,
          errorMessage: error?.message,
        })

        if (error) {
          log.error('auth.ts', 'Error getting session', { error: error.message })
          set({ loading: false, initialized: true })
        } else {
          log.debug('auth.ts', 'Session retrieved successfully, updating state')
          set({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          })
        }

        // Listen for auth changes - store subscription for cleanup
        log.debug('auth.ts', 'Setting up onAuthStateChange listener')
        authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
          log.debug('auth.ts', 'Auth state changed', {
            event: _event,
            hasSession: !!session,
          })
          set({
            user: session?.user ?? null,
            session,
            loading: false,
          })
        })
        log.debug('auth.ts', 'onAuthStateChange listener setup complete')
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
