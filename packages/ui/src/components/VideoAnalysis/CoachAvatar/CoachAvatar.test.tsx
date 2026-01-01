import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
// Import test setup to get all the mocks (expo-image, expo-blur, etc.)
import '../../../test-utils/setup'
import { CoachAvatar } from './CoachAvatar'

// Mock the require call for the coach avatar image
jest.mock('../../../../../../apps/expo/assets/coach_avatar.png', () => 'mocked-coach-avatar')

// Mock Tamagui components and React Native modules
jest.mock('tamagui', () => {
  const React = require('react')

  // Import the comprehensive mock utilities
  const { createMockComponent, TAMAGUI_PROPS_TO_FILTER } = require('../../../test-utils/mocks')

  // Create mock components that properly filter Tamagui props
  const MockView = createMockComponent('View')
  const MockButton = createMockComponent('Button')
  const MockText = createMockComponent('Text')

  // Mock Image component with proper prop filtering
  const MockImage = React.forwardRef(({ children, testID, source, ...props }: any, ref: any) => {
    // Filter out Tamagui-specific props
    const domProps = Object.fromEntries(
      Object.entries(props).filter(([key]: [string, unknown]) => !TAMAGUI_PROPS_TO_FILTER.has(key))
    )

    return React.createElement(
      'img',
      {
        ref,
        'data-testid': testID || 'image',
        src: typeof source === 'string' ? source : 'mock-image.png',
        ...domProps,
      },
      children
    )
  })

  return {
    Image: MockImage,
    View: MockView,
    XStack: MockView,
    YStack: MockView,
    Button: MockButton,
    Text: MockText,
    SizableText: MockText,
  }
})

// Mock React Native's TurboModuleRegistry to prevent DevMenu module errors
jest.mock('react-native', () => {
  // Mock TurboModuleRegistry to prevent DevMenu module errors
  const mockTurboModuleRegistry = {
    getEnforcing: jest.fn(() => ({})),
    get: jest.fn(() => ({})),
  }

  return {
    TurboModuleRegistry: mockTurboModuleRegistry,
    DevMenu: {},
    // Add other RN modules that might be imported
    Platform: {
      OS: 'ios', // Set to 'ios' so OptimizedImage uses ExpoImage (which is properly mocked)
      select: jest.fn((obj) => obj.ios || obj.web || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  }
})

describe('CoachAvatar', () => {
  describe('Rendering', () => {
    it('should render the coach avatar with default props', () => {
      render(<CoachAvatar />)

      // Check that the component renders
      expect(screen.getByTestId('coach-avatar-idle')).toBeInTheDocument()
      expect(screen.getByTestId('coach-avatar-image')).toBeInTheDocument()
    })

    it('should render with custom size', () => {
      const customSize = 48
      render(<CoachAvatar size={customSize} />)

      expect(screen.getByTestId('coach-avatar-idle')).toBeInTheDocument()
    })

    it('should render with speaking state', () => {
      render(<CoachAvatar isSpeaking={true} />)

      expect(screen.getByTestId('coach-avatar-speaking')).toBeInTheDocument()
    })

    it('should render with idle state by default', () => {
      render(<CoachAvatar />)

      expect(screen.getByTestId('coach-avatar-idle')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      render(<CoachAvatar />)

      const avatar = screen.getByTestId('coach-avatar-idle')
      expect(avatar).toHaveAttribute('aria-label', 'AI Coach Avatar')
    })

    it('should have proper accessibility role', () => {
      render(<CoachAvatar />)

      const avatar = screen.getByTestId('coach-avatar-idle')
      expect(avatar).toHaveAttribute('role', 'image')
    })

    it('should be accessible', () => {
      render(<CoachAvatar />)

      const avatar = screen.getByTestId('coach-avatar-idle')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('aria-label')
      expect(avatar).toHaveAttribute('role')
    })
  })

  describe('States', () => {
    it('should have speaking state data attribute when speaking', () => {
      render(<CoachAvatar isSpeaking={true} />)

      expect(screen.getByTestId('coach-avatar-speaking')).toBeInTheDocument()
    })

    it('should have idle state data attribute when not speaking', () => {
      render(<CoachAvatar />)

      expect(screen.getByTestId('coach-avatar-idle')).toBeInTheDocument()
    })
  })
})
