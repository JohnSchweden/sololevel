import { Platform } from 'react-native'
import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS !== 'web') {
    const { VideoPlayerNative } = require('./VideoPlayer.native')
    return <VideoPlayerNative {...props} />
  }

  return <YStack flex={1} />
}
