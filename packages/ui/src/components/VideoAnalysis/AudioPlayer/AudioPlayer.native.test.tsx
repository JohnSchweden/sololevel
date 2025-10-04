import { render } from '@testing-library/react-native'
import { AudioPlayer } from './AudioPlayer.native'

// Mock react-native-video
jest.mock('react-native-video', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: ({ testID, ...props }: any) => React.createElement('Video', { testID, ...props }),
  }
})

describe('AudioPlayer', () => {
  const mockController = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render Video component with audio-only props', () => {
    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={mockController}
        testID="audio-player"
      />
    )

    const videoElement = getByTestId('audio-player')
    expect(videoElement).toBeTruthy()
  })

  it('should pass correct props to Video component', () => {
    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={mockController}
      />
    )

    const videoElement = getByTestId('AudioPlayer')
    expect(videoElement.props.source).toEqual({ uri: 'https://example.com/audio.mp3' })
    expect(videoElement.props.paused).toBe(true) // isPlaying is false
    expect(videoElement.props.ignoreSilentSwitch).toBe('ignore')
    expect(videoElement.props.seek).toBeUndefined() // seekTime is null
  })

  it('should set paused to false when isPlaying is true', () => {
    const playingController = { ...mockController, isPlaying: true }

    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={playingController}
      />
    )

    const videoElement = getByTestId('AudioPlayer')
    expect(videoElement.props.paused).toBe(false)
  })

  it('should set seek prop when seekTime is not null', () => {
    const seekingController = { ...mockController, seekTime: 5.5 }

    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={seekingController}
      />
    )

    const videoElement = getByTestId('AudioPlayer')
    expect(videoElement.props.seek).toBe(5.5)
  })

  it('should not render when audioUrl is null', () => {
    const { queryByTestId } = render(
      <AudioPlayer
        audioUrl={null}
        controller={mockController}
      />
    )

    expect(queryByTestId('AudioPlayer')).toBeNull()
  })

  it('should call controller handlers on video events', () => {
    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={mockController}
      />
    )

    const videoElement = getByTestId('AudioPlayer')

    // Simulate onLoad event
    const loadData = { duration: 10.5 }
    videoElement.props.onLoad(loadData)
    expect(mockController.handleLoad).toHaveBeenCalledWith(loadData)

    // Simulate onProgress event
    const progressData = { currentTime: 3.2 }
    videoElement.props.onProgress(progressData)
    expect(mockController.handleProgress).toHaveBeenCalledWith(progressData)

    // Simulate onEnd event
    videoElement.props.onEnd()
    expect(mockController.handleEnd).toHaveBeenCalled()

    // Simulate onError event
    const errorData = { error: { code: 'E_LOAD' } }
    videoElement.props.onError(errorData)
    expect(mockController.handleError).toHaveBeenCalledWith(errorData)
  })

  it('should hide video component with zero dimensions', () => {
    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={mockController}
      />
    )

    const videoElement = getByTestId('AudioPlayer')
    expect(videoElement.props.style).toEqual({
      width: 0,
      height: 0,
      position: 'absolute',
    })
  })

  it('should apply custom testID when provided', () => {
    const { getByTestId } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        controller={mockController}
        testID="custom-audio-player"
      />
    )

    expect(getByTestId('custom-audio-player')).toBeTruthy()
  })
})
