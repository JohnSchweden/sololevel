import React from 'react'
import { YStack, Text, Circle } from 'tamagui'
import { Button } from '../Button'
import { Menu, Bell } from '@tamagui/lucide-icons'

export interface CameraHeaderProps {
  title: string
  showTimer?: boolean
  timerValue?: string
  onMenuPress?: () => void
  onNotificationPress?: () => void
  notificationBadgeCount?: number
}

/**
 * Camera Header Component
 * Mobile-optimized header with navigation/menu button, title/timer display, and notifications
 * Implements 44px touch targets and responsive design
 */
export function CameraHeader({
  title,
  showTimer = false,
  timerValue = '00:00:00',
  onMenuPress,
  onNotificationPress,
  notificationBadgeCount = 0,
}: CameraHeaderProps) {
  return (
    <>
      {/* Left Section - Menu/Back Button */}
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
        borderRadius="$6"
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
          borderRadius="$6"
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
