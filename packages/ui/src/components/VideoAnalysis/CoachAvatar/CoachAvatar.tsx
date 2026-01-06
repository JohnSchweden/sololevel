import { OptimizedImage as Image } from '@my/ui'
import { Platform } from 'react-native'
import { BlurView } from '../../BlurView/BlurView'

import { View, YStack } from 'tamagui'

export interface CoachAvatarProps {
  size?: number
  isSpeaking?: boolean
  testID?: string
  position?: 'absolute' | 'relative' | 'static'
  bottom?: number
  right?: number
  zIndex?: number
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
}: CoachAvatarProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

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
              source={require('../../../../../../apps/expo/assets/coach_avatar_dark.webp')}
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
              source={require('../../../../../../apps/expo/assets/coach_avatar.png')}
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
