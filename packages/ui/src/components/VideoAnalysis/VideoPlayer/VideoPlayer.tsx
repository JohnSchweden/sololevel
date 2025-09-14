import { YStack } from 'tamagui'

// Types from analysis-ui.md
export interface PoseData {
  id: string
  timestamp: number
  joints: Joint[]
  confidence: number
}

export interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

export interface FeedbackMessage {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  position: { x: number; y: number }
  isHighlighted: boolean
  isActive: boolean
}

export interface VideoPlayerProps {
  videoUri: string
  isPlaying: boolean
  currentTime: number
  duration: number
  showControls: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  poseData: PoseData[]
  feedbackMessages: FeedbackMessage[]
  audioUrl: string | null
  isAudioPlaying: boolean
  onAudioPlayPause: () => void
  onAudioSeek: (time: number) => void
  onAudioClose: () => void
  onFeedbackBubbleTap: (message: FeedbackMessage) => void
}

export function VideoPlayer(_props: VideoPlayerProps) {
  // Simple video player stub for now - will be enhanced with overlays
  return (
    <YStack
      flex={1}
      position="relative"
      backgroundColor="$color1"
    >
      <YStack
        flex={1}
        backgroundColor="$color2"
        justifyContent="center"
        alignItems="center"
        testID="video-player-stub"
      />
    </YStack>
  )
}
