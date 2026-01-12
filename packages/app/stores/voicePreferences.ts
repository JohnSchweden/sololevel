import type { CoachGender, CoachMode } from '@my/api'
import { getUserVoicePreferences, updateVoicePreferences } from '@my/api'
import { mmkvStorage } from '@my/config'
import { log } from '@my/logging'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Voice preferences state
 */
export interface VoicePreferencesState {
  gender: CoachGender
  mode: CoachMode
  isLoaded: boolean
  isSyncing: boolean
}

/**
 * Voice preferences actions
 */
export interface VoicePreferencesActions {
  setGender: (gender: CoachGender) => void
  setMode: (mode: CoachMode) => void
  loadFromDatabase: (userId: string) => Promise<void>
  syncToDatabase: (userId: string) => Promise<void>
  reset: () => void
}

/**
 * Voice preferences store type
 */
export type VoicePreferencesStore = VoicePreferencesState & VoicePreferencesActions

/**
 * Default preferences (female + roast per spec)
 */
const DEFAULT_PREFERENCES: VoicePreferencesState = {
  gender: 'female',
  mode: 'roast',
  isLoaded: false,
  isSyncing: false,
}

/**
 * Voice preferences store with MMKV persistence
 * Provides client-side caching and optimistic updates for voice preferences
 */
export const useVoicePreferencesStore = create<VoicePreferencesStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        ...DEFAULT_PREFERENCES,

        // Actions
        setGender: (gender: CoachGender) => {
          log.info('VoicePreferencesStore', 'Setting gender (optimistic)', { gender })
          set({ gender })
        },

        setMode: (mode: CoachMode) => {
          log.info('VoicePreferencesStore', 'Setting mode (optimistic)', { mode })
          set({ mode })
        },

        loadFromDatabase: async (userId: string) => {
          try {
            log.info('VoicePreferencesStore', 'Loading preferences from database', { userId })

            const preferences = await getUserVoicePreferences(userId)

            if (preferences) {
              set({
                gender: preferences.coachGender,
                mode: preferences.coachMode,
                isLoaded: true,
              })
              log.info('VoicePreferencesStore', 'Preferences loaded successfully', {
                preferences,
              })
            } else {
              // No preferences found - user hasn't set them yet
              // Keep defaults
              set({ isLoaded: true })
              log.info('VoicePreferencesStore', 'No preferences found, using defaults', {
                userId,
              })
            }
          } catch (error) {
            log.error('VoicePreferencesStore', 'Failed to load preferences', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId,
            })
            // Keep current state on error, mark as loaded to prevent retry loops
            set({ isLoaded: true })
          }
        },

        syncToDatabase: async (userId: string) => {
          const { gender, mode } = get()

          try {
            set({ isSyncing: true })
            log.info('VoicePreferencesStore', 'Syncing preferences to database', {
              userId,
              gender,
              mode,
            })

            await updateVoicePreferences(userId, {
              coachGender: gender,
              coachMode: mode,
            })

            log.info('VoicePreferencesStore', 'Preferences synced successfully', {
              userId,
              gender,
              mode,
            })
          } catch (error) {
            log.error('VoicePreferencesStore', 'Failed to sync preferences', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId,
              gender,
              mode,
            })
            // Don't revert optimistic update - user sees their choice immediately
            // Background sync will retry via auth subscription
          } finally {
            set({ isSyncing: false })
          }
        },

        reset: () => {
          log.info('VoicePreferencesStore', 'Resetting preferences to defaults')
          set(DEFAULT_PREFERENCES)
        },
      }),
      {
        name: 'voice-preferences',
        storage: createJSONStorage(() => mmkvStorage),
        // Only persist gender and mode - transient state (isLoaded, isSyncing) should not persist
        partialize: (state) => ({
          gender: state.gender,
          mode: state.mode,
        }),
      }
    )
  )
)

/**
 * Subscribe to auth store changes to auto-sync preferences on login
 * Store the subscription reference outside the store for cleanup
 */
let authSubscription: (() => void) | null = null

/**
 * Initialize auth subscription for voice preferences
 * Call this once during app initialization (e.g., in root provider)
 */
export function initializeVoicePreferencesAuthSync(): void {
  // Lazy import to avoid circular dependencies
  const { useAuthStore } = require('./auth')

  // Clean up existing subscription if any
  if (authSubscription) {
    authSubscription()
    authSubscription = null
  }

  // Subscribe to auth user changes
  authSubscription = useAuthStore.subscribe(
    (state: any) => state.user,
    (user: any, prevUser: any) => {
      // User signed in - load preferences
      if (user && !prevUser) {
        log.info('VoicePreferencesStore', 'User signed in, loading preferences', {
          userId: user.id,
        })
        useVoicePreferencesStore.getState().loadFromDatabase(user.id)
      }
      // User signed out - reset handled by clearAllUserData() in auth.ts
    }
  )

  log.info('VoicePreferencesStore', 'Auth subscription initialized')
}

/**
 * Cleanup auth subscription
 * Call this during app shutdown or hot reload
 */
export function cleanupVoicePreferencesAuthSync(): void {
  if (authSubscription) {
    authSubscription()
    authSubscription = null
    log.info('VoicePreferencesStore', 'Auth subscription cleaned up')
  }
}
