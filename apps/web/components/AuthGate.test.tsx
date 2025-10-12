import { render, screen, waitFor } from '@testing-library/react'
/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGate } from './AuthGate'

// Import the mocked modules properly
import { useAuth } from '@my/app/hooks/useAuth'
import { useRouter } from 'expo-router'

// Get the mocked functions with proper typing
const mockUseAuth = vi.mocked(useAuth)
const mockUseRouter = vi.mocked(useRouter)

describe('AuthGate (Web)', () => {
  let mockRouter: ReturnType<typeof useRouter>

  beforeEach(() => {
    // Reset all mocks before each test for isolation
    vi.clearAllMocks()

    // Setup default mock router
    mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    } as any
    mockUseRouter.mockReturnValue(mockRouter)
  })

  it('renders children when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      initialized: true,
      user: { id: 'test-user' } as any,
      session: { access_token: 'test-token' } as any,
      userId: 'test-user',
      signIn: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
    } as any)

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('shows loading when auth is not initialized', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      initialized: false,
      user: null,
      session: null,
      userId: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
    } as any)

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    await waitFor(() => {
      expect(screen.getByTestId('Spinner')).toBeInTheDocument()
    })
  })

  it('redirects to sign-in when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      initialized: true,
      user: null,
      session: null,
      userId: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
    } as any)

    // Mock window.location.pathname since AuthGate uses it
    Object.defineProperty(window, 'location', {
      value: { pathname: '/protected' },
      writable: true,
    })

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/sign-in?redirectTo=%2Fprotected')
    })
  })

  it('preserves intended destination for post-auth redirect', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      initialized: true,
      user: null,
      session: null,
      userId: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
    } as any)

    // Mock window.location.pathname since AuthGate uses it
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard' },
      writable: true,
    })

    render(
      <AuthGate redirectTo="/custom-sign-in">
        <div>Protected Content</div>
      </AuthGate>
    )

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/custom-sign-in?redirectTo=%2Fdashboard')
    })
  })
})
