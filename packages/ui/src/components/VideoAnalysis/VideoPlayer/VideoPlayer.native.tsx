import Video from 'react-native-video'
import { YStack } from 'tamagui'
import { VideoPlayerProps } from './VideoPlayer'

export function VideoPlayerNative({
  videoUri,
  isPlaying,
  currentTime,
}: Pick<VideoPlayerProps, 'videoUri' | 'isPlaying' | 'currentTime'>) {
  return (
    <YStack
      flex={1}
      position="relative"
    >
      {/* Native Video Player */}
      <Video
        source={{ uri: videoUri }}
        style={{ flex: 1 }}
        paused={!isPlaying}
        currentTime={currentTime}
        onEnd={() => {
          // Handle video end
        }}
        resizeMode="contain"
        controls={false}
      />

      {/* TODO: Add overlays when implemented */}
      {/* Video Controls Overlay */}
      {/* Motion Capture Overlay */}
      {/* Feedback Bubbles */}
      {/* Audio Feedback Overlay */}
    </YStack>
  )
}
