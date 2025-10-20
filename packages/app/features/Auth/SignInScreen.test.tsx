import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SignInScreen } from './SignInScreen'

// Mock the auth hook
const mockSignIn = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@app/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock test auth bootstrap
jest.mock('@my/app/auth/testAuthBootstrap', () => ({
  initializeTestAuth: jest.fn(),
}))

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock useToastController
const mockToastShow = jest.fn()
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    useToastController: () => ({
      show: mockToastShow,
      hide: jest.fn(),
    }),
    GlassButton: ({ children, onPress, disabled, testID, ...props }: any) =>
      React.createElement('button', { onClick: onPress, disabled, testID, ...props }, children),
    GlassBackground: ({ children, testID, ...props }: any) =>
      React.createElement('div', { testID, ...props }, children),
    H2: ({ children, testID, ...props }: any) =>
      React.createElement('h2', { testID, ...props }, children),
    Input: ({ value, onChangeText, placeholder, testID, ...props }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText(e.target.value),
        placeholder,
        testID,
        ...props,
      }),
    Paragraph: ({ children, testID, ...props }: any) =>
      React.createElement('p', { testID, ...props }, children),
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { testID, style: { display: 'flex', flexDirection: 'column' }, ...props },
        children
      ),
  }
})

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('div', { testID, ...props }, children)
  },
}))

const renderWithProvider = (ui: React.ReactElement) => {
  // UI components are already mocked in test-utils/setup.ts
  return render(ui)
}

describe('SignInScreen', () => {
  const mockOnSignInSuccess = jest.fn()
  const mockOnAlreadyAuthenticated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      isAuthenticated: false,
      user: null,
      session: null,
      signOut: jest.fn(),
      isLoading: false,
    })
  })

  describe('Component Rendering', () => {
    // RED: Test 1 - Component renders with sign in form
    it('renders sign in form with email and password inputs', () => {
      // Arrange: Default unauthenticated state
      // Act: Render screen
      renderWithProvider(<SignInScreen />)

      // Assert: Form elements visible
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  describe('Authentication State', () => {
    // RED: Test 2 - Calls onAlreadyAuthenticated when user is authenticated
    it('calls onAlreadyAuthenticated callback when user is already authenticated', () => {
      // Arrange: Authenticated user
      mockUseAuth.mockReturnValue({
        signIn: mockSignIn,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' } as any,
        session: {} as any,
        signOut: jest.fn(),
        isLoading: false,
      })

      // Act: Render screen
      renderWithProvider(<SignInScreen onAlreadyAuthenticated={mockOnAlreadyAuthenticated} />)

      // Assert: Callback invoked
      expect(mockOnAlreadyAuthenticated).toHaveBeenCalledTimes(1)
    })
  })

  describe('User Interactions', () => {
    // RED: Test 3 - Successful sign in triggers callback
    it('calls onSignInSuccess when sign in is successful', async () => {
      // Arrange: Successful sign in response
      mockSignIn.mockResolvedValue({
        success: true,
        data: { user: { id: '1', email: 'test@example.com' }, session: {} },
      })

      renderWithProvider(<SignInScreen onSignInSuccess={mockOnSignInSuccess} />)

      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      // Act: Fill form and submit
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(signInButton)

      // Assert: Success callback invoked
      await waitFor(() => {
        expect(mockOnSignInSuccess).toHaveBeenCalledTimes(1)
      })
    })
  })
})
