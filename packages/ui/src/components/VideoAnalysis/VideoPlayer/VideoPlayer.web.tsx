import { YStack } from 'tamagui'
import { VideoPlayerProps } from './VideoPlayer'

export function VideoPlayerWeb({ videoUri }: Pick<VideoPlayerProps, 'videoUri'>) {
  return (
    <YStack
      flex={1}
      position="relative"
    >
      {/* HTML5 Video Player */}
      <video
        src={videoUri}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        controls={false}
        playsInline
      />

      {/* TODO: Add overlays when implemented */}
      {/* Video Controls Overlay */}
      {/* Motion Capture Overlay */}
      {/* Feedback Bubbles */}
      {/* Audio Feedback Overlay */}
    </YStack>
  )
}
