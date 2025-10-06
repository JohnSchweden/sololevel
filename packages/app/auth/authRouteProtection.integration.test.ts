/**
 * Integration tests for route protection behavior
 * Tests the authentication flow without complex component rendering
 */

import type { AuthResult, SignInData } from '@my/api'
import { authClient } from '@my/api'
import { useAuthStore } from '../stores/auth'
import { createAuthFixtures } from '../test-utils/authFixtures'
import { testAuthBootstrap } from './testAuthBootstrap'

// Mock the auth client
jest.mock('@my/api', () => ({
  authClient: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getCurrentUserId: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}))

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('Route Protection Integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset auth store to initial state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    })
    // Reset environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication State Management', () => {
    it('should initialize with unauthenticated state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(true)
      expect(state.initialized).toBe(false)
    })

    it('should transition to authenticated state after successful sign-in', async () => {
      const { user, session } = createAuthFixtures()

      // Mock successful sign-in
      const signInSuccess: AuthResult<SignInData> = {
        success: true,
        data: { user, session },
      }
      jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInSuccess)

      // Simulate sign-in process
      const result = await authClient.signInWithPassword('test@example.com', 'password')

      expect(result.success).toBe(true)
      if (result.success) {
        // Simulate what useAuth would do
        useAuthStore.getState().setAuth(result.data.user, result.data.session)
        useAuthStore.getState().setInitialized(true)
      }

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.session).toEqual(session)
      expect(state.initialized).toBe(true)
      expect(state.loading).toBe(false)
    })

    it('should handle sign-in errors gracefully', async () => {
      // Mock failed sign-in
      const signInFailure: AuthResult<SignInData> = {
        success: false,
        error: {
          code: 'invalid_credentials',
          message: 'Invalid credentials',
          originalError: {
            name: 'AuthApiError',
            message: 'Invalid credentials',
            status: 400,
            code: 'invalid_credentials',
            __isAuthError: true,
          } as any,
        },
      }
      jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInFailure)

      const result = await authClient.signInWithPassword('test@example.com', 'wrong-password')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid credentials')
      }

      // State should remain unauthenticated
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
    })

    it('should transition to unauthenticated state after sign-out', async () => {
      const { user, session } = createAuthFixtures()

      // Set up authenticated state
      useAuthStore.getState().setAuth(user, session)
      useAuthStore.getState().setInitialized(true)

      // Mock successful sign-out
      const signOutSuccess: AuthResult<void> = {
        success: true,
        data: undefined,
      }
      jest.mocked(authClient.signOut).mockResolvedValue(signOutSuccess)

      const result = await authClient.signOut()
      expect(result.success).toBe(true)

      // Simulate what useAuth would do
      useAuthStore.getState().setAuth(null, null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
    })
  })

  describe('Test Auth Bootstrap Integration', () => {
    it('should not activate when TEST_AUTH_ENABLED is false', async () => {
      process.env.TEST_AUTH_ENABLED = 'false'
      process.env.TEST_AUTH_EMAIL = 'test@example.com'
      process.env.TEST_AUTH_PASSWORD = 'password'

      const result = await testAuthBootstrap()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Test auth not enabled')
      expect(authClient.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should activate and sign in when properly configured', async () => {
      process.env.TEST_AUTH_ENABLED = 'true'
      process.env.TEST_AUTH_EMAIL = 'test@example.com'
      process.env.TEST_AUTH_PASSWORD = 'password'

      // Mock no existing user
      jest.mocked(authClient.getCurrentUserId).mockResolvedValue(null)

      const { user, session } = createAuthFixtures({
        user: { id: 'test-user', email: 'test@example.com' },
      })

      // Mock successful sign-in
      const signInSuccess: AuthResult<SignInData> = {
        success: true,
        data: { user, session },
      }
      jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInSuccess)

      const result = await testAuthBootstrap()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Test auth bootstrap completed successfully')
      expect(authClient.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password')
    })

    it('should be disabled in production environment', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
      })
      process.env.TEST_AUTH_ENABLED = 'true'
      process.env.TEST_AUTH_EMAIL = 'test@example.com'
      process.env.TEST_AUTH_PASSWORD = 'password'

      const result = await testAuthBootstrap()

      expect(result.success).toBe(false)
      expect(result.error).toContain('production builds')
      expect(authClient.signInWithPassword).not.toHaveBeenCalled()

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
      })
    })
  })

  describe('Route Protection Logic', () => {
    it('should allow access when user is authenticated', () => {
      const { user, session } = createAuthFixtures()

      useAuthStore.getState().setAuth(user, session)
      useAuthStore.getState().setInitialized(true)

      const state = useAuthStore.getState()
      const isAuthenticated = !!state.user
      const shouldAllowAccess = state.initialized && !state.loading && isAuthenticated

      expect(shouldAllowAccess).toBe(true)
    })

    it('should block access when user is not authenticated', () => {
      useAuthStore.getState().setAuth(null, null)
      useAuthStore.getState().setInitialized(true)

      const state = useAuthStore.getState()
      const isAuthenticated = !!state.user
      const shouldAllowAccess = state.initialized && !state.loading && isAuthenticated

      expect(shouldAllowAccess).toBe(false)
    })

    it('should show loading when auth is not initialized', () => {
      useAuthStore.getState().setInitialized(false)
      useAuthStore.getState().setLoading(true)

      const state = useAuthStore.getState()
      const shouldShowLoading = !state.initialized || state.loading

      expect(shouldShowLoading).toBe(true)
    })
  })
})
