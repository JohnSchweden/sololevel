import { type CoachMode, VOICE_TEXT_CONFIG, type VoiceTextConfig } from '@my/config'
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
import { memo, useCallback, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

import { FeedbackRatingButtons } from '../../FeedbackRating/FeedbackRatingButtons'
import type { ActivityData } from '../../Insights/ActivityChart'
import { ActivityChart } from '../../Insights/ActivityChart'
import { Badge } from '../../Insights/Badge'
import { FocusCard } from '../../Insights/FocusCard'
import { Progress } from '../../Insights/Progress'
import { StatCard } from '../../Insights/StatCard'
import { SettingsSectionHeader } from '../../Settings/SettingsSectionHeader'
import { StateDisplay } from '../../StateDisplay'
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_ACTIONS,
  DEFAULT_FOCUS_AREAS,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_REELS,
  DEFAULT_SKILL_MATRIX,
  DEFAULT_TIMELINE,
  getDefaultOverview,
  getDefaultQuote,
} from './utils/defaults'
import { renderMarkdownText } from './utils/renderMarkdownText'

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
  voiceMode?: CoachMode // Voice mode for UI text (roast/zen/lovebomb)
  onHighlightPress?: (highlightId: string) => void
  onActionPress?: (actionId: string) => void
  onReelPress?: (reelId: string) => void
  /** Controls whether the summary section is expanded (persists across sub-tab switches) */
  isSummaryExpanded?: boolean
  /** Callback to toggle the summary expanded state */
  onSummaryToggle?: () => void
  /** Current rating for full feedback text */
  fullFeedbackRating?: 'up' | 'down' | null
  /** Callback when full feedback rating changes */
  onFullFeedbackRatingChange?: (rating: 'up' | 'down' | null) => void
  testID?: string
}

// Status token map will be created dynamically from voice text
function getStatusTokenMap(
  voiceText: VoiceTextConfig
): Record<
  VideoAnalysisInsightsV2Highlight['status'],
  { label: string; backgroundColor: string; color: string }
> {
  return {
    good: {
      label: voiceText.feedbackPanel.insights.statusLabels.good,
      backgroundColor: '$green4',
      color: '$green11',
    },
    improve: {
      label: voiceText.feedbackPanel.insights.statusLabels.improve,
      backgroundColor: '$orange4',
      color: '$orange11',
    },
    critical: {
      label: voiceText.feedbackPanel.insights.statusLabels.critical,
      backgroundColor: '$red4',
      color: '$red11',
    },
  }
}

const HighlightCard = memo(function HighlightCard({
  highlight,
  onPress,
  statusTokenMap,
}: {
  highlight: VideoAnalysisInsightsV2Highlight
  onPress?: (highlightId: string) => void
  statusTokenMap: ReturnType<typeof getStatusTokenMap>
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
  voiceText,
}: {
  skill: VideoAnalysisInsightsV2SkillDimension
  voiceText: VoiceTextConfig
}) {
  // Derive colors and labels based on trend direction
  type TextColorProp = ComponentProps<typeof Text>['color']
  type IconColorProp = ComponentProps<typeof ChevronUp>['color']
  let scoreColor: TextColorProp
  let iconColor: IconColorProp
  let trendLabel: string

  switch (skill.trend) {
    case 'up':
      scoreColor = '$green11' as TextColorProp
      iconColor = '$green11' as IconColorProp
      trendLabel = voiceText.feedbackPanel.insights.trendLabels.up
      break
    case 'down':
      scoreColor = '$orange11' as TextColorProp
      iconColor = '$orange11' as IconColorProp
      trendLabel = voiceText.feedbackPanel.insights.trendLabels.down
      break
    default:
      scoreColor = '$color11' as TextColorProp
      iconColor = '$color11' as IconColorProp
      trendLabel = voiceText.feedbackPanel.insights.trendLabels.steady
  }

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
            {trendLabel}
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

/** Transparent style for button hover/press states (extracted for performance) */
const TRANSPARENT_STYLE = { backgroundColor: 'transparent' } as const

export const VideoAnalysisInsightsV2 = memo(
  function VideoAnalysisInsightsV2({
    fullFeedbackText,
    overview: overviewProp,
    quote: quoteProp,
    focusAreas = DEFAULT_FOCUS_AREAS,
    skillMatrix = DEFAULT_SKILL_MATRIX,
    performanceTimeline = DEFAULT_TIMELINE,
    highlights = DEFAULT_HIGHLIGHTS,
    actions = DEFAULT_ACTIONS,
    achievements = DEFAULT_ACHIEVEMENTS,
    reels = DEFAULT_REELS,
    voiceMode = 'roast',
    onHighlightPress,
    onActionPress,
    onReelPress,
    isSummaryExpanded: isSummaryExpandedProp,
    onSummaryToggle,
    fullFeedbackRating,
    onFullFeedbackRatingChange,
    testID = 'video-analysis-insights-v2',
  }: VideoAnalysisInsightsV2Props) {
    // Get voice text config for current mode (default to roast)
    const voiceText = useMemo(() => VOICE_TEXT_CONFIG[voiceMode || 'roast'], [voiceMode])
    const statusTokenMap = useMemo(() => getStatusTokenMap(voiceText), [voiceText])

    // Use provided overview/quote or generate from voice text
    const overview = useMemo(
      () => overviewProp ?? getDefaultOverview(voiceText),
      [overviewProp, voiceText]
    )
    const quote = useMemo(() => quoteProp ?? getDefaultQuote(voiceText), [quoteProp, voiceText])

    // State for expand/collapse of detailed summary
    // Use controlled props if provided (from FeedbackPanel), otherwise fall back to local state for backwards compatibility
    const [localExpanded, setLocalExpanded] = useState(false)
    const isSummaryExpanded = isSummaryExpandedProp ?? localExpanded
    const [isHoveredOrPressed, setIsHoveredOrPressed] = useState(false)

    const toggleSummaryExpanded = useCallback(() => {
      if (onSummaryToggle) {
        onSummaryToggle()
      } else {
        setLocalExpanded((prev) => !prev)
      }
    }, [onSummaryToggle])

    // PERFORMANCE: Extract hover/press handlers to stable callbacks to prevent unnecessary re-renders
    const handlePressIn = useCallback(() => setIsHoveredOrPressed(true), [])
    const handlePressOut = useCallback(() => setIsHoveredOrPressed(false), [])
    const handleMouseEnter = useCallback(() => setIsHoveredOrPressed(true), [])
    const handleMouseLeave = useCallback(() => setIsHoveredOrPressed(false), [])

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
            title={voiceText.feedbackPanel.insights.emptyStates.noInsights.title}
            description={voiceText.feedbackPanel.insights.emptyStates.noInsights.description}
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
                <XStack
                  justifyContent={onFullFeedbackRatingChange ? 'space-between' : 'flex-end'}
                  alignItems="center"
                  flexWrap="wrap"
                  gap="$2"
                >
                  {onFullFeedbackRatingChange ? (
                    <FeedbackRatingButtons
                      currentRating={fullFeedbackRating ?? null}
                      onRatingChange={onFullFeedbackRatingChange}
                      size="small"
                      testID="insights-v2-detailed-summary-rating"
                    />
                  ) : null}
                  <Button
                    unstyled
                    onPress={toggleSummaryExpanded}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    paddingRight={0}
                    height="auto"
                    backgroundColor="transparent"
                    hoverStyle={TRANSPARENT_STYLE}
                    pressStyle={TRANSPARENT_STYLE}
                    accessibilityRole="button"
                    accessibilityLabel="Show more"
                    testID="insights-v2-detailed-summary-toggle"
                  >
                    <Text
                      fontSize="$3"
                      fontWeight="500"
                      color={isHoveredOrPressed ? '$color12' : '$color11'}
                    >
                      ...show more
                    </Text>
                  </Button>
                </XStack>
              ) : onFullFeedbackRatingChange ? (
                <XStack
                  justifyContent="flex-start"
                  paddingTop="$2"
                >
                  <FeedbackRatingButtons
                    currentRating={fullFeedbackRating ?? null}
                    onRatingChange={onFullFeedbackRatingChange}
                    size="small"
                    testID="insights-v2-detailed-summary-rating"
                  />
                </XStack>
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
              title={voiceText.feedbackPanel.insights.overviewHeader}
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
              title={voiceText.feedbackPanel.insights.quoteHeader}
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
            title={voiceText.feedbackPanel.insights.achievementsHeader}
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
              title={voiceText.feedbackPanel.insights.emptyStates.noAchievements.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noAchievements.description}
              icon="🏆"
              testID="insights-v2-achievements-empty"
            />
          )}
        </YStack>

        {/* PERFORMANCE: Conditional rendering reduces virtual DOM overhead when data is missing */}

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.focusHeader}
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
              title={voiceText.feedbackPanel.insights.emptyStates.noFocusAreas.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noFocusAreas.description}
              icon="🎯"
              testID="insights-v2-focus-empty"
            />
          )}
        </YStack>

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.skillHeader}
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
                  voiceText={voiceText}
                />
              ))}
            </YStack>
          ) : (
            <StateDisplay
              type="empty"
              title={voiceText.feedbackPanel.insights.emptyStates.noSkills.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noSkills.description}
              icon="📊"
              testID="insights-v2-skill-empty"
            />
          )}
        </YStack>

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.timelineHeader}
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
              title={voiceText.feedbackPanel.insights.emptyStates.noTimeline.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noTimeline.description}
              icon="📈"
              testID="insights-v2-timeline-empty"
            />
          )}
        </YStack>

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.highlightsHeader}
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
                  statusTokenMap={statusTokenMap}
                />
              ))}
            </YStack>
          ) : (
            <StateDisplay
              type="empty"
              title={voiceText.feedbackPanel.insights.emptyStates.noHighlights.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noHighlights.description}
              icon="✨"
              testID="insights-v2-highlights-empty"
            />
          )}
        </YStack>

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.actionsHeader}
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
              title={voiceText.feedbackPanel.insights.emptyStates.noActions.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noActions.description}
              icon="💡"
              testID="insights-v2-actions-empty"
            />
          )}
        </YStack>

        <YStack gap="$3">
          <SettingsSectionHeader
            title={voiceText.feedbackPanel.insights.reelsHeader}
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
              title={voiceText.feedbackPanel.insights.emptyStates.noReels.title}
              description={voiceText.feedbackPanel.insights.emptyStates.noReels.description}
              icon="🎬"
              testID="insights-v2-reels-empty"
            />
          )}
        </YStack>
      </YStack>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent re-renders when props haven't meaningfully changed
    return (
      prevProps.fullFeedbackText === nextProps.fullFeedbackText &&
      prevProps.overview === nextProps.overview &&
      prevProps.quote === nextProps.quote &&
      prevProps.focusAreas === nextProps.focusAreas &&
      prevProps.skillMatrix === nextProps.skillMatrix &&
      prevProps.performanceTimeline === nextProps.performanceTimeline &&
      prevProps.highlights === nextProps.highlights &&
      prevProps.actions === nextProps.actions &&
      prevProps.achievements === nextProps.achievements &&
      prevProps.reels === nextProps.reels &&
      prevProps.voiceMode === nextProps.voiceMode &&
      prevProps.onHighlightPress === nextProps.onHighlightPress &&
      prevProps.onActionPress === nextProps.onActionPress &&
      prevProps.onReelPress === nextProps.onReelPress &&
      prevProps.isSummaryExpanded === nextProps.isSummaryExpanded &&
      prevProps.onSummaryToggle === nextProps.onSummaryToggle &&
      prevProps.fullFeedbackRating === nextProps.fullFeedbackRating &&
      prevProps.onFullFeedbackRatingChange === nextProps.onFullFeedbackRatingChange &&
      prevProps.testID === nextProps.testID
    )
  }
)

VideoAnalysisInsightsV2.displayName = 'VideoAnalysisInsightsV2'
