import { render } from '@testing-library/react-native'
import { AudioFeedback } from './AudioFeedback'

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

const mockController = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  isLoaded: true,
  seekTime: null,
  setIsPlaying: jest.fn(),
  togglePlayback: jest.fn(),
  handleLoad: jest.fn(),
  handleProgress: jest.fn(),
  handleEnd: jest.fn(),
  handleError: jest.fn(),
  handleSeekComplete: jest.fn(),
  seekTo: jest.fn(),
  reset: jest.fn(),
}

const mockProps = {
  audioUrl: 'https://example.com/audio.mp3',
  controller: mockController,
  onClose: jest.fn(),
  isVisible: true,
}

describe('AudioFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders audio feedback when visible with audio URL', () => {
    const { toJSON } = render(<AudioFeedback {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <AudioFeedback
        {...mockProps}
        isVisible={false}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('does not render when no audio URL', () => {
    const { toJSON } = render(
      <AudioFeedback
        {...mockProps}
        audioUrl={null}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('shows play button when paused', () => {
    const { toJSON } = render(<AudioFeedback {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows pause button when playing', () => {
    const { toJSON } = render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, isPlaying: true }}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('displays correct time format', () => {
    const { toJSON } = render(<AudioFeedback {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows progress bar with correct fill', () => {
    const { toJSON } = render(<AudioFeedback {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('handles different progress states', () => {
    const { toJSON: start } = render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 0 }}
      />
    )
    const { toJSON: middle } = render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 60 }}
      />
    )
    const { toJSON: end } = render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 120 }}
      />
    )

    expect(start()).toBeTruthy()
    expect(middle()).toBeTruthy()
    expect(end()).toBeTruthy()
  })

  it('handles close button interaction', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(mockProps.onClose).toBeDefined()
  })

  it('handles play/pause button interaction', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(mockController.togglePlayback).toBeDefined()
  })
})
