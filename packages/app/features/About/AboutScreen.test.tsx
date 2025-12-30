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

// Mock image assets
jest.mock('../../../../apps/expo/assets/icon-transparent.png', () => 'icon-transparent.png')
jest.mock('../../../../apps/expo/assets/logo_text.png', () => 'logo_text.png')

// Mock @my/ui components
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    GlassBackground: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, children),
    SettingsListItem: ({ label, onPress, testID, ...props }: any) =>
      React.createElement('button', { onClick: onPress, 'data-testid': testID, ...props }, label),
    SettingsSectionHeader: ({ title, icon, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, title),
  }
})

// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  FileText: () => 'FileText',
}))

// Mock safe area hook
jest.mock('@app/provider/safe-area/use-safe-area', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useStableSafeArea: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  useStableTopInset: () => 44,
}))

// Mock react-native
jest.mock('react-native', () => {
  const React = require('react')
  return {
    Platform: {
      OS: 'web',
      select: jest.fn((obj: any) => obj.web || obj.default),
    },
    View: ({ children, testID, style, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, style, ...props }, children),
  }
})

// Mock tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  return {
    Image: ({ source, testID, ...props }: any) =>
      React.createElement('img', { src: source, 'data-testid': testID, ...props }),
    ScrollView: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { overflow: 'auto' }, ...props },
        children
      ),
    Text: ({ children, testID, ...props }: any) =>
      React.createElement('span', { 'data-testid': testID, ...props }, children),
    XStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { display: 'flex', flexDirection: 'row' }, ...props },
        children
      ),
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { display: 'flex', flexDirection: 'column' }, ...props },
        children
      ),
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, children),
  }
})

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
      // Logo renders as an image
      expect(screen.getByTestId('about-screen-logo')).toBeTruthy()
    })

    it('should render app name', () => {
      // Arrange
      // (setup in beforeEach)

      // Act
      render(<AboutScreen testID="about-screen" />)

      // Assert
      // App name is rendered as an image (logo_text.png), not as text
      // App name also appears in copyright text
      expect(screen.getByTestId('about-screen-logo-text')).toBeTruthy()
      expect(screen.getByText(/Solo:Level/)).toBeTruthy()
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
      expect(
        screen.getByText(/Your toxic relationship with a coach you will never forget/i)
      ).toBeTruthy()
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
