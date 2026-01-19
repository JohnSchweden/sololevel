import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

type MockAuthUser = {
  id: string
  email?: string
  user_metadata?: { full_name?: string; avatar_url?: string | null }
  app_metadata?: Record<string, unknown>
}

type MockProfile = {
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
}

let mockAuthState: { user: MockAuthUser | null; loading: boolean } = { user: null, loading: false }
let mockCurrentUserResult: { data: MockProfile | null; isLoading: boolean } = {
  data: null,
  isLoading: false,
}

jest.mock('../../stores/auth', () => ({
  useAuthStore: <T,>(selector: (state: typeof mockAuthState) => T) => selector(mockAuthState),
}))

jest.mock('@app/hooks/useUser', () => ({
  useCurrentUser: () => mockCurrentUserResult,
}))

import { AccountScreen } from './AccountScreen'

const renderWithProvider = (ui: React.ReactElement) => {
  // UI components are already mocked in test-utils/setup.ts
  return render(ui)
}

describe('AccountScreen', () => {
  const defaultAuthUser: MockAuthUser = {
    id: '123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User', avatar_url: null },
    app_metadata: {},
  }

  const defaultProfile: MockProfile = {
    full_name: 'Test User',
    avatar_url: null,
  }

  beforeEach(() => {
    mockAuthState = { user: defaultAuthUser, loading: false }
    mockCurrentUserResult = { data: defaultProfile, isLoading: false }
  })

  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders profile section with user data', () => {
      // Act: Render screen
      renderWithProvider(<AccountScreen is2FAEnabled={false} />)

      // Assert: Profile section visible with email
      expect(screen.getByText('I watch you, Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('renders all navigation sections', () => {
      // Arrange: Loaded state
      // Act: Render screen
      renderWithProvider(<AccountScreen is2FAEnabled={false} />)

      // Assert: All sections visible
      expect(screen.getByText('Profile & Security')).toBeInTheDocument()
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      expect(screen.getByText('Change Password')).toBeInTheDocument()
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Email Preferences')).toBeInTheDocument()
      expect(screen.getByText('Danger Zone')).toBeInTheDocument()
      expect(screen.getByText('Delete Account')).toBeInTheDocument()
    })

    it('shows skeleton during loading', () => {
      // Arrange: Loading state
      mockAuthState = { user: null, loading: true }
      mockCurrentUserResult = { data: null, isLoading: true }

      // Act: Render loading
      renderWithProvider(<AccountScreen is2FAEnabled={false} />)

      // Assert: Skeleton visible, content hidden
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument()
      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onEditProfile when Edit Profile pressed', () => {
      // Arrange: Mock callback
      const onEditProfile = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <AccountScreen
          is2FAEnabled={false}
          onEditProfile={onEditProfile}
        />
      )
      fireEvent.click(screen.getByText('Edit Profile'))

      // Assert: Callback called
      expect(onEditProfile).toHaveBeenCalledTimes(1)
    })

    it('calls onChangePassword when Change Password pressed', () => {
      // Arrange: Mock callback
      const onChangePassword = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <AccountScreen
          is2FAEnabled={false}
          onChangePassword={onChangePassword}
        />
      )
      fireEvent.click(screen.getByText('Change Password'))

      // Assert: Callback called
      expect(onChangePassword).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle2FA when toggle switch changed', () => {
      // Arrange: Mock callback
      const onToggle2FA = jest.fn()

      // Act: Render and toggle
      renderWithProvider(
        <AccountScreen
          is2FAEnabled={false}
          onToggle2FA={onToggle2FA}
        />
      )

      const toggleSwitch = screen.getByRole('switch', { name: 'Two-Factor Authentication' })
      fireEvent.click(toggleSwitch)

      // Assert: Callback called with true
      expect(onToggle2FA).toHaveBeenCalledWith(true)
    })

    it('calls onEmailPreferences when Email Preferences pressed', () => {
      // Arrange: Mock callback
      const onEmailPreferences = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <AccountScreen
          is2FAEnabled={false}
          onEmailPreferences={onEmailPreferences}
        />
      )
      fireEvent.click(screen.getByText('Email Preferences'))

      // Assert: Callback called
      expect(onEmailPreferences).toHaveBeenCalledTimes(1)
    })

    it('calls onDeleteAccount when Delete Account pressed', () => {
      // Arrange: Mock callback
      const onDeleteAccount = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <AccountScreen
          is2FAEnabled={false}
          onDeleteAccount={onDeleteAccount}
        />
      )
      fireEvent.click(screen.getByText('Delete Account'))

      // Assert: Callback called
      expect(onDeleteAccount).toHaveBeenCalledTimes(1)
    })
  })

  describe('2FA Toggle State', () => {
    it('shows toggle as enabled when is2FAEnabled is true', () => {
      // Arrange: 2FA enabled
      // Act: Render with enabled state
      renderWithProvider(<AccountScreen is2FAEnabled={true} />)

      // Assert: Toggle is checked
      const toggleSwitch = screen.getByRole('switch', { name: 'Two-Factor Authentication' })
      expect(toggleSwitch).toBeChecked()
    })

    it('shows toggle as disabled when is2FAEnabled is false', () => {
      // Arrange: 2FA disabled
      // Act: Render with disabled state
      renderWithProvider(<AccountScreen is2FAEnabled={false} />)

      // Assert: Toggle is not checked
      const toggleSwitch = screen.getByRole('switch', { name: 'Two-Factor Authentication' })
      expect(toggleSwitch).not.toBeChecked()
    })
  })
})
