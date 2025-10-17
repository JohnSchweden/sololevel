import type { ReactNode } from 'react'
import { Text, XStack, type XStackProps } from 'tamagui'

export interface BadgeProps extends Omit<XStackProps, 'children'> {
  /**
   * Badge content (text or elements)
   */
  children: ReactNode

  /**
   * Visual variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'destructive'

  /**
   * Test ID for testing
   * @default 'badge'
   */
  testID?: string
}

/**
 * Badge Component
 *
 * A small badge indicator for status, priority, or categories.
 * Used in insights, goals, and content labeling.
 *
 * @example
 * ```tsx
 * <Badge variant="primary">High</Badge>
 * ```
 *
 * @example Secondary variant
 * ```tsx
 * <Badge variant="secondary">Medium</Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'primary',
  testID = 'badge',
  ...props
}: BadgeProps): React.ReactElement {
  // Variant colors based on design spec
  const colors = {
    primary: {
      backgroundColor: '$red4' as const,
      color: '$red11' as const,
    },
    secondary: {
      backgroundColor: '$color4' as const,
      color: '$color11' as const,
    },
    destructive: {
      backgroundColor: '$blue4' as const,
      color: '$blue11' as const,
    },
  } as const

  const variantColors = colors[variant]

  return (
    <XStack
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$1"
      alignItems="center"
      justifyContent="center"
      backgroundColor={variantColors.backgroundColor}
      data-testid={testID}
      {...props}
    >
      <Text
        fontSize="$2"
        color={variantColors.color}
        fontWeight="500"
      >
        {children}
      </Text>
    </XStack>
  )
}
