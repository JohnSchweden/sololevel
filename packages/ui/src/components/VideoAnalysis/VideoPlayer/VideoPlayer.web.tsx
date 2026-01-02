import { forwardRef } from 'react'
import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export const VideoPlayerWeb = forwardRef<unknown, VideoPlayerProps>(({ videoUri, isPlaying, posterUri }, ref) => {
  return (
    <YStack flex={1}>
      <video
        ref={ref as any}
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
})

export const VideoPlayer = VideoPlayerWeb
