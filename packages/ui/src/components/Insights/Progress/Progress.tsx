import { YStack, type YStackProps } from 'tamagui'

export interface ProgressProps extends Omit<YStackProps, 'children'> {
  /**
   * Current progress value
   */
  value: number

  /**
   * Maximum value
   * @default 100
   */
  max?: number

  /**
   * Size variant
   * @default 'sm'
   */
  size?: 'sm' | 'md'

  /**
   * Test ID for testing
   * @default 'progress'
   */
  testID?: string
}

/**
 * Progress Component
 *
 * A progress bar indicator showing completion percentage.
 * Used in insights, goals, and tracking views.
 *
 * @example
 * ```tsx
 * <Progress value={75} />
 * ```
 *
 * @example With custom max
 * ```tsx
 * <Progress value={25} max={50} />
 * ```
 */
export function Progress({
  value,
  max = 100,
  size = 'sm',
  testID = 'progress',
  ...props
}: ProgressProps): React.ReactElement {
  // Calculate percentage
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  // Height based on size
  const height = size === 'sm' ? '$1' : '$2'

  return (
    <YStack
      width="100%"
      height={height}
      backgroundColor="$color4"
      borderRadius="$2"
      overflow="hidden"
      position="relative"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      data-testid={testID}
      {...props}
    >
      {/* Progress fill */}
      <YStack
        position="absolute"
        top={0}
        left={0}
        height="100%"
        width={`${percentage}%`}
        backgroundColor="$color9"
        data-testid={`${testID}-fill`}
        animation="quick"
      />
    </YStack>
  )
}
