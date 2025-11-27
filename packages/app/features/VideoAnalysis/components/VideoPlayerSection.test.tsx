jest.mock('react-native-video', () => ({
  default: jest.fn(() => null),
}))

jest.mock('react-native-reanimated', () => {
  const React = require('react')

  const identity = (value: any) => value

  const animatedComponent = (Component: any) => {
    if (typeof Component === 'string') {
      return Component
    }
    return (props: any) => React.createElement(Component, props)
  }

  return {
    default: {
      View: (props: any) => React.createElement('View', props),
      ScrollView: (props: any) => React.createElement('ScrollView', props),
      call: () => {},
      createAnimatedComponent: animatedComponent,
    },
    View: (props: any) => React.createElement('View', props),
    ScrollView: (props: any) => React.createElement('ScrollView', props),
    createAnimatedComponent: animatedComponent,
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn((compute: () => any) => ({ value: compute?.() })),
    withTiming: jest.fn(identity),
    withSpring: jest.fn(identity),
    withDecay: jest.fn(identity),
    interpolate: jest.fn(() => 0),
    Extrapolation: { CLAMP: 'CLAMP' },
    Easing: {
      linear: jest.fn(identity),
      inOut: jest.fn(() => identity),
    },
    runOnJS: jest.fn((fn) => fn),
  }
})

declare global {
  // eslint-disable-next-line no-var
  var __reanimatedWorkletInit: (() => void) | undefined
}

globalThis.__reanimatedWorkletInit = jest.fn()

import { fireEvent, render } from '@testing-library/react-native'

import { VideoPlayerSection } from './VideoPlayerSection'

const createProps = () => ({
  videoUri: 'test-video.mp4',
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
  bubbleState: {
    visible: false,
    currentIndex: null,
    items: [],
  },
  feedbackItems: [
    {
      id: 'test-feedback-1',
      timestamp: 10,
      text: 'Test feedback',
      type: 'suggestion' as const,
      category: 'voice' as const,
      confidence: 0.8,
    },
  ],
  analysisTitle: undefined as string | undefined,
  audioOverlayFunctions: {
    onClose: jest.fn(),
    onInactivity: jest.fn(),
    onInteraction: jest.fn(),
    audioDuration: 0,
  },
  panelFraction: 0.05,
})

jest.mock('@my/ui', () => ({
  AppHeader: jest.fn(() => null),
}))

jest.mock('@ui/components/BottomSheets', () => ({
  __esModule: true,
  ShareSheet: jest.fn(() => null),
}))

jest.mock('../stores/feedbackCoordinatorStore', () => ({
  useFeedbackCoordinatorStore: jest.fn((selector) => {
    if (selector) {
      return selector({
        isCoachSpeaking: false,
        bubbleState: {
          bubbleVisible: false,
          currentBubbleIndex: null,
        },
      })
    }
    return {
      isCoachSpeaking: false,
      bubbleState: {
        bubbleVisible: false,
        currentBubbleIndex: null,
      },
    }
  }),
}))

jest.mock('../stores/feedbackAudio', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      activeAudio: null,
      isPlaying: false,
      setController: jest.fn(),
    }
    return selector ? selector(state) : state
  })

  // Add getState method to the mock store
  ;(mockStore as any).getState = jest.fn(() => ({
    activeAudio: null,
    isPlaying: false,
    setController: jest.fn(),
  }))

  return {
    useFeedbackAudioStore: mockStore,
  }
})

jest.mock('../hooks/useFeedbackPanel', () => ({
  requestFeedbackPanelTab: jest.fn(),
}))

jest.mock('../hooks/useAudioControllerLazy', () => ({
  useAudioControllerLazy: jest.fn(() => ({
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
  })),
}))

jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')

  // Use simple strings for primitives to avoid undefined component issues
  const VideoControls = ({ onPlay, onPause, onReplay, onSeek, onControlsVisibilityChange }: any) =>
    React.createElement(
      'View',
      null,
      React.createElement('Pressable', { testID: 'play', onPress: onPlay }),
      React.createElement('Pressable', { testID: 'pause', onPress: onPause }),
      React.createElement('Pressable', { testID: 'replay', onPress: onReplay }),
      React.createElement('Pressable', { testID: 'seek', onPress: () => onSeek(10) }),
      React.createElement('Pressable', {
        testID: 'show-controls',
        onPress: () => onControlsVisibilityChange(true),
      })
    )

  // VideoPlayer mock using forwardRef with useImperativeHandle pattern
  const VideoPlayer = React.forwardRef((props: any, ref: any) => {
    const { onSeekComplete } = props

    React.useImperativeHandle(
      ref,
      () => ({
        seekDirect: jest.fn(),
      }),
      []
    )

    return React.createElement('Pressable', {
      testID: 'seek-complete',
      onPress: () => onSeekComplete?.(15),
    })
  })

  VideoPlayer.displayName = 'VideoPlayer'

  const VideoPlayerArea = ({ children }: any) =>
    React.createElement('View', { testID: 'video-player-container' }, children)

  const VideoContainer = ({ children }: any) => React.createElement('View', null, children)

  const VideoTitle = ({ title }: any) =>
    React.createElement('View', { testID: 'video-title-overlay' }, title)

  return {
    __esModule: true,
    VideoControls,
    VideoPlayer,
    VideoPlayerArea,
    VideoContainer,
    VideoControlsRef: jest.fn(),
    SocialIcons: () => null,
    AudioFeedback: () => null,
    AudioPlayer: () => null,
    CoachAvatar: () => null,
    FeedbackBubbles: () => null,
    MotionCaptureOverlay: () => null,
    VideoTitle,
  }
})

describe.skip('VideoPlayerSection', () => {
  beforeEach(() => {
    const { usePersistentProgressStore, useVideoPlayerStore } =
      require('../stores') as typeof import('../stores')
    usePersistentProgressStore.getState().reset()
    useVideoPlayerStore.getState().reset()
  })

  it('renders without crashing', () => {
    render(<VideoPlayerSection {...createProps()} />)
    // Component renders successfully - no errors thrown
  })

  it('invokes playback callbacks when user interacts', () => {
    const props = createProps()
    const { getByTestId } = render(<VideoPlayerSection {...props} />)

    fireEvent.press(getByTestId('play'))
    expect(props.onPlay).toHaveBeenCalled()

    fireEvent.press(getByTestId('pause'))
    expect(props.onPause).toHaveBeenCalled()

    fireEvent.press(getByTestId('replay'))
    expect(props.onReplay).toHaveBeenCalled()
  })

  it('invokes seek callback when user seeks', () => {
    const props = createProps()
    const { getByTestId } = render(<VideoPlayerSection {...props} />)

    fireEvent.press(getByTestId('seek'))
    expect(props.onSeek).toHaveBeenCalledWith(10)
  })
})
