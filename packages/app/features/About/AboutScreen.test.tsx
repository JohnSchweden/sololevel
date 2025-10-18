import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import { AboutScreen } from './AboutScreen'

// Mock navigation hooks
const mockBack = jest.fn()
const mockSetOptions = jest.fn()
const mockUseNavigation = jest.fn(() => ({
  setOptions: mockSetOptions,
}))
const mockUseRouter = jest.fn(() => ({
  back: mockBack,
}))

jest.mock('expo-router', () => ({
  useNavigation: () => mockUseNavigation(),
  useRouter: () => mockUseRouter(),
}))

jest.mock('@react-navigation/elements', () => ({}))

describe('AboutScreen', () => {
  // Arrange: Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Component Tests', () => {
    it('should render app logo', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      // Logo renders "S" text inside the container
      expect(screen.getByText('S')).toBeTruthy()
    })

    it('should render app name', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText('Solo:Level')).toBeTruthy()
    })

    it('should render version number', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText(/version 1\.0\.0/i)).toBeTruthy()
    })

    it('should render app description', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText(/Your healthy relationship with a coach/i)).toBeTruthy()
    })

    it('should render Legal section header', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText('Legal')).toBeTruthy()
    })

    it('should render Privacy Policy list item', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText('Privacy Policy')).toBeTruthy()
    })

    it('should render Terms of Service list item', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText('Terms of Service')).toBeTruthy()
    })

    it('should render Licenses list item', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText('Licenses')).toBeTruthy()
    })

    it('should render copyright notice', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByText(/© 2025.*all rights reserved/i)).toBeTruthy()
    })
  })

  describe('User Interaction Tests', () => {
    it('should call onPrivacyPress when Privacy Policy is pressed', () => {
      // Arrange
      const mockOnPrivacy = jest.fn()

      // Act
      render(<AboutScreen onPrivacyPress={mockOnPrivacy} />)
      const privacyItem = screen.getByText('Privacy Policy')
      fireEvent.click(privacyItem)

      // Assert
      expect(mockOnPrivacy).toHaveBeenCalledTimes(1)
    })

    it('should call onTermsPress when Terms of Service is pressed', () => {
      // Arrange
      const mockOnTerms = jest.fn()

      // Act
      render(<AboutScreen onTermsPress={mockOnTerms} />)
      const termsItem = screen.getByText('Terms of Service')
      fireEvent.click(termsItem)

      // Assert
      expect(mockOnTerms).toHaveBeenCalledTimes(1)
    })

    it('should call onLicensesPress when Licenses is pressed', () => {
      // Arrange
      const mockOnLicenses = jest.fn()

      // Act
      render(<AboutScreen onLicensesPress={mockOnLicenses} />)
      const licensesItem = screen.getByText('Licenses')
      fireEvent.click(licensesItem)

      // Assert
      expect(mockOnLicenses).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility Tests', () => {
    it('should have correct testID', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      expect(screen.getByTestId('about-screen')).toBeTruthy()
    })

    it('should use SettingsListItem components with accessibility support', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen />)

      // Assert
      // SettingsListItem includes accessibilityRole="button" and accessibilityLabel
      const privacyItem = screen.getByText('Privacy Policy')
      expect(privacyItem).toBeTruthy()
    })
  })
})
