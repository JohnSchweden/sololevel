// All types for VideoAnalysis feature
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

// VideoPlayer-specific types
export interface OriginalVideoPlayerProps {
  videoUri: string
  duration?: number
  onRestart?: () => void
  onShare?: () => void
  onContinue?: () => void
  isProcessing?: boolean
  disabled?: boolean
  showControls?: boolean
  autoPlay?: boolean
}

export interface VideoPlayerProps {
  videoUri: string
  isPlaying: boolean
  currentTime?: number
  onPause?: () => void
}
