/// <reference types="jest" />
import { getUserVoicePreferences, updateVoicePreferences } from '@my/api'
import { useVoicePreferencesStore } from './voicePreferences'

// Mock API service
jest.mock('@my/api', () => ({
  getUserVoicePreferences: jest.fn(),
  updateVoicePreferences: jest.fn(),
}))

// Mock MMKV storage
jest.mock('@my/config', () => ({
  mmkvStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}))

// Mock logging
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockGetUserVoicePreferences = getUserVoicePreferences as jest.MockedFunction<
  typeof getUserVoicePreferences
>
const mockUpdateVoicePreferences = updateVoicePreferences as jest.MockedFunction<
  typeof updateVoicePreferences
>

describe('VoicePreferencesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useVoicePreferencesStore.setState({
      gender: 'female',
      mode: 'roast',
      isLoaded: false,
      isSyncing: false,
    })

    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct default preferences', () => {
      // ARRANGE: Get initial state
      const state = useVoicePreferencesStore.getState()

      // ASSERT: Defaults match spec (female + roast)
      expect(state.gender).toBe('female')
      expect(state.mode).toBe('roast')
      expect(state.isLoaded).toBe(false)
      expect(state.isSyncing).toBe(false)
    })
  })

  describe('setGender', () => {
    it('updates gender immediately (optimistic)', () => {
      // ARRANGE: Start with female
      const initialState = useVoicePreferencesStore.getState()
      expect(initialState.gender).toBe('female')

      // ACT: Change to male
      useVoicePreferencesStore.getState().setGender('male')

      // ASSERT: Updated immediately
      const state = useVoicePreferencesStore.getState()
      expect(state.gender).toBe('male')
    })
  })

  describe('setMode', () => {
    it('updates mode immediately (optimistic)', () => {
      // ARRANGE: Start with roast
      const initialState = useVoicePreferencesStore.getState()
      expect(initialState.mode).toBe('roast')

      // ACT: Change to zen
      useVoicePreferencesStore.getState().setMode('zen')

      // ASSERT: Updated immediately
      const state = useVoicePreferencesStore.getState()
      expect(state.mode).toBe('zen')
    })
  })

  describe('loadFromDatabase', () => {
    it('fetches and hydrates state from API', async () => {
      // ARRANGE: Mock API response
      mockGetUserVoicePreferences.mockResolvedValue({
        coachGender: 'male',
        coachMode: 'zen',
      })

      // ACT: Load from database
      await useVoicePreferencesStore.getState().loadFromDatabase('user-123')

      // ASSERT: State hydrated from API
      const state = useVoicePreferencesStore.getState()
      expect(state.gender).toBe('male')
      expect(state.mode).toBe('zen')
      expect(state.isLoaded).toBe(true)
      expect(mockGetUserVoicePreferences).toHaveBeenCalledWith('user-123')
    })
  })

  describe('syncToDatabase', () => {
    it('calls API service with current state', async () => {
      // ARRANGE: Set local state
      useVoicePreferencesStore.setState({
        gender: 'female',
        mode: 'lovebomb',
        isLoaded: true,
        isSyncing: false,
      })
      mockUpdateVoicePreferences.mockResolvedValue({
        coachGender: 'female',
        coachMode: 'lovebomb',
      })

      // ACT: Sync to database
      await useVoicePreferencesStore.getState().syncToDatabase('user-456')

      // ASSERT: API called with current preferences
      expect(mockUpdateVoicePreferences).toHaveBeenCalledWith('user-456', {
        coachGender: 'female',
        coachMode: 'lovebomb',
      })
      expect(useVoicePreferencesStore.getState().isSyncing).toBe(false)
    })
  })

  describe('reset', () => {
    it('clears state to defaults', () => {
      // ARRANGE: Set non-default state
      useVoicePreferencesStore.setState({
        gender: 'male',
        mode: 'zen',
        isLoaded: true,
        isSyncing: false,
      })

      // ACT: Reset
      useVoicePreferencesStore.getState().reset()

      // ASSERT: Back to defaults
      const state = useVoicePreferencesStore.getState()
      expect(state.gender).toBe('female')
      expect(state.mode).toBe('roast')
      expect(state.isLoaded).toBe(false)
    })
  })
})
