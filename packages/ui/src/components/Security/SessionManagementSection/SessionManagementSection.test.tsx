import { fireEvent, screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { SessionManagementSection } from './SessionManagementSection'

describe('SessionManagementSection', () => {
  const defaultProps = {
    onActiveSessionsPress: jest.fn(),
    onLoginHistoryPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with test ID', () => {
      renderWithProvider(
        <SessionManagementSection
          {...defaultProps}
          testID="session-section"
        />
      )

      expect(screen.getByTestId('session-section')).toBeInTheDocument()
    })

    it('should render section header', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      expect(screen.getByText('Session Management')).toBeInTheDocument()
    })

    it('should render Active Sessions item', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      expect(screen.getByText('Active Sessions')).toBeInTheDocument()
      expect(screen.getByText('Manage logged in devices')).toBeInTheDocument()
    })

    it('should render Login History item', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      expect(screen.getByText('Login History')).toBeInTheDocument()
      expect(screen.getByText('View recent login attempts')).toBeInTheDocument()
    })
  })

  describe('Navigation Interactions', () => {
    it('should call onActiveSessionsPress when Active Sessions is clicked', () => {
      const handleActiveSessionsPress = jest.fn()
      renderWithProvider(
        <SessionManagementSection
          {...defaultProps}
          onActiveSessionsPress={handleActiveSessionsPress}
        />
      )

      const activeSessions = screen.getByText('Active Sessions')
      fireEvent.click(activeSessions)

      expect(handleActiveSessionsPress).toHaveBeenCalledTimes(1)
    })

    it('should call onLoginHistoryPress when Login History is clicked', () => {
      const handleLoginHistoryPress = jest.fn()
      renderWithProvider(
        <SessionManagementSection
          {...defaultProps}
          onLoginHistoryPress={handleLoginHistoryPress}
        />
      )

      const loginHistory = screen.getByText('Login History')
      fireEvent.click(loginHistory)

      expect(handleLoginHistoryPress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Visual Elements', () => {
    it('should render Smartphone icon for header', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      const smartphoneIcons = screen.getAllByTestId('smartphone-icon')
      expect(smartphoneIcons.length).toBeGreaterThan(0)
    })

    it('should render Clock icon for Login History', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('should render ChevronRight icons for navigation', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      const chevronIcons = screen.getAllByTestId('chevron-right-icon')
      expect(chevronIcons).toHaveLength(2) // One for each navigation item
    })
  })

  describe('Touch Targets', () => {
    it('should have proper button structure for Active Sessions', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      const activeSessions = screen.getByText('Active Sessions')
      expect(activeSessions).toBeInTheDocument()
    })

    it('should have proper button structure for Login History', () => {
      renderWithProvider(<SessionManagementSection {...defaultProps} />)

      const loginHistory = screen.getByText('Login History')
      expect(loginHistory).toBeInTheDocument()
    })
  })
})
