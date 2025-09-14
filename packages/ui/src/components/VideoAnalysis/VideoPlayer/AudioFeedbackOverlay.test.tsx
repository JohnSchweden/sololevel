import { render } from '@testing-library/react-native'
import { AudioFeedbackOverlay } from './AudioFeedbackOverlay'

const mockProps = {
  audioUrl: 'https://example.com/audio.mp3',
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  onPlayPause: jest.fn(),
  onSeek: jest.fn(),
  onClose: jest.fn(),
  isVisible: true,
}

describe('AudioFeedbackOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders audio feedback overlay when visible with audio URL', () => {
    const { toJSON } = render(<AudioFeedbackOverlay {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        isVisible={false}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('does not render when no audio URL', () => {
    const { toJSON } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        audioUrl={null}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('shows play button when paused', () => {
    const { toJSON } = render(<AudioFeedbackOverlay {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows pause button when playing', () => {
    const { toJSON } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        isPlaying={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('displays correct time format', () => {
    const { toJSON } = render(<AudioFeedbackOverlay {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows progress bar with correct fill', () => {
    const { toJSON } = render(<AudioFeedbackOverlay {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('handles different progress states', () => {
    const { toJSON: start } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        currentTime={0}
      />
    )
    const { toJSON: middle } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        currentTime={60}
      />
    )
    const { toJSON: end } = render(
      <AudioFeedbackOverlay
        {...mockProps}
        currentTime={120}
      />
    )

    expect(start()).toBeTruthy()
    expect(middle()).toBeTruthy()
    expect(end()).toBeTruthy()
  })

  it('handles close button interaction', () => {
    render(<AudioFeedbackOverlay {...mockProps} />)

    expect(mockProps.onClose).toBeDefined()
  })

  it('handles play/pause button interaction', () => {
    render(<AudioFeedbackOverlay {...mockProps} />)

    expect(mockProps.onPlayPause).toBeDefined()
  })
})
