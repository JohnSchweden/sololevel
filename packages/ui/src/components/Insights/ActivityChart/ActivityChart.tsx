import { Text, XStack, type XStackProps, YStack } from 'tamagui'

export interface ActivityData {
  day: string
  sessions: number
  quality?: number
}

export interface ActivityChartProps extends Omit<XStackProps, 'children'> {
  /**
   * Activity data for each day
   */
  data: ActivityData[]

  /**
   * Test ID for testing
   * @default 'activity-chart'
   */
  testID?: string
}

/**
 * ActivityChart Component
 *
 * A simple bar chart showing daily activity levels.
 * Used in insights and progress tracking.
 *
 * @example
 * ```tsx
 * <ActivityChart
 *   data={[
 *     { day: 'Mon', sessions: 2, quality: 8.5 },
 *     { day: 'Tue', sessions: 1, quality: 9.2 },
 *   ]}
 * />
 * ```
 */
export function ActivityChart({
  data,
  testID = 'activity-chart',
  ...props
}: ActivityChartProps): React.ReactElement {
  // Calculate bar heights (base 8px + 12px per session)
  const getBarHeight = (sessions: number): number => {
    return Math.max(8, sessions * 12 + 8)
  }

  return (
    <XStack
      justifyContent="space-between"
      alignItems="flex-end"
      height={60}
      gap="$2"
      data-testid={testID}
      {...props}
    >
      {data.map((day) => (
        <YStack
          key={day.day}
          alignItems="center"
          gap="$1"
          flex={1}
        >
          {/* Bar */}
          <YStack
            width={16}
            height={getBarHeight(day.sessions)}
            backgroundColor="$color6"
            borderRadius="$2"
            data-testid={`activity-bar-${day.day}`}
          />

          {/* Day label */}
          <Text
            fontSize="$1"
            color="$color11"
          >
            {day.day}
          </Text>
        </YStack>
      ))}
    </XStack>
  )
}
