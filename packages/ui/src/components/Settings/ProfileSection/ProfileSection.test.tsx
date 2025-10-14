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
      expect(screen.getByTestId('profile-section-avatar-fallback')).toBeInTheDocument()
    })
  })
})
