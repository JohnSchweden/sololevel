import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from '@tamagui/linear-gradient'
import React, { useMemo } from 'react'
import { Platform } from 'react-native'
import { YStack } from 'tamagui'
import { BlurView } from '../BlurView/BlurView'

/**
 * Native Bottom Navigation Container
 *
 * Platform-specific implementation:
 * - iOS: Uses BlurView with MaskedView for native blur effect with gradient mask
 * - Android: Uses LinearGradient background (BlurView causes flickering when content above changes)
 */
export function BottomNavigationContainer({
  children,
  disableBlur = false,
  bottomOffset = 0,
}: {
  children: React.ReactNode
  disableBlur?: boolean
  bottomOffset?: number
}) {
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()

  // Reduce bottom inset to minimize spacing (subtract 12px, minimum 0)
  const bottomInset = useMemo(() => Math.max(0, insets.bottom - 12), [insets.bottom])

  // Platform-specific height: Android uses 52px, iOS uses 52px
  const containerHeight = useMemo(
    () => (Platform.OS === 'android' ? 52 : 52) + bottomInset,
    [bottomInset]
  )

  // Memoize background style to prevent re-creation on every render
  const backgroundStyle = useMemo(
    () => ({
      flex: 1 as const,
      paddingBottom: bottomInset,
      paddingHorizontal: 16, // equivalent to $4
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    }),
    [bottomInset]
  )

  // PERF FIX: Memoize inline styles to prevent re-creation on every render
  const maskedViewStyle = useMemo(() => ({ flex: 1 as const }), [])
  const linearGradientStyle = useMemo(() => ({ flex: 1 as const }), [])

  // iOS: Use MaskedView + BlurView (works correctly)
  // Android: Use LinearGradient background (BlurView causes flickering when content above changes)
  const blurContent = disableBlur ? null : Platform.OS === 'ios' ? (
    <MaskedView
      style={maskedViewStyle}
      maskElement={
        <LinearGradient
          colors={['transparent', '$color1']} // mask from visible → blurred
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={linearGradientStyle}
        />
      }
    >
      <BlurView
        intensity={30}
        tint="dark"
        style={backgroundStyle}
      />
    </MaskedView>
  ) : (
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.9)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={backgroundStyle}
    />
  )

  return (
    <YStack
      position="absolute"
      bottom={bottomOffset}
      left={0}
      right={0}
      height={containerHeight}
      zIndex={10}
      backgroundColor={disableBlur ? 'transparent' : undefined}
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
