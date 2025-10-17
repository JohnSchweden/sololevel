import { Spinner, Text, YStack } from 'tamagui'
import { GlassButton } from '../../GlassButton/GlassButton'

export interface LogOutButtonProps {
  /**
   * Callback when button is pressed
   */
  onPress: () => void

  /**
   * Loading state (shows spinner, disables interaction)
   */
  isLoading: boolean

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * LogOutButton Component
 *
 * Destructive action button for logging out.
 * Shows spinner during logout process and prevents interaction.
 * Follows mobile-first design with 44px touch target.
 *
 * @example
 * ```tsx
 * <LogOutButton
 *   onPress={handleLogout}
 *   isLoading={isLoggingOut}
 * />
 * ```
 */
export function LogOutButton({
  onPress,
  isLoading,
  testID = 'log-out-button',
}: LogOutButtonProps): React.ReactElement {
  return (
    <YStack
      position="absolute"
      bottom={50}
      left={36}
      right={36}
      paddingHorizontal="$4"
      testID={`${testID}-container`}
      alignItems="stretch"
    >
      <GlassButton
        onPress={onPress}
        disabled={isLoading}
        testID={testID}
        accessibilityLabel="Log out"
        minHeight={44}
        minWidth="100%"
        borderRadius="$4"
        borderWidth={1.1}
        borderColor="$color12"
        blurIntensity={0}
        blurTint="light"
        variant="variant2"
        overlayOpacity={0.2}
      >
        {isLoading ? (
          // @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web)
          <Spinner
            size="small"
            color="$red10"
            testID={`${testID}-spinner`}
          />
        ) : (
          <Text
            fontSize="$3"
            fontWeight="400"
            color="$color12"
            testID={`${testID}-text`}
          >
            Log out
          </Text>
        )}
      </GlassButton>
    </YStack>
  )
}
