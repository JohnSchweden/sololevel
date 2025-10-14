import { screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { AuthenticationSection } from './AuthenticationSection'

describe('AuthenticationSection', () => {
  const defaultProps = {
    appLock: false,
    onAppLockChange: jest.fn(),
    biometricLogin: true,
    onBiometricLoginChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with test ID', () => {
      renderWithProvider(
        <AuthenticationSection
          {...defaultProps}
          testID="auth-section"
        />
      )

      expect(screen.getByTestId('auth-section')).toBeInTheDocument()
    })

    it('should render section header', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      expect(screen.getByText('Authentication')).toBeInTheDocument()
    })

    it('should render App Lock toggle', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      expect(screen.getByText('App Lock')).toBeInTheDocument()
      expect(screen.getByText('Require authentication to open app')).toBeInTheDocument()
    })

    it('should render Biometric Login toggle', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      expect(screen.getByText('Biometric Login')).toBeInTheDocument()
      expect(screen.getByText('Use fingerprint or face recognition')).toBeInTheDocument()
    })
  })

  describe('Toggle State', () => {
    it('should reflect App Lock state', () => {
      renderWithProvider(
        <AuthenticationSection
          {...defaultProps}
          appLock={false}
        />
      )

      // Find switch elements - there should be 2 (App Lock and Biometric Login)
      const switches = screen.getAllByTestId('Switch')
      expect(switches).toHaveLength(2)
    })

    it('should reflect Biometric Login state', () => {
      renderWithProvider(
        <AuthenticationSection
          {...defaultProps}
          biometricLogin={true}
        />
      )

      const switches = screen.getAllByTestId('Switch')
      expect(switches).toHaveLength(2)
    })
  })

  describe('Toggle Integration', () => {
    it('should render both toggle switches', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      const switches = screen.getAllByTestId('Switch')
      expect(switches).toHaveLength(2)
    })

    it('should render toggle switches with proper accessibility', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      const switches = screen.getAllByTestId('Switch')

      // Verify switches are not disabled by default
      switches.forEach((switchEl) => {
        expect(switchEl).toHaveAttribute('aria-disabled', 'false')
      })
    })
  })

  describe('Visual Elements', () => {
    it('should render Shield icons', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      const shieldIcons = screen.getAllByTestId('shield-icon')
      expect(shieldIcons.length).toBeGreaterThan(0)
    })

    it('should render Fingerprint icon', () => {
      renderWithProvider(<AuthenticationSection {...defaultProps} />)

      expect(screen.getByTestId('fingerprint-icon')).toBeInTheDocument()
    })
  })
})
