import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export function VideoPlayerWeb({ videoUri, isPlaying }: VideoPlayerProps) {
  return (
    <YStack flex={1}>
      <video
        src={videoUri}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        autoPlay={isPlaying}
        controls={false}
        muted
        loop
        playsInline
      />
    </YStack>
  )
}
