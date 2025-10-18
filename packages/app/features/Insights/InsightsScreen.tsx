import {
  AchievementCard,
  ActivityChart,
  FocusCard,
  GlassBackground,
  Progress,
  SettingsSectionHeader,
  StatCard,
} from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { Award, BarChart3, Calendar, Target } from '@tamagui/lucide-icons'
import { useNavigation } from 'expo-router'
import { useEffect, useLayoutEffect, useState } from 'react'
import { RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { useInsightsData } from './hooks/useInsightsData'

export interface InsightsScreenProps {
  /**
   * Callback when navigating to history/progress screen
   * Implemented by route file with router.push()
   */
  onNavigateToHistory?: () => void

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
 * **Navigation Pattern (Battle-Tested):**
 * - Screen receives callbacks as props (framework-agnostic)
 * - Route file implements callbacks with platform router
 * - No direct router/navigation imports in screen
 *
 * @example
 * ```tsx
 * // Route file (apps/expo/app/(tabs)/insights.tsx)
 * <InsightsScreen onNavigateToHistory={() => router.push('/history-progress')} />
 * ```
 */
export function InsightsScreen({
  onNavigateToHistory,
  testID = 'insights-screen',
}: InsightsScreenProps = {}): React.ReactElement {
  const navigation = useNavigation()
  const headerHeight = useHeaderHeight()
  const [sectionsVisible, setSectionsVisible] = useState<boolean[]>([false, false, false, false])

  const { data, isLoading, isError, refetch } = useInsightsData()

  // Configure header with menu button for history navigation
  useLayoutEffect(() => {
    navigation.setOptions({
      // @ts-ignore: custom appHeaderProps not in base type
      appHeaderProps: {
        leftAction: 'sidesheet',
        onMenuPress: () => onNavigateToHistory?.(),
      },
    })
  }, [navigation, onNavigateToHistory])

  // Stagger section animations on mount
  useEffect(() => {
    if (data && !isLoading) {
      const timers: ReturnType<typeof setTimeout>[] = []
      sectionsVisible.forEach((_, index) => {
        timers.push(
          setTimeout(() => {
            setSectionsVisible((prev) => {
              const updated = [...prev]
              updated[index] = true
              return updated
            })
          }, index * 50) // 50ms stagger delay
        )
      })
      return () => timers.forEach(clearTimeout)
    }
    return undefined
  }, [data, isLoading])

  if (isLoading) {
    return (
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$color12">Loading...</Text>
        </YStack>
      </GlassBackground>
    )
  }

  if (isError || !data) {
    return (
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$6"
          gap="$4"
        >
          <Text
            fontSize="$8"
            textAlign="center"
            color="$color12"
          >
            📊
          </Text>
          <Text
            fontSize="$5"
            fontWeight="500"
            textAlign="center"
            color="$color12"
          >
            {isError ? 'Failed to load insights' : 'No data available yet'}
          </Text>
          <Text
            fontSize="$3"
            textAlign="center"
            color="$color11"
            maxWidth={300}
          >
            {isError
              ? 'Please try again later or pull to refresh.'
              : 'Complete workouts to see insights about your performance and progress.'}
          </Text>
        </YStack>
      </GlassBackground>
    )
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
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
            paddingTop={headerHeight + 30}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom="$6"
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
