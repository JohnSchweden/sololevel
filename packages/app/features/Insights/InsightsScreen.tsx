import { useRenderDiagnostics } from '@app/hooks'
import { useLazySectionVisibility } from '@app/hooks/useLazySectionVisibility'
import { useStaggeredAnimation } from '@app/hooks/useStaggeredAnimation'
import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
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
import { LazySection, ProfilerWrapper } from '@ui/components/Performance'
import { memo, useCallback, useMemo } from 'react'
import { RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
        title="This Week"
        icon={BarChart3}
      />

      {/* Stats Grid */}
      <XStack gap="$4">
        <YStack flex={1}>
          <StatCard
            value={data.weeklyStats.totalSessions}
            label="Total Sessions"
          />
        </YStack>
        <YStack flex={1}>
          <StatCard
            value={`${data.weeklyStats.improvement}%`}
            label="Improvement"
            trend="up"
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
            Weekly Progress
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
          Daily Activity
        </Text>
        <ActivityChart data={dailyActivityData} />
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
        title="Focus Areas"
        icon={Target}
      />

      {focusAreasList.map((focus, index) => (
        <FocusCard
          key={`focus-${index}`}
          title={focus.title}
          progress={focus.progress}
          priority={focus.priority}
        />
      ))}
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
        title="Recent Achievements"
        icon={Award}
      />

      {achievementsList.map((achievement, index) => (
        <AchievementCard
          key={`achievement-${index}`}
          title={achievement.title}
          date={achievement.date}
          type={achievement.type}
          icon={achievement.icon}
        />
      ))}
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
        title="Quick Stats"
        icon={Calendar}
      />

      <XStack gap="$4">
        <YStack flex={1}>
          <StatCard
            value={data.quickStats.streakDays}
            label="Day Streak"
            variant="center"
          />
        </YStack>
        <YStack flex={1}>
          <StatCard
            value={`${data.quickStats.avgSessionTime}min`}
            label="Avg Session"
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
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component
  const { data, isLoading, isError, refetch } = useInsightsData()

  // Diagnose what's causing re-renders - log all renders to see frequency
  const diagnostics = useRenderDiagnostics(
    'InsightsScreen',
    { data, isLoading, isError },
    {
      logToConsole: __DEV__,
      logOnlyChanges: false, // Log all renders to see frequency
    }
  )

  // Warn if rendering too frequently
  if (__DEV__ && diagnostics.renderCount > 10) {
    log.warn('InsightsScreen', 'High render count detected', {
      renderCount: diagnostics.renderCount,
      message: 'Check for unstable dependencies or parent re-renders',
    })
  }

  // Lazy load sections to reduce initial render time
  // First section renders immediately, others render after delay
  const { visibleSections: lazyVisibleSections } = useLazySectionVisibility({
    sectionCount: 4,
    renderFirstImmediately: true,
    renderDelay: 150, // Delay between sections to spread mount work
  })

  // Stable dependencies array to prevent useStaggeredAnimation from re-running unnecessarily
  const staggerDependencies = useMemo(() => [isLoading], [isLoading])

  const { visibleItems: sectionsVisible } = useStaggeredAnimation({
    itemCount: 4,
    staggerDelay: 50,
    dependencies: staggerDependencies, // Only restart animation when loading state changes, not on data updates
  })

  // Stable refetch callback
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Memoize refresh control to prevent recreation
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isLoading}
        onRefresh={handleRefresh}
        tintColor="white"
        titleColor="white"
      />
    ),
    [isLoading, handleRefresh]
  )

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
          <LazySection
            isVisible={lazyVisibleSections[0]}
            placeholderHeight={300}
            testID="weekly-overview-section"
          >
            <WeeklyOverviewSection
              isVisible={sectionsVisible[0]}
              data={data}
              dailyActivityData={dailyActivityData}
            />
          </LazySection>

          {/* Focus Areas Section - lazy loaded */}
          <LazySection
            isVisible={lazyVisibleSections[1]}
            placeholderHeight={200}
            testID="focus-areas-section"
          >
            <FocusAreasSection
              isVisible={sectionsVisible[1]}
              focusAreasList={focusAreasList}
            />
          </LazySection>

          {/* Achievements Section - lazy loaded */}
          <LazySection
            isVisible={lazyVisibleSections[2]}
            placeholderHeight={200}
            testID="achievements-section"
          >
            <AchievementsSection
              isVisible={sectionsVisible[2]}
              achievementsList={achievementsList}
            />
          </LazySection>

          {/* Quick Stats Section - lazy loaded */}
          <LazySection
            isVisible={lazyVisibleSections[3]}
            placeholderHeight={150}
            testID="quick-stats-section"
          >
            <QuickStatsSection
              isVisible={sectionsVisible[3]}
              data={data}
            />
          </LazySection>
        </>
      ),
    [
      data,
      lazyVisibleSections[0],
      lazyVisibleSections[1],
      lazyVisibleSections[2],
      lazyVisibleSections[3],
      sectionsVisible[0],
      sectionsVisible[1],
      sectionsVisible[2],
      sectionsVisible[3],
      dailyActivityData,
      focusAreasList,
      achievementsList,
    ]
  )

  if (isLoading) {
    return (
      <ProfilerWrapper
        id="InsightsScreen"
        logToConsole={__DEV__}
      >
        <GlassBackground
          backgroundColor="$color3"
          testID={testID}
        >
          <StateDisplay
            type="loading"
            title="Loading insights..."
            testID={`${testID}-loading`}
          />
        </GlassBackground>
      </ProfilerWrapper>
    )
  }

  if (isError || !data) {
    return (
      <ProfilerWrapper
        id="InsightsScreen"
        logToConsole={__DEV__}
      >
        <GlassBackground
          backgroundColor="$color3"
          testID={testID}
        >
          <StateDisplay
            type={isError ? 'error' : 'empty'}
            title={isError ? 'Failed to load insights' : 'No data available yet'}
            description={
              isError
                ? 'Please try again later or pull to refresh.'
                : 'Complete workouts to see insights about your performance and progress.'
            }
            icon="📊"
            onRetry={isError ? refetch : undefined}
            testID={`${testID}-${isError ? 'error' : 'empty'}`}
          />
        </GlassBackground>
      </ProfilerWrapper>
    )
  }

  return (
    <ProfilerWrapper
      id="InsightsScreen"
      logToConsole={__DEV__}
    >
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <SafeAreaView
          edges={['left', 'right']}
          style={{ flex: 1 }}
        >
          <ScrollView
            flex={1}
            refreshControl={refreshControl}
          >
            <YStack
              paddingTop={insets.top + APP_HEADER_HEIGHT + 30}
              paddingHorizontal="$4"
              gap="$6"
              paddingBottom="$6"
              marginBottom={insets.bottom}
            >
              {sectionsContent}
            </YStack>
          </ScrollView>
        </SafeAreaView>
      </GlassBackground>
    </ProfilerWrapper>
  )
}
