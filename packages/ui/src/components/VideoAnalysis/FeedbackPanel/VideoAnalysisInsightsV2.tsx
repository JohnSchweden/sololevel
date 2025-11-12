import { Award, BarChart3, Lightbulb, Play, Sparkles, Target, Zap } from '@tamagui/lucide-icons'
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
  benchmarkSummary: 'Benchmark clarity is 15% above average for new speakers.',
  lastScore: 72,
  improvementDelta: 6,
  summary: 'Your energy connects with the audience. Pace your pauses for even more impact.',
}

const DEFAULT_QUOTE: VideoAnalysisInsightsV2Quote = {
  id: 'quote-primary',
  author: 'AI Coach Orbit',
  text: '“Your energy really connects with the audience. Let’s refine your pacing so your impact is even stronger.”',
  tone: 'coach',
}

const DEFAULT_FOCUS_AREAS: VideoAnalysisInsightsV2FocusArea[] = [
  {
    id: 'focus-story',
    title: 'Story arc confidence',
    progress: 82,
    priority: 'high',
  },
  {
    id: 'focus-pauses',
    title: 'Strategic pauses',
    progress: 58,
    priority: 'medium',
  },
  {
    id: 'focus-filler',
    title: 'Reduce filler words',
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
    title: 'Storytelling peak',
    tags: ['00:15 → 00:45'],
    duration: '00:15 → 00:45',
    score: 86,
    status: 'good',
  },
  {
    id: 'highlight-pauses',
    title: 'Needs pauses',
    tags: ['00:45 → 01:05'],
    duration: '00:45 → 01:05',
    score: 48,
    status: 'improve',
  },
  {
    id: 'highlight-filler',
    title: 'Filler words spike',
    tags: ['01:05 → 01:20'],
    duration: '01:05 → 01:20',
    score: 32,
    status: 'critical',
  },
]

const DEFAULT_ACTIONS: VideoAnalysisInsightsV2Action[] = [
  {
    id: 'action-drill-filler',
    title: 'Reduce filler words',
    description: 'Launch a 60-second drill with live counters and timing prompts.',
    domains: ['Voice', 'Delivery'],
    ctaLabel: 'Start 60s drill',
  },
  {
    id: 'action-pauses',
    title: 'Strategic pauses',
    description: 'Practice pacing with metronome-like prompts at key phrases.',
    domains: ['Pacing'],
    ctaLabel: '2-min pause exercise',
  },
  {
    id: 'action-posture',
    title: 'Posture & gestures',
    description: 'Mirror practice with pose prompts to reduce nervous fidgeting.',
    domains: ['Body language'],
    ctaLabel: 'Open mirror mode',
  },
]

const DEFAULT_ACHIEVEMENTS: VideoAnalysisInsightsV2Achievement[] = [
  {
    id: 'achievement-evergreen',
    title: 'Evergreen delivery',
    date: 'Earned 2 days ago',
    type: 'technique',
    icon: '🌲',
  },
  {
    id: 'achievement-excellent-story',
    title: 'Excellent storytelling',
    date: 'New badge',
    type: 'technique',
    icon: '🎤',
  },
  {
    id: 'achievement-streak',
    title: '3-session streak',
    date: '23 wins',
    type: 'streak',
    icon: '⚡️',
  },
]

const DEFAULT_REELS: VideoAnalysisInsightsV2Reel[] = [
  {
    id: 'reel-spikies',
    title: 'Spikies fail compilation',
    description: 'Shows all fails and awkward moments you ever had.',
    ctaLabel: 'Play',
  },
  {
    id: 'reel-boss',
    title: 'Boss compilation',
    description: 'Shows where you were absolutely on fire.',
    ctaLabel: 'Play',
  },
]

const statusTokenMap: Record<
  VideoAnalysisInsightsV2Highlight['status'],
  { label: string; badgeVariant: 'primary' | 'secondary' | 'destructive' }
> = {
  good: { label: 'Good', badgeVariant: 'primary' },
  improve: { label: 'Needs attention', badgeVariant: 'secondary' },
  critical: { label: 'Critical', badgeVariant: 'destructive' },
}

const HighlightCard = ({
  highlight,
  onPress,
}: {
  highlight: VideoAnalysisInsightsV2Highlight
  onPress?: (highlightId: string) => void
}) => {
  const statusTokens = statusTokenMap[highlight.status]

  return (
    <YStack
      key={highlight.id}
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
          variant={statusTokens.badgeVariant}
          testID={`insights-v2-highlight-score-${highlight.id}`}
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
            testID={`insights-v2-highlight-tag-${highlight.id}-${tag}`}
          >
            {tag}
          </Badge>
        ))}
      </XStack>

      <Badge
        variant={statusTokens.badgeVariant}
        testID={`insights-v2-highlight-status-${highlight.id}`}
      >
        {statusTokens.label}
      </Badge>

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
          testID={`insights-v2-highlight-cta-${highlight.id}`}
        >
          <Text
            fontSize="$2"
            color="$color12"
          >
            Watch moment
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
  action: VideoAnalysisInsightsV2Action
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
          onPress={() => onPress(action.id)}
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
}

const ReelCard = ({
  reel,
  onPress,
}: {
  reel: VideoAnalysisInsightsV2Reel
  onPress?: (reelId: string) => void
}) => {
  return (
    <YStack
      key={reel.id}
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
          onPress={() => onPress(reel.id)}
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
}

export const VideoAnalysisInsightsV2 = memo(function VideoAnalysisInsightsV2({
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
  const hasContent = useMemo(
    () =>
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
          title="Insights will unlock soon"
          description="Upload a few more videos to unlock personalized breakdowns."
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
            title="Performance summary"
            icon={BarChart3}
            testID="insights-v2-overview-header"
            borderBottomWidth={0}
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
              <YStack gap="$1">
                <Text
                  fontSize="$10"
                  fontWeight="600"
                  color="$color12"
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
                alignItems="flex-end"
                gap="$2"
              >
                <XStack
                  gap="$2"
                  alignItems="center"
                  testID="insights-v2-improvement-label"
                >
                  <Sparkles
                    size={16}
                    color="$color11"
                  />
                  <Text
                    fontSize="$2"
                    color="$color11"
                    fontWeight="600"
                  >
                    +{overview.improvementDelta}% vs last video
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
                Key takeaways
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
                label="Last score"
                variant="left"
              />
              <StatCard
                value={`${overview.improvementDelta}%`}
                label="Improvement"
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
                  Consistency
                </Text>
                <Progress
                  value={Math.min(overview.score, 100)}
                  size="md"
                />
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      ) : null}

      {quote ? (
        <YStack gap="$3">
          <SettingsSectionHeader
            title="Coach perspective"
            icon={Sparkles}
            testID="insights-v2-quote-header"
            borderBottomWidth={0}
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
              fontSize="$3"
              color="$color11"
            >
              {quote.author}
            </Text>
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
                {quote.tone === 'celebrate' ? 'Celebrate the momentum' : 'Coaching focus'}
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
                testID={`insights-v2-achievement-${achievement.id}`}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="No achievements yet"
            description="As soon as you unlock milestones they will appear here."
            icon="🏆"
            testID="insights-v2-achievements-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Focus areas"
          icon={Target}
          testID="insights-v2-focus-header"
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
                testID={`insights-v2-focus-${focusArea.id}`}
              />
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Focus areas coming soon"
            description="We need a few more videos to prioritize your focus areas."
            icon="🎯"
            testID="insights-v2-focus-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Skill matrix"
          icon={BarChart3}
          testID="insights-v2-skill-header"
          borderBottomWidth={0}
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
              <XStack
                key={skill.id}
                gap="$3"
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
                      <Sparkles
                        size={16}
                        color="$color11"
                      />
                    ) : skill.trend === 'down' ? (
                      <Zap
                        size={16}
                        color="$color11"
                      />
                    ) : (
                      <BarChart3
                        size={16}
                        color="$color11"
                      />
                    )}
                    <Text
                      fontSize="$2"
                      color="$color11"
                    >
                      {skill.trend === 'up'
                        ? 'Trending up'
                        : skill.trend === 'down'
                          ? 'Needs attention'
                          : 'Stable'}
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
                  <Text
                    fontSize="$2"
                    color="$color11"
                  >
                    {skill.score} / 100
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Skill matrix will unlock soon"
            description="Record a few more videos to map out your dimensions."
            icon="📈"
            testID="insights-v2-skill-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Performance through the video"
          icon={Sparkles}
          testID="insights-v2-timeline-header"
          borderBottomWidth={0}
        />
        {performanceTimeline.length > 0 ? (
          <YStack
            padding="$4"
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
              Confidence dips at 01:10 when filler words spike. Pacing recovers quickly after 02:30.
            </Text>
          </YStack>
        ) : (
          <StateDisplay
            type="empty"
            title="Timeline will unlock soon"
            description="Add more videos to visualize performance throughout the session."
            icon="⏱️"
            testID="insights-v2-timeline-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Highlights"
          icon={Sparkles}
          testID="insights-v2-highlights-header"
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
            description="We surface standout clips and lowlights once enough data is collected."
            icon="⭐️"
            testID="insights-v2-highlights-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="Your personalized action plan"
          icon={Lightbulb}
          testID="insights-v2-actions-header"
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
            title="Action plan will unlock soon"
            description="Complete a few more analyses to unlock personalized drills."
            icon="💡"
            testID="insights-v2-actions-empty"
          />
        )}
      </YStack>

      <YStack gap="$3">
        <SettingsSectionHeader
          title="AI reels"
          icon={Play}
          testID="insights-v2-reels-header"
          borderBottomWidth={0}
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
            title="Reels will unlock soon"
            description="We are still compiling your best and worst moments."
            icon="🎬"
            testID="insights-v2-reels-empty"
          />
        )}
      </YStack>
    </YStack>
  )
})

VideoAnalysisInsightsV2.displayName = 'VideoAnalysisInsightsV2'
