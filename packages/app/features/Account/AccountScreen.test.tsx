import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AccountScreen } from './AccountScreen'

const renderWithProvider = (ui: React.ReactElement) => {
  // UI components are already mocked in test-utils/setup.ts
  return render(ui)
}

describe('AccountScreen', () => {
  const mockUser = {
    id: '123',
    name: 'Test User',
    avatar_url: null,
  }

  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders profile section with user data', () => {
      // Arrange: User with email
      const email = 'test@example.com'

      // Act: Render screen
      renderWithProvider(
        <AccountScreen
          user={mockUser}
          email={email}
          isLoading={false}
          is2FAEnabled={false}
        />
      )

      // Assert: Profile section visible with email
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('renders all navigation sections', () => {
      // Arrange: Loaded state
      // Act: Render screen
      renderWithProvider(
        <AccountScreen
          user={mockUser}
          email="test@example.com"
          isLoading={false}
          is2FAEnabled={false}
        />
      )

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
      // Act: Render loading
      renderWithProvider(
        <AccountScreen
          user={null}
          email={undefined}
          isLoading={true}
          is2FAEnabled={false}
        />
      )

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
          user={mockUser}
          email="test@example.com"
          isLoading={false}
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
          user={mockUser}
          email="test@example.com"
          isLoading={false}
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
          user={mockUser}
          email="test@example.com"
          isLoading={false}
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
          user={mockUser}
          email="test@example.com"
          isLoading={false}
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
          user={mockUser}
          email="test@example.com"
          isLoading={false}
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
      renderWithProvider(
        <AccountScreen
          user={mockUser}
          email="test@example.com"
          isLoading={false}
          is2FAEnabled={true}
        />
      )

      // Assert: Toggle is checked
      const toggleSwitch = screen.getByRole('switch', { name: 'Two-Factor Authentication' })
      expect(toggleSwitch).toBeChecked()
    })

    it('shows toggle as disabled when is2FAEnabled is false', () => {
      // Arrange: 2FA disabled
      // Act: Render with disabled state
      renderWithProvider(
        <AccountScreen
          user={mockUser}
          email="test@example.com"
          isLoading={false}
          is2FAEnabled={false}
        />
      )

      // Assert: Toggle is not checked
      const toggleSwitch = screen.getByRole('switch', { name: 'Two-Factor Authentication' })
      expect(toggleSwitch).not.toBeChecked()
    })
  })
})
