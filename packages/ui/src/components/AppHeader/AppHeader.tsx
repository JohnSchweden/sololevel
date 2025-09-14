import { Bell, ChevronLeft, Menu } from '@tamagui/lucide-icons'
import { Circle, Text, YStack } from 'tamagui'
import { Button } from '../Button'

// Generic app states that can be handled by the header
export type AppHeaderMode = 'default' | 'camera' | 'recording' | 'analysis'

export interface AppHeaderProps {
  title: string
  mode?: AppHeaderMode
  showTimer?: boolean
  timerValue?: string
  onMenuPress?: () => void
  onBackPress?: () => void
  onNotificationPress?: () => void
  notificationBadgeCount?: number
  // Mode-specific props
  cameraProps?: {
    isRecording?: boolean
  }
}

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
  const showNotifications = mode !== 'recording' && mode !== 'camera'
  return (
    <>
      {/* Left Section - Menu/Back Button */}
      <Button
        chromeless
        size="$3"
        onPress={isRecording ? onBackPress : onMenuPress}
        icon={
          isRecording ? (
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
        accessibilityLabel={isRecording ? 'Stop recording and go back' : 'Open side menu'}
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

      {/* Right Section - Notification Button with Badge */}
      {showNotifications && (
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
      )}
    </>
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
