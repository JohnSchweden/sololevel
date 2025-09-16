import Video from 'react-native-video'
import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export function VideoPlayerNative({ videoUri, isPlaying }: VideoPlayerProps) {
  return (
    <YStack flex={1}>
      <Video
        source={{ uri: videoUri }}
        style={{ flex: 1 }}
        paused={!isPlaying}
        resizeMode="contain"
      />
    </YStack>
  )
}
