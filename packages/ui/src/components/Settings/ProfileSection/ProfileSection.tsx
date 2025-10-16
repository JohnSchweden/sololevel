import type { User } from '@supabase/supabase-js'
import { Image, Spinner, Text, YStack } from 'tamagui'

// Import mock avatar image as fallback
const mockAvatarImage = require('../../../../../../apps/expo/assets/profile.png')

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
   * Optional email to display below name
   */
  email?: string

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
 * Displays user avatar, name, and optional email with loading skeleton state.
 * Mobile-first responsive design with 44px touch targets.
 *
 * @example
 * ```tsx
 * <ProfileSection
 *   user={{ id: '123', name: 'User Name', avatar_url: 'https://...' }}
 *   email="user@example.com"
 *   isLoading={false}
 * />
 * ```
 */
export function ProfileSection({
  user,
  isLoading,
  email,
  onAvatarPress: _onAvatarPress, // P1 feature: avatar press handler
  testID = 'profile-section',
}: ProfileSectionProps): React.ReactElement {
  // Loading State: Show skeleton
  if (isLoading) {
    return (
      <YStack
        alignItems="center"
        gap="$3"
        marginBottom="$2"
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
        {email && (
          <YStack
            width={200}
            height={16}
            borderRadius="$2"
            backgroundColor="$gray4"
            testID={`${testID}-skeleton-email`}
          />
        )}
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
      marginBottom="$2"
      paddingTop="$8"
      testID={testID}
    >
      {/* Avatar with fallback: 1) real URL, 2) mock image, 3) letter fallback */}
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          width={84}
          height={84}
          borderRadius={42} // Half of width for perfect circle
          borderWidth={1}
          borderColor="$primary"
          testID={`${testID}-avatar`}
          accessibilityLabel={`${userName}'s profile picture`}
        />
      ) : (
        <Image
          source={mockAvatarImage}
          width={84}
          height={84}
          borderRadius={42}
          borderWidth={1}
          borderColor="$primary"
          testID={`${testID}-avatar-mock`}
          accessibilityLabel={`${userName}'s profile picture`}
        />
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

      {/* Email (optional) */}
      {email && (
        <Text
          fontSize="$4"
          color="$textSecondary"
          testID={`${testID}-email`}
        >
          {email}
        </Text>
      )}
    </YStack>
  )
}
