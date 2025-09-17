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
  /**
   * Deprecated: do not drive playback with currentTime; use seekToTime for user-initiated scrubs
   */
  currentTime?: number
  onPause?: () => void
  onLoad?: (data: { duration: number }) => void
  onProgress?: (data: { currentTime: number }) => void
  /** Time to seek to when user scrubs; set to null to do nothing */
  seekToTime?: number | null
  /** Called after native player performs the seek */
  onSeekComplete?: () => void
}
