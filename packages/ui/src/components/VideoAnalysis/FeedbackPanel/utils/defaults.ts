import type { VoiceTextConfig } from '@my/config'
import type { ActivityData } from '../../../Insights/ActivityChart'
import type {
  VideoAnalysisInsightsV2Achievement,
  VideoAnalysisInsightsV2Action,
  VideoAnalysisInsightsV2FocusArea,
  VideoAnalysisInsightsV2Highlight,
  VideoAnalysisInsightsV2Overview,
  VideoAnalysisInsightsV2Quote,
  VideoAnalysisInsightsV2Reel,
  VideoAnalysisInsightsV2SkillDimension,
} from '../VideoAnalysisInsightsV2'

/**
 * Default data generation functions and constants for VideoAnalysisInsightsV2
 */

export function getDefaultOverview(voiceText: VoiceTextConfig): VideoAnalysisInsightsV2Overview {
  return {
    score: 78,
    levelLabel: 'Proficient',
    benchmarkSummary: voiceText.feedbackPanel.insights.defaultOverview.benchmarkSummary,
    lastScore: 72,
    improvementDelta: 6,
    summary: voiceText.feedbackPanel.insights.defaultOverview.summary,
  }
}

export function getDefaultQuote(voiceText: VoiceTextConfig): VideoAnalysisInsightsV2Quote {
  return {
    id: 'quote-primary',
    author: 'AI Coach',
    text: voiceText.feedbackPanel.insights.defaultQuote,
    tone: 'coach',
  }
}

export const DEFAULT_FOCUS_AREAS: VideoAnalysisInsightsV2FocusArea[] = [
  {
    id: 'focus-story',
    title: 'Story Arc Confidence',
    progress: 82,
    priority: 'high',
  },
  {
    id: 'focus-pauses',
    title: 'Strategic Pauses (Stop Rushing)',
    progress: 58,
    priority: 'medium',
  },
  {
    id: 'focus-filler',
    title: 'Kill Those Filler Words',
    progress: 32,
    priority: 'high',
  },
]

export const DEFAULT_SKILL_MATRIX: VideoAnalysisInsightsV2SkillDimension[] = [
  { id: 'skill-confidence', label: 'Confidence', score: 84, trend: 'up' },
  { id: 'skill-voice', label: 'Voice', score: 71, trend: 'up' },
  { id: 'skill-posture', label: 'Posture', score: 64, trend: 'steady' },
  { id: 'skill-clarity', label: 'Clarity', score: 77, trend: 'up' },
  { id: 'skill-engagement', label: 'Engagement', score: 69, trend: 'down' },
]

export const DEFAULT_TIMELINE: ActivityData[] = [
  { day: '00:00', sessions: 2 },
  { day: '00:45', sessions: 3 },
  { day: '01:30', sessions: 4 },
  { day: '02:15', sessions: 2 },
  { day: '03:00', sessions: 5 },
  { day: '03:45', sessions: 4 },
]

export const DEFAULT_HIGHLIGHTS: VideoAnalysisInsightsV2Highlight[] = [
  {
    id: 'highlight-storytelling',
    title: 'Storytelling Peak (You Nailed This)',
    tags: ['00:15 → 00:45'],
    duration: '00:15 → 00:45',
    score: 86,
    status: 'good',
  },
  {
    id: 'highlight-pauses',
    title: 'Pause Disaster Zone',
    tags: ['00:45 → 01:05'],
    duration: '00:45 → 01:05',
    score: 48,
    status: 'improve',
  },
  {
    id: 'highlight-filler',
    title: 'Filler Word Apocalypse',
    tags: ['01:05 → 01:20'],
    duration: '01:05 → 01:20',
    score: 32,
    status: 'critical',
  },
]

export const DEFAULT_ACTIONS: VideoAnalysisInsightsV2Action[] = [
  {
    id: 'action-drill-filler',
    title: 'Stop Saying "Um" Every 3 Seconds',
    description:
      'A 60-second drill that will shame you into silence every time you say "um", "uh", or "like". Prepare to be roasted.',
    domains: ['Voice', 'Delivery'],
    ctaLabel: 'Start 60s roast session',
  },
  {
    id: 'action-pauses',
    title: 'Learn What a Pause Actually Is',
    description:
      "Practice not rushing through sentences like you're being chased. Metronome included because apparently you can't count.",
    domains: ['Pacing'],
    ctaLabel: '2-min pause intervention',
  },
  {
    id: 'action-posture',
    title: 'Stop Fidgeting Like a Nervous Squirrel',
    description:
      "Mirror practice to see yourself fidgeting in real-time. It's going to be awkward, but necessary.",
    domains: ['Body language'],
    ctaLabel: 'Face the mirror of truth',
  },
]

export const DEFAULT_ACHIEVEMENTS: VideoAnalysisInsightsV2Achievement[] = [
  {
    id: 'achievement-evergreen',
    title: 'Champion of "Um"',
    date: '23 "ehms" in one video',
    type: 'technique',
    icon: '🐄',
  },
  {
    id: 'achievement-excellent-story',
    title: 'Actually Told a Story (Shocking!)',
    date: 'New badge',
    type: 'technique',
    icon: '🎤',
  },
  {
    id: 'achievement-streak',
    title: '3 Sessions Without Quitting',
    date: "23 wins (we're counting)",
    type: 'streak',
    icon: '⚡️',
  },
]

export const DEFAULT_REELS: VideoAnalysisInsightsV2Reel[] = [
  {
    id: 'reel-spikies',
    title: 'Your Cringe-Worthy Moments',
    description:
      'All your fails, awkward pauses, and moments that made us question your life choices. Enjoy the roast!',
    ctaLabel: 'Watch the disaster',
  },
  {
    id: 'reel-boss',
    title: "When You Actually Didn't Suck",
    description:
      "Rare footage of you being competent. Frame this, because it doesn't happen often.",
    ctaLabel: 'Witness the miracle',
  },
]
