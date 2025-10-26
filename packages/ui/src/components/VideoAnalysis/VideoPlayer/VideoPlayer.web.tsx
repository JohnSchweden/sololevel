import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export function VideoPlayerWeb({ videoUri, isPlaying, posterUri }: VideoPlayerProps) {
  return (
    <YStack flex={1}>
      <video
        src={videoUri}
        poster={posterUri}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay={isPlaying}
        controls={false}
        muted
        loop
        playsInline
      />
    </YStack>
  )
}
