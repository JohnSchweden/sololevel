import { useStaggeredAnimation } from '@app/hooks/useStaggeredAnimation'
import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
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
import { RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { useInsightsData } from './hooks/useInsightsData'

export interface InsightsScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string
}

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

  const { visibleItems: sectionsVisible } = useStaggeredAnimation({
    itemCount: 4,
    staggerDelay: 50,
    dependencies: [isLoading], // Only restart animation when loading state changes, not on data updates
  })

  if (isLoading) {
    return (
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
    )
  }

  if (isError || !data) {
    return (
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
    )
  }

  return (
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
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refetch()}
              tintColor="white"
              titleColor="white"
            />
          }
        >
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 30}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom="$6"
            marginBottom={insets.bottom}
          >
            {/* Weekly Overview Section */}
            <YStack
              gap="$4"
              opacity={sectionsVisible[0] ? 1 : 0}
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
                <ActivityChart data={data.weeklyStats.dailyActivity} />
              </YStack>
            </YStack>

            {/* Focus Areas Section */}
            <YStack
              gap="$3"
              opacity={sectionsVisible[1] ? 1 : 0}
              animation="quick"
            >
              <SettingsSectionHeader
                title="Focus Areas"
                icon={Target}
              />

              {data.focusAreas.map((focus, index) => (
                <FocusCard
                  key={`focus-${index}`}
                  title={focus.title}
                  progress={focus.progress}
                  priority={focus.priority}
                />
              ))}
            </YStack>

            {/* Achievements Section */}
            <YStack
              gap="$3"
              opacity={sectionsVisible[2] ? 1 : 0}
              animation="quick"
            >
              <SettingsSectionHeader
                title="Recent Achievements"
                icon={Award}
              />

              {data.achievements.map((achievement, index) => (
                <AchievementCard
                  key={`achievement-${index}`}
                  title={achievement.title}
                  date={achievement.date}
                  type={achievement.type}
                  icon={achievement.icon}
                />
              ))}
            </YStack>

            {/* Quick Stats Section */}
            <YStack
              gap="$4"
              opacity={sectionsVisible[3] ? 1 : 0}
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
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  )
}
