import { Award, BarChart3, Lightbulb, Play, Sparkles, Target } from '@tamagui/lucide-icons'
import { memo, useMemo } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'
import { AchievementCard } from '../../Insights/AchievementCard'
import type { ActivityData } from '../../Insights/ActivityChart'
import { ActivityChart } from '../../Insights/ActivityChart'
import { Badge } from '../../Insights/Badge'
import { FocusCard } from '../../Insights/FocusCard'
import { Progress } from '../../Insights/Progress'
import { StatCard } from '../../Insights/StatCard'
import { SettingsSectionHeader } from '../../Settings/SettingsSectionHeader'
import { StateDisplay } from '../../StateDisplay'

export interface VideoAnalysisInsightsOverview {
  score: number
  /**
   * High-level skill tier, e.g., "Proficient"
   */
  levelLabel: string
  /**
   * Percent improvement vs. previous session/week
   */
  improvementDelta: number
  /**
   * Summary sentence describing performance
   */
  summary: string
  /**
   * Number of skills tracked in recent sessions
   */
  skillsTracked: number
  /**
   * Current streak in days
   */
  streakDays: number
  /**
   * Recent activities represented as chips
   */
  activities: string[]
}

export interface VideoAnalysisInsightsFocusArea {
  id: string
  title: string
  progress: number
  priority: 'high' | 'medium' | 'low'
}

export interface VideoAnalysisInsightsHighlight {
  id: string
  title: string
  tags: string[]
  duration: string
  score: number
}

export interface VideoAnalysisInsightsAction {
  id: string
  title: string
  description: string
  domains: string[]
  ctaLabel: string
}

export interface VideoAnalysisInsightsAchievement {
  id: string
  title: string
  date: string
  type: 'streak' | 'technique' | 'record'
  icon: string
}

export interface VideoAnalysisInsightsProps {
  overview?: VideoAnalysisInsightsOverview | null
  focusAreas?: VideoAnalysisInsightsFocusArea[]
  timeline?: ActivityData[]
  highlights?: VideoAnalysisInsightsHighlight[]
  actions?: VideoAnalysisInsightsAction[]
  achievements?: VideoAnalysisInsightsAchievement[]
  onHighlightPress?: (highlightId: string) => void
  onActionPress?: (actionId: string) => void
  testID?: string
}

const DEFAULT_OVERVIEW: VideoAnalysisInsightsOverview = {
  score: 78,
  levelLabel: 'Proficient',
  improvementDelta: 12,
  summary: 'Your energy keeps audiences engaged. Clarity and pacing steadily improved this week.',
  skillsTracked: 14,
  streakDays: 7,
  activities: ['Basketball', 'Weightlifting', 'Public Speaking'],
}

const DEFAULT_FOCUS_AREAS: VideoAnalysisInsightsFocusArea[] = [
  {
    id: 'focus-voice-control',
    title: 'Voice control for clarity',
    progress: 68,
    priority: 'high',
  },
  {
    id: 'focus-posture',
    title: 'Posture & gestures sync',
    progress: 54,
    priority: 'medium',
  },
  {
    id: 'focus-strength',
    title: 'Lower body strength',
    progress: 42,
    priority: 'low',
  },
]

const DEFAULT_TIMELINE: ActivityData[] = [
  { day: '0:00', sessions: 2 },
  { day: '0:45', sessions: 3 },
  { day: '1:30', sessions: 4 },
  { day: '2:15', sessions: 3 },
  { day: '3:00', sessions: 5 },
  { day: '3:45', sessions: 4 },
]

const DEFAULT_HIGHLIGHTS: VideoAnalysisInsightsHighlight[] = [
  {
    id: 'highlight-story',
    title: 'Fantastic storytelling',
    tags: ['Public speaking'],
    duration: '15 sec',
    score: 86,
  },
  {
    id: 'highlight-pullup',
    title: 'Clean pull ups',
    tags: ['Weightlifting'],
    duration: '23 sec',
    score: 82,
  },
  {
    id: 'highlight-voice',
    title: 'Otherworldly voice',
    tags: ['Singing', 'Voice'],
    duration: '23 sec',
    score: 89,
  },
]

const DEFAULT_ACTIONS: VideoAnalysisInsightsAction[] = [
  {
    id: 'action-reduce-filler',
    title: 'Reduce filler words',
    description: 'Launch 60s cadence drill with cadence counters and visual cues.',
    domains: ['Public speaking'],
    ctaLabel: 'Start 60s drill',
  },
  {
    id: 'action-mindful-breathing',
    title: 'Mindful breathing',
    description: 'Boost calmness in speaking and focus in sports.',
    domains: ['Singing', 'Public speaking', 'Sleep'],
    ctaLabel: '2-min exercise',
  },
  {
    id: 'action-posture',
    title: 'Posture & gestures',
    description: 'Mirror session with pose tips and handling nervous energy.',
    domains: ['Public speaking', 'Singing'],
    ctaLabel: 'Open mirror mode',
  },
]

const DEFAULT_ACHIEVEMENTS: VideoAnalysisInsightsAchievement[] = [
  {
    id: 'achievement-master',
    title: 'Master of Flow',
    date: '23 wins',
    type: 'streak',
    icon: '🔥',
  },
  {
    id: 'achievement-story',
    title: 'Excellent storytelling',
    date: 'New badge',
    type: 'technique',
    icon: '🎤',
  },
  {
    id: 'achievement-break',
    title: '3-break streak',
    date: 'Unlocked',
    type: 'record',
    icon: '⚡️',
  },
]

const HighlightCard = ({
  highlight,
  onPress,
}: {
  highlight: VideoAnalysisInsightsHighlight
  onPress?: (highlightId: string) => void
}) => {
  return (
    <YStack
      key={highlight.id}
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$2"
      data-testid={`insight-highlight-${highlight.id}`}
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$3"
      >
        <YStack gap="$1">
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
        <Badge
          variant="secondary"
          testID={`insight-highlight-score-${highlight.id}`}
        >
          {highlight.score}
        </Badge>
      </XStack>

      <XStack
        gap="$2"
        flexWrap="wrap"
      >
        {highlight.tags.map((tag) => (
          <Badge
            key={`${highlight.id}-${tag}`}
            variant="secondary"
            testID={`insight-highlight-tag-${highlight.id}-${tag}`}
          >
            {tag}
          </Badge>
        ))}
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
          onPress={() => onPress(highlight.id)}
          testID={`insight-highlight-cta-${highlight.id}`}
        >
          <Text
            fontSize="$2"
            color="$color12"
          >
            Play clip
          </Text>
        </Button>
      ) : null}
    </YStack>
  )
}

const ActionCard = ({
  action,
  onPress,
}: {
  action: VideoAnalysisInsightsAction
  onPress?: (actionId: string) => void
}) => {
  return (
    <YStack
      key={action.id}
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$3"
      data-testid={`insight-action-${action.id}`}
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
            testID={`insight-action-tag-${action.id}-${domain}`}
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
          onPress={() => onPress(action.id)}
          testID={`insight-action-cta-${action.id}`}
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
}

export const VideoAnalysisInsights = memo(function VideoAnalysisInsights({
  overview = DEFAULT_OVERVIEW,
  focusAreas = DEFAULT_FOCUS_AREAS,
  timeline = DEFAULT_TIMELINE,
  highlights = DEFAULT_HIGHLIGHTS,
  actions = DEFAULT_ACTIONS,
  achievements = DEFAULT_ACHIEVEMENTS,
  onHighlightPress,
  onActionPress,
  testID = 'video-analysis-insights',
}: VideoAnalysisInsightsProps) {
  const hasContent = useMemo(
    () =>
      Boolean(overview) ||
      focusAreas.length > 0 ||
      timeline.length > 0 ||
      highlights.length > 0 ||
      actions.length > 0 ||
      achievements.length > 0,
    [
      overview,
      focusAreas.length,
      timeline.length,
      highlights.length,
      actions.length,
      achievements.length,
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
          title="No insights yet"
          description="Upload a few more videos to unlock personalized insights."
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
      {overview ? (
        <YStack gap="$3">
          <SettingsSectionHeader
            title="Your skills snapshot"
            icon={BarChart3}
            testID="insight-overview-header"
            borderBottomWidth={0}
          />

          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$4"
            testID="insight-overview-card"
          >
            <XStack
              justifyContent="space-between"
              alignItems="flex-start"
              gap="$3"
            >
              <YStack gap="$1">
                <Text
                  fontSize="$10"
                  fontWeight="600"
                  color="$color12"
                  testID="insight-score-value"
                >
                  {overview.score}
                </Text>
                <Text
                  fontSize="$3"
                  color="$color11"
                  testID="insight-score-label"
                >
                  {overview.levelLabel}
                </Text>
              </YStack>

              <YStack
                alignItems="flex-end"
                gap="$2"
              >
                <Badge
                  variant="primary"
                  testID="insight-improvement-badge"
                >
                  +{overview.improvementDelta}% vs last week
                </Badge>
                <Text
                  fontSize="$2"
                  color="$color11"
                  textAlign="right"
                >
                  {overview.summary}
                </Text>
              </YStack>
            </XStack>

            <YStack gap="$2">
              <Text
                fontSize="$2"
                color="$color11"
              >
                Recent activities
              </Text>
              <XStack
                gap="$2"
                flexWrap="wrap"
              >
                {overview.activities.map((activity) => (
                  <Badge
                    key={`activity-${activity}`}
                    variant="secondary"
                    testID={`insight-activity-${activity}`}
                  >
                    {activity}
                  </Badge>
                ))}
              </XStack>
            </YStack>

            <XStack
              gap="$3"
              flexWrap="wrap"
            >
              <StatCard
                value={overview.skillsTracked}
                label="Skills tracked"
                variant="left"
              />
              <StatCard
                value={`${overview.streakDays} days`}
                label="Streak"
                variant="left"
              />
              <YStack
                flex={1}
                minWidth={160}
                gap="$2"
              >
                <Text
                  fontSize="$2"
                  color="$color11"
                >
                  Weekly improvement
                </Text>
                <Progress
                  value={overview.improvementDelta}
                  size="md"
                />
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      ) : null}

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Focus areas"
          icon={Target}
          testID="insight-focus-header"
          borderBottomWidth={0}
        />

        {focusAreas.length > 0 ? (
          <YStack gap="$3">
            {focusAreas.map((focusArea) => (
              <FocusCard
                key={focusArea.id}
                title={focusArea.title}
                progress={focusArea.progress}
                priority={focusArea.priority}
                testID={`insight-focus-${focusArea.id}`}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Focus areas coming soon"
            description="Track a few more sessions to unlock targeted focus areas."
            icon="🎯"
            testID="insight-focus-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Progress timeline"
          icon={Sparkles}
          testID="insight-timeline-header"
          borderBottomWidth={0}
        />
        {timeline.length > 0 ? (
          <YStack
            padding="$4"
            backgroundColor="$backgroundHover"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
            testID="insight-timeline-card"
          >
            <ActivityChart
              data={timeline}
              testID="insight-timeline-chart"
            />
            <Text
              fontSize="$2"
              color="$color11"
            >
              Confidence trends stay above goal pace after the 2:30 mark.
            </Text>
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Timeline will unlock soon"
            description="Add more videos to see a full progress timeline."
            icon="⏱️"
            testID="insight-timeline-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Video highlights"
          icon={Award}
          testID="insight-highlights-header"
          borderBottomWidth={0}
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
            title="Highlights will appear here"
            description="We will surface standout clips as soon as enough videos are analyzed."
            icon="⭐️"
            testID="insight-highlights-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Action hub"
          icon={Lightbulb}
          testID="insight-actions-header"
          borderBottomWidth={0}
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
            title="Action hub will unlock soon"
            description="Complete a few coaching drills to unlock personalized next steps."
            icon="💡"
            testID="insight-actions-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Achievements"
          icon={Award}
          testID="insight-achievements-header"
          borderBottomWidth={0}
        />
        {achievements.length > 0 ? (
          <YStack gap="$3">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                title={achievement.title}
                date={achievement.date}
                type={achievement.type}
                icon={achievement.icon}
                testID={`insight-achievement-${achievement.id}`}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Achievements will appear as you progress"
            description="Keep training to unlock milestones."
            icon="🏆"
            testID="insight-achievements-empty"
          />
        )}
      </YStack>
    </YStack>
  )
})

VideoAnalysisInsights.displayName = 'VideoAnalysisInsights'
