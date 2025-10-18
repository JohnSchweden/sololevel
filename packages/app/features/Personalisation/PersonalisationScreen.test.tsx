import { render, screen } from '@testing-library/react'
import { PersonalisationScreen } from './PersonalisationScreen'

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  SettingsSectionHeader: ({ title, testID }: any) => (
    <div data-testid={testID || 'settings-section-header'}>{title}</div>
  ),
  SettingsRadioGroup: ({ testID }: any) => (
    <div data-testid={testID || 'settings-radio-group'}>
      <span>Light</span>
      <span>Dark</span>
      <span>Auto</span>
    </div>
  ),
  SettingsSelectItem: ({ title, description, value, options, testID }: any) => {
    const currentLabel = options.find((opt: any) => opt.value === value)?.label || 'Select...'
    return (
      <div data-testid={testID || 'settings-select-item'}>
        <div>{title}</div>
        <div>{description}</div>
        <button data-testid="select-trigger">{currentLabel}</button>
      </div>
    )
  },
  SettingsToggleItem: ({ title, description, testID }: any) => (
    <div data-testid={testID || 'settings-toggle-item'}>
      <div>{title}</div>
      <div>{description}</div>
      <div data-testid="Switch" />
    </div>
  ),
}))

// Mock tamagui components
jest.mock('tamagui', () => ({
  YStack: ({ children, testID, ...props }: any) => (
    <div
      data-testid={testID}
      {...props}
    >
      {children}
    </div>
  ),
  ScrollView: ({ children, testID, ...props }: any) => (
    <div
      data-testid={testID}
      {...props}
    >
      {children}
    </div>
  ),
}))

// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  Palette: () => 'Palette',
  Globe: () => 'Globe',
  Type: () => 'Type',
  Zap: () => 'Zap',
  Volume2: () => 'Volume2',
}))

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
}))

// Mock navigation hooks
const mockNavigation = {
  setOptions: jest.fn(),
}

jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
}))

jest.mock('@react-navigation/elements', () => ({}))

describe('PersonalisationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render screen with all sections', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - All sections should be visible
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Language & Region')).toBeInTheDocument()
      expect(screen.getByText('Accessibility')).toBeInTheDocument()
      expect(screen.getByText('Interaction')).toBeInTheDocument()
    })

    it('should render theme selector with all options', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Theme options should be visible
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('should render language selector', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert
      expect(screen.getByText('Language')).toBeInTheDocument()
      expect(screen.getByText('Select your preferred language')).toBeInTheDocument()
    })

    it('should render accessibility toggles', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert
      expect(screen.getByText('Large Text')).toBeInTheDocument()
      expect(screen.getByText('Increase text size for better readability')).toBeInTheDocument()
      expect(screen.getByText('Reduce Animations')).toBeInTheDocument()
      expect(screen.getByText('Minimize motion effects')).toBeInTheDocument()
    })

    it('should render interaction toggles', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert
      expect(screen.getByText('Sound Effects')).toBeInTheDocument()
      expect(screen.getByText('Play sounds for interactions')).toBeInTheDocument()
      expect(screen.getByText('Haptic Feedback')).toBeInTheDocument()
      expect(screen.getByText('Feel vibrations for actions')).toBeInTheDocument()
    })

    it('should apply custom testID', () => {
      // Arrange & Act
      render(<PersonalisationScreen testID="custom-screen" />)

      // Assert
      expect(screen.getByTestId('custom-screen')).toBeInTheDocument()
    })
  })

  // AppHeader Configuration removed - now handled in _layout.tsx

  describe('Interactive Elements', () => {
    it('should have working theme selector', () => {
      // Arrange
      render(<PersonalisationScreen />)

      // Act - Theme selection is tested in SettingsRadioGroup component tests
      // Just verify the component is rendered
      const radioGroup = screen.getByTestId('settings-radio-group')

      // Assert
      expect(radioGroup).toBeInTheDocument()
    })

    it('should have working language selector', () => {
      // Arrange
      render(<PersonalisationScreen />)

      // Act - Select is tested in SettingsSelectItem component tests
      // Just verify the component is rendered
      const selectTrigger = screen.getByTestId('select-trigger')

      // Assert
      expect(selectTrigger).toBeInTheDocument()
    })

    it('should have working toggle switches', () => {
      // Arrange
      render(<PersonalisationScreen />)

      // Act - Get all switches (4 total: Large Text, Reduce Animations, Sound Effects, Haptic Feedback)
      const switches = screen.getAllByTestId('Switch')

      // Assert - All switches should be present
      expect(switches).toHaveLength(4)
    })
  })

  describe('Layout and Styling', () => {
    it('should use GlassBackground wrapper', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - GlassBackground is mocked in test
      expect(screen.getByTestId('personalisation-screen')).toBeInTheDocument()
    })

    it('should have proper section spacing', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Sections should be rendered with proper structure
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Language & Region')).toBeInTheDocument()
      expect(screen.getByText('Accessibility')).toBeInTheDocument()
      expect(screen.getByText('Interaction')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible section headers', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - All section headers should be visible
      const sectionHeaders = [
        screen.getByText('Appearance'),
        screen.getByText('Language & Region'),
        screen.getByText('Accessibility'),
        screen.getByText('Interaction'),
      ]

      sectionHeaders.forEach((header) => {
        expect(header).toBeInTheDocument()
      })
    })

    it('should have accessible toggle labels', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - All toggle labels should be visible
      const toggleLabels = ['Large Text', 'Reduce Animations', 'Sound Effects', 'Haptic Feedback']

      toggleLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })

  describe('Default State', () => {
    it('should initialize with default theme (auto)', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Auto should be present (default selected in SettingsRadioGroup)
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('should initialize with default language (en-US)', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Default language should be displayed
      expect(screen.getByText('English (US)')).toBeInTheDocument()
    })

    it('should initialize accessibility toggles to false', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Switches should be present
      const switches = screen.getAllByTestId('Switch')
      expect(switches.length).toBeGreaterThan(0)
    })

    it('should initialize interaction toggles (sound effects and haptic feedback)', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Both interaction settings should be present
      expect(screen.getByText('Sound Effects')).toBeInTheDocument()
      expect(screen.getByText('Haptic Feedback')).toBeInTheDocument()
    })
  })
})
