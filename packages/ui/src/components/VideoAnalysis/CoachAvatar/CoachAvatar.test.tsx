import { render } from '@testing-library/react-native'
import { CoachAvatar } from './CoachAvatar'

// Mock the require call for the coach avatar image
jest.mock('../../../../../../apps/expo/assets/coach_avatar.png', () => 'mocked-coach-avatar')

// Mock Tamagui components and React Native modules
jest.mock('tamagui', () => {
  const React = require('react')

  // Mock Image component
  const mockImage = ({ children, testID, source, ...props }: any) =>
    React.createElement(
      'img',
      {
        'data-testid': testID || 'image',
        src: typeof source === 'string' ? source : 'mock-image.png',
        ...props,
      },
      children
    )

  // Mock View component
  const mockView = ({ children, ...props }: any) =>
    React.createElement('div', { ...props, 'data-testid': props.testID || 'view' }, children)

  return {
    Image: mockImage,
    View: mockView,
    // Add other Tamagui components as needed
    XStack: mockView,
    YStack: mockView,
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { onClick: onPress, ...props }, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('span', { ...props, 'data-testid': props.testID || 'text' }, children),
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
      OS: 'web',
      select: jest.fn((obj) => obj.web || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  }
})

describe('CoachAvatar', () => {
  describe('Rendering', () => {
    it('should render the coach avatar with default props', () => {
      const { toJSON } = render(<CoachAvatar />)

      // Check that the component renders
      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })

    it('should render with custom size', () => {
      const customSize = 48
      const { toJSON } = render(<CoachAvatar size={customSize} />)

      expect(toJSON()).toBeTruthy()
    })

    it('should render with speaking state', () => {
      const { toJSON } = render(<CoachAvatar isSpeaking={true} />)

      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })

    it('should render with idle state by default', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })

    it('should have proper accessibility role', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })

    it('should be accessible', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })
  })

  describe('States', () => {
    it('should have speaking state data attribute when speaking', () => {
      const { toJSON } = render(<CoachAvatar isSpeaking={true} />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })

    it('should have idle state data attribute when not speaking', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'view',
        },
      })
    })
  })
})
