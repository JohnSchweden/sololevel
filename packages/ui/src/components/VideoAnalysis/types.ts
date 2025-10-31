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
  /** Optional poster/thumbnail image URL to display before video loads */
  posterUri?: string
  onPause?: () => void
  onEnd?: (endTime?: number) => void
  onLoad?: (data: { duration: number }) => void
  onProgress?: (data: { currentTime: number }) => void
  /** Time to seek to when user scrubs; set to null to do nothing */
  seekToTime?: number | null
  /** Called after native player performs the seek with the time that was sought */
  onSeekComplete?: (seekTime?: number) => void
}

// VideoPlayerSection Component API
export interface VideoPlayerSectionOptions {
  /** Optional poster/thumbnail to display before video loads */
  posterUri?: string
}

// AudioPlayer-specific types
export interface AudioPlayerProps {
  audioUrl: string | null
  controller: {
    isPlaying: boolean
    currentTime: number
    duration: number
    isLoaded: boolean
    seekTime: number | null
    setIsPlaying: (playing: boolean) => void
    togglePlayback: () => void
    handleLoad: (data: { duration: number }) => void
    handleProgress: (data: {
      currentTime: number
      playableDuration?: number
      seekableDuration?: number
    }) => void
    handleEnd: () => void
    handleError: (error: any) => void
    handleSeekComplete: () => void
    seekTo: (time: number) => void
    reset: () => void
  }
  testID?: string
}
