import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@my/api'

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
}

export type AuthStore = AuthState & AuthActions

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
          console.error('Error signing out:', error)
          set({ loading: false })
        } else {
          set({ user: null, session: null, loading: false })
        }
      } catch (error) {
        console.error('Unexpected error during sign out:', error)
        set({ loading: false })
      }
    },

    initialize: async () => {
      if (get().initialized) return

      set({ loading: true })

      try {
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          set({ loading: false, initialized: true })
        } else {
          set({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          })
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          set({
            user: session?.user ?? null,
            session,
            loading: false,
          })
        })

        // Note: subscription cleanup would be handled by the component using this store
      } catch (error) {
        console.error('Error initializing auth:', error)
        set({ loading: false, initialized: true })
      }
    },
  }))
)

// Note: Initialize auth in the app provider, not here to avoid SSR issues
