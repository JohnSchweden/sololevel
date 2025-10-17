import { TrendingDown, TrendingUp } from '@tamagui/lucide-icons'
import type { ReactNode } from 'react'
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
  // Render trend icon based on trend prop
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null

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
            size={16}
            color="$green10"
          />
        )}
      </XStack>

      {/* Label */}
      <Text
        fontSize="$3"
        color="$color11"
      >
        {label}
      </Text>
    </YStack>
  )
}
