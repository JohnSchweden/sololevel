import { TrendingDown, TrendingUp } from '@tamagui/lucide-icons'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Text, XStack, YStack } from 'tamagui'

export interface StatCardProps {
  /**
   * Stat value to display (string or number)
   */
  value: string | number

  /**
   * Label describing the stat
   */
  label: string

  /**
   * Optional custom icon element
   */
  icon?: ReactNode

  /**
   * Optional trend indicator (up/down)
   */
  trend?: 'up' | 'down'

  /**
   * Layout variant
   * @default 'center'
   */
  variant?: 'center' | 'left'

  /**
   * Test ID for testing
   * @default 'stat-card'
   */
  testID?: string
}

/**
 * StatCard Component
 *
 * Displays a numeric stat with label and optional trend indicator.
 * Used in insights and dashboard views.
 *
 * @example
 * ```tsx
 * <StatCard
 *   value={127}
 *   label="Total Sessions"
 * />
 * ```
 *
 * @example With trend indicator
 * ```tsx
 * <StatCard
 *   value="23%"
 *   label="Improvement"
 *   trend="up"
 * />
 * ```
 */
export function StatCard({
  value,
  label,
  icon,
  trend,
  variant = 'center',
  testID = 'stat-card',
}: StatCardProps): React.ReactElement {
  // Memoize trend icon to prevent recalculation on every render
  const TrendIcon = useMemo(
    () => (trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null),
    [trend]
  )

  return (
    <YStack
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      alignItems={variant === 'center' ? 'center' : 'flex-start'}
      gap="$1"
      data-testid={testID}
    >
      {/* Value row with optional icon/trend */}
      <XStack
        alignItems="center"
        gap="$2"
      >
        <Text
          fontSize="$8"
          fontWeight="500"
          color="$color12"
        >
          {value}
        </Text>
        {icon}
        {TrendIcon && (
          <TrendIcon
            size={20}
            color="$green10"
          />
        )}
      </XStack>

      {/* Label - supports multiline with center alignment */}
      <YStack
        alignItems={variant === 'center' ? 'center' : 'flex-start'}
        gap="$0.5"
      >
        {label.split('\n').map((line, index) => (
          <Text
            key={index}
            fontSize="$3"
            color="$color11"
            textAlign={variant === 'center' ? 'center' : 'left'}
          >
            {line}
          </Text>
        ))}
      </YStack>
    </YStack>
  )
}
