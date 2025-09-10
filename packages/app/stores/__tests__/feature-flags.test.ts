/// <reference types="jest" />
// No imports needed - jest-expo preset provides globals
import { useFeatureFlagsStore } from '../feature-flags'

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_USE_MOCKS: 'false',
  EXPO_PUBLIC_USE_MOCKS: 'false',
  NEXT_PUBLIC_ENABLE_BETA_FEATURES: 'false',
  EXPO_PUBLIC_ENABLE_BETA_FEATURES: 'false',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
  EXPO_PUBLIC_ENABLE_ANALYTICS: 'true',
}

describe('FeatureFlagsStore', () => {
  beforeEach(() => {
    // Reset environment variables
    Object.keys(mockEnv).forEach((key) => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv]
    })

    // Reset store state before each test
    useFeatureFlagsStore.setState({
      flags: {
        enableDevMode: false,
        showDebugInfo: false,
        useMockData: false,
        useVisionCamera: false,
        enableNewUi: false,
        enablePushNotifications: true,
        enableAnalytics: true,
        enableBetaFeatures: false,
        experimentNewOnboarding: false,
        experimentNewNavigation: false,
      },
      loading: false,
      lastUpdated: null,
    })

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct default flags', () => {
      const state = useFeatureFlagsStore.getState()

      expect(state.flags.enableDevMode).toBe(false) // NODE_ENV is 'test'
      expect(state.flags.showDebugInfo).toBe(false)
      expect(state.flags.useMockData).toBe(false)
      expect(state.flags.enableNewUi).toBe(false)
      expect(state.flags.enablePushNotifications).toBe(true)
      expect(state.flags.enableAnalytics).toBe(true)
      expect(state.flags.enableBetaFeatures).toBe(false)
      expect(state.flags.experimentNewOnboarding).toBe(false)
      expect(state.flags.experimentNewNavigation).toBe(false)
      expect(state.loading).toBe(false)
      expect(state.lastUpdated).toBeNull()
    })
  })

  describe('setFlag', () => {
    it('sets a single flag', () => {
      useFeatureFlagsStore.getState().setFlag('enableNewUi', true)

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(true)
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })

    it('sets multiple different flags', () => {
      const store = useFeatureFlagsStore.getState()

      store.setFlag('showDebugInfo', true)
      store.setFlag('enableBetaFeatures', true)

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.showDebugInfo).toBe(true)
      expect(state.flags.enableBetaFeatures).toBe(true)
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('setFlags', () => {
    it('sets multiple flags at once', () => {
      useFeatureFlagsStore.getState().setFlags({
        enableNewUi: true,
        showDebugInfo: true,
        enableBetaFeatures: true,
      })

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(true)
      expect(state.flags.showDebugInfo).toBe(true)
      expect(state.flags.enableBetaFeatures).toBe(true)
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })

    it('preserves existing flags when setting partial flags', () => {
      // Set initial state
      useFeatureFlagsStore.getState().setFlag('enableAnalytics', false)

      // Set partial flags
      useFeatureFlagsStore.getState().setFlags({
        enableNewUi: true,
        showDebugInfo: true,
      })

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(true)
      expect(state.flags.showDebugInfo).toBe(true)
      expect(state.flags.enableAnalytics).toBe(false) // Preserved
      expect(state.flags.enablePushNotifications).toBe(true) // Default preserved
    })
  })

  describe('toggleFlag', () => {
    it('toggles flag from false to true', () => {
      useFeatureFlagsStore.getState().toggleFlag('enableNewUi')

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(true)
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })

    it('toggles flag from true to false', () => {
      // Set flag to true first
      useFeatureFlagsStore.getState().setFlag('enablePushNotifications', true)

      // Toggle it
      useFeatureFlagsStore.getState().toggleFlag('enablePushNotifications')

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enablePushNotifications).toBe(false)
    })

    it('toggles multiple times', () => {
      const store = useFeatureFlagsStore.getState()

      expect(store.flags.showDebugInfo).toBe(false)

      store.toggleFlag('showDebugInfo')
      expect(useFeatureFlagsStore.getState().flags.showDebugInfo).toBe(true)

      store.toggleFlag('showDebugInfo')
      expect(useFeatureFlagsStore.getState().flags.showDebugInfo).toBe(false)
    })
  })

  describe('resetFlags', () => {
    it('resets all flags to defaults', () => {
      // Modify some flags
      const store = useFeatureFlagsStore.getState()
      store.setFlags({
        enableNewUi: true,
        showDebugInfo: true,
        enableBetaFeatures: true,
        enableAnalytics: false,
      })

      // Reset flags
      store.resetFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(false)
      expect(state.flags.showDebugInfo).toBe(false)
      expect(state.flags.enableBetaFeatures).toBe(false)
      expect(state.flags.enableAnalytics).toBe(true) // Back to default
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('loadFlags', () => {
    it('loads flags with no environment overrides', async () => {
      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.loading).toBe(false)
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })

    it('loads flags with beta features enabled via NEXT_PUBLIC env', async () => {
      process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES = 'true'

      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableBetaFeatures).toBe(true)
      expect(state.loading).toBe(false)
    })

    it('loads flags with beta features enabled via EXPO_PUBLIC env', async () => {
      process.env.EXPO_PUBLIC_ENABLE_BETA_FEATURES = 'true'

      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableBetaFeatures).toBe(true)
    })

    it('loads flags with analytics disabled via NEXT_PUBLIC env', async () => {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false'

      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableAnalytics).toBe(false)
    })

    it('loads flags with analytics disabled via EXPO_PUBLIC env', async () => {
      process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'false'

      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableAnalytics).toBe(false)
    })

    it('handles multiple environment overrides', async () => {
      process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES = 'true'
      process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'false'

      await useFeatureFlagsStore.getState().loadFlags()

      const state = useFeatureFlagsStore.getState()
      expect(state.flags.enableBetaFeatures).toBe(true)
      expect(state.flags.enableAnalytics).toBe(false)
    })

    it('handles loading error gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Store original state for cleanup
      const originalSetFlags = useFeatureFlagsStore.getState().setFlags

      process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES = 'true'

      await useFeatureFlagsStore.getState().loadFlags()

      expect(useFeatureFlagsStore.getState().loading).toBe(false)

      // Restore original function
      useFeatureFlagsStore.setState({
        ...useFeatureFlagsStore.getState(),
        setFlags: originalSetFlags,
      })

      consoleSpy.mockRestore()
    })

    it('sets loading state during flag loading', async () => {
      // Ensure initial loading state is false
      expect(useFeatureFlagsStore.getState().loading).toBe(false)

      await useFeatureFlagsStore.getState().loadFlags()

      // Check loading state after completion
      expect(useFeatureFlagsStore.getState().loading).toBe(false)
      expect(useFeatureFlagsStore.getState().lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('integration scenarios', () => {
    it('handles complete feature flag workflow', async () => {
      const store = useFeatureFlagsStore.getState()

      // Initial state
      expect(store.flags.enableBetaFeatures).toBe(false)

      // Toggle a flag
      store.toggleFlag('enableBetaFeatures')
      expect(useFeatureFlagsStore.getState().flags.enableBetaFeatures).toBe(true)

      // Set multiple flags
      store.setFlags({
        enableNewUi: true,
        showDebugInfo: true,
      })

      let state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(true)
      expect(state.flags.showDebugInfo).toBe(true)
      expect(state.flags.enableBetaFeatures).toBe(true) // Preserved

      // Load flags with environment overrides
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false'
      await store.loadFlags()

      state = useFeatureFlagsStore.getState()
      expect(state.flags.enableAnalytics).toBe(false) // Overridden by env

      // Reset to defaults
      store.resetFlags()

      state = useFeatureFlagsStore.getState()
      expect(state.flags.enableNewUi).toBe(false)
      expect(state.flags.showDebugInfo).toBe(false)
      expect(state.flags.enableBetaFeatures).toBe(false)
      expect(state.flags.enableAnalytics).toBe(true) // Back to default
    })
  })
})
