import { Bell, ChevronLeft, Menu, MoreHorizontal, User } from '@tamagui/lucide-icons'
import type { ComponentProps } from 'react'
import { Circle, Image, Text, Theme, XStack, YStack } from 'tamagui'
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
  onProfilePress,
  notificationBadgeCount = 0,
  cameraProps,
  titleAlignment = 'center',
  leftAction = 'auto',
  rightAction = 'auto',
  leftSlot,
  rightSlot,
  titleSlot,
  themeName,
  profileImageUri,
}: AppHeaderProps) {
  // Derive state from mode
  const isRecording = mode === 'recording' || cameraProps?.isRecording
  const isAnalysis = mode === 'analysis'
  const isVideoSettings = mode === 'videoSettings'

  const computedLeftAction = (() => {
    if (leftAction !== 'auto') {
      return leftAction
    }

    if (leftSlot) {
      return 'none'
    }

    if (isRecording || isAnalysis || isVideoSettings) {
      return 'back'
    }

    return 'sidesheet'
  })()

  const computedRightAction = (() => {
    if (rightAction !== 'auto') {
      return rightAction
    }

    if (rightSlot) {
      return 'none'
    }

    if (isVideoSettings) {
      return 'videoSettings'
    }

    if (isAnalysis) {
      return 'menu'
    }

    if (mode !== 'recording' && mode !== 'camera') {
      return 'notifications'
    }

    return 'none'
  })()

  type IconColor = ComponentProps<typeof Bell>['color']
  type TextColor = ComponentProps<typeof Text>['color']

  const foreground = '$color' as TextColor
  const iconColor = '$color' as IconColor

  const renderLeft = () => {
    if (leftSlot) {
      return leftSlot
    }

    if (computedLeftAction === 'none') {
      return null
    }

    const isBackButton = computedLeftAction === 'back'

    return (
      <Button
        chromeless
        size="$3"
        onPress={isBackButton ? onBackPress : onMenuPress}
        icon={
          isBackButton ? (
            <ChevronLeft
              size="$1.5"
              color={iconColor}
            />
          ) : (
            <Menu
              size="$1.5"
              color={iconColor}
            />
          )
        }
        minWidth={44}
        minHeight={44}
        borderRadius="$4"
        backgroundColor="transparent"
        hoverStyle={{
          backgroundColor: '$backgroundHover',
        }}
        pressStyle={{
          scale: 0.95,
          backgroundColor: '$backgroundPress',
        }}
        accessibilityRole="button"
        accessibilityLabel={
          isBackButton
            ? isRecording
              ? 'Stop recording and go back'
              : 'Go back to previous screen'
            : 'Open side menu'
        }
      />
    )
  }

  const renderRight = () => {
    if (rightSlot) {
      return rightSlot
    }

    switch (computedRightAction) {
      case 'menu':
        return (
          <Button
            chromeless
            size="$3"
            onPress={onMenuPress}
            icon={
              <Menu
                size="$1.5"
                color={iconColor}
              />
            }
            minWidth={44}
            minHeight={44}
            borderRadius="$4"
            backgroundColor="transparent"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
            }}
            pressStyle={{
              scale: 0.95,
              backgroundColor: '$backgroundPress',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open side menu"
          />
        )

      case 'videoSettings':
        return (
          <Button
            chromeless
            size="$3"
            onPress={onMenuPress}
            icon={
              <MoreHorizontal
                size="$1.5"
                color={iconColor}
              />
            }
            minWidth={44}
            minHeight={44}
            borderRadius="$4"
            backgroundColor="transparent"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
            }}
            pressStyle={{
              scale: 0.95,
              backgroundColor: '$backgroundPress',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open video settings menu"
          />
        )

      case 'notifications':
        return (
          <YStack position="relative">
            <Button
              chromeless
              size="$3"
              onPress={onNotificationPress}
              icon={
                <Bell
                  size="$1.5"
                  color={iconColor}
                />
              }
              minWidth={44}
              minHeight={44}
              borderRadius="$4"
              backgroundColor="transparent"
              hoverStyle={{
                backgroundColor: '$backgroundHover',
              }}
              pressStyle={{
                scale: 0.95,
                backgroundColor: '$backgroundPress',
              }}
              accessibilityRole="button"
              accessibilityLabel={
                notificationBadgeCount > 0
                  ? `Notifications: ${notificationBadgeCount} unread`
                  : 'Notifications'
              }
            />

            {notificationBadgeCount > 0 && (
              <Circle
                backgroundColor="$red9"
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize="$1"
                  color="$text"
                  fontWeight="600"
                  lineHeight="$1"
                >
                  {notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}
                </Text>
              </Circle>
            )}
          </YStack>
        )

      case 'profile':
        return (
          <Button
            chromeless
            size="$3"
            onPress={onProfilePress}
            icon={
              profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  width={36}
                  height={36}
                />
              ) : (
                <User
                  size="$1.5"
                  color={iconColor}
                />
              )
            }
            minWidth={44}
            minHeight={44}
            borderRadius="$4"
            backgroundColor="transparent"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
            }}
            pressStyle={{
              scale: 0.95,
              backgroundColor: '$backgroundPress',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          />
        )

      default:
        return null
    }
  }

  const titleContent = (() => {
    if (titleSlot) {
      return titleSlot
    }

    if (showTimer) {
      return (
        <Text
          fontSize="$5"
          fontFamily="$body"
          fontWeight="600"
          color={foreground}
          textAlign="center"
          accessibilityRole="text"
          accessibilityLabel={`Recording time: ${timerValue}`}
        >
          {timerValue}
        </Text>
      )
    }

    return (
      <Text
        fontSize="$7"
        fontFamily="$heading"
        fontWeight="600"
        color={foreground}
        textAlign={titleAlignment}
        numberOfLines={1}
        letterSpacing={0.2}
        accessibilityRole="header"
        accessibilityLabel="header"
      >
        {title}
      </Text>
    )
  })()

  const content = (
    <XStack
      alignItems="center"
      height={56}
      paddingHorizontal="$2"
      gap="$2"
      flexDirection="row"
    >
      <XStack
        width={56}
        alignItems="center"
        justifyContent="center"
      >
        {renderLeft()}
      </XStack>

      <YStack
        flex={1}
        alignItems={titleAlignment === 'center' ? 'center' : 'flex-start'}
      >
        {titleContent}
      </YStack>

      <XStack
        width={56}
        alignItems="center"
        justifyContent="center"
      >
        {renderRight()}
      </XStack>
    </XStack>
  )

  return themeName ? <Theme name={themeName}>{content}</Theme> : content
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
      color="$text"
      textAlign="center"
      accessibilityRole="text"
      accessibilityLabel={`Recording time: ${formatTime(duration)}`}
    >
      {formatTime(duration)}
    </Text>
  )
}
