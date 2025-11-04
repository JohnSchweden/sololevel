import type { User } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { SettingsNavItem } from '@my/ui'
import { SettingsScreen } from './SettingsScreen'

// Mock dependencies
const mockAuthState = {
  user: null,
  session: null,
  loading: false,
  signOut: jest.fn(),
}

jest.mock('../../stores/auth', () => ({
  useAuthStore: jest.fn((selector?: (state: typeof mockAuthState) => unknown) => {
    if (selector) {
      return selector(mockAuthState)
    }
    return mockAuthState
  }),
}))

// Export mock state for tests to update
// biome-ignore lint/suspicious/noExportsInTest: Required for dynamic test state updates
export { mockAuthState }

// Test navigation items
const TEST_NAVIGATION_ITEMS: SettingsNavItem[] = [
  { id: 'account', label: 'Account', route: '/settings/account' },
  { id: 'personalisation', label: 'Personalisation', route: '/settings/personalisation' },
  { id: 'give-feedback', label: 'Give feedback', route: '/settings/give-feedback' },
  { id: 'data-controls', label: 'Data controls', route: '/settings/data-controls' },
  { id: 'security', label: 'Security', route: '/settings/security' },
  { id: 'about', label: 'About', route: '/settings/about' },
]

const renderWithProvider = (ui: React.ReactElement) => {
  // UI components are already mocked in test-utils/setup.ts
  return render(ui)
}

describe('SettingsScreen', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    beforeEach(() => {
      // Reset mock before each test
      jest.clearAllMocks()
    })

    it('renders all main sections', () => {
      // Arrange: Mock user data
      const { mockAuthState } = require('./SettingsScreen.test')
      const mockUser: Partial<User> = {
        id: '123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: null,
        },
      }

      // Update mock state
      mockAuthState.user = mockUser
      mockAuthState.loading = false
      mockAuthState.session = null
      mockAuthState.signOut = jest.fn()

      // Act: Render screen
      renderWithProvider(
        <SettingsScreen
          navigationItems={TEST_NAVIGATION_ITEMS}
          onNavigate={jest.fn()}
        />
      )

      // Assert: Profile, navigation list, logout button, footer visible
      expect(screen.getByTestId('profile-section')).toBeInTheDocument()
      expect(screen.getByTestId('settings-navigation-list')).toBeInTheDocument()
      expect(screen.getByTestId('log-out-button')).toBeInTheDocument()
      expect(screen.getByTestId('settings-footer')).toBeInTheDocument()
    })

    it('shows loading skeleton when user data loading', () => {
      // Arrange: Loading state
      const { mockAuthState } = require('./SettingsScreen.test')
      mockAuthState.user = null
      mockAuthState.loading = true
      mockAuthState.session = null
      mockAuthState.signOut = jest.fn()

      // Act: Render loading
      renderWithProvider(
        <SettingsScreen
          navigationItems={TEST_NAVIGATION_ITEMS}
          onNavigate={jest.fn()}
        />
      )

      // Assert: Skeleton visible
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument()
    })

    it('renders navigation items for all settings categories', () => {
      // Arrange: User logged in
      const { mockAuthState } = require('./SettingsScreen.test')
      mockAuthState.user = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      } as Partial<User>
      mockAuthState.loading = false
      mockAuthState.session = null
      mockAuthState.signOut = jest.fn()

      // Act: Render screen
      renderWithProvider(
        <SettingsScreen
          navigationItems={TEST_NAVIGATION_ITEMS}
          onNavigate={jest.fn()}
        />
      )

      // Assert: All 6 navigation items visible (per wireframe)
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Personalisation')).toBeInTheDocument()
      expect(screen.getByText('Give feedback')).toBeInTheDocument()
      expect(screen.getByText('Data controls')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })
  })
})
