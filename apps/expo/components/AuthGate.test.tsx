import { useAuth } from '@my/app/hooks/useAuth'
import { useRouter } from 'expo-router'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import { AuthGate } from './AuthGate'

jest.mock('@my/app/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const mockLogInfo = jest.fn()
const mockLogWarn = jest.fn()
jest.mock('@my/logging', () => ({
  log: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    debug: jest.fn(),
  },
}))

describe('AuthGate', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue(mockRouter as any)
    jest.mocked(useAuth).mockReset()
  })

  it('renders children when user is authenticated', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-id' } as any,
      session: { access_token: 'test-token' } as any,
      loading: false,
      initialized: true,
      userId: 'test-user-id',
      isAuthenticated: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    })

    let component: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      component = TestRenderer.create(
        <AuthGate>
          <React.Fragment>Protected Content</React.Fragment>
        </AuthGate>
      )
    })

    const tree = component!.toJSON()
    expect(tree).toMatchSnapshot()
  })

  it('shows loading when auth is not initialized', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: true,
      initialized: false,
      userId: null,
      isAuthenticated: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    })

    let component: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      component = TestRenderer.create(
        <AuthGate>
          <React.Fragment>Protected Content</React.Fragment>
        </AuthGate>
      )
    })

    const tree = component!.toJSON()
    expect(tree).toMatchSnapshot()
  })

  it('redirects to sign-in when user is not authenticated', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      initialized: true,
      userId: null,
      isAuthenticated: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    })

    TestRenderer.act(() => {
      TestRenderer.create(
        <AuthGate>
          <React.Fragment>Protected Content</React.Fragment>
        </AuthGate>
      )
    })

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('preserves intended destination for post-auth redirect', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      initialized: true,
      userId: null,
      isAuthenticated: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    })

    TestRenderer.act(() => {
      TestRenderer.create(
        <AuthGate redirectTo="/custom-redirect">
          <React.Fragment>Protected Content</React.Fragment>
        </AuthGate>
      )
    })

    expect(mockRouter.replace).toHaveBeenCalledWith('/custom-redirect')
  })
})
