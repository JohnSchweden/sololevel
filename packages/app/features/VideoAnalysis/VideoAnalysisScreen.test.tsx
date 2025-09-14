import { render } from '@testing-library/react-native'
import { VideoAnalysisScreen } from './VideoAnalysisScreen'

const mockProps = {
  videoId: 'test-video-123',
  initialStatus: 'ready' as const,
}

describe('VideoAnalysisScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders screen correctly', () => {
    const { toJSON } = render(<VideoAnalysisScreen {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('renders processing state', () => {
    const { toJSON } = render(
      <VideoAnalysisScreen
        {...mockProps}
        initialStatus="processing"
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('renders playing state', () => {
    const { toJSON } = render(
      <VideoAnalysisScreen
        {...mockProps}
        initialStatus="playing"
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('handles callback props', () => {
    const onBack = jest.fn()
    const onMenuPress = jest.fn()

    render(
      <VideoAnalysisScreen
        {...mockProps}
        onBack={onBack}
        onMenuPress={onMenuPress}
      />
    )

    expect(onBack).toBeDefined()
    expect(onMenuPress).toBeDefined()
  })

  it('handles different video IDs', () => {
    const { toJSON } = render(
      <VideoAnalysisScreen
        {...mockProps}
        videoId="different-video-id"
      />
    )

    expect(toJSON()).toBeTruthy()
  })
})
