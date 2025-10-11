import type { ReactNode } from 'react'
import { YStack } from 'tamagui'
import type { GetProps } from 'tamagui'
import { BottomNavigationContainer } from '../../BottomNavigation/BottomNavigation'

export interface VideoContainerProps {
  children?: ReactNode
  header?: ReactNode
  bottomNavigation?: ReactNode
  backgroundColor?: GetProps<typeof YStack>['backgroundColor']
  useFlexLayout?: boolean // When true, doesn't use absolute positioning for content
  flex?: number // Flex value for flex layout mode
}

/**
 * Responsive Video Container Layout
 * Mobile-first YStack root container with safe area handling
 * Implements responsive breakpoints and video analysis layout
 */
export function VideoContainer({
  children,
  header,
  bottomNavigation,
  backgroundColor = '$background',
  useFlexLayout = false,
  flex,
}: VideoContainerProps) {
  if (useFlexLayout) {
    // Flex layout mode - no absolute positioning, children flow normally
    return (
      <YStack
        flex={flex ?? 1}
        backgroundColor={backgroundColor}
        position="relative"
      >
        {/* Video Player Area - flows in flex layout */}
        <YStack
          flex={1}
          overflow="hidden"
        >
          {children}
        </YStack>

        {/* Header Section - deprecated, use NavigationAppHeader instead */}
        {header && header}

        {/* Bottom Navigation - Mobile optimized */}
        {bottomNavigation && (
          <BottomNavigationContainer>{bottomNavigation}</BottomNavigationContainer>
        )}
      </YStack>
    )
  }

  // Default full-screen mode with absolute positioning
  return (
    <YStack
      flex={1}
      backgroundColor={backgroundColor}
      position="relative"
    >
      {/* Video Player Area - Full flex container */}
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        overflow="hidden"
      >
        {children}
      </YStack>

      {/* Header Section - deprecated, use NavigationAppHeader instead */}
      {header && header}

      {/* Bottom Navigation - Mobile optimized */}
      {bottomNavigation && (
        <BottomNavigationContainer>{bottomNavigation}</BottomNavigationContainer>
      )}
    </YStack>
  )
}

export interface VideoPlayerAreaProps {
  children?: ReactNode
  isPlaying?: boolean
  flex?: number
}

/**
 * Video Player Area with Absolute Positioning Support
 * Provides relative positioning for overlays and controls
 */
export function VideoPlayerArea({
  children,
  isPlaying: _isPlaying = false,
  flex,
}: VideoPlayerAreaProps) {
  return (
    <YStack
      flex={flex ?? 1}
      position="relative"
      backgroundColor="transparent"
    >
      {children}
    </YStack>
  )
}

export interface VideoPositioningOverlayProps {
  children?: ReactNode
  position?: 'bottom' | 'center' | 'top'
}

/**
 * Video Positioning Overlay
 * Absolute positioned container for video overlays
 * Mobile-first touch target positioning
 */
export function VideoPositioningOverlay({
  children,
  position = 'bottom',
}: VideoPositioningOverlayProps) {
  const getPositionProps = () => {
    switch (position) {
      case 'top':
        return {
          position: 'absolute' as const,
          top: 16,
          left: 16,
          right: 16,
        }
      case 'center':
        return {
          position: 'absolute' as const,
          top: 0,
          left: 16,
          right: 16,
          bottom: 0,
          justifyContent: 'center' as const,
        }
      default:
        return {
          position: 'absolute' as const,
          bottom: 80,
          left: 0,
          right: 0,
        }
    }
  }

  return (
    <YStack
      {...getPositionProps()}
      alignItems="center"
      justifyContent="center"
      zIndex={15} // Above video but below header/nav
    >
      {children}
    </YStack>
  )
}
