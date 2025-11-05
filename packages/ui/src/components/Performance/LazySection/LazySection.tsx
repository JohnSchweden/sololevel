import { YStack, type YStackProps } from 'tamagui'

export interface LazySectionProps extends Omit<YStackProps, 'children'> {
  /**
   * Children to render when section is visible
   */
  children: React.ReactNode

  /**
   * Whether section should render content immediately
   * @default false
   */
  isVisible?: boolean

  /**
   * Height of placeholder when section is not visible
   * Prevents layout shift when section becomes visible
   * @default 100
   */
  placeholderHeight?: number

  /**
   * Test ID for testing
   * @default 'lazy-section'
   */
  testID?: string
}

/**
 * LazySection Component
 *
 * Lazy loads content to improve initial render performance.
 * Renders a placeholder when not visible, then renders actual content when visible.
 *
 * Used to defer rendering of expensive sections until they're about to enter viewport.
 *
 * @example
 * ```tsx
 * <LazySection isVisible={shouldRender}>
 *   <ExpensiveSection />
 * </LazySection>
 * ```
 */
export function LazySection({
  children,
  isVisible = false,
  placeholderHeight = 100,
  testID = 'lazy-section',
  ...props
}: LazySectionProps): React.ReactElement {
  // Only render children when visible
  if (!isVisible) {
    return (
      <YStack
        height={placeholderHeight}
        data-testid={`${testID}-placeholder`}
      />
    )
  }

  return (
    <YStack
      data-testid={`${testID}-content`}
      {...props}
    >
      {children}
    </YStack>
  )
}
