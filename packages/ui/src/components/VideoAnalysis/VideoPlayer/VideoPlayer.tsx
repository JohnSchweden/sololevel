import { Platform } from 'react-native'
import { YStack } from 'tamagui'
import type { VideoPlayerProps } from './types'

// Re-export types for convenience
export type {
  PoseData,
  Joint,
  FeedbackMessage,
  VideoPlayerProps,
  OriginalVideoPlayerProps,
} from './types'

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS !== 'web') {
    const { VideoPlayerNative } = require('./VideoPlayer.native')
    return <VideoPlayerNative {...props} />
  }

  return <YStack flex={1} />
}
