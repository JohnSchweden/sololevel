import { supabase } from '@my/api'
import type { Session, User } from '@supabase/supabase-js'
/// <reference types="jest" />
// No imports needed - jest-expo preset provides globals
import { useAuthStore } from './auth'

// Mock Supabase functions
jest.mock('@my/api', () => {
  const mockSignOut = jest.fn()
  const mockGetSession = jest.fn()
  const mockOnAuthStateChange = jest.fn()

  return {
    supabase: {
      auth: {
        signOut: mockSignOut,
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    },
  }
})

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    })
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(true)
      expect(state.initialized).toBe(false)
    })
  })

  describe('setAuth', () => {
    it('sets user and session', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as User
      const mockSession = { user: mockUser, access_token: 'token' } as Session

      useAuthStore.getState().setAuth(mockUser, mockSession)

      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.session).toBe(mockSession)
      expect(state.loading).toBe(false)
    })

    it('can set null user and session', () => {
      useAuthStore.getState().setAuth(null, null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('sets loading state', () => {
      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().loading).toBe(false)

      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().loading).toBe(true)
    })
  })

  describe('setInitialized', () => {
    it('sets initialized state', () => {
      useAuthStore.getState().setInitialized(true)
      expect(useAuthStore.getState().initialized).toBe(true)

      useAuthStore.getState().setInitialized(false)
      expect(useAuthStore.getState().initialized).toBe(false)
    })
  })

  describe('signOut', () => {
    it('successfully signs out user', async () => {
      // Use static import instead of dynamic import
      const mockSignOut = jest.mocked(supabase.auth.signOut)
      mockSignOut.mockResolvedValue({ error: null })

      // Set initial authenticated state
      useAuthStore
        .getState()
        .setAuth({ id: 'user-1' } as User, { access_token: 'token' } as Session)

      await useAuthStore.getState().signOut()

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(false)
    })

    it('handles sign out error', async () => {
      // Use static import instead of dynamic import
      const mockSignOut = jest.mocked(supabase.auth.signOut)
      const mockError = {
        message: 'Sign out failed',
        code: 'sign_out_error',
        status: 400,
        __isAuthError: true,
      } as any
      mockSignOut.mockResolvedValue({ error: mockError })

      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await useAuthStore.getState().signOut()

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)

      // Loading should be false after error handling
      expect(useAuthStore.getState().loading).toBe(false)

      consoleSpy.mockRestore()
    })

    it('handles unexpected error during sign out', async () => {
      // Use static import instead of dynamic import
      const mockSignOut = jest.mocked(supabase.auth.signOut)
      const mockError = new Error('Unexpected error')
      mockSignOut.mockRejectedValue(mockError)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await useAuthStore.getState().signOut()

      expect(useAuthStore.getState().loading).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('initialize', () => {
    it('initializes auth with existing session', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as User
      const mockSession = { user: mockUser, access_token: 'token' } as Session

      // Use static import instead of dynamic import
      const mockGetSession = jest.mocked(supabase.auth.getSession)
      const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange)

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: { id: 'test', callback: jest.fn(), unsubscribe: jest.fn() },
        },
      })

      await useAuthStore.getState().initialize()

      expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)

      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.session).toBe(mockSession)
      expect(state.loading).toBe(false)
      expect(state.initialized).toBe(true)
    })

    it('initializes auth with no session', async () => {
      // Use static import instead of dynamic import
      const mockGetSession = jest.mocked(supabase.auth.getSession)
      const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange)

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: { id: 'test', callback: jest.fn(), unsubscribe: jest.fn() },
        },
      })

      await useAuthStore.getState().initialize()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.initialized).toBe(true)
    })

    it('handles session error during initialization', async () => {
      // Use static import instead of dynamic import
      const mockGetSession = jest.mocked(supabase.auth.getSession)
      const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange)
      const mockError = {
        message: 'Session error',
        code: 'session_error',
        status: 400,
        __isAuthError: true,
      } as any

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      })
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: { id: 'test', callback: jest.fn(), unsubscribe: jest.fn() },
        },
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await useAuthStore.getState().initialize()

      // Should still be initialized even with session error
      expect(useAuthStore.getState().initialized).toBe(true)

      consoleSpy.mockRestore()
    })

    it('does not initialize if already initialized', async () => {
      // Use static import instead of dynamic import
      // Set as already initialized
      useAuthStore.getState().setInitialized(true)

      await useAuthStore.getState().initialize()

      expect(supabase.auth.getSession).not.toHaveBeenCalled()
    })

    it('handles auth state changes', async () => {
      // Use static import instead of dynamic import
      const mockGetSession = jest.mocked(supabase.auth.getSession)
      const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange)
      let authChangeCallback: any

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      mockOnAuthStateChange.mockImplementation((callback: any) => {
        authChangeCallback = callback
        return {
          data: {
            subscription: {
              id: 'test',
              callback: jest.fn(),
              unsubscribe: jest.fn(),
            },
          },
        }
      })

      await useAuthStore.getState().initialize()

      // Simulate auth state change
      const mockUser = { id: 'user-1' } as User
      const mockSession = { user: mockUser } as Session
      authChangeCallback('SIGNED_IN', mockSession)

      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.session).toBe(mockSession)
      expect(state.loading).toBe(false)
    })
  })
})
