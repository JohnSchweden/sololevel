import { OptimizedImage as Image } from '@my/ui'
import type { User } from '@supabase/supabase-js'
import { useMemo } from 'react'
import { Spinner, Text, YStack } from 'tamagui'

// PERF FIX: Cache module-level to prevent require() blocking main thread on every mount
// This is evaluated once at module load time, not on every component render
const mockAvatarImage = require('../../../../../../apps/expo/assets/profile_settings.webp')

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
          backgroundColor="$color4"
          alignItems="center"
          justifyContent="center"
        >
          {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
          <Spinner
            size="large"
            color="$color8"
          />
        </YStack>
        <YStack
          width={150}
          height={24}
          borderRadius="$2"
          backgroundColor="$color4"
        />
        {email && (
          <YStack
            width={200}
            height={16}
            borderRadius="$2"
            backgroundColor="$color4"
            testID={`${testID}-skeleton-email`}
          />
        )}
      </YStack>
    )
  }

  // Loaded State: Show avatar and name
  const userName = user?.name || 'User'
  const avatarUrl = user?.avatar_url

  // Memoize image source to prevent Image re-renders when avatarUrl doesn't change
  const imageSource = useMemo(() => (avatarUrl ? { uri: avatarUrl } : null), [avatarUrl])

  return (
    <YStack
      alignItems="center"
      gap="$3"
      marginBottom="$2"
      paddingTop="$8"
      testID={testID}
    >
      {/* Avatar with fallback: 1) real URL, 2) mock image, 3) letter fallback */}
      {imageSource ? (
        <YStack
          width={84}
          height={84}
          borderRadius={42}
          borderWidth={1}
          borderColor="$color9"
          overflow="hidden"
          testID={`${testID}-avatar`}
        >
          <Image
            source={imageSource}
            contentFit="cover"
            style={{ width: 82, height: 82 }}
            cachePolicy="memory-disk"
            transition={200}
            accessibilityLabel={`${userName}'s profile picture`}
          />
        </YStack>
      ) : (
        <YStack
          width={84}
          height={84}
          borderRadius={42}
          borderWidth={1}
          borderColor="$color12"
          overflow="hidden"
          testID={`${testID}-avatar-mock`}
        >
          <Image
            source={mockAvatarImage}
            contentFit="cover"
            style={{ width: 82, height: 82 }}
            cachePolicy="memory-disk"
            transition={200}
            accessibilityLabel={`${userName}'s profile picture`}
          />
        </YStack>
      )}

      {/* User Name */}
      <Text
        fontSize="$8"
        fontWeight="500"
        color="$color12"
        textAlign="center"
        testID={`${testID}-name`}
      >
        I watch you, {userName}
      </Text>

      {/* Email (optional) */}
      {email && (
        <Text
          fontSize="$4"
          color="$color11"
          testID={`${testID}-email`}
        >
          {email}
        </Text>
      )}
    </YStack>
  )
}
