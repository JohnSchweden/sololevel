import { Bell, ChevronLeft, Menu } from '@tamagui/lucide-icons'
import { Circle, Text, XStack, YStack } from 'tamagui'
import { Button } from '../Button'
import type { AppHeaderProps } from './types'

/**
 * App Header Component
 * Generic header that adapts to different application states and modes
 * Mobile-optimized with navigation, title/timer display, and notifications
 * Implements 44px touch targets and responsive design
 */
export function AppHeader({
  title,
  mode = 'default',
  showTimer = false,
  timerValue = '00:00:00',
  onMenuPress,
  onBackPress,
  onNotificationPress,
  notificationBadgeCount = 0,
  cameraProps,
}: AppHeaderProps) {
  // Derive state from mode
  const isRecording = mode === 'recording' || cameraProps?.isRecording
  const isAnalysis = mode === 'analysis'
  const showBackButton = isRecording || isAnalysis
  const showNotifications = mode !== 'recording' && mode !== 'camera' && !isAnalysis
  return (
    <>
      {/* Left Section - Back Button (for recording/analysis) or Menu Button (for other modes) */}
      <Button
        chromeless
        size="$3"
        onPress={showBackButton ? onBackPress : onMenuPress}
        icon={
          showBackButton ? (
            <ChevronLeft
              size="$1.5"
              color="white"
            />
          ) : (
            <Menu
              size="$1.5"
              color="white"
            />
          )
        }
        minWidth={44}
        minHeight={44}
        borderRadius="$4"
        backgroundColor="transparent"
        hoverStyle={{
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
        pressStyle={{
          scale: 0.95,
          backgroundColor: 'rgba(255,255,255,0.2)',
        }}
        accessibilityRole="button"
        accessibilityLabel={
          showBackButton
            ? isRecording
              ? 'Stop recording and go back'
              : 'Go back to previous screen'
            : 'Open side menu'
        }
      />

      {/* Center Section - Title or Timer */}
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
      >
        {showTimer ? (
          <Text
            fontSize="$5"
            fontFamily="$body"
            fontWeight="600"
            color="white"
            textAlign="center"
            accessibilityRole="text"
            accessibilityLabel={`Recording time: ${timerValue}`}
          >
            {timerValue}
          </Text>
        ) : (
          <Text
            fontSize={18}
            fontWeight="600"
            color="white"
            textAlign="center"
            numberOfLines={1}
            letterSpacing={0.2}
            accessibilityRole="header"
            accessibilityLabel="header"
          >
            {title}
          </Text>
        )}
      </YStack>

      {/* Right Section - Menu Button (for analysis) or Notification Button with Badge (for other modes) */}
      {isAnalysis ? (
        <Button
          chromeless
          size="$3"
          onPress={onMenuPress}
          icon={
            <Menu
              size="$1.5"
              color="white"
            />
          }
          minWidth={44}
          minHeight={44}
          borderRadius="$4"
          backgroundColor="transparent"
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
          pressStyle={{
            scale: 0.95,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Open side menu"
        />
      ) : showNotifications ? (
        <YStack position="relative">
          <Button
            chromeless
            size="$3"
            onPress={onNotificationPress}
            icon={
              <Bell
                size="$1.5"
                color="white"
              />
            }
            minWidth={44}
            minHeight={44}
            borderRadius="$4"
            backgroundColor="transparent"
            hoverStyle={{
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            pressStyle={{
              scale: 0.95,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
            accessibilityRole="button"
            accessibilityLabel={
              notificationBadgeCount > 0
                ? `Notifications: ${notificationBadgeCount} unread`
                : 'Notifications'
            }
          />

          {/* Notification Badge */}
          {notificationBadgeCount > 0 && (
            <Circle
              position="absolute"
              top={6}
              right={6}
              size={16}
              backgroundColor="$red9"
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize="$1"
                color="white"
                fontWeight="600"
                lineHeight="$1"
              >
                {notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}
              </Text>
            </Circle>
          )}
        </YStack>
      ) : null}
    </>
  )
}

// Platform-agnostic safe area hook for header configuration
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
 * Centralized App Header Container
 * Provides consistent header styling and layout across the app
 * Mobile-optimized with safe area handling and touch targets
 */
export function AppHeaderContainer({
  children,
  backgroundColor = 'transparent',
}: {
  children: React.ReactNode
  backgroundColor?: any
}) {
  const insets = useSafeAreaInsets()

  return (
    <XStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      paddingTop={insets.top + 20}
      height={80 + insets.top}
      paddingHorizontal="$3"
      alignItems="center"
      justifyContent="space-between"
      zIndex={10}
      backgroundColor={backgroundColor}
    >
      {children}
    </XStack>
  )
}

export interface RecordingTimerProps {
  duration: number // Duration in milliseconds
}

/**
 * Recording Timer Component
 * Formats duration and displays with monospace font for recording state
 */
export function RecordingTimer({ duration }: RecordingTimerProps) {
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Text
      fontSize="$5"
      fontFamily="$body"
      fontWeight="600"
      color="white"
      textAlign="center"
      accessibilityRole="text"
      accessibilityLabel={`Recording time: ${formatTime(duration)}`}
    >
      {formatTime(duration)}
    </Text>
  )
}

// Usage Examples (can be moved to a separate examples file)
/*
// Default mode - standard app header
<AppHeader
  title="Dashboard"
  onMenuPress={() => console.log('Menu pressed')}
  onNotificationPress={() => console.log('Notifications pressed')}
/>

// Camera mode - hides notifications, shows menu
<AppHeader
  title="Camera"
  mode="camera"
  onMenuPress={() => console.log('Menu pressed')}
  onBackPress={() => console.log('Back pressed')}
/>

// Camera idle mode - shows notifications, shows menu
<AppHeader
  title="Camera Ready"
  mode="camera-idle"
  onMenuPress={() => console.log('Menu pressed')}
  onNotificationPress={() => console.log('Notifications pressed')}
  notificationBadgeCount={2}
/>

// Recording mode - shows back button, timer, hides notifications
<AppHeader
  title="Recording"
  mode="recording"
  showTimer={true}
  timerValue="00:05:23"
  onBackPress={() => console.log('Stop recording')}
/>

// Analysis mode - shows notifications, menu
<AppHeader
  title="Analysis"
  mode="analysis"
  onMenuPress={() => console.log('Menu pressed')}
  onNotificationPress={() => console.log('Notifications pressed')}
  notificationBadgeCount={3}
/>
*/
