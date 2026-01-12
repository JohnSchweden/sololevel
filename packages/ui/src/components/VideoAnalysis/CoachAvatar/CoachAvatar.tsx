import { OptimizedImage as Image } from '@my/ui'
import { useMemo } from 'react'
import { Platform } from 'react-native'
import { BlurView } from '../../BlurView/BlurView'

import { View, YStack } from 'tamagui'
import { AVATAR_ASSETS, type AvatarAssetKey, DEFAULT_AVATAR_KEY } from '../../../assets/avatars'

export interface CoachAvatarProps {
  size?: number
  isSpeaking?: boolean
  testID?: string
  position?: 'absolute' | 'relative' | 'static'
  bottom?: number
  right?: number
  zIndex?: number
  avatarAssetKey?: AvatarAssetKey
}

/**
 * CoachAvatar - Avatar component
 *
 * Simple static component. Parent handles animation via Reanimated.View
 * (no conflicting animation systems).
 */
export function CoachAvatar({
  size = 90,
  isSpeaking = false,
  testID = 'coach-avatar',
  position = 'absolute',
  bottom = 70,
  right = 20,
  zIndex = 0,
  avatarAssetKey,
}: CoachAvatarProps) {
  // Memoize style object to prevent recreation on every render
  const avatarStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [size]
  )

  const avatarSource = AVATAR_ASSETS[avatarAssetKey ?? DEFAULT_AVATAR_KEY]

  return (
    <View
      position={position}
      bottom={bottom}
      right={right}
      zIndex={zIndex}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={15}
          style={avatarStyle}
        >
          <View
            width={size}
            height={size}
            borderRadius={size / 2}
            alignItems="center"
            justifyContent="center"
            testID={testID}
            accessibilityLabel="AI Coach Avatar"
            accessibilityRole="image"
            data-testid={isSpeaking ? 'coach-avatar-speaking' : 'coach-avatar-idle'}
          >
            <Image
              source={avatarSource}
              contentFit="cover"
              style={{
                width: size * 1.15,
                height: size * 1.15,
                marginTop: -9,
              }}
              cachePolicy="memory-disk"
              transition={200}
              testID="coach-avatar-image"
            />
          </View>
        </BlurView>
      ) : (
        <YStack
          backgroundColor="rgba(0, 0, 0, 0.5)"
          style={avatarStyle}
        >
          <View
            width={size}
            height={size}
            borderRadius={size / 2}
            alignItems="center"
            justifyContent="center"
            testID={testID}
            accessibilityLabel="AI Coach Avatar"
            accessibilityRole="image"
            data-testid={isSpeaking ? 'coach-avatar-speaking' : 'coach-avatar-idle'}
          >
            <Image
              source={avatarSource}
              contentFit="cover"
              style={{
                width: size * 1.15,
                height: size * 1.15,
                marginTop: -9,
              }}
              cachePolicy="memory-disk"
              transition={200}
              testID="coach-avatar-image"
            />
          </View>
        </YStack>
      )}
    </View>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(CoachAvatar as any).whyDidYouRender = true
}
