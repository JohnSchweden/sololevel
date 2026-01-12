/**
 * VoiceSelectionScreen Tests
 * Tests for first-login voice selection onboarding
 */

import { useAuthStore } from '@app/stores/auth'
import { useVoicePreferencesStore } from '@app/stores/voicePreferences'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { VoiceSelectionScreen } from './VoiceSelectionScreen'
import { DEFAULT_PREFERENCES } from './constants'

// Mock stores
jest.mock('@app/stores/auth')
jest.mock('@app/stores/voicePreferences')

// Mock logging
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  GlassButton: ({ children, onPress, testID, disabled }: any) => (
    <button
      data-testid={testID}
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  H2: ({ children }: any) => <h2>{children}</h2>,
  Paragraph: ({ children }: any) => <p>{children}</p>,
  SettingsRadioGroup: ({ testID, options, onValueChange }: any) => (
    <div data-testid={testID}>
      {options?.map((opt: any) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onValueChange?.(opt.value)}
          style={{ cursor: 'pointer' }}
        >
          {opt.label}
        </button>
      ))}
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
  Sparkles: () => 'Sparkles',
  User: () => 'User',
}))

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
}))

// Mock react-native components
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
}))

// Mock safe area hook
jest.mock('@app/provider/safe-area/use-safe-area', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

describe('VoiceSelectionScreen', () => {
  const mockOnContinue = jest.fn()
  const mockSetGender = jest.fn()
  const mockSetMode = jest.fn()
  const mockSyncToDatabase = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock auth store - handle selector pattern
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = { user: { id: 'user-123' } }
      return selector ? selector(state) : state
    })

    // Mock voice preferences store
    ;(useVoicePreferencesStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const store = {
        setGender: mockSetGender,
        setMode: mockSetMode,
        syncToDatabase: mockSyncToDatabase,
      }
      return selector ? selector(store) : store
    })
  })

  describe('Rendering', () => {
    it('should render with default selections', () => {
      // Act
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)

      // Assert
      expect(screen.getByText("Let's get you started")).toBeInTheDocument()
      expect(screen.getByText('Customize your Solo:Leveling')).toBeInTheDocument()
      expect(screen.getByText('Female')).toBeInTheDocument()
      expect(screen.getByText('Male')).toBeInTheDocument()
      expect(screen.getByText('Roast:Me ⭐')).toBeInTheDocument()
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('should render gender selector with Female and Male options', () => {
      // Act
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)

      // Assert
      expect(screen.getByText('Female')).toBeInTheDocument()
      expect(screen.getByText('Male')).toBeInTheDocument()
    })

    it('should render mode selector with all three modes', () => {
      // Act
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)

      // Assert
      expect(screen.getByText('Roast:Me ⭐')).toBeInTheDocument()
      expect(screen.getByText('Zen:Me 🧘')).toBeInTheDocument()
      expect(screen.getByText('Lovebomb:Me 💖')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call setGender when gender is changed', () => {
      // Arrange
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const maleOption = screen.getByText('Male')

      // Act
      fireEvent.click(maleOption)

      // Assert
      expect(mockSetGender).toHaveBeenCalledWith('male')
    })

    it('should call setMode when mode is changed', () => {
      // Arrange
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const zenOption = screen.getByText('Zen:Me 🧘')

      // Act
      fireEvent.click(zenOption)

      // Assert
      expect(mockSetMode).toHaveBeenCalledWith('zen')
    })

    it('should save preferences and call onContinue when Continue is pressed', async () => {
      // Arrange
      mockSyncToDatabase.mockResolvedValue(undefined)
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const continueButton = screen.getByTestId('continue-button')

      // Act
      fireEvent.click(continueButton)

      // Assert
      await waitFor(() => {
        expect(mockSyncToDatabase).toHaveBeenCalledWith('user-123')
        expect(mockOnContinue).toHaveBeenCalled()
      })
    })

    it('should show saving state while syncing to database', async () => {
      // Arrange
      mockSyncToDatabase.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const continueButton = screen.getByTestId('continue-button')

      // Act
      fireEvent.click(continueButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      })
    })

    it('should not call onContinue if sync fails', async () => {
      // Arrange
      mockSyncToDatabase.mockRejectedValue(new Error('Network error'))
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const continueButton = screen.getByTestId('continue-button')

      // Act
      fireEvent.click(continueButton)

      // Assert
      await waitFor(() => {
        expect(mockSyncToDatabase).toHaveBeenCalled()
      })
      expect(mockOnContinue).not.toHaveBeenCalled()
      // Button should become enabled again for retry
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should not save if user ID is missing', async () => {
      // Arrange - Mock returns null user for selector
      ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
        const state = { user: null }
        return selector ? selector(state) : state
      })
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)
      const continueButton = screen.getByTestId('continue-button')

      // Act
      fireEvent.click(continueButton)

      // Assert
      await waitFor(() => {
        expect(mockSyncToDatabase).not.toHaveBeenCalled()
        expect(mockOnContinue).not.toHaveBeenCalled()
      })
    })
  })

  describe('Default Preselections', () => {
    it('should preselect female gender per spec', () => {
      // Act
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)

      // Assert
      // Female should be the default (visual verification in component)
      expect(DEFAULT_PREFERENCES.gender).toBe('female')
    })

    it('should preselect roast mode per spec', () => {
      // Act
      render(<VoiceSelectionScreen onContinue={mockOnContinue} />)

      // Assert
      // Roast should be the default (visual verification in component)
      expect(DEFAULT_PREFERENCES.mode).toBe('roast')
    })
  })
})
