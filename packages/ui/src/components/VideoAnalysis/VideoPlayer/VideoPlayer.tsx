import { Platform } from 'react-native'
import type { VideoPlayerProps } from '../types'

// Re-export types for external usage
export type { VideoPlayerProps }

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS !== 'web') {
    const { videoPlayer: VideoPlayerNative } = require('./VideoPlayer.native')
    return <VideoPlayerNative {...props} />
  }

  // Web stub - no video support
  const { VideoPlayerWeb } = require('./VideoPlayer.web')
  return <VideoPlayerWeb {...props} />
}
