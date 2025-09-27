/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

// Mock useAuth hook
jest.mock('@my/app', () => ({
  useAuth: jest.fn(),
}))

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock UI components
jest.mock('@my/ui', () => ({
  YStack: ({ children, ...props }: any) => (
    <div
      data-testid="ystack"
      {...props}
    >
      {children}
    </div>
  ),
  Spinner: () => <div data-testid="spinner">Loading spinner</div>,
  H3: ({ children }: any) => <h3>{children}</h3>,
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
}

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue(mockRouter as any)
  })

  it('renders children when user is authenticated', () => {
    const { useAuth } = require('@my/app')
    jest.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      initialized: true,
    })

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    expect(screen.getByText('Protected Content')).toBeTruthy()
  })

  it('shows loading when auth is not initialized', () => {
    const { useAuth } = require('@my/app')
    jest.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: true,
      initialized: false,
    })

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).toBeFalsy()
  })

  it('redirects to sign-in when user is not authenticated', () => {
    const { useAuth } = require('@my/app')
    jest.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      initialized: true,
    })

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    )

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/sign-in')
    expect(screen.queryByText('Protected Content')).toBeFalsy()
  })

  it('preserves intended destination for post-auth redirect', () => {
    const { useAuth } = require('@my/app')
    jest.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      initialized: true,
    })

    render(
      <AuthGate redirectTo="/custom-redirect">
        <div>Protected Content</div>
      </AuthGate>
    )

    expect(mockRouter.replace).toHaveBeenCalledWith('/custom-redirect')
  })
})
