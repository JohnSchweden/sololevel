import { BlurView } from 'expo-blur'
import type { ComponentProps, ReactNode } from 'react'
import { ImageBackground } from 'react-native'
import type { AccessibilityRole } from 'react-native'
import { Button, XStack, type XStackProps } from 'tamagui'

// Import glass overlay asset
const defaultGlassOverlay = require('../../../../../apps/expo/assets/glass-button.png')

export type GlassButtonProps = {
  /** Button content */
  children?: ReactNode
  /** Icon element to display */
  icon?: ReactNode
  /** Press handler */
  onPress?: () => void
  /** Disabled state */
  disabled?: boolean
  /** Test ID for testing */
  testID?: string
  /** Accessibility label */
  accessibilityLabel?: string
  /** Accessibility hint */
  accessibilityHint?: string
  /** Accessibility role */
  accessibilityRole?: AccessibilityRole
  /** Accessibility state (for toggle buttons) */
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean }
  /** Blur intensity (1-100, default 80) */
  blurIntensity?: number
  /** Blur tint ('light' | 'dark' | 'default', default 'dark') */
  blurTint?: ComponentProps<typeof BlurView>['tint']
  /** Minimum width (number only) */
  minWidth?: number
  /** Minimum height (number only) */
  minHeight?: number
  /** Border radius token */
  borderRadius?: XStackProps['borderRadius']
  /** Opacity */
  opacity?: number
  /** Glass overlay image source (optional, defaults to built-in overlay) */
  glassOverlaySource?: any
  /** Border width */
  borderWidth?: number
  /** Border color */
  borderColor?: XStackProps['borderColor']
  /** Background color override */
  backgroundColor?: XStackProps['backgroundColor']
}

/**
 * GlassButton - A button with glassmorphism effect using expo-blur
 *
 * @example
 * ```tsx
 * <GlassButton
 *   icon={<Upload size="$1.5" color="white" />}
 *   onPress={handlePress}
 *   accessibilityLabel="Upload video"
 * />
 * ```
 */
export const GlassButton = ({
  children,
  icon,
  onPress,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  blurIntensity = 20,
  blurTint = 'light',
  minWidth = 52,
  minHeight = 52,
  borderRadius = '$12',
  opacity = 1,
  glassOverlaySource = defaultGlassOverlay,
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.2)',
  backgroundColor = 'rgba(255, 255, 255, 0.05)',
}: GlassButtonProps) => {
  // Convert borderRadius token to number for BlurView
  const numericRadius = typeof borderRadius === 'string' ? 24 : Number(borderRadius) || 24

  return (
    <XStack
      position="relative"
      borderRadius={borderRadius}
      overflow="hidden"
      opacity={disabled ? 1 : opacity}
    >
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={{
          borderRadius: numericRadius,
          overflow: 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <ImageBackground
        source={glassOverlaySource}
        style={{
          borderRadius: numericRadius,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 1,
        }}
        resizeMode="cover"
      />
      <Button
        testID={testID}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        unstyled
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="$2"
        minWidth={minWidth}
        minHeight={minHeight}
        borderRadius={borderRadius}
        borderWidth={borderWidth}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        pressStyle={
          disabled
            ? undefined
            : {
                scale: 0.96,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
        }
        hoverStyle={
          disabled
            ? undefined
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
              }
        }
        cursor={disabled ? 'not-allowed' : 'pointer'}
        paddingHorizontal="$3"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {icon}
        {children}
      </Button>
    </XStack>
  )
}
