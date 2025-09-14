import { Camera, Loader2, RotateCcw } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { Animated, Platform } from 'react-native'
import { Button, Circle, Paragraph, XStack, YStack, styled } from 'tamagui'

/**
 * Camera Swap Button Component for Phase 2 Completion
 * Provides visual feedback for camera switching with animations
 * Integrates with useEnhancedCameraSwap hook
 */

export interface CameraSwapButtonProps {
  currentCamera: 'front' | 'back'
  isSwapping: boolean
  canSwap: boolean
  onSwap: () => void
  swapError?: string | null
  size?: 'small' | 'medium' | 'large'
  variant?: 'minimal' | 'detailed' | 'floating'
  showLabel?: boolean
  disabled?: boolean
  fadeAnim?: Animated.Value
  scaleAnim?: Animated.Value
}

const SwapButtonContainer = styled(Button, {
  borderRadius: '$6',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$backgroundTransparent',
  borderWidth: 2,
  borderColor: '$borderColor',

  variants: {
    size: {
      small: {
        size: 40,
        padding: '$2',
      },
      medium: {
        size: 56,
        padding: '$3',
      },
      large: {
        size: 72,
        padding: '$4',
      },
    },

    variant: {
      minimal: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      detailed: {
        backgroundColor: '$background',
        borderColor: '$borderColor',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      floating: {
        backgroundColor: '$backgroundStrong',
        borderColor: '$borderColorHover',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      },
    },

    state: {
      idle: {
        borderColor: '$borderColor',
      },
      swapping: {
        borderColor: '$blue6',
        backgroundColor: '$blue2',
      },
      error: {
        borderColor: '$red6',
        backgroundColor: '$red2',
      },
      disabled: {
        opacity: 0.5,
        borderColor: '$gray6',
      },
    },
  } as const,
})

const CameraIcon = styled(Circle, {
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$blue6',

  variants: {
    size: {
      small: {
        size: 24,
      },
      medium: {
        size: 32,
      },
      large: {
        size: 40,
      },
    },

    camera: {
      front: {
        backgroundColor: '$green6',
      },
      back: {
        backgroundColor: '$blue6',
      },
    },
  } as const,
})

const SwapIndicator = styled(Circle, {
  position: 'absolute',
  top: -4,
  right: -4,
  size: 16,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$orange6',
  borderWidth: 2,
  borderColor: '$background',
})

/**
 * Camera Swap Button Component
 */
export const CameraSwapButton = ({
  currentCamera,
  isSwapping,
  canSwap,
  onSwap,
  swapError,
  size = 'medium',
  variant = 'detailed',
  showLabel = false,
  disabled = false,
  fadeAnim,
  scaleAnim,
}: CameraSwapButtonProps) => {
  const [rotateAnim] = useState(new Animated.Value(0))
  const [pulseAnim] = useState(new Animated.Value(1))

  // Rotation animation for swap indication
  useEffect(() => {
    if (isSwapping) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        })
      )
      rotation.start()

      return () => rotation.stop()
    } else {
      rotateAnim.setValue(0)
      return undefined
    }
  }, [isSwapping, rotateAnim])

  // Pulse animation for error state
  useEffect(() => {
    if (swapError) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
      pulse.start()
      return undefined
    }
    return undefined
  }, [swapError, pulseAnim])

  const getButtonState = () => {
    if (disabled || !canSwap) return 'disabled'
    if (swapError) return 'error'
    if (isSwapping) return 'swapping'
    return 'idle'
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16
      case 'medium':
        return 20
      default: // large
        return 24
    }
  }

  const getCameraLabel = () => {
    return currentCamera === 'front' ? 'Front Camera' : 'Back Camera'
  }

  const getNextCameraLabel = () => {
    return currentCamera === 'front' ? 'Switch to Back' : 'Switch to Front'
  }

  // Combine external animations with internal ones
  const combinedAnimatedStyle = {
    opacity: fadeAnim || 1,
    transform: [
      { scale: scaleAnim || pulseAnim },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  }

  return (
    <YStack
      alignItems="center"
      gap="$2"
    >
      <Animated.View style={combinedAnimatedStyle}>
        <SwapButtonContainer
          size={size}
          variant={variant}
          state={getButtonState()}
          onPress={onSwap}
          disabled={disabled || !canSwap || isSwapping}
          accessibilityLabel={getNextCameraLabel()}
          accessibilityHint={`Currently using ${getCameraLabel().toLowerCase()}`}
        >
          <XStack
            alignItems="center"
            gap="$2"
          >
            {/* Camera Icon */}
            <CameraIcon
              size={size}
              camera={currentCamera}
            >
              <Camera
                size={getIconSize()}
                color="white"
              />
            </CameraIcon>

            {/* Swap Indicator */}
            {isSwapping ? (
              <SwapIndicator>
                <Loader2
                  size={10}
                  color="white"
                />
              </SwapIndicator>
            ) : (
              <SwapIndicator>
                <RotateCcw
                  size={10}
                  color="white"
                />
              </SwapIndicator>
            )}
          </XStack>
        </SwapButtonContainer>
      </Animated.View>

      {/* Label */}
      {showLabel && (
        <YStack
          alignItems="center"
          gap="$1"
        >
          <Paragraph
            fontSize={size === 'small' ? '$1' : '$2'}
            fontWeight="600"
            color="$color"
            textAlign="center"
          >
            {getCameraLabel()}
          </Paragraph>

          {swapError && (
            <Paragraph
              fontSize="$1"
              color="$red10"
              textAlign="center"
              maxWidth={120}
            >
              {swapError}
            </Paragraph>
          )}

          {isSwapping && (
            <Paragraph
              fontSize="$1"
              color="$blue10"
              textAlign="center"
            >
              Switching...
            </Paragraph>
          )}
        </YStack>
      )}
    </YStack>
  )
}

/**
 * Compact Camera Swap Button for minimal UI space
 */
export const CompactCameraSwapButton = ({
  currentCamera,
  isSwapping,
  canSwap,
  onSwap,
}: Pick<CameraSwapButtonProps, 'currentCamera' | 'isSwapping' | 'canSwap' | 'onSwap'>) => {
  return (
    <CameraSwapButton
      currentCamera={currentCamera}
      isSwapping={isSwapping}
      canSwap={canSwap}
      onSwap={onSwap}
      size="small"
      variant="minimal"
      showLabel={false}
    />
  )
}

/**
 * Floating Camera Swap Button for overlay usage
 */
export const FloatingCameraSwapButton = ({
  currentCamera,
  isSwapping,
  canSwap,
  onSwap,
  swapError,
}: Pick<
  CameraSwapButtonProps,
  'currentCamera' | 'isSwapping' | 'canSwap' | 'onSwap' | 'swapError'
>) => {
  return (
    <YStack
      position="absolute"
      top="$4"
      left="$4"
      zIndex={1000}
    >
      <CameraSwapButton
        currentCamera={currentCamera}
        isSwapping={isSwapping}
        canSwap={canSwap}
        onSwap={onSwap}
        swapError={swapError}
        size="medium"
        variant="floating"
        showLabel={false}
      />
    </YStack>
  )
}
