import { render, screen } from '@testing-library/react'
import { PersonalisationScreen } from './PersonalisationScreen'

// Mock auth hook
const mockAuth = {
  userId: 'test-user-id',
  user: { id: 'test-user-id' },
  session: {},
  loading: false,
  initialized: true,
  isAuthenticated: true,
}

jest.mock('@app/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

// Mock MODE_OPTIONS constant
jest.mock('@app/features/Onboarding/constants', () => ({
  MODE_OPTIONS: [
    { value: 'roast', label: 'Roast:Me ⭐', description: 'Brutal honesty with biting humor' },
    { value: 'zen', label: 'Zen:Me 🧘', description: 'Calm, encouraging guidance' },
    { value: 'lovebomb', label: 'Lovebomb:Me 💖', description: 'Lovable positivity' },
  ],
}))

// Mock voice preferences store
const mockVoicePreferencesStore = {
  gender: 'female',
  mode: 'roast',
  isLoaded: true,
  isSyncing: false,
  _isHydrated: true,
  setGender: jest.fn(),
  setMode: jest.fn(),
  loadFromDatabase: jest.fn(),
  syncToDatabase: jest.fn(),
}

jest.mock('@app/stores/voicePreferences', () => ({
  useVoicePreferencesStore: (selector?: (state: any) => any) => {
    if (!selector) {
      return mockVoicePreferencesStore
    }
    return selector(mockVoicePreferencesStore)
  },
}))

// Mock safe area hook
jest.mock('@app/provider/safe-area/use-safe-area', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useStableSafeArea: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  useStableTopInset: () => 44,
}))

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  SettingsSectionHeader: ({ title, testID }: any) => (
    <div data-testid={testID || 'settings-section-header'}>{title}</div>
  ),
  SettingsRadioGroup: ({ testID, options }: any) => (
    <div data-testid={testID || 'settings-radio-group'}>
      {options
        ? options.map((opt: any) => <span key={opt.value}>{opt.label}</span>)
        : ['Light', 'Dark', 'Auto'].map((label) => <span key={label}>{label}</span>)}
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

// Mock react-native
jest.mock('react-native', () => ({
  View: ({ children, testID, ...props }: any) => (
    <div
      data-testid={testID}
      {...props}
    >
      {children}
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
  XStack: ({ children, testID, ...props }: any) => (
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
  Text: ({ children, testID, ...props }: any) => (
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
  Mic: () => 'Mic',
  User: () => 'User',
  Sparkles: () => 'Sparkles',
  AArrowUp: () => 'AArrowUp',
  Vibrate: () => 'Vibrate',
  ChevronDown: () => 'ChevronDown',
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
      expect(screen.getByText('Coach Voice')).toBeInTheDocument()
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Language & Region')).toBeInTheDocument()
      expect(screen.getByText('Accessibility')).toBeInTheDocument()
      expect(screen.getByText('Interaction')).toBeInTheDocument()
    })

    it('should render Coach Voice section with gender and mode selectors', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Coach Voice section should be visible
      expect(screen.getByText('Coach Voice')).toBeInTheDocument()
      expect(screen.getByText('Female')).toBeInTheDocument()
      expect(screen.getByText('Male')).toBeInTheDocument()
      expect(screen.getByText('Roast:Me ⭐')).toBeInTheDocument()
      expect(screen.getByText('Zen:Me 🧘')).toBeInTheDocument()
      expect(screen.getByText('Lovebomb:Me 💖')).toBeInTheDocument()
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
        screen.getByText('Coach Voice'),
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

  describe('Voice Preferences Integration', () => {
    it('should load voice preferences on mount when user is authenticated and not loaded', () => {
      // Arrange - Override mock to set isLoaded = false
      const mockStoreNotLoaded = {
        ...mockVoicePreferencesStore,
        isLoaded: false,
      }
      const mockStore = require('@app/stores/voicePreferences')
      jest.spyOn(mockStore, 'useVoicePreferencesStore').mockImplementation((selector: any) => {
        if (!selector) {
          return mockStoreNotLoaded
        }
        return selector(mockStoreNotLoaded)
      })

      // Act
      render(<PersonalisationScreen />)

      // Assert - loadFromDatabase should be called with userId
      expect(mockStoreNotLoaded.loadFromDatabase).toHaveBeenCalledWith('test-user-id')
    })

    it('should display current voice preferences from store', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Current preferences should be visible
      expect(screen.getByText('Female')).toBeInTheDocument()
      expect(screen.getByText('Male')).toBeInTheDocument()
      expect(screen.getByText('Roast:Me ⭐')).toBeInTheDocument()
    })

    it('should render voice gender radio group', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Gender radio should be present
      const genderRadio = screen.getByTestId('voice-gender-radio')
      expect(genderRadio).toBeInTheDocument()
    })

    it('should render voice mode radio group', () => {
      // Arrange & Act
      render(<PersonalisationScreen />)

      // Assert - Mode radio should be present
      const modeRadio = screen.getByTestId('voice-mode-radio')
      expect(modeRadio).toBeInTheDocument()
    })
  })
})
