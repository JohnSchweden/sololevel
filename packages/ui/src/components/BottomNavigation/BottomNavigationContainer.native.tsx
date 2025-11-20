import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from '@tamagui/linear-gradient'
import React, { useMemo } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'
import { BlurView } from '../BlurView/BlurView'

/**
 * Native Bottom Navigation Container
 *
 * Platform-specific implementation:
 * - iOS: Uses BlurView with MaskedView for native blur effect with gradient mask
 * - Android: Uses BlurView with LinearGradient overlay (MaskedView doesn't work with BlurView on Android)
 */
export function BottomNavigationContainer({
  children,
}: {
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  // Platform-specific height: Android uses 52px, iOS uses 72px
  const containerHeight = useMemo(
    () => (Platform.OS === 'android' ? 52 : 22) + insets.bottom,
    [insets.bottom]
  )

  // Memoize BlurView style to prevent re-creation on every render
  // Reduced intensity from 50 to 30 for better performance (always visible component)
  const blurViewStyle = useMemo(
    () => ({
      flex: 1,
      paddingBottom: insets.bottom,
      paddingHorizontal: 16, // equivalent to $4
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    }),
    [insets.bottom]
  )

  // iOS: Use MaskedView + BlurView (works correctly)
  // Android: Use BlurView + LinearGradient overlay (MaskedView causes black screen)
  const blurContent =
    Platform.OS === 'ios' ? (
      <MaskedView
        style={{ flex: 1 }}
        maskElement={
          <LinearGradient
            colors={['transparent', '$color1']} // mask from visible → blurred
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.3 }}
            style={{ flex: 1 }}
          />
        }
      >
        <BlurView
          intensity={30}
          tint="dark"
          style={blurViewStyle}
        />
      </MaskedView>
    ) : (
      <BlurView
        intensity={30}
        tint="dark"
        style={blurViewStyle}
      />
    )

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={containerHeight}
      zIndex={10}
    >
      {blurContent}
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        //paddingBottom={insets.bottom}
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        pointerEvents="box-none"
      >
        {children}
      </YStack>
    </YStack>
  )
}
