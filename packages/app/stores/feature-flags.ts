import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface FeatureFlags {
  // Development flags
  enableDevMode: boolean
  showDebugInfo: boolean
  useMockData: boolean

  // Feature flags
  enableNewUi: boolean
  enablePushNotifications: boolean
  enableAnalytics: boolean
  enableBetaFeatures: boolean

  // A/B test flags
  experimentNewOnboarding: boolean
  experimentNewNavigation: boolean
}

export interface FeatureFlagsState {
  flags: FeatureFlags
  loading: boolean
  lastUpdated: Date | null
}

export interface FeatureFlagsActions {
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void
  setFlags: (flags: Partial<FeatureFlags>) => void
  toggleFlag: (key: keyof FeatureFlags) => void
  resetFlags: () => void
  loadFlags: () => Promise<void>
}

export type FeatureFlagsStore = FeatureFlagsState & FeatureFlagsActions

// Default feature flags
const defaultFlags: FeatureFlags = {
  // Development
  enableDevMode: process.env.NODE_ENV === 'development',
  showDebugInfo: false,
  useMockData:
    process.env.NEXT_PUBLIC_USE_MOCKS === 'true' || process.env.EXPO_PUBLIC_USE_MOCKS === 'true',

  // Features
  enableNewUi: false,
  enablePushNotifications: true,
  enableAnalytics: true,
  enableBetaFeatures: false,

  // A/B tests
  experimentNewOnboarding: false,
  experimentNewNavigation: false,
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    flags: defaultFlags,
    loading: false,
    lastUpdated: null,

    // Actions
    setFlag: (key, value) => {
      set((state) => ({
        flags: { ...state.flags, [key]: value },
        lastUpdated: new Date(),
      }))
    },

    setFlags: (newFlags) => {
      set((state) => ({
        flags: { ...state.flags, ...newFlags },
        lastUpdated: new Date(),
      }))
    },

    toggleFlag: (key) => {
      set((state) => ({
        flags: { ...state.flags, [key]: !state.flags[key] },
        lastUpdated: new Date(),
      }))
    },

    resetFlags: () => {
      set({
        flags: defaultFlags,
        lastUpdated: new Date(),
      })
    },

    loadFlags: async () => {
      set({ loading: true })

      try {
        // In a real app, this would fetch from a feature flag service
        // For now, we'll use environment variables and local storage

        const envFlags: Partial<FeatureFlags> = {}

        // Check environment variables
        if (
          process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true' ||
          process.env.EXPO_PUBLIC_ENABLE_BETA_FEATURES === 'true'
        ) {
          envFlags.enableBetaFeatures = true
        }

        if (
          process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'false' ||
          process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'false'
        ) {
          envFlags.enableAnalytics = false
        }

        // Apply environment overrides
        if (Object.keys(envFlags).length > 0) {
          get().setFlags(envFlags)
        }

        set({ loading: false, lastUpdated: new Date() })
      } catch (error) {
        set({ loading: false })
      }
    },
  }))
)

// Note: Load feature flags in the provider to avoid SSR issues
