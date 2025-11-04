import { useMemo } from 'react'
import { Text, XStack, YStack, type YStackProps } from 'tamagui'
import { Badge } from '../Badge'
import { Progress } from '../Progress'

export interface FocusCardProps extends Omit<YStackProps, 'children'> {
  /**
   * Focus area/goal title
   */
  title: string

  /**
   * Progress percentage (0-100)
   */
  progress: number

  /**
   * Priority level
   */
  priority: 'high' | 'medium' | 'low'

  /**
   * Test ID for testing
   * @default 'focus-card'
   */
  testID?: string
}

/**
 * FocusCard Component
 *
 * Displays a focus area or goal with progress and priority indicator.
 * Used in insights and goal tracking views.
 *
 * @example
 * ```tsx
 * <FocusCard
 *   title="Perfect Squat Form"
 *   progress={78}
 *   priority="high"
 * />
 * ```
 */
export function FocusCard({
  title,
  progress,
  priority,
  testID = 'focus-card',
  ...props
}: FocusCardProps): React.ReactElement {
  // Memoize badge variant calculation to prevent recalculation on every render
  const badgeVariant = useMemo(
    () => (priority === 'high' ? 'primary' : priority === 'medium' ? 'secondary' : 'destructive'),
    [priority]
  )

  return (
    <YStack
      padding="$4"
      backgroundColor="$backgroundHover"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$2"
      data-testid={testID}
      {...props}
    >
      {/* Header: Title and Priority Badge */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$1"
      >
        <Text
          fontSize="$3"
          color="$color12"
        >
          {title}
        </Text>
        <Badge variant={badgeVariant}>{priority}</Badge>
      </XStack>

      {/* Progress Bar */}
      <Progress
        value={progress}
        size="md"
        testID="focus-progress"
      />
    </YStack>
  )
}
