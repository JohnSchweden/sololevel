// Local mirror of the item shape used by FeedbackPanel to decouple app tests from UI package types
export interface FeedbackPanelItem {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  ssmlStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  audioStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  ssmlAttempts?: number
  audioAttempts?: number
  ssmlLastError?: string | null
  audioLastError?: string | null
  audioUrl?: string
  audioError?: string
  confidence: number
}
