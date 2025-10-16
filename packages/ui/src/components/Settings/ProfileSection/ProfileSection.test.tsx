import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { ProfileSection } from './ProfileSection'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{ui}</TamaguiProvider>)
}

describe('ProfileSection', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders avatar and name when user provided', () => {
      // Arrange: User data with avatar
      const user = {
        id: '123',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      }

      // Act: Render component
      renderWithProvider(
        <ProfileSection
          user={user}
          isLoading={false}
        />
      )

      // Assert: Avatar and name visible
      expect(screen.getByTestId('profile-section-avatar')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('shows skeleton during loading state', () => {
      // Arrange: Loading state
      const isLoading = true

      // Act: Render with loading
      renderWithProvider(
        <ProfileSection
          user={null}
          isLoading={isLoading}
        />
      )

      // Assert: Skeleton visible, content hidden
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument()
      expect(screen.queryByTestId('profile-section-avatar')).not.toBeInTheDocument()
    })

    it('renders without avatar when avatar_url is null', () => {
      // Arrange: User without avatar
      const user = {
        id: '123',
        name: 'No Avatar User',
        avatar_url: null,
      }

      // Act: Render component
      renderWithProvider(
        <ProfileSection
          user={user}
          isLoading={false}
        />
      )

      // Assert: Name visible, avatar shows fallback
      expect(screen.getByText('No Avatar User')).toBeInTheDocument()
      expect(screen.getByTestId('profile-section-avatar-mock')).toBeInTheDocument()
    })
  })

  describe('Email Display', () => {
    it('renders email when provided', () => {
      // Arrange: User with email
      const user = {
        id: '123',
        name: 'Test User',
        avatar_url: null,
      }
      const email = 'test@example.com'

      // Act: Render with email
      renderWithProvider(
        <ProfileSection
          user={user}
          email={email}
          isLoading={false}
        />
      )

      // Assert: Email visible with correct styling
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByTestId('profile-section-email')).toBeInTheDocument()
    })

    it('does not render email when not provided', () => {
      // Arrange: User without email prop
      const user = {
        id: '123',
        name: 'Test User',
        avatar_url: null,
      }

      // Act: Render without email
      renderWithProvider(
        <ProfileSection
          user={user}
          isLoading={false}
        />
      )

      // Assert: Email not visible
      expect(screen.queryByTestId('profile-section-email')).not.toBeInTheDocument()
    })

    it('includes email in skeleton during loading', () => {
      // Arrange: Loading with email
      const email = 'test@example.com'

      // Act: Render loading state with email
      renderWithProvider(
        <ProfileSection
          user={null}
          email={email}
          isLoading={true}
        />
      )

      // Assert: Skeleton includes email placeholder
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument()
      expect(screen.getByTestId('profile-section-skeleton-email')).toBeInTheDocument()
    })
  })
})
