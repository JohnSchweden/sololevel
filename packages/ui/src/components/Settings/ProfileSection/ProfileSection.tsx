import type { User } from '@supabase/supabase-js'
import { Image, Spinner, Text, YStack } from 'tamagui'

export interface ProfileSectionProps {
  /**
   * User data with name and avatar
   */
  user: (Pick<User, 'id'> & { name?: string; avatar_url?: string | null }) | null

  /**
   * Loading state for skeleton display
   */
  isLoading: boolean

  /**
   * Optional callback when avatar is pressed (P1 feature)
   */
  onAvatarPress?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * ProfileSection Component
 *
 * Displays user avatar and name with loading skeleton state.
 * Mobile-first responsive design with 44px touch targets.
 *
 * @example
 * ```tsx
 * <ProfileSection
 *   user={{ id: '123', name: 'User Name', avatar_url: 'https://...' }}
 *   isLoading={false}
 * />
 * ```
 */
export function ProfileSection({
  user,
  isLoading,
  onAvatarPress: _onAvatarPress, // P1 feature: avatar press handler
  testID = 'profile-section',
}: ProfileSectionProps): React.ReactElement {
  // Loading State: Show skeleton
  if (isLoading) {
    return (
      <YStack
        alignItems="center"
        gap="$3"
        marginBottom="$6"
        testID={`${testID}-skeleton`}
      >
        <YStack
          width={100}
          height={100}
          borderRadius="$12"
          backgroundColor="$gray4"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner
            size="large"
            color="$gray8"
          />
        </YStack>
        <YStack
          width={150}
          height={24}
          borderRadius="$2"
          backgroundColor="$gray4"
        />
      </YStack>
    )
  }

  // Loaded State: Show avatar and name
  const userName = user?.name || 'User'
  const avatarUrl = user?.avatar_url

  return (
    <YStack
      alignItems="center"
      gap="$3"
      marginBottom="$8"
      paddingTop="$8"
      testID={testID}
    >
      {/* Avatar with fallback */}
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          width={84}
          height={84}
          borderRadius={50} // Half of width for perfect circle
          borderWidth={2}
          borderColor="$primary"
          testID={`${testID}-avatar`}
          accessibilityLabel={`${userName}'s profile picture`}
        />
      ) : (
        <YStack
          width={84}
          height={84}
          marginBottom="$4"
          borderRadius="$12"
          backgroundColor="$gray3"
          borderWidth={2}
          borderColor="$primary"
          alignItems="center"
          justifyContent="center"
          testID={`${testID}-avatar-fallback`}
        >
          <Text
            fontSize="$8"
            fontWeight="600"
            color="$gray10"
          >
            {userName.charAt(0).toUpperCase()}
          </Text>
        </YStack>
      )}

      {/* User Name */}
      <Text
        fontSize="$8"
        fontWeight="500"
        color="$color12"
        testID={`${testID}-name`}
      >
        {userName}
      </Text>
    </YStack>
  )
}
