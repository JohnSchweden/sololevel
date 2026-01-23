// Local mirror of the item shape used by FeedbackPanel to decouple app tests from UI package types
export interface FeedbackPanelItem {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  ssmlStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  audioStatus?: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'
  ssmlAttempts?: number
  audioAttempts?: number
  ssmlLastError?: string | null
  audioLastError?: string | null
  audioUrl?: string
  audioError?: string
  confidence: number
  userRating?: 'up' | 'down' | null
}

// Props for VideoAnalysisScreen component (moved from orchestrator)
export interface VideoAnalysisScreenProps {
  analysisJobId?: number
  videoRecordingId?: number
  videoUri?: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onControlsVisibilityChange?: (visible: boolean, isUserInteraction?: boolean) => void
}
