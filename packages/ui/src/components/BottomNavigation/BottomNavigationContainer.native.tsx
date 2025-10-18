import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from '@tamagui/linear-gradient'
import { BlurView } from 'expo-blur'
import React from 'react'
import { YStack } from 'tamagui'

// Platform-agnostic safe area hook for bottom navigation
const useSafeAreaInsets = () => {
  // Default safe area values for cross-platform compatibility
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
}

/**
 * Native Bottom Navigation Container
 * Uses BlurView with MaskedView for native blur effect with gradient mask
 */
export function BottomNavigationContainer({
  children,
}: {
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={72 + insets.bottom}
      zIndex={10}
    >
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
          intensity={50}
          tint="dark"
          style={{
            flex: 1,
            paddingBottom: insets.bottom,
            paddingHorizontal: 16, // equivalent to $4
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        />
      </MaskedView>
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        paddingBottom={insets.bottom}
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
