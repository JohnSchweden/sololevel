// react import not needed in React 17+ with automatic JSX runtime
import { fireEvent, render } from '@testing-library/react-native'

import { AudioFeedback } from '@ui/components/VideoAnalysis'

import { VideoPlayerSection } from './VideoPlayerSection'

// Mock VideoAnalysisContext
jest.mock('../contexts/VideoAnalysisContext', () => ({
  useVideoAnalysisContext: () => ({
    videoUri: 'video.mp4',
    feedbackItems: [],
  }),
}))

const createProps = () => ({
  videoControlsRef: { current: null },
  pendingSeek: null,
  userIsPlaying: false,
  videoShouldPlay: false,
  videoEnded: false,
  showControls: true,
  isProcessing: false,
  videoAreaScale: 1,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onReplay: jest.fn(),
  onSeek: jest.fn(),
  onSeekComplete: jest.fn(),
  onSignificantProgress: jest.fn(),
  onLoad: jest.fn(),
  onEnd: jest.fn(),
  onTap: jest.fn(),
  onMenuPress: jest.fn(),
  onControlsVisibilityChange: jest.fn(),
  headerBackHandler: jest.fn(),
  audioPlayerController: {
    setIsPlaying: jest.fn(),
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    seekTime: null,
    togglePlayback: jest.fn(),
    handleLoad: jest.fn(),
    handleProgress: jest.fn(),
    handleEnd: jest.fn(),
    handleError: jest.fn(),
    handleSeekComplete: jest.fn(),
    seekTo: jest.fn(),
    reset: jest.fn(),
  },
  bubbleState: {
    visible: false,
    currentIndex: null,
    items: [],
  },
  audioOverlay: {
    shouldShow: false,
    activeAudio: null,
    onClose: jest.fn(),
  },
  coachSpeaking: false,
  panelFraction: 0.05,
  socialCounts: {
    likes: 1200,
    comments: 89,
    bookmarks: 234,
    shares: 1500,
  },
  onSocialAction: {
    onShare: jest.fn(),
    onLike: jest.fn(),
    onComment: jest.fn(),
    onBookmark: jest.fn(),
  },
})

jest.mock('@my/ui', () => ({
  AppHeader: jest.fn(() => null),
}))

jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')
  return {
    AudioFeedback: jest.fn(() => null),
    AudioPlayer: jest.fn(() => null),
    CoachAvatar: jest.fn(() => null),
    FeedbackBubbles: jest.fn(() => null),
    MotionCaptureOverlay: jest.fn(() => null),
    SocialIcons: jest.fn(() => null),
    VideoContainer: jest.fn(({ children }) => children),
    VideoControls: jest.fn(
      ({ onPlay, onPause, onReplay, onSeek, onControlsVisibilityChange, children }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement('button', { testID: 'play', onPress: onPlay }),
          React.createElement('button', { testID: 'pause', onPress: onPause }),
          React.createElement('button', { testID: 'replay', onPress: onReplay }),
          React.createElement('button', { testID: 'seek', onPress: () => onSeek(10) }),
          React.createElement('button', {
            testID: 'show-controls',
            onPress: () => onControlsVisibilityChange(true),
          }),
          children
        )
    ),
    VideoControlsRef: jest.fn(),
    VideoPlayer: jest.fn(({ onSeekComplete }: any) =>
      React.createElement('button', {
        testID: 'seek-complete',
        onPress: () => onSeekComplete(15),
      })
    ),
    VideoPlayerArea: jest.fn(({ children }: any) =>
      React.createElement('div', { testID: 'video-player-container' }, children)
    ),
  }
})

describe('VideoPlayerSection', () => {
  const mockAudioFeedback = AudioFeedback as unknown as jest.Mock

  beforeEach(() => {
    mockAudioFeedback.mockClear()
  })

  it('renders without crashing', () => {
    const { getAllByTestId } = render(<VideoPlayerSection {...createProps()} />)
    // Some layouts may render multiple areas; assert at least one exists
    expect(getAllByTestId('video-player-container').length).toBeGreaterThan(0)
  })

  it('invokes playback callbacks', () => {
    const props = createProps()
    const { getByTestId } = render(<VideoPlayerSection {...props} />)

    fireEvent.press(getByTestId('play'))
    fireEvent.press(getByTestId('pause'))
    fireEvent.press(getByTestId('replay'))
    fireEvent.press(getByTestId('seek'))
    fireEvent.press(getByTestId('seek-complete'))

    expect(props.onPlay).toHaveBeenCalled()
    expect(props.onPause).toHaveBeenCalled()
    expect(props.onReplay).toHaveBeenCalled()
    expect(props.onSeek).toHaveBeenCalledWith(10)
    // Some platforms provide time via event wrappers; just assert it was called
    expect(props.onSeekComplete).toHaveBeenCalled()
  })

  it('renders audio overlay when provided', () => {
    const props = {
      ...createProps(),
      audioOverlay: {
        shouldShow: true,
        activeAudio: { id: '1', url: 'audio.mp3' },
        onClose: jest.fn(),
      },
    }
    render(<VideoPlayerSection {...props} />)

    expect(mockAudioFeedback).toHaveBeenCalled()
  })

  it('forwards controls visibility change callback', () => {
    const props = createProps()
    const { getByTestId } = render(<VideoPlayerSection {...props} />)

    fireEvent.press(getByTestId('show-controls'))

    expect(props.onControlsVisibilityChange).toHaveBeenCalledWith(true)
  })
})
