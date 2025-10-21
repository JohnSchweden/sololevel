import { render, screen, waitFor } from '@testing-library/react'
/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGate } from './AuthGate'

// Import the mocked modules properly
import { useAuthStore } from '@my/app/stores/auth'
import { useRouter } from 'expo-router'

// Get the mocked functions with proper typing
const mockUseAuthStore = vi.mocked(useAuthStore)
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
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        user: { id: 'test-user' } as any,
        session: { access_token: 'test-token' } as any,
        loading: false,
        initialized: true,
        setAuth: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        refresh: vi.fn(),
        initialize: vi.fn(),
      }
      return selector(mockState)
    })

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
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        user: null,
        session: null,
        loading: true,
        initialized: false,
        setAuth: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        refresh: vi.fn(),
        initialize: vi.fn(),
      }
      return selector(mockState)
    })

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
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        user: null,
        session: null,
        loading: false,
        initialized: true,
        setAuth: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        refresh: vi.fn(),
        initialize: vi.fn(),
      }
      return selector(mockState)
    })

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
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        user: null,
        session: null,
        loading: false,
        initialized: true,
        setAuth: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        signOut: vi.fn(),
        refresh: vi.fn(),
        initialize: vi.fn(),
      }
      return selector(mockState)
    })

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
