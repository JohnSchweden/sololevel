// import { useLazySectionVisibility } from '@app/hooks/useLazySectionVisibility'
// import { useStaggeredAnimation } from '@app/hooks/useStaggeredAnimation'
import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
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
}: {
  isVisible: boolean
  data: InsightsData
  dailyActivityData: InsightsData['weeklyStats']['dailyActivity']
}) {
  return (
    <YStack
      gap="$4"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title="This Week (The numbers don't lie)"
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
                ? 'Sessions\n(Not bad!)'
                : 'Sessions\n(Barely trying)'
            }
            variant="center"
          />
        </YStack>
        <YStack flex={1}>
          <StatCard
            value={`${data.weeklyStats.improvement}%`}
            label={
              data.weeklyStats.improvement > 20
                ? 'Improvement\n(Actually trying)'
                : 'Improvement\n(Could be worse)'
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
              ? 'Weekly Progress (Almost there!)'
              : data.weeklyStats.weeklyProgress >= 50
                ? 'Weekly Progress (Halfway to mediocrity)'
                : 'Weekly Progress (Room for improvement)'}
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
            ? "Almost perfect! Now don't mess it up next week."
            : data.weeklyStats.weeklyProgress >= 80
              ? "Solid effort. Could be better, but we'll take it."
              : data.weeklyStats.weeklyProgress >= 50
                ? "Halfway there... which means you're also halfway behind."
                : data.weeklyStats.weeklyProgress >= 25
                  ? "A quarter of the way? That's... something, I guess."
                  : 'Less than 25%? Ouch. Time to step it up.'}
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
          Daily Activity (The truth hurts)
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
              return "Zero sessions? Really? That's not even trying."
            }
            if (maxSessions === minSessions && maxSessions === 1) {
              return 'One session per day? Consistency is key, but so is effort.'
            }
            if (avgSessions >= 2.5) {
              return "Now that's what I call commitment! Keep it up."
            }
            if (avgSessions >= 1.5) {
              return 'Decent effort, but we both know you can do better.'
            }
            return 'Some days you tried, some days... not so much. Classic.'
          })()}
        </Text>
      </YStack>
    </YStack>
  )
})

const FocusAreasSection = memo(function FocusAreasSection({
  isVisible,
  focusAreasList,
}: {
  isVisible: boolean
  focusAreasList: InsightsData['focusAreas']
}) {
  return (
    <YStack
      gap="$3"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title="Focus Areas (Where you're failing)"
        icon={Target}
        variant="minSpacing"
      />

      {focusAreasList.map((focus, index) => {
        const roastTitle =
          focus.progress >= 80
            ? `${focus.title} (Almost there!)`
            : focus.progress >= 50
              ? `${focus.title} (Halfway to decent)`
              : focus.progress >= 25
                ? `${focus.title} (Baby steps...)`
                : `${focus.title} (Yikes)`

        return (
          <YStack
            key={`focus-${index}`}
            gap="$2"
          >
            <FocusCard
              title={roastTitle}
              progress={focus.progress}
              priority={focus.priority}
            />
            <Text
              fontSize="$2"
              color="$color10"
              fontStyle="italic"
              paddingHorizontal="$2"
            >
              {focus.progress >= 80
                ? 'Look at you, actually trying!'
                : focus.progress >= 50
                  ? "Not terrible, but we've seen better."
                  : focus.progress >= 25
                    ? "At least you're not at zero... yet."
                    : 'This is embarrassing. Do better.'}
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
}: {
  isVisible: boolean
  achievementsList: InsightsData['achievements']
}) {
  return (
    <YStack
      gap="$3"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title="Recent Achievements (You did something!)"
        icon={Award}
        variant="minSpacing"
      />

      {achievementsList.map((achievement, index) => {
        const roastTitle =
          achievement.type === 'streak'
            ? `${achievement.title} (The streak lives!)`
            : achievement.type === 'technique'
              ? `${achievement.title} (You learned something!)`
              : `${achievement.title} (A new low... I mean high!)`

        const roastDate =
          achievement.date === 'Today'
            ? 'Today (Fresh off the press)'
            : achievement.date.includes('ago')
              ? `${achievement.date} (Ancient history)`
              : achievement.date

        return (
          <YStack
            key={`achievement-${index}`}
            gap="$1"
          >
            <AchievementCard
              title={roastTitle}
              date={roastDate}
              type={achievement.type}
              icon={achievement.icon}
            />
            <Text
              fontSize="$2"
              color="$color10"
              fontStyle="italic"
              paddingHorizontal="$2"
            >
              {achievement.type === 'streak'
                ? 'Keep it going before you break it!'
                : achievement.type === 'technique'
                  ? 'Finally, some improvement. About time.'
                  : 'A personal best! Now do it again.'}
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
}: {
  isVisible: boolean
  data: InsightsData
}) {
  return (
    <YStack
      gap="$4"
      opacity={isVisible ? 1 : 0}
      animation="quick"
    >
      <SettingsSectionHeader
        title="Quick Stats (The brutal truth)"
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
          />

          <FocusAreasSection
            isVisible={true}
            focusAreasList={focusAreasList}
          />

          <AchievementsSection
            isVisible={true}
            achievementsList={achievementsList}
          />

          <QuickStatsSection
            isVisible={true}
            data={data}
          />
        </>
      ),
    [data, dailyActivityData, focusAreasList, achievementsList]
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
