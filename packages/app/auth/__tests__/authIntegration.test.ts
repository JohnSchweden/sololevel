/**
 * Integration tests for authentication system
 * Tests the interaction between authClient, useAuth hook, and auth store
 */

import { authClient } from '@my/api'
import type { AuthResult, SignInData } from '@my/api'
import { act, renderHook } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/auth'
import { createAuthFixtures } from '../../test-utils/authFixtures'

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

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset auth store to initial state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    })
  })

  it('completes full sign-in flow', async () => {
    const { user, session } = createAuthFixtures()

    // Mock successful sign-in
    const signInSuccess: AuthResult<SignInData> = {
      success: true,
      data: { user, session },
    }
    jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInSuccess)

    // Mock auth state change listener
    jest.mocked(authClient.onAuthStateChange).mockReturnValue(() => {})

    // Mock initial session check
    jest.mocked(authClient.getSession).mockResolvedValue({
      success: true,
      data: null,
    })

    const { result } = renderHook(() => useAuth())

    // Initial state should be unauthenticated
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.userId).toBeNull()

    // Sign in
    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123')
      expect(signInResult.success).toBe(true)
    })

    // Verify sign-in was called correctly
    expect(authClient.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('completes full sign-out flow', async () => {
    const { user, session } = createAuthFixtures()

    // Set up authenticated state
    useAuthStore.setState({
      user,
      session,
      loading: false,
      initialized: true,
    })

    // Mock successful sign-out
    const signOutSuccess: AuthResult<void> = {
      success: true,
      data: undefined,
    }
    jest.mocked(authClient.signOut).mockResolvedValue(signOutSuccess)

    // Mock auth state change listener
    jest.mocked(authClient.onAuthStateChange).mockReturnValue(() => {})

    // Mock initial session check
    jest.mocked(authClient.getSession).mockResolvedValue({
      success: true,
      data: session,
    })

    const { result } = renderHook(() => useAuth())

    // Should be authenticated initially
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.userId).toBe(user.id)

    // Sign out
    await act(async () => {
      const signOutResult = await result.current.signOut()
      expect(signOutResult.success).toBe(true)
    })

    // Verify sign-out was called
    expect(authClient.signOut).toHaveBeenCalled()
  })

  it('handles authentication errors gracefully', async () => {
    // Mock failed sign-in
    const signInFailure: AuthResult<SignInData> = {
      success: false,
      error: {
        code: 'invalid_credentials',
        message: 'Invalid credentials',
      },
    }
    jest.mocked(authClient.signInWithPassword).mockResolvedValue(signInFailure)

    // Mock auth state change listener
    jest.mocked(authClient.onAuthStateChange).mockReturnValue(() => {})

    // Mock initial session check
    jest.mocked(authClient.getSession).mockResolvedValue({
      success: true,
      data: null,
    })

    const { result } = renderHook(() => useAuth())

    // Attempt sign-in with invalid credentials
    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'wrong-password')
      expect(signInResult.success).toBe(false)
      if (!signInResult.success) {
        expect(signInResult.error.message).toBe('Invalid credentials')
      }
    })

    // Should remain unauthenticated
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.userId).toBeNull()
  })
})
