import type { User } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SettingsScreen } from './SettingsScreen'

// Mock dependencies
jest.mock('../../stores/auth', () => ({
  useAuthStore: jest.fn(() => ({
    user: null,
    session: null,
    loading: false,
    signOut: jest.fn(),
  })),
}))

const renderWithProvider = (ui: React.ReactElement) => {
  // UI components are already mocked in test-utils/setup.ts
  return render(ui)
}

describe('SettingsScreen', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders all main sections', () => {
      // Arrange: Mock user data
      const { useAuthStore } = require('../../stores/auth')
      const mockUser: Partial<User> = {
        id: '123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: null,
        },
      }

      useAuthStore.mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: jest.fn(),
      })

      // Act: Render screen
      renderWithProvider(<SettingsScreen />)

      // Assert: Profile, navigation list, logout button, footer visible
      expect(screen.getByTestId('profile-section')).toBeInTheDocument()
      expect(screen.getByTestId('settings-navigation-list')).toBeInTheDocument()
      expect(screen.getByTestId('log-out-button')).toBeInTheDocument()
      expect(screen.getByTestId('settings-footer')).toBeInTheDocument()
    })

    it('shows loading skeleton when user data loading', () => {
      // Arrange: Loading state
      const { useAuthStore } = require('../../stores/auth')
      useAuthStore.mockReturnValue({
        user: null,
        loading: true,
        signOut: jest.fn(),
      })

      // Act: Render loading
      renderWithProvider(<SettingsScreen />)

      // Assert: Skeleton visible
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument()
    })

    it('renders navigation items for all settings categories', () => {
      // Arrange: User logged in
      const { useAuthStore } = require('../../stores/auth')
      useAuthStore.mockReturnValue({
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
        loading: false,
        signOut: jest.fn(),
      })

      // Act: Render screen
      renderWithProvider(<SettingsScreen />)

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
