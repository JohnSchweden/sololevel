import { describe, expect, it, jest } from '@jest/globals'
import { render } from '@testing-library/react-native'

import { VideoPlayerNative } from '../VideoPlayer.native'

// Mock react-native-video
const MockVideo = jest.fn()
jest.mock('react-native-video', () => ({
  default: MockVideo,
}))

describe.skip('VideoPlayerNative', () => {
  it('renders error state with Text component (no raw string warnings)', () => {
    // Mock console.error to capture React Native warnings
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { getByTestId, getByText } = render(
      <VideoPlayerNative
        videoUri="invalid-uri"
        isPlaying={false}
        onEnd={() => {}}
        onLoad={() => {}}
        onProgress={() => {}}
        onSeekComplete={() => {}}
      />
    )

    // Wait for error state to render
    expect(getByTestId('video-error')).toBeTruthy()
    expect(getByText('Unable to load video')).toBeTruthy()
    expect(getByTestId('error-text')).toBeTruthy()

    // Ensure no "Text strings must be rendered within a <Text> component" warnings
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Text strings must be rendered within a <Text> component')
    )

    consoleErrorSpy.mockRestore()
  })
})
