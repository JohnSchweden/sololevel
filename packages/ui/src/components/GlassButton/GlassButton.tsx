import { BlurView } from 'expo-blur'
import { type ComponentProps, type ReactNode, useState } from 'react'
import { Button, Image, XStack, type XStackProps } from 'tamagui'

// Import glass overlay assets
const defaultGlassOverlay = require('../../../../../apps/expo/assets/glass-button.png')
const glassButtonVariant2 = require('../../../../../apps/expo/assets/glass-button-variant2.png')

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
  /** Role for accessibility (Tamagui/web-standard) */
  role?: ComponentProps<typeof Button>['role']
  /** Accessibility state (for toggle buttons) */
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean }
  /** Blur intensity (1-100, default 15) */
  blurIntensity?: number
  /** Blur tint ('light' | 'dark' | 'default', default 'light') */
  blurTint?: ComponentProps<typeof BlurView>['tint']
  /** Minimum width (number or string like "100%") */
  minWidth?: number | string
  /** Minimum height (number only) */
  minHeight?: number
  /** Width (number or string like "100%") */
  width?: XStackProps['width']
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
  /** Glass button variant ('default' | 'variant2') */
  variant?: 'default' | 'variant2'
  /** Glass overlay opacity (0-1, default 1) */
  overlayOpacity?: number
  /** Edge glow intensity (0-1, default 0.1) - adds subtle edge lighting */
  edgeGlowIntensity?: number
  /** Edge glow color (default 'rgba(255, 255, 255, 0.2)') */
  edgeGlowColor?: XStackProps['borderColor']
  /** Animation preset (always 'quick') */
  animation?: ComponentProps<typeof Button>['animation']
}

/**
 * GlassButton - A button with glassmorphism effect using expo-blur
 * Enhanced with highlight contrast, shadows, and edge glow effects
 *
 * @example
 * ```tsx
 * // Basic glass button
 * <GlassButton
 *   icon={<Upload size="$1.5" color="white" />}
 *   onPress={handlePress}
 *   accessibilityLabel="Upload video"
 * />
 *
 * // High contrast glass button with enhanced effects
 * <GlassButton
 *   icon={<Upload size="$1.5" color="white" />}
 *   onPress={handlePress}
 *   highlightContrast={0.5}
 *   shadowIntensity={0.4}
 *   edgeGlowIntensity={0.2}
 *   accessibilityLabel="Upload video"
 * />
 *
 * // Custom highlight colors
 * <GlassButton
 *   icon={<Upload size="$1.5" color="white" />}
 *   onPress={handlePress}
 *   highlightColor="rgba(255, 255, 255, 0.6)"
 *   edgeGlowColor="rgba(0, 255, 255, 0.3)"
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
  role,
  accessibilityState,
  blurIntensity = 10,
  blurTint = 'light',
  minWidth = 44,
  minHeight = 44,
  width,
  borderRadius = '$12',
  opacity = 1,
  glassOverlaySource,
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.15)',
  backgroundColor = 'rgba(255, 255, 255, 0.0)',
  variant = 'default',
  overlayOpacity = 0.8,
  edgeGlowIntensity = 0.9,
  edgeGlowColor = 'rgba(255, 255, 255, 0.9)',
  animation = 'bouncy',
}: GlassButtonProps) => {
  // Convert borderRadius token to number for BlurView
  const numericRadius = typeof borderRadius === 'string' ? 32 : Number(borderRadius) || 32

  // Select glass overlay based on variant
  const overlaySource =
    glassOverlaySource || (variant === 'variant2' ? glassButtonVariant2 : defaultGlassOverlay)

  // Track press state for BlurView animation sync
  const [isPressed, setIsPressed] = useState(false)

  return (
    <XStack
      position="relative"
      borderRadius={borderRadius}
      overflow="visible"
      opacity={disabled ? 1 : opacity}
      minWidth={typeof minWidth === 'number' ? minWidth : undefined}
      minHeight={minHeight}
      width={(width || (typeof minWidth === 'string' ? minWidth : undefined)) as any}
    >
      {/* Edge glow effect */}
      {edgeGlowIntensity > 0 && (
        <XStack
          position="absolute"
          top={-1}
          left={-1}
          right={-1}
          bottom={-1}
          borderRadius={borderRadius}
          borderWidth={0}
          borderColor={edgeGlowColor}
          opacity={edgeGlowIntensity}
          pointerEvents="none"
        />
      )}

      <XStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        borderRadius={borderRadius}
        animation={animation}
        scale={isPressed && !disabled ? 0.93 : 1}
        pointerEvents="none"
      >
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          style={{
            borderRadius: numericRadius,
            overflow: 'hidden',
            width: '100%',
            height: '100%',
          }}
        />

        <Image
          source={overlaySource}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          width="100%"
          height="100%"
          opacity={overlayOpacity}
          resizeMode="cover"
        />
      </XStack>

      <Button
        testID={testID}
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : () => setIsPressed(true)}
        onPressOut={disabled ? undefined : () => setIsPressed(false)}
        disabled={disabled}
        unstyled
        animation={animation}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="$2"
        minWidth={typeof minWidth === 'number' ? minWidth : undefined}
        minHeight={minHeight}
        width={(width || (typeof minWidth === 'string' ? minWidth : undefined)) as any}
        borderRadius={borderRadius}
        borderWidth={borderWidth}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        pressStyle={
          disabled
            ? undefined
            : {
                scale: 0.93,
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
        paddingHorizontal="$2"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        role={role}
        accessibilityState={accessibilityState}
      >
        {icon}
        {children}
      </Button>
    </XStack>
  )
}
