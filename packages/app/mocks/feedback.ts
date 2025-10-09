import type { FeedbackPanelItem } from '@app/features/VideoAnalysis/types'

/**
 * Fallback video URI for VideoAnalysis when no video is provided
 * Public domain sample video from Google
 */
export const FALLBACK_VIDEO_URI =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

/**
 * Mock feedback items for VideoAnalysis feature
 * Used as fallback when no real feedback data is available
 * Non-numeric IDs (seed-*) signal to useFeedbackAudioSource to skip audio fetching
 *
 * @see packages/app/features/VideoAnalysis/hooks/useFeedbackAudioSource.ts (lines 69-78)
 */
export const mockFeedbackItems: FeedbackPanelItem[] = [
  {
    id: 'seed-1',
    timestamp: 2_000,
    text: 'Great posture! Keep your shoulders relaxed.',
    type: 'suggestion',
    category: 'posture',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
  {
    id: 'seed-2',
    timestamp: 5_000,
    text: 'Try speaking with more confidence.',
    type: 'suggestion',
    category: 'voice',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
  {
    id: 'seed-3',
    timestamp: 8_000,
    text: 'Your hand gestures are too stiff.',
    type: 'suggestion',
    category: 'movement',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
]
