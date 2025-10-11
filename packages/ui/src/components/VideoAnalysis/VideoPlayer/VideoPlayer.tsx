import { Platform } from 'react-native'
import type { VideoPlayerProps } from '../types'

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS !== 'web') {
    const { VideoPlayerNative } = require('./VideoPlayer.native')
    return <VideoPlayerNative {...props} />
  }

  const { VideoPlayerWeb } = require('./VideoPlayer.web')
  return <VideoPlayerWeb {...props} />
}
