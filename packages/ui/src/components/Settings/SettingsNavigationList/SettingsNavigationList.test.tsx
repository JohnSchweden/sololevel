import { fireEvent, render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { SettingsNavigationList } from './SettingsNavigationList'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{ui}</TamaguiProvider>)
}

describe('SettingsNavigationList', () => {
  // Arrange-Act-Assert pattern
  const mockNavigationItems = [
    { id: 'account', label: 'Account', route: '/settings/account' },
    { id: 'security', label: 'Security', route: '/settings/security' },
  ]

  describe('Component Rendering', () => {
    it('renders all navigation items', () => {
      // Arrange: List of navigation items
      const onNavigate = jest.fn()

      // Act: Render list
      renderWithProvider(
        <SettingsNavigationList
          items={mockNavigationItems}
          onNavigate={onNavigate}
        />
      )

      // Assert: All labels visible
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
    })

    it('renders empty state when items array is empty', () => {
      // Arrange: Empty items
      const onNavigate = jest.fn()

      // Act: Render with empty array
      renderWithProvider(
        <SettingsNavigationList
          items={[]}
          onNavigate={onNavigate}
        />
      )

      // Assert: No list items rendered
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('User Interactions', () => {
    it('calls onNavigate with correct route when item pressed', () => {
      // Arrange: Spy on navigate handler
      const onNavigate = jest.fn()

      // Act: Render and click first item
      renderWithProvider(
        <SettingsNavigationList
          items={mockNavigationItems}
          onNavigate={onNavigate}
        />
      )
      const accountButton = screen.getByText('Account')
      fireEvent.click(accountButton)

      // Assert: Handler called with route
      expect(onNavigate).toHaveBeenCalledTimes(1)
      expect(onNavigate).toHaveBeenCalledWith('/settings/account')
    })
  })
})
