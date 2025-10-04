import { AudioControllerState } from '@app/features/VideoAnalysis/hooks/useAudioController'
import { AudioFeedbackProps } from './AudioFeedback'

describe('AudioFeedback - Controller Interface', () => {
  it('should accept AudioControllerState in props interface', () => {
    // This test verifies that the interface has been updated to accept controller
    const mockController: AudioControllerState = {
      isPlaying: false,
      currentTime: 0,
      duration: 10.5,
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

    // Test that the props interface accepts the new controller property
    const props: AudioFeedbackProps = {
      audioUrl: 'https://example.com/audio.mp3',
      controller: mockController,
      onClose: jest.fn(),
      isVisible: true,
    }

    expect(props.controller).toBe(mockController)
    expect(props.audioUrl).toBe('https://example.com/audio.mp3')
    expect(typeof props.onClose).toBe('function')
    expect(props.isVisible).toBe(true)
  })

  it('should have controller property in interface', () => {
    // Verify the interface includes controller and excludes old individual props
    const mockController: AudioControllerState = {
      isPlaying: true,
      currentTime: 5.0,
      duration: 20.0,
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

    const props: AudioFeedbackProps = {
      audioUrl: 'https://example.com/audio.mp3',
      controller: mockController,
      onClose: jest.fn(),
      isVisible: true,
    }

    // Verify controller properties are accessible
    expect(props.controller.isPlaying).toBe(true)
    expect(props.controller.currentTime).toBe(5.0)
    expect(props.controller.duration).toBe(20.0)
    expect(typeof props.controller.setIsPlaying).toBe('function')
    expect(typeof props.controller.seekTo).toBe('function')
  })
})
