import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface FeatureFlags {
  // Development flags
  enableDevMode: boolean
  showDebugInfo: boolean
  useMockData: boolean
  simulateAnalysisFailure: boolean // Simulate failed analysis for testing retry UI

  // Camera implementation flags
  useVisionCamera: boolean // true = VisionCamera (dev build), false = Expo Camera (Expo Go)

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
  useMockData: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  simulateAnalysisFailure: false, // Set to true to test retry UI

  // Camera implementation
  useVisionCamera: process.env.EXPO_PUBLIC_USE_VISION_CAMERA !== 'false', // Default true, override with env

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
        if (process.env.EXPO_PUBLIC_ENABLE_BETA_FEATURES === 'true') {
          envFlags.enableBetaFeatures = true
        }

        if (process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'false') {
          envFlags.enableAnalytics = false
        }

        // Camera implementation flag
        if (process.env.EXPO_PUBLIC_USE_VISION_CAMERA === 'true') {
          envFlags.useVisionCamera = true
        } else if (process.env.EXPO_PUBLIC_USE_VISION_CAMERA === 'false') {
          envFlags.useVisionCamera = false
        }

        // Apply environment overrides
        if (Object.keys(envFlags).length > 0) {
          get().setFlags(envFlags)
        }

        set({ loading: false, lastUpdated: new Date() })
      } catch (_error) {
        set({ loading: false })
      }
    },
  }))
)

// Development helper: Expose feature flags to console for manual testing
// Usage in browser console:
//   window.__toggleSimulateAnalysisFailure() // Toggle the flag
//   window.__getFeatureFlags() // View all flags
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const store = useFeatureFlagsStore.getState()
  ;(window as any).__toggleSimulateAnalysisFailure = () => {
    store.toggleFlag('simulateAnalysisFailure')
    const current = store.flags.simulateAnalysisFailure
    console.log(
      `✅ simulateAnalysisFailure: ${current ? 'ENABLED' : 'DISABLED'}`,
      current
        ? '\n📝 Analysis will now appear as failed.\n\nTo test:\n1. Upload a video (or navigate to an existing analysis)\n2. You\'ll immediately see the error screen with "Try Again" button\n3. Click "Try Again" to test the retry functionality\n\nNote: The error is simulated - retry will create a real analysis job.'
        : '\n📝 Analysis will work normally now.'
    )
  }
  ;(window as any).__getFeatureFlags = () => {
    return store.flags
  }
  ;(window as any).__setSimulateAnalysisFailure = (value: boolean) => {
    store.setFlag('simulateAnalysisFailure', value)
    console.log(`✅ simulateAnalysisFailure set to: ${value}`)
  }
}

// Note: Load feature flags in the provider to avoid SSR issues
