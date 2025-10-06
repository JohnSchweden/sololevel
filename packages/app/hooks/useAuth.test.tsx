import type { AuthResult, SignInData } from '@my/api'
import { authClient } from '@my/api'
import type { Session, User } from '@supabase/supabase-js'
import { renderHook } from '@testing-library/react'
import {
  createAuthFixtures,
  createSupabaseSession,
  createSupabaseUser,
} from '../test-utils/authFixtures'
import { useAuth } from './useAuth'

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
  },
}))

// Mock the auth store
const mockAuthStore: {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  setAuth: jest.Mock<void, [User | null, Session | null]>
  setLoading: jest.Mock<void, [boolean]>
  setInitialized: jest.Mock<void, [boolean]>
} = {
  user: null,
  session: null,
  loading: false,
  initialized: false,
  setAuth: jest.fn(),
  setLoading: jest.fn(),
  setInitialized: jest.fn(),
}

jest.mock('../stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock store state
    mockAuthStore.user = null
    mockAuthStore.session = null
    mockAuthStore.loading = false
    mockAuthStore.initialized = false
  })

  it('provides auth state and actions', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('session')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('signIn')
    expect(result.current).toHaveProperty('signOut')
    expect(result.current).toHaveProperty('userId')
  })

  it('signs in successfully', async () => {
    const { session, user } = createAuthFixtures()

    const signInSuccess: AuthResult<SignInData> = {
      success: true,
      data: { session, user },
    }
    jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInSuccess)

    const { result } = renderHook(() => useAuth())

    const signInResult = await result.current.signIn('test@example.com', 'password123')

    expect(signInResult.success).toBe(true)
    expect(authClient.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('handles sign in error', async () => {
    const signInFailure: AuthResult<SignInData> = {
      success: false,
      error: {
        code: 'invalid_credentials',
        message: 'Invalid email or password',
      },
    }
    jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInFailure)

    const { result } = renderHook(() => useAuth())

    const signInResult = await result.current.signIn('test@example.com', 'wrong-password')

    expect(signInResult.success).toBe(false)
    if (!signInResult.success) {
      expect(signInResult.error.code).toBe('invalid_credentials')
    }
  })

  it('returns current user ID when authenticated', () => {
    const user = createSupabaseUser({ id: 'test-user-id' })
    const session = createSupabaseSession({ user })

    mockAuthStore.user = user
    mockAuthStore.session = session

    const { result } = renderHook(() => useAuth())

    expect(result.current.userId).toBe('test-user-id')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('returns null user ID when not authenticated', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.userId).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('signs out successfully', async () => {
    const signOutSuccess: AuthResult<void> = {
      success: true,
      data: undefined,
    }
    jest.mocked(authClient.signOut).mockResolvedValue(signOutSuccess)

    const { result } = renderHook(() => useAuth())

    const signOutResult = await result.current.signOut()

    expect(signOutResult.success).toBe(true)
    expect(authClient.signOut).toHaveBeenCalled()
  })

  it('handles sign out error', async () => {
    const signOutFailure: AuthResult<void> = {
      success: false,
      error: {
        code: 'sign_out_error',
        message: 'Failed to sign out',
      },
    }
    jest.mocked(authClient.signOut).mockResolvedValue(signOutFailure)

    const { result } = renderHook(() => useAuth())

    const signOutResult = await result.current.signOut()

    expect(signOutResult.success).toBe(false)
    if (!signOutResult.success) {
      expect(signOutResult.error.code).toBe('sign_out_error')
    }
  })
})
