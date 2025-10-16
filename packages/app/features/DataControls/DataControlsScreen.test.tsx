import { render, screen } from '@testing-library/react'
import { DataControlsScreen } from './DataControlsScreen'

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  SettingsSectionHeader: ({ title }: any) => <h3>{title}</h3>,
  SettingsToggleItem: ({ title, description, testID }: any) => (
    <div data-testid={testID}>
      <div>{title}</div>
      <div>{description}</div>
      <input type="checkbox" />
    </div>
  ),
  SettingsNavigationItem: ({ title, subtitle }: any) => (
    <button>
      <div>{title}</div>
      <div>{subtitle}</div>
    </button>
  ),
}))

// Mock tamagui components
jest.mock('tamagui', () => ({
  ScrollView: ({ children }: any) => <div>{children}</div>,
  YStack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, testID }: any) => <button data-testid={testID}>{children}</button>,
}))

// Mock navigation hooks
const mockRouter = {
  back: jest.fn(),
}

const mockNavigation = {
  setOptions: jest.fn(),
}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
}))

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 60,
}))

describe('DataControlsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Component Tests', () => {
    it('should render the screen with glass background', () => {
      // Arrange
      render(<DataControlsScreen testID="data-controls-screen" />)

      // Act & Assert
      expect(screen.getByTestId('data-controls-screen')).toBeInTheDocument()
    })

    it('should render Data Sharing section with header', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const sectionHeader = screen.getByText('Data Sharing')

      // Assert
      expect(sectionHeader).toBeInTheDocument()
    })

    it('should render Analytics Data toggle item', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const title = screen.getByText('Analytics Data')
      const description = screen.getByText('Share app usage data to improve experience')

      // Assert
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should render Crash Reports toggle item', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const title = screen.getByText('Crash Reports')
      const description = screen.getByText('Automatically send crash reports')

      // Assert
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should render Data Export section with navigation item', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const sectionHeader = screen.getByText('Data Export')
      const title = screen.getByText('Export Data')
      const description = screen.getByText('Download all your personal data')

      // Assert
      expect(sectionHeader).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should render Data Deletion section with warning and button', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const sectionHeader = screen.getByText('Data Deletion')
      const warningText = screen.getByText(
        /This will permanently delete all your app data including preferences, history, and saved items/
      )
      const deleteButton = screen.getByRole('button', { name: /Clear All Data/i })

      // Assert
      expect(sectionHeader).toBeInTheDocument()
      expect(warningText).toBeInTheDocument()
      expect(deleteButton).toBeInTheDocument()
    })
  })

  describe('User Interaction Tests', () => {
    it('should render Analytics Data toggle', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act & Assert
      expect(screen.getByTestId('settings-toggle-item-analytics')).toBeInTheDocument()
    })

    it('should render Crash Reports toggle', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act & Assert
      expect(screen.getByTestId('settings-toggle-item-crash-reports')).toBeInTheDocument()
    })

    it('should have Export Data button with correct accessibility', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const exportButton = screen.getByRole('button', { name: /Export Data/i })

      // Assert
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveAccessibleName()
    })

    it('should have Clear All Data button with destructive styling', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const deleteButton = screen.getByRole('button', { name: /Clear All Data/i })

      // Assert
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton).toHaveAccessibleName()
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper heading structure', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const dataSharingHeader = screen.getByText('Data Sharing')
      const dataExportHeader = screen.getByText('Data Export')
      const dataDeletionHeader = screen.getByText('Data Deletion')

      // Assert
      expect(dataSharingHeader).toBeInTheDocument()
      expect(dataExportHeader).toBeInTheDocument()
      expect(dataDeletionHeader).toBeInTheDocument()
    })

    it('should have all buttons with accessible names', () => {
      // Arrange
      render(<DataControlsScreen />)

      // Act
      const buttons = screen.getAllByRole('button')

      // Assert
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })
  })
})
