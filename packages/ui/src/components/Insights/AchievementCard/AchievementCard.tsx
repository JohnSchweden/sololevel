import { useMemo } from 'react'
import { Text, XStack, type XStackProps, YStack } from 'tamagui'

export interface AchievementCardProps extends Omit<XStackProps, 'children'> {
  /**
   * Achievement title
   */
  title: string

  /**
   * Achievement date/timestamp
   */
  date: string

  /**
   * Achievement type (determines icon background color)
   */
  type: 'streak' | 'technique' | 'record'

  /**
   * Icon emoji or symbol
   */
  icon: string

  /**
   * Test ID for testing
   * @default 'achievement-card'
   */
  testID?: string
}

/**
 * AchievementCard Component
 *
 * Displays a recent achievement with icon, title, and date.
 * Used in insights and achievements views.
 *
 * @example
 * ```tsx
 * <AchievementCard
 *   title="7-Day Streak"
 *   date="Today"
 *   type="streak"
 *   icon="🔥"
 * />
 * ```
 */
export function AchievementCard({
  title,
  date,
  type,
  icon,
  testID = 'achievement-card',
  ...props
}: AchievementCardProps): React.ReactElement {
  // Memoize icon colors based on achievement type to prevent recalculation
  const colors = useMemo(() => {
    const iconColors = {
      streak: {
        backgroundColor: '$orange4' as const,
        borderColor: '$orange6' as const,
      },
      technique: {
        backgroundColor: '$blue4' as const,
        borderColor: '$blue6' as const,
      },
      record: {
        backgroundColor: '$green4' as const,
        borderColor: '$green6' as const,
      },
    } as const
    return iconColors[type]
  }, [type])

  return (
    <XStack
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      alignItems="center"
      gap="$3"
      data-testid={testID}
      {...props}
    >
      {/* Icon container */}
      <YStack
        width={40}
        height={40}
        borderRadius="$3"
        backgroundColor={colors.backgroundColor}
        borderWidth={1}
        borderColor={colors.borderColor}
        alignItems="center"
        justifyContent="center"
        data-testid="achievement-icon-container"
      >
        <Text fontSize="$5">{icon}</Text>
      </YStack>

      {/* Content */}
      <YStack
        flex={1}
        gap="$1"
      >
        <Text
          fontSize="$3"
          fontWeight="500"
          color="$color12"
        >
          {title}
        </Text>
        <Text
          fontSize="$2"
          color="$color11"
        >
          {date}
        </Text>
      </YStack>
    </XStack>
  )
}
