import { Button, Spinner, Text, YStack } from 'tamagui'

export interface StateDisplayProps {
  /**
   * Type of state to display
   */
  type: 'loading' | 'empty' | 'error'

  /**
   * Main message/title to display
   */
  title: string

  /**
   * Optional description text
   */
  description?: string

  /**
   * Optional icon/emoji to display (for empty and error states)
   */
  icon?: string

  /**
   * Optional retry handler (for error state)
   */
  onRetry?: () => void

  /**
   * Custom test ID
   */
  testID?: string

  /**
   * Additional props to pass to the container
   */
  containerProps?: Record<string, any>
}

/**
 * Reusable component for displaying loading, empty, and error states
 *
 * Provides consistent styling and behavior across the app for common state scenarios.
 *
 * @example
 * ```tsx
 * // Loading state
 * <StateDisplay
 *   type="loading"
 *   title="Loading insights..."
 * />
 *
 * // Empty state
 * <StateDisplay
 *   type="empty"
 *   title="No data available yet"
 *   description="Complete workouts to see insights about your performance."
 *   icon="📊"
 * />
 *
 * // Error state
 * <StateDisplay
 *   type="error"
 *   title="Failed to load insights"
 *   description="Please try again later or pull to refresh."
 *   onRetry={handleRetry}
 * />
 * ```
 */
export function StateDisplay({
  type,
  title,
  description,
  icon,
  onRetry,
  testID = 'state-display',
  containerProps = {},
}: StateDisplayProps) {
  const isError = type === 'error'
  const isLoading = type === 'loading'

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
      testID={testID}
      {...containerProps}
    >
      {/* Icon (for empty and error states) */}
      {!isLoading && icon && (
        <Text
          fontSize="$8"
          textAlign="center"
          color="$color11"
          testID={`${testID}-icon`}
        >
          {icon}
        </Text>
      )}

      {/* Spinner (for loading state) */}
      {isLoading && (
        <YStack
          alignItems="center"
          gap="$4"
          testID={`${testID}-spinner`}
        >
          {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
          <Spinner
            size="small"
            color="$color12"
          />
        </YStack>
      )}

      {/* Title - commented out for loading state */}
      {!isLoading && (
        <YStack
          paddingHorizontal="$4"
          maxWidth="90%"
          width="100%"
          alignItems="center"
        >
          <Text
            fontSize="$5"
            fontWeight="500"
            textAlign="center"
            color="$color12"
            testID={`${testID}-title`}
          >
            {title}
          </Text>
        </YStack>
      )}

      {/* Description - commented out for loading state */}
      {!isLoading && description && (
        <Text
          fontSize="$3"
          textAlign="center"
          color="$color11"
          maxWidth={300}
          testID={`${testID}-description`}
        >
          {description}
        </Text>
      )}

      {/* Retry Button (for error state) */}
      {isError && onRetry && (
        <Button
          size="$3"
          onPress={onRetry}
          backgroundColor="$color5"
          color="$color12"
          animation="quick"
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          testID={`${testID}-retry-button`}
          marginTop="$2"
        >
          <Text>Retry</Text>
        </Button>
      )}
    </YStack>
  )
}
