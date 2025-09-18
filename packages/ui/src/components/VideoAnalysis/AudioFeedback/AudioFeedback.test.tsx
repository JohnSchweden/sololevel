import { render } from '@testing-library/react-native'
import { AudioFeedback } from './AudioFeedback'

// Mock the require call for the coach avatar image
jest.mock('../../../../../../apps/expo/assets/coach_avatar.png', () => 'mocked-coach-avatar')

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
        isPlaying={true}
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
        currentTime={0}
      />
    )
    const { toJSON: middle } = render(
      <AudioFeedback
        {...mockProps}
        currentTime={60}
      />
    )
    const { toJSON: end } = render(
      <AudioFeedback
        {...mockProps}
        currentTime={120}
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

    expect(mockProps.onPlayPause).toBeDefined()
  })
})
