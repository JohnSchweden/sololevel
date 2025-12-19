import {
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Play,
  Sparkles,
  Target,
} from '@tamagui/lucide-icons'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

import type { ActivityData } from '../../Insights/ActivityChart'
import { ActivityChart } from '../../Insights/ActivityChart'
import { Badge } from '../../Insights/Badge'
import { FocusCard } from '../../Insights/FocusCard'
import { Progress } from '../../Insights/Progress'
import { StatCard } from '../../Insights/StatCard'
import { SettingsSectionHeader } from '../../Settings/SettingsSectionHeader'
import { StateDisplay } from '../../StateDisplay'

/**
 * Parse markdown bold (**text**) and render as nested Text components with bold styling
 * PERFORMANCE: Should be wrapped in useMemo by caller to avoid re-parsing on every render
 * Returns an array of React nodes that can be used as children of a Text component
 */
function renderMarkdownText(text: string): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  // Create regex inside function to avoid global state issues in concurrent renders
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match
  let boldCounter = 0

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold section
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    // Add bold text as nested Text component
    // Key is based on content hash (first 20 chars) + counter for uniqueness
    // This ensures same content gets same key regardless of position in string
    const contentKey = match[1].substring(0, 20).replace(/\s+/g, '-')
    parts.push(
      <Text
        key={`bold-${contentKey}-${boldCounter++}`}
        fontWeight="700"
      >
        {match[1]}
      </Text>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no matches, return original text as string
  if (parts.length === 0) {
    return [text]
  }

  return parts
}

export interface VideoAnalysisInsightsV2Overview {
  score: number
  levelLabel: string
  benchmarkSummary: string
  lastScore: number
  improvementDelta: number
  summary: string
}

export interface VideoAnalysisInsightsV2Quote {
  id: string
  author: string
  text: string
  tone: 'celebrate' | 'coach'
}

export interface VideoAnalysisInsightsV2FocusArea {
  id: string
  title: string
  progress: number
  priority: 'high' | 'medium' | 'low'
}

export interface VideoAnalysisInsightsV2SkillDimension {
  id: string
  label: string
  score: number
  trend: 'up' | 'down' | 'steady'
}

export interface VideoAnalysisInsightsV2Highlight {
  id: string
  title: string
  tags: string[]
  duration: string
  score: number
  status: 'good' | 'improve' | 'critical'
}

export interface VideoAnalysisInsightsV2Action {
  id: string
  title: string
  description: string
  domains: string[]
  ctaLabel: string
}

export interface VideoAnalysisInsightsV2Achievement {
  id: string
  title: string
  date: string
  type: 'streak' | 'technique' | 'record'
  icon: string
}

export interface VideoAnalysisInsightsV2Reel {
  id: string
  title: string
  description: string
  ctaLabel: string
}

export interface VideoAnalysisInsightsV2Props {
  /** Full AI feedback text for "Detailed Summary" section */
  fullFeedbackText?: string | null
  overview?: VideoAnalysisInsightsV2Overview | null
  quote?: VideoAnalysisInsightsV2Quote | null
  focusAreas?: VideoAnalysisInsightsV2FocusArea[]
  skillMatrix?: VideoAnalysisInsightsV2SkillDimension[]
  performanceTimeline?: ActivityData[]
  highlights?: VideoAnalysisInsightsV2Highlight[]
  actions?: VideoAnalysisInsightsV2Action[]
  achievements?: VideoAnalysisInsightsV2Achievement[]
  reels?: VideoAnalysisInsightsV2Reel[]
  onHighlightPress?: (highlightId: string) => void
  onActionPress?: (actionId: string) => void
  onReelPress?: (reelId: string) => void
  testID?: string
}

const DEFAULT_OVERVIEW: VideoAnalysisInsightsV2Overview = {
  score: 78,
  levelLabel: 'Proficient',
  benchmarkSummary: "You're 15% clearer than the average mumbler. Congrats, I guess?",
  lastScore: 72,
  improvementDelta: 6,
  summary:
    "Your energy is there, but your pauses are like a broken record player. Let's fix that before your audience falls asleep.",
}

const DEFAULT_QUOTE: VideoAnalysisInsightsV2Quote = {
  id: 'quote-primary',
  author: 'AI Coach Orbit',
  text: "\"Look, you've got energy, I'll give you that. But your pacing? It's like watching a sloth try to deliver a TED Talk. Let's fix that disaster before your next presentation.\"",
  tone: 'coach',
}

const DEFAULT_FOCUS_AREAS: VideoAnalysisInsightsV2FocusArea[] = [
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

const DEFAULT_SKILL_MATRIX: VideoAnalysisInsightsV2SkillDimension[] = [
  { id: 'skill-confidence', label: 'Confidence', score: 84, trend: 'up' },
  { id: 'skill-voice', label: 'Voice', score: 71, trend: 'up' },
  { id: 'skill-posture', label: 'Posture', score: 64, trend: 'steady' },
  { id: 'skill-clarity', label: 'Clarity', score: 77, trend: 'up' },
  { id: 'skill-engagement', label: 'Engagement', score: 69, trend: 'down' },
]

const DEFAULT_TIMELINE: ActivityData[] = [
  { day: '00:00', sessions: 2 },
  { day: '00:45', sessions: 3 },
  { day: '01:30', sessions: 4 },
  { day: '02:15', sessions: 2 },
  { day: '03:00', sessions: 5 },
  { day: '03:45', sessions: 4 },
]

const DEFAULT_HIGHLIGHTS: VideoAnalysisInsightsV2Highlight[] = [
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

const DEFAULT_ACTIONS: VideoAnalysisInsightsV2Action[] = [
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

const DEFAULT_ACHIEVEMENTS: VideoAnalysisInsightsV2Achievement[] = [
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

const DEFAULT_REELS: VideoAnalysisInsightsV2Reel[] = [
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

const statusTokenMap: Record<
  VideoAnalysisInsightsV2Highlight['status'],
  { label: string; backgroundColor: string; color: string }
> = {
  good: { label: 'Not Terrible', backgroundColor: '$green4', color: '$green11' },
  improve: { label: 'Yikes, Fix This', backgroundColor: '$orange4', color: '$orange11' },
  critical: { label: 'Absolute Disaster', backgroundColor: '$red4', color: '$red11' },
}

const HighlightCard = memo(function HighlightCard({
  highlight,
  onPress,
}: {
  highlight: VideoAnalysisInsightsV2Highlight
  onPress?: (highlightId: string) => void
}) {
  const statusTokens = statusTokenMap[highlight.status]

  const handlePress = useCallback(() => {
    onPress?.(highlight.id)
  }, [onPress, highlight.id])

  return (
    <YStack
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$2"
      data-testid={`insights-v2-highlight-${highlight.id}`}
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$3"
      >
        <YStack gap="$2">
          <Text
            fontSize="$4"
            fontWeight="600"
            color="$color12"
          >
            {highlight.title}
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            {highlight.duration}
          </Text>
        </YStack>
        <XStack
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$1"
          alignItems="center"
          justifyContent="center"
          backgroundColor={statusTokens.backgroundColor as any}
          testID={`insights-v2-highlight-score-${highlight.id}`}
        >
          <Text
            fontSize="$2"
            color={statusTokens.color as any}
            fontWeight="500"
          >
            {highlight.score}
          </Text>
        </XStack>
      </XStack>

      <XStack
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius="$1"
        alignItems="center"
        justifyContent="center"
        backgroundColor={statusTokens.backgroundColor as any}
        testID={`insights-v2-highlight-status-${highlight.id}`}
      >
        <Text
          fontSize="$2"
          color={statusTokens.color as any}
          fontWeight="500"
        >
          {statusTokens.label}
        </Text>
      </XStack>

      {onPress ? (
        <Button
          size="$2"
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$4"
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignSelf="flex-start"
          icon={Play}
          iconAfter={undefined}
          gap="$2"
          onPress={handlePress}
          testID={`insights-v2-highlight-cta-${highlight.id}`}
        >
          <Text
            fontSize="$2"
            color="$color12"
          >
            Watch the carnage
          </Text>
        </Button>
      ) : null}
    </YStack>
  )
})

const ActionCard = memo(function ActionCard({
  action,
  onPress,
}: {
  action: VideoAnalysisInsightsV2Action
  onPress?: (actionId: string) => void
}) {
  const handlePress = useCallback(() => {
    onPress?.(action.id)
  }, [onPress, action.id])

  return (
    <YStack
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$3"
      data-testid={`insights-v2-action-${action.id}`}
    >
      <YStack gap="$1">
        <Text
          fontSize="$4"
          fontWeight="600"
          color="$color12"
        >
          {action.title}
        </Text>
        <Text
          fontSize="$3"
          color="$color11"
        >
          {action.description}
        </Text>
      </YStack>

      <XStack
        gap="$2"
        flexWrap="wrap"
      >
        {action.domains.map((domain) => (
          <Badge
            key={`${action.id}-${domain}`}
            variant="secondary"
            testID={`insights-v2-action-tag-${action.id}-${domain}`}
          >
            {domain}
          </Badge>
        ))}
      </XStack>

      {onPress ? (
        <Button
          size="$3"
          chromeless
          backgroundColor="$color3"
          borderRadius="$4"
          paddingHorizontal="$3"
          paddingVertical="$2"
          hoverStyle={{
            backgroundColor: '$color4',
          }}
          pressStyle={{
            backgroundColor: '$color5',
          }}
          onPress={handlePress}
          testID={`insights-v2-action-cta-${action.id}`}
        >
          <Text
            fontSize="$3"
            color="$color12"
          >
            {action.ctaLabel}
          </Text>
        </Button>
      ) : null}
    </YStack>
  )
})

const ReelCard = memo(function ReelCard({
  reel,
  onPress,
}: {
  reel: VideoAnalysisInsightsV2Reel
  onPress?: (reelId: string) => void
}) {
  const handlePress = useCallback(() => {
    onPress?.(reel.id)
  }, [onPress, reel.id])

  return (
    <YStack
      padding="$4"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$backgroundHover"
      gap="$3"
      data-testid={`insights-v2-reel-${reel.id}`}
    >
      <YStack gap="$1">
        <Text
          fontSize="$4"
          fontWeight="600"
          color="$color12"
        >
          {reel.title}
        </Text>
        <Text
          fontSize="$3"
          color="$color11"
        >
          {reel.description}
        </Text>
      </YStack>
      {onPress ? (
        <Button
          size="$3"
          backgroundColor="$color12"
          borderRadius="$4"
          paddingHorizontal="$3"
          paddingVertical="$2"
          icon={Play}
          onPress={handlePress}
          testID={`insights-v2-reel-cta-${reel.id}`}
        >
          <Text
            fontSize="$3"
            color="$color1"
          >
            {reel.ctaLabel}
          </Text>
        </Button>
      ) : null}
    </YStack>
  )
})

const AchievementCard = memo(function AchievementCard({
  achievement,
}: {
  achievement: VideoAnalysisInsightsV2Achievement
}) {
  return (
    <YStack
      flex={1}
      minWidth={100}
      padding="$2"
      paddingBottom="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$1"
      alignItems="center"
      testID={`insights-v2-achievement-${achievement.id}`}
    >
      <YStack
        width={48}
        height={40}
        borderRadius="$4"
        borderWidth={0}
        alignItems="center"
        justifyContent="center"
        testID={`insights-v2-achievement-icon-${achievement.id}`}
      >
        <Text
          fontSize="$6"
          lineHeight="$1"
        >
          {achievement.icon}
        </Text>
      </YStack>

      <YStack
        gap="$1"
        alignItems="center"
        width="100%"
      >
        <Text
          fontSize="$3"
          fontWeight="500"
          color="$color12"
          textAlign="center"
          numberOfLines={3}
        >
          {achievement.title}
        </Text>
        <Text
          fontSize="$2"
          color="$color11"
          textAlign="center"
        >
          {achievement.date}
        </Text>
      </YStack>
    </YStack>
  )
})

const SkillRow = memo(function SkillRow({
  skill,
}: {
  skill: VideoAnalysisInsightsV2SkillDimension
}) {
  const isTrendingUp = skill.trend === 'up'
  const isTrendingDown = skill.trend === 'down'
  const scoreColor = isTrendingUp ? '$green11' : isTrendingDown ? '$orange11' : '$color11'

  const iconColor =
    skill.trend === 'up' ? '$green11' : skill.trend === 'down' ? '$orange11' : '$color11'

  return (
    <XStack
      gap="$5"
      alignItems="center"
    >
      <YStack
        width={120}
        gap="$1"
      >
        <Text
          fontSize="$3"
          fontWeight="500"
          color="$color12"
        >
          {skill.label}
        </Text>
        <XStack
          gap="$1"
          alignItems="center"
          testID={`insights-v2-skill-trend-${skill.id}`}
        >
          {skill.trend === 'up' ? (
            <ChevronUp
              size={16}
              color={iconColor}
            />
          ) : skill.trend === 'down' ? (
            <ChevronDown
              size={16}
              color={iconColor}
            />
          ) : (
            <BarChart3
              size={16}
              color={iconColor}
            />
          )}
          <Text
            fontSize="$2"
            color="$color11"
          >
            {skill.trend === 'up'
              ? 'Actually improving'
              : skill.trend === 'down'
                ? 'Getting worse (oof)'
                : 'Stuck in mediocrity'}
          </Text>
        </XStack>
      </YStack>
      <YStack
        flex={1}
        gap="$1"
      >
        <Progress
          value={skill.score}
          size="md"
          testID={`insights-v2-skill-progress-${skill.id}`}
        />
        <XStack
          gap="$1"
          alignItems="center"
        >
          <Text
            fontSize="$2"
            color={scoreColor}
            fontWeight="600"
          >
            {skill.score}
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            / 100
          </Text>
        </XStack>
      </YStack>
    </XStack>
  )
})

/** Number of characters to show before truncating with "Show more" */
const SUMMARY_TRUNCATE_LENGTH = 100

export const VideoAnalysisInsightsV2 = memo(function VideoAnalysisInsightsV2({
  fullFeedbackText,
  overview = DEFAULT_OVERVIEW,
  quote = DEFAULT_QUOTE,
  focusAreas = DEFAULT_FOCUS_AREAS,
  skillMatrix = DEFAULT_SKILL_MATRIX,
  performanceTimeline = DEFAULT_TIMELINE,
  highlights = DEFAULT_HIGHLIGHTS,
  actions = DEFAULT_ACTIONS,
  achievements = DEFAULT_ACHIEVEMENTS,
  reels = DEFAULT_REELS,
  onHighlightPress,
  onActionPress,
  onReelPress,
  testID = 'video-analysis-insights-v2',
}: VideoAnalysisInsightsV2Props) {
  // State for expand/collapse of detailed summary
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)

  const toggleSummaryExpanded = useCallback(() => {
    setIsSummaryExpanded((prev) => !prev)
  }, [])

  // Determine if text needs truncation
  const summaryNeedsTruncation = useMemo(() => {
    return fullFeedbackText && fullFeedbackText.length > SUMMARY_TRUNCATE_LENGTH
  }, [fullFeedbackText])

  // Truncated text for collapsed state
  const truncatedSummary = useMemo(() => {
    if (!fullFeedbackText) return ''
    if (!summaryNeedsTruncation) return fullFeedbackText
    return fullFeedbackText.slice(0, SUMMARY_TRUNCATE_LENGTH).trim() + '...'
  }, [fullFeedbackText, summaryNeedsTruncation])

  // PERFORMANCE: Memoize parsed markdown to avoid re-parsing on every render
  // Only re-parse when text content or expand state changes
  const parsedFullText = useMemo(
    () => (fullFeedbackText ? renderMarkdownText(fullFeedbackText) : []),
    [fullFeedbackText]
  )

  const parsedTruncatedText = useMemo(
    () => (truncatedSummary ? renderMarkdownText(truncatedSummary) : []),
    [truncatedSummary]
  )

  const hasContent = useMemo(
    () =>
      Boolean(fullFeedbackText) ||
      Boolean(overview) ||
      Boolean(quote) ||
      focusAreas.length > 0 ||
      skillMatrix.length > 0 ||
      performanceTimeline.length > 0 ||
      highlights.length > 0 ||
      actions.length > 0 ||
      achievements.length > 0 ||
      reels.length > 0,
    [
      fullFeedbackText,
      overview,
      quote,
      focusAreas.length,
      skillMatrix.length,
      performanceTimeline.length,
      highlights.length,
      actions.length,
      achievements.length,
      reels.length,
    ]
  )

  if (!hasContent) {
    return (
      <YStack
        testID={testID}
        accessibilityLabel="Insights content area"
        padding="$4"
      >
        <StateDisplay
          type="empty"
          title="No Insights Yet (You're Not Ready)"
          description="Upload more videos so we can properly roast your performance. We need material to work with."
          icon="📊"
          testID={`${testID}-empty`}
        />
      </YStack>
    )
  }

  return (
    <YStack
      testID={testID}
      accessibilityLabel="Insights content area"
      paddingTop="$4"
      paddingBottom="$6"
      paddingHorizontal="$4"
      gap="$6"
    >
      {/* Detailed Summary Section - appears first when data available */}
      {fullFeedbackText ? (
        <YStack gap="$3">
          <SettingsSectionHeader
            title="The Brutal Truth"
            icon={FileText}
            testID="insights-v2-detailed-summary-header"
            borderBottomWidth={0}
            variant="minSpacing"
          />

          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
            testID="insights-v2-detailed-summary-card"
          >
            <Text
              fontSize="$4"
              color="$color12"
              lineHeight="$4"
              testID="insights-v2-detailed-summary-text"
            >
              {isSummaryExpanded ? parsedFullText : parsedTruncatedText}
            </Text>

            {summaryNeedsTruncation && !isSummaryExpanded ? (
              <Button
                chromeless
                onPress={toggleSummaryExpanded}
                alignSelf="flex-end"
                paddingVertical="$2"
                paddingHorizontal="$3"
                paddingRight={0}
                minHeight={44}
                accessibilityRole="button"
                accessibilityLabel="Show full roast"
                testID="insights-v2-detailed-summary-toggle"
              >
                <Text
                  fontSize="$3"
                  fontWeight="500"
                  color="$color11"
                >
                  ... show full roast
                </Text>
              </Button>
            ) : null}
          </YStack>
        </YStack>
      ) : null}

      {overview ? (
        <YStack gap="$3">
          {/* Separator with Demo Data label */}
          <YStack
            gap="$2"
            paddingHorizontal="$4"
            paddingBottom="$4"
          >
            <XStack
              justifyContent="center"
              alignItems="center"
              gap="$3"
            >
              <ChevronDown
                size={20}
                color="$color11"
              />
              <Text
                fontSize="$3"
                color="$color11"
                textAlign="center"
                testID="insights-v2-demo-data-label"
              >
                Demo Data
              </Text>
              <ChevronDown
                size={20}
                color="$color11"
              />
            </XStack>
          </YStack>

          <SettingsSectionHeader
            title="How Bad Was It?"
            icon={BarChart3}
            testID="insights-v2-overview-header"
            borderBottomWidth={0}
            variant="minSpacing"
          />

          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$4"
            testID="insights-v2-overview-card"
          >
            <XStack
              justifyContent="space-between"
              alignItems="flex-start"
              gap="$3"
            >
              <YStack
                gap="$1"
                flexShrink={0}
              >
                <Text
                  fontSize="$10"
                  fontWeight="600"
                  color="$green11"
                  testID="insights-v2-score-value"
                >
                  {overview.score}
                </Text>
                <Text
                  fontSize="$3"
                  color="$color11"
                  testID="insights-v2-score-label"
                >
                  {overview.levelLabel}
                </Text>
              </YStack>

              <YStack
                flex={1}
                alignItems="flex-end"
                gap="$2"
                paddingLeft="$3"
              >
                <XStack
                  gap="$2"
                  alignItems="center"
                  justifyContent="flex-end"
                  testID="insights-v2-improvement-label"
                  flexShrink={1}
                >
                  <Sparkles
                    size={16}
                    color="$green11"
                  />
                  <Text
                    fontSize="$2"
                    color="$green11"
                    fontWeight="600"
                  >
                    +{overview.improvementDelta}% vs last disaster
                  </Text>
                </XStack>
                <Text
                  fontSize="$2"
                  color="$color11"
                  textAlign="right"
                >
                  {overview.benchmarkSummary}
                </Text>
              </YStack>
            </XStack>

            <YStack gap="$2">
              <Text
                fontSize="$2"
                color="$color11"
              >
                The Hard Truth
              </Text>
              <Text
                fontSize="$3"
                color="$color12"
              >
                {overview.summary}
              </Text>
            </YStack>

            <XStack
              gap="$3"
              flexWrap="wrap"
            >
              <StatCard
                value={overview.lastScore}
                label="Last disaster"
                variant="left"
              />
              <StatCard
                value={`${overview.improvementDelta}%`}
                label="Slightly better"
                variant="left"
                trend="up"
              />
            </XStack>
          </YStack>
        </YStack>
      ) : null}

      {quote ? (
        <YStack gap="$3">
          <SettingsSectionHeader
            title="Coach's Honest Take"
            icon={Sparkles}
            testID="insights-v2-quote-header"
            borderBottomWidth={0}
            variant="minSpacing"
          />
          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
            testID="insights-v2-quote-card"
          >
            <Text
              fontSize="$5"
              fontWeight="500"
              color="$color12"
              lineHeight="$4"
            >
              {quote.text}
            </Text>
            <XStack
              gap="$2"
              alignItems="center"
              testID="insights-v2-quote-tone"
            >
              {quote.tone === 'celebrate' ? (
                <Sparkles
                  size={16}
                  color="$color11"
                />
              ) : (
                <Lightbulb
                  size={16}
                  color="$color11"
                />
              )}
              <Text
                fontSize="$2"
                color="$color11"
              >
                {quote.tone === 'celebrate' ? 'Rare win moment' : 'Pace/Tempo (Your Weakness)'}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      ) : null}

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Achievements"
          icon={Award}
          testID="insights-v2-achievements-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {achievements.length > 0 ? (
          <XStack
            gap="$2"
            flexWrap="wrap"
          >
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </XStack>
        ) : (
          <StateDisplay
            type="empty"
            title="No Achievements (Shocking, I Know)"
            description="You haven't earned anything yet. Keep trying, maybe one day you'll get a participation trophy."
            icon="🏆"
            testID="insights-v2-achievements-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="What You're Terrible At"
          icon={Target}
          testID="insights-v2-focus-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {focusAreas.length > 0 ? (
          <YStack gap="$3">
            {focusAreas.map((focusArea) => (
              <FocusCard
                key={focusArea.id}
                title={focusArea.title}
                progress={focusArea.progress}
                priority={focusArea.priority}
                testID={`insights-v2-focus-${focusArea.id}`}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Focus Areas Coming Soon"
            description="We need more videos to identify all the ways you're failing. Don't worry, we'll find them."
            icon="🎯"
            testID="insights-v2-focus-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Your Skill Breakdown (It's Not Pretty)"
          icon={BarChart3}
          testID="insights-v2-skill-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {skillMatrix.length > 0 ? (
          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
            testID="insights-v2-skill-card"
          >
            {skillMatrix.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Skill Matrix Locked"
            description="Record more videos so we can properly map out all your weaknesses. We're waiting."
            icon="📈"
            testID="insights-v2-skill-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="How You Crashed and Burned (Timeline)"
          icon={Sparkles}
          testID="insights-v2-timeline-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {performanceTimeline.length > 0 ? (
          <YStack
            padding="$4"
            paddingTop="$7"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
            testID="insights-v2-timeline-card"
          >
            <ActivityChart
              data={performanceTimeline}
              testID="insights-v2-timeline-chart"
            />
            <Text
              fontSize="$2"
              color="$color11"
            >
              You completely fell apart at 01:10 when the filler words took over. You sort of
              recovered after 02:30, but the damage was done.
            </Text>
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Timeline Locked"
            description="Add more videos so we can chart your journey from bad to... well, still bad, but documented."
            icon="⏱️"
            testID="insights-v2-timeline-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Highlights (and Lowlights)"
          icon={Sparkles}
          testID="insights-v2-highlights-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {highlights.length > 0 ? (
          <YStack gap="$3">
            {highlights.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                onPress={onHighlightPress}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="No Highlights Yet"
            description="We're still collecting your worst moments. Once we have enough cringe, we'll compile it all here."
            icon="⭐️"
            testID="insights-v2-highlights-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Your Intervention Plan"
          icon={Lightbulb}
          testID="insights-v2-actions-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {actions.length > 0 ? (
          <YStack gap="$3">
            {actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onPress={onActionPress}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Action Plan Locked"
            description="Complete more analyses so we can create a personalized plan to fix all your problems. It's going to be a long list."
            icon="💡"
            testID="insights-v2-actions-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="AI Reels (Your Greatest Hits & Misses)"
          icon={Play}
          testID="insights-v2-reels-header"
          borderBottomWidth={0}
          variant="minSpacing"
        />
        {reels.length > 0 ? (
          <YStack gap="$3">
            {reels.map((reel) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                onPress={onReelPress}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Reels Coming Soon"
            description="We're still editing together your best fails and rare wins. The compilation is going to be brutal."
            icon="🎬"
            testID="insights-v2-reels-empty"
          />
        )}
      </YStack>
    </YStack>
  )
})

VideoAnalysisInsightsV2.displayName = 'VideoAnalysisInsightsV2'
