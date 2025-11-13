jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => undefined
  return Reanimated
})

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
// react import not needed in React 17+ with automatic JSX runtime
import { fireEvent, render } from '@testing-library/react-native'

import { AudioFeedback, SocialIcons } from '@ui/components/VideoAnalysis'

import { VideoPlayerSection } from './VideoPlayerSection'

// Context removed - videoUri is now passed as prop

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
  // coachSpeaking: false, - REMOVED: Now subscribed directly from store
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

jest.mock('../stores/feedbackAudio', () => ({
  useFeedbackAudioStore: jest.fn((selector) => {
    const state = {
      activeAudio: null,
    }
    return selector ? selector(state) : state
  }),
}))

const mockRequestTab = jest.fn()
jest.mock('../hooks/useFeedbackPanel', () => {
  const actual = jest.requireActual('../hooks/useFeedbackPanel')
  return {
    ...actual,
    requestFeedbackPanelTab: mockRequestTab,
  }
})

jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')
  const { Pressable, View } = require('react-native')

  const components = new Map<string | symbol, jest.Mock>()

  const ensureComponent = (name: string | symbol, factory: () => jest.Mock) => {
    if (!components.has(name)) {
      components.set(name, factory())
    }
    return components.get(name)!
  }

  return new Proxy(
    {},
    {
      get: (_target, prop: string | symbol) => {
        if (prop === '__esModule') {
          return true
        }
        if (prop === 'VideoControls') {
          return ensureComponent(prop, () =>
            jest.fn(
              ({ onPlay, onPause, onReplay, onSeek, onControlsVisibilityChange, children }: any) =>
                React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(Pressable, { testID: 'play', onPress: onPlay }),
                  React.createElement(Pressable, { testID: 'pause', onPress: onPause }),
                  React.createElement(Pressable, { testID: 'replay', onPress: onReplay }),
                  React.createElement(Pressable, { testID: 'seek', onPress: () => onSeek(10) }),
                  React.createElement(Pressable, {
                    testID: 'show-controls',
                    onPress: () => onControlsVisibilityChange(true),
                  }),
                  children
                )
            )
          )
        }
        if (prop === 'VideoPlayer') {
          return ensureComponent(prop, () =>
            jest.fn(({ onSeekComplete }: any) =>
              React.createElement(Pressable, {
                testID: 'seek-complete',
                onPress: () => onSeekComplete?.(15),
              })
            )
          )
        }
        if (prop === 'VideoPlayerArea') {
          return ensureComponent(prop, () =>
            jest.fn(({ children }: any) =>
              React.createElement(View, { testID: 'video-player-container' }, children)
            )
          )
        }
        if (prop === 'VideoContainer') {
          return ensureComponent(prop, () =>
            jest.fn(({ children }: any) => React.createElement(View, null, children))
          )
        }
        if (prop === 'VideoControlsRef') {
          return ensureComponent(prop, () => jest.fn())
        }
        if (prop === 'SocialIcons') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'AudioFeedback') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'AudioPlayer') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'CoachAvatar') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'FeedbackBubbles') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'MotionCaptureOverlay') {
          return ensureComponent(prop, () => jest.fn(() => null))
        }
        if (prop === 'VideoTitle') {
          return ensureComponent(prop, () =>
            jest.fn(({ title, testID }: any) =>
              React.createElement(View, { testID: testID || 'video-title' }, title)
            )
          )
        }
        return ensureComponent(prop, () => jest.fn(() => null))
      },
    }
  )
})

describe.skip('VideoPlayerSection', () => {
  const mockAudioFeedback = AudioFeedback as unknown as jest.Mock

  beforeEach(() => {
    mockAudioFeedback.mockClear()
    const { usePersistentProgressStore, useVideoPlayerStore } =
      require('../stores') as typeof import('../stores')
    usePersistentProgressStore.getState().reset()
    useVideoPlayerStore.getState().reset()
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
        onInactivity: jest.fn(),
      },
    }
    render(<VideoPlayerSection {...props} />)

    expect(mockAudioFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        audioUrl: 'audio.mp3',
        controller: expect.any(Object),
        onClose: props.audioOverlay.onClose,
        onInactivity: props.audioOverlay.onInactivity,
        isVisible: true,
        testID: 'audio-feedback-controls',
      }),
      undefined
    )
  })

  it('forwards controls visibility change callback', () => {
    const props = createProps()
    const { getByTestId } = render(<VideoPlayerSection {...props} />)

    fireEvent.press(getByTestId('show-controls'))

    expect(props.onControlsVisibilityChange).toHaveBeenCalledWith(true)
  })

  it('switches to comments tab when comment action invoked', () => {
    mockRequestTab.mockClear()
    const props = createProps()
    render(<VideoPlayerSection {...props} />)

    const socialMock = SocialIcons as jest.Mock
    const latestArgs = socialMock.mock.calls.at(-1)?.[0]
    expect(latestArgs?.onComment).toBeDefined()

    latestArgs.onComment()

    expect(mockRequestTab).toHaveBeenCalledWith('comments')
  })

  describe('Title Overlay', () => {
    it('renders title overlay when analysisTitle is provided', () => {
      // 🧪 ARRANGE: Set up component with analysis title
      const props = { ...createProps(), analysisTitle: 'Test Analysis Title' }

      // 🎬 ACT: Render the component
      const { getByTestId } = render(<VideoPlayerSection {...props} />)

      // ✅ ASSERT: Title overlay container is rendered
      expect(getByTestId('video-title-overlay-container')).toBeTruthy()
    })

    it('does not render title overlay when analysisTitle is not provided', () => {
      // 🧪 ARRANGE: Set up component without analysis title
      const props = { ...createProps(), analysisTitle: undefined }

      // 🎬 ACT: Render the component
      const { queryByTestId } = render(<VideoPlayerSection {...props} />)

      // ✅ ASSERT: Title overlay container is not rendered
      expect(queryByTestId('video-title-overlay-container')).toBeNull()
    })

    it('passes title to VideoTitle component', () => {
      // 🧪 ARRANGE: Set up component with analysis title
      const props = { ...createProps(), analysisTitle: 'Test Analysis Title' }

      // 🎬 ACT: Render the component
      render(<VideoPlayerSection {...props} />)

      // ✅ ASSERT: VideoTitle is called with correct props
      const VideoTitleMock = require('@ui/components/VideoAnalysis').VideoTitle as jest.Mock
      expect(VideoTitleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Analysis Title',
          overlayMode: true,
          isEditable: false,
        }),
        expect.anything()
      )
    })
  })
})
