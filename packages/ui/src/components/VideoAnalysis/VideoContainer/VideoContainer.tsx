import type { ReactNode } from 'react'
import { YStack } from 'tamagui'
import type { GetProps } from 'tamagui'
import { AppHeaderContainer } from '../../AppHeader/AppHeader'
import { BottomNavigationContainer } from '../../BottomNavigation/BottomNavigation'

export interface VideoContainerProps {
  children?: ReactNode
  header?: ReactNode
  bottomNavigation?: ReactNode
  backgroundColor?: GetProps<typeof YStack>['backgroundColor']
  hasFeedbackPanel?: boolean
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
  hasFeedbackPanel = false,
}: VideoContainerProps) {
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
        overflow={hasFeedbackPanel ? 'visible' : 'hidden'}
      >
        {children}
      </YStack>

      {/* Header Section - Mobile optimized */}
      {header && <AppHeaderContainer>{header}</AppHeaderContainer>}

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
}

/**
 * Video Player Area with Absolute Positioning Support
 * Provides relative positioning for overlays and controls
 */
export function VideoPlayerArea({ children, isPlaying: _isPlaying = false }: VideoPlayerAreaProps) {
  return (
    <YStack
      flex={1}
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
