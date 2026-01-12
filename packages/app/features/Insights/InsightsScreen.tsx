import { useVoiceText } from '@app/hooks/useVoiceText'
// import { useLazySectionVisibility } from '@app/hooks/useLazySectionVisibility'
// import { useStaggeredAnimation } from '@app/hooks/useStaggeredAnimation'
import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import type { VoiceTextConfig } from '@my/config'
import {
  AchievementCard,
  ActivityChart,
  FocusCard,
  GlassBackground,
  Progress,
  SettingsSectionHeader,
  StatCard,
  StateDisplay,
} from '@my/ui'
import { Award, BarChart3, Calendar, Target } from '@tamagui/lucide-icons'
// import { LazySection } from '@ui/components/Performance'
import { memo, useMemo } from 'react'
// import { useCallback } from 'react'
import { Platform, View } from 'react-native'
// import { RefreshControl } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { useInsightsData } from './hooks/useInsightsData'
import type { InsightsData } from './hooks/useInsightsData'

export interface InsightsScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string
}

// Memoized section components to prevent re-renders when other sections animate
const WeeklyOverviewSection = memo(function WeeklyOverviewSection({
  isVisible,
  data,
  dailyActivityData,
  voiceText,
}: {
  isVisible: boolean
  data: InsightsData
  dailyActivityData: InsightsData['weeklyStats']['dailyActivity']
  voiceText: VoiceTextConfig
}) {
  return (
    <YStack
      gap="$4"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title={voiceText.insights.weeklySectionHeader}
        icon={BarChart3}
        variant="minSpacing"
      />

      {/* Stats Grid */}
      <XStack gap="$4">
        <YStack flex={1}>
          <StatCard
            value={data.weeklyStats.totalSessions}
            label={
              data.weeklyStats.totalSessions > 10
                ? voiceText.insights.sessionLabels.many
                : voiceText.insights.sessionLabels.few
            }
            variant="center"
          />
        </YStack>
        <YStack flex={1}>
          <StatCard
            value={`${data.weeklyStats.improvement}%`}
            label={
              data.weeklyStats.improvement > 20
                ? voiceText.insights.improvementLabels.high
                : voiceText.insights.improvementLabels.low
            }
            trend="up"
            variant="center"
          />
        </YStack>
      </XStack>

      {/* Weekly Progress */}
      <YStack
        padding="$4"
        backgroundColor="$backgroundHover"
        borderRadius="$6"
        borderWidth={1}
        borderColor="$borderColor"
        gap="$2"
      >
        <XStack justifyContent="space-between">
          <Text
            fontSize="$3"
            color="$color11"
          >
            {data.weeklyStats.weeklyProgress >= 80
              ? `Weekly Progress ${voiceText.insights.progressLabels.high}`
              : data.weeklyStats.weeklyProgress >= 50
                ? `Weekly Progress ${voiceText.insights.progressLabels.medium}`
                : `Weekly Progress ${voiceText.insights.progressLabels.low}`}
          </Text>
          <Text
            fontSize="$3"
            color="$color11"
          >
            {data.weeklyStats.weeklyProgress}%
          </Text>
        </XStack>
        <Progress
          value={data.weeklyStats.weeklyProgress}
          size="md"
        />
        <Text
          fontSize="$2"
          color="$color10"
          fontStyle="italic"
          paddingTop="$1"
        >
          {data.weeklyStats.weeklyProgress >= 90
            ? voiceText.insights.progressComments.excellent
            : data.weeklyStats.weeklyProgress >= 80
              ? voiceText.insights.progressComments.good
              : data.weeklyStats.weeklyProgress >= 50
                ? voiceText.insights.progressComments.average
                : data.weeklyStats.weeklyProgress >= 25
                  ? voiceText.insights.progressComments.poor
                  : voiceText.insights.progressComments.veryPoor}
        </Text>
      </YStack>

      {/* Activity Chart */}
      <YStack
        padding="$4"
        backgroundColor="$backgroundHover"
        borderRadius="$6"
        borderWidth={1}
        borderColor="$borderColor"
        gap="$3"
      >
        <Text
          fontSize="$3"
          color="$color11"
        >
          {voiceText.insights.dailyActivityHeader}
        </Text>
        <ActivityChart data={dailyActivityData} />
        <Text
          fontSize="$2"
          color="$color10"
          fontStyle="italic"
          paddingTop="$2"
        >
          {(() => {
            const totalSessions = dailyActivityData.reduce((sum, day) => sum + day.sessions, 0)
            const avgSessions = totalSessions / dailyActivityData.length
            const maxSessions = Math.max(...dailyActivityData.map((d) => d.sessions))
            const minSessions = Math.min(...dailyActivityData.map((d) => d.sessions))

            if (maxSessions === 0) {
              return voiceText.insights.dailyActivityComments.none
            }
            if (maxSessions === minSessions && maxSessions === 1) {
              return voiceText.insights.dailyActivityComments.low
            }
            if (avgSessions >= 2.5) {
              return voiceText.insights.dailyActivityComments.high
            }
            if (avgSessions >= 1.5) {
              return voiceText.insights.dailyActivityComments.medium
            }
            return voiceText.insights.dailyActivityComments.medium
          })()}
        </Text>
      </YStack>
    </YStack>
  )
})

const FocusAreasSection = memo(function FocusAreasSection({
  isVisible,
  focusAreasList,
  voiceText,
}: {
  isVisible: boolean
  focusAreasList: InsightsData['focusAreas']
  voiceText: VoiceTextConfig
}) {
  return (
    <YStack
      gap="$3"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title={voiceText.insights.focusAreasHeader}
        icon={Target}
        variant="minSpacing"
      />

      {focusAreasList.map((focus, index) => {
        const progressLabel =
          focus.progress >= 80
            ? voiceText.insights.progressLabels.high
            : focus.progress >= 50
              ? voiceText.insights.progressLabels.medium
              : focus.progress >= 25
                ? voiceText.insights.progressLabels.low
                : voiceText.insights.progressLabels.low

        const progressComment =
          focus.progress >= 80
            ? voiceText.insights.progressComments.good
            : focus.progress >= 50
              ? voiceText.insights.progressComments.average
              : focus.progress >= 25
                ? voiceText.insights.progressComments.poor
                : voiceText.insights.progressComments.veryPoor

        return (
          <YStack
            key={`focus-${index}`}
            gap="$2"
          >
            <FocusCard
              title={`${focus.title} ${progressLabel}`}
              progress={focus.progress}
              priority={focus.priority}
            />
            <Text
              fontSize="$2"
              color="$color10"
              fontStyle="italic"
              paddingHorizontal="$2"
            >
              {progressComment}
            </Text>
          </YStack>
        )
      })}
    </YStack>
  )
})

const AchievementsSection = memo(function AchievementsSection({
  isVisible,
  achievementsList,
  voiceText,
}: {
  isVisible: boolean
  achievementsList: InsightsData['achievements']
  voiceText: VoiceTextConfig
}) {
  return (
    <YStack
      gap="$3"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title={voiceText.insights.achievementsHeader}
        icon={Award}
        variant="minSpacing"
      />

      {achievementsList.map((achievement, index) => {
        const titleLabel =
          achievement.type === 'streak'
            ? ` (The streak lives!)`
            : achievement.type === 'technique'
              ? ` (You learned something!)`
              : ` (A new low... I mean high!)`

        const dateLabel =
          achievement.date === 'Today'
            ? 'Today (Fresh off the press)'
            : achievement.date.includes('ago')
              ? `${achievement.date} (Ancient history)`
              : achievement.date

        const comment =
          achievement.type === 'streak'
            ? voiceText.insights.achievementComments.streak
            : achievement.type === 'technique'
              ? voiceText.insights.achievementComments.technique
              : voiceText.insights.achievementComments.record

        return (
          <YStack
            key={`achievement-${index}`}
            gap="$1"
          >
            <AchievementCard
              title={`${achievement.title}${titleLabel}`}
              date={dateLabel}
              type={achievement.type}
              icon={achievement.icon}
            />
            <Text
              fontSize="$2"
              color="$color10"
              fontStyle="italic"
              paddingHorizontal="$2"
            >
              {comment}
            </Text>
          </YStack>
        )
      })}
    </YStack>
  )
})

const QuickStatsSection = memo(function QuickStatsSection({
  isVisible,
  data,
  voiceText,
}: {
  isVisible: boolean
  data: InsightsData
  voiceText: VoiceTextConfig
}) {
  return (
    <YStack
      gap="$4"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title={voiceText.insights.quickStatsHeader}
        icon={Calendar}
        variant="minSpacing"
      />

      <XStack gap="$4">
        <YStack flex={1}>
          <StatCard
            value={data.quickStats.streakDays}
            label={
              data.quickStats.streakDays >= 7
                ? 'Day Streak (Impressive!)'
                : data.quickStats.streakDays >= 3
                  ? 'Day Streak (Keep going)'
                  : 'Day Streak (Try harder)'
            }
            variant="center"
          />
        </YStack>
        <YStack flex={1}>
          <StatCard
            value={`${data.quickStats.avgSessionTime}min`}
            label={
              data.quickStats.avgSessionTime >= 45
                ? 'Avg Session (Decent effort)'
                : 'Avg Session (Was that it?)'
            }
            variant="center"
          />
        </YStack>
      </XStack>
    </YStack>
  )
})

/**
 * Insights Screen
 *
 * Displays performance insights, achievements, and progress tracking.
 * Includes weekly stats, focus areas, achievements, and quick stats.
 *
 * **Navigation Pattern (Expo Router Native):**
 * - Screen is framework-agnostic with no navigation imports
 * - Route file configures header via Tabs.Screen options
 * - All navigation logic isolated in route files
 *
 * @example
 * ```tsx
 * // Route file (apps/expo/app/(tabs)/insights.tsx)
 * <Tabs.Screen
 *   name="insights"
 *   options={{
 *     appHeaderProps: { onMenuPress: () => router.push('/history-progress') }
 *   }}
 * />
 * <InsightsScreen />
 * ```
 */
export function InsightsScreen({
  testID = 'insights-screen',
}: InsightsScreenProps = {}): React.ReactElement {
  // Use stable safe area hook to prevent layout jumps during navigation
  const insets = useStableSafeArea()
  const bottomInset = useMemo(() => Math.max(0, insets.bottom - 22), [insets.bottom])
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component
  const BOTTOM_TAB_BAR_HEIGHT = (Platform.OS === 'android' ? 52 : 72) + bottomInset // Match BottomNavigationContainer height with inset

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  const containerStyle = useMemo(
    () => ({ flex: 1 as const, paddingLeft: insets.left, paddingRight: insets.right }),
    [insets.left, insets.right]
  )
  const { data, isError, refetch } = useInsightsData()
  const voiceText = useVoiceText()

  // Lazy load sections to reduce initial render time
  // First section renders immediately, others render after delay
  // const { visibleSections: lazyVisibleSections } = useLazySectionVisibility({
  //   sectionCount: 4,
  //   renderFirstImmediately: true,
  //   renderDelay: 150, // Delay between sections to spread mount work
  // })

  // Stable dependencies array to prevent useStaggeredAnimation from re-running unnecessarily
  // const staggerDependencies = useMemo(() => [isLoading], [isLoading])

  // const { visibleItems: sectionsVisible } = useStaggeredAnimation({
  //   itemCount: 4,
  //   staggerDelay: 50,
  //   dependencies: staggerDependencies, // Only restart animation when loading state changes, not on data updates
  // })

  // Stable refetch callback
  // const handleRefresh = useCallback(() => {
  //   refetch()
  // }, [refetch])

  // Memoize refresh control to prevent recreation
  // const refreshControl = useMemo(
  //   () => (
  //     <RefreshControl
  //       refreshing={isLoading}
  //       onRefresh={handleRefresh}
  //       tintColor="white"
  //       titleColor="white"
  //     />
  //   ),
  //   [isLoading, handleRefresh]
  // )

  // Memoize data references to prevent child re-renders (only when data exists)
  const dailyActivityData = useMemo(
    () => data?.weeklyStats?.dailyActivity ?? [],
    [data?.weeklyStats?.dailyActivity]
  )
  const focusAreasList = useMemo(() => data?.focusAreas ?? [], [data?.focusAreas])
  const achievementsList = useMemo(() => data?.achievements ?? [], [data?.achievements])

  // Memoize sections content with lazy loading
  // First section renders immediately, others render only when lazyVisibleSections[i] is true
  // This spreads out component mounting work to prevent frame drops
  const sectionsContent = useMemo(
    () =>
      !data ? null : (
        <>
          {/* Weekly Overview Section - renders immediately */}
          <WeeklyOverviewSection
            isVisible={true}
            data={data}
            dailyActivityData={dailyActivityData}
            voiceText={voiceText}
          />

          <FocusAreasSection
            isVisible={true}
            focusAreasList={focusAreasList}
            voiceText={voiceText}
          />

          <AchievementsSection
            isVisible={true}
            achievementsList={achievementsList}
            voiceText={voiceText}
          />

          <QuickStatsSection
            isVisible={true}
            data={data}
            voiceText={voiceText}
          />
        </>
      ),
    [data, dailyActivityData, focusAreasList, achievementsList, voiceText]
  )

  // if (isLoading) {
  //   return (
  //     <GlassBackground
  //       backgroundColor="$color3"
  //       testID={testID}
  //     >
  //       <StateDisplay
  //         type="loading"
  //         title="This too shall pass..."
  //         testID={`${testID}-loading`}
  //       />
  //     </GlassBackground>
  //   )
  // }

  if (isError || !data) {
    return (
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <StateDisplay
          type={isError ? 'error' : 'empty'}
          title={isError ? 'Oops, Something Broke (Classic)' : 'No Data Yet (Shocking)'}
          description={
            isError
              ? 'The app tried its best, but even it gave up. Pull to refresh and try again.'
              : "Complete some workouts first. I know, shocking concept. Then come back and see how you're actually doing."
          }
          icon={isError ? '💥' : '📊'}
          onRetry={isError ? refetch : undefined}
          testID={`${testID}-${isError ? 'error' : 'empty'}`}
        />
      </GlassBackground>
    )
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView
          flex={1}
          // refreshControl={refreshControl}
        >
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 20}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={BOTTOM_TAB_BAR_HEIGHT}
          >
            {sectionsContent}
          </YStack>
        </ScrollView>
      </View>
    </GlassBackground>
  )
}
