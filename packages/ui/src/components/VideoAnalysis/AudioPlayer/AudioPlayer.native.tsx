import { log } from '@my/logging'
import Video from 'react-native-video'
import type { AudioPlayerProps } from '../types'

export function AudioPlayer({ audioUrl, controller, testID = 'AudioPlayer' }: AudioPlayerProps) {
  // Debug logging for AudioPlayer component
  if (!audioUrl) {
    log.debug('AudioPlayer', 'No audio URL provided, not rendering')
    return null
  }

  log.debug('AudioPlayer', 'Rendering audio player', {
    audioUrl: audioUrl.substring(0, 50) + '...',
    isPlaying: controller.isPlaying,
    seekTime: controller.seekTime,
    currentTime: controller.currentTime,
    duration: controller.duration,
  })

  return (
    <Video
      testID={testID}
      source={{ uri: audioUrl }}
      paused={!controller.isPlaying}
      seek={controller.seekTime ?? undefined}
      onLoad={(data) => {
        log.info('AudioPlayer', 'Video component onLoad', { data })
        controller.handleLoad(data)
      }}
      onProgress={(data) => {
        // Throttle progress logging to avoid spam (log every 2 seconds)
        if (
          Math.floor(data.currentTime) % 2 === 0 &&
          Math.floor(data.currentTime) !== Math.floor(controller.currentTime)
        ) {
          log.debug('AudioPlayer', 'Video component onProgress', {
            currentTime: data.currentTime,
            playableDuration: data.playableDuration,
            seekableDuration: data.seekableDuration,
          })
        }
        controller.handleProgress(data)
      }}
      onEnd={() => {
        log.info('AudioPlayer', 'Video component onEnd')
        controller.handleEnd()
      }}
      onError={(error) => {
        log.error('AudioPlayer', 'Video component onError', { error })
        controller.handleError(error)
      }}
      ignoreSilentSwitch="ignore" // Play in silent mode on iOS
      style={{
        width: 0,
        height: 0,
        position: 'absolute',
      }}
    />
  )
}
