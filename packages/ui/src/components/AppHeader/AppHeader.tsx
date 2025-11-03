import { Bell, ChevronLeft, Menu, MoreHorizontal, User } from '@tamagui/lucide-icons'
import type { ComponentProps } from 'react'
import { Circle, Image, Text, Theme, XStack, YStack } from 'tamagui'
import { Button } from '../Button'
import { GlassButton } from '../GlassButton'
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
        width="$4"
        height="$4"
        borderRadius="$10"
        backgroundColor="transparent"
        borderWidth={0}
        animation="quick"
        hoverStyle={{
          backgroundColor: '$backgroundPress',
          scale: 1.08,
          opacity: 0.9,
        }}
        pressStyle={{
          scale: 0.92,
          backgroundColor: '$color10',
          opacity: 0.75,
        }}
        focusStyle={{
          borderWidth: 1,
          borderColor: '$color7',
          opacity: 0.9,
        }}
        onPress={isBackButton ? onBackPress : onMenuPress}
        cursor="pointer"
        accessibilityRole="button"
        accessibilityLabel={
          isBackButton
            ? isRecording
              ? 'Stop recording and go back'
              : 'Go back to previous screen'
            : 'Open side menu'
        }
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
            width="$4"
            height="$4"
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
            animation="quick"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
              scale: 1.08,
              opacity: 0.9,
            }}
            pressStyle={{
              scale: 0.92,
              backgroundColor: '$color10',
              opacity: 0.75,
            }}
            focusStyle={{
              borderWidth: 1,
              borderColor: '$color7',
              opacity: 0.9,
            }}
            onPress={onMenuPress}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Open side menu"
            icon={
              <Menu
                size="$1.5"
                color={iconColor}
              />
            }
          />
        )

      case 'videoSettings':
        return (
          <Button
            chromeless
            width="$4"
            height="$4"
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
            animation="quick"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
              scale: 1.08,
              opacity: 0.9,
            }}
            pressStyle={{
              scale: 0.92,
              backgroundColor: '$color10',
              opacity: 0.75,
            }}
            focusStyle={{
              borderWidth: 1,
              borderColor: '$color7',
              opacity: 0.9,
            }}
            onPress={onMenuPress}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Open video settings menu"
            icon={
              <MoreHorizontal
                size="$1.5"
                color={iconColor}
              />
            }
          />
        )

      case 'notifications':
        return (
          <YStack position="relative">
            <Button
              chromeless
              width="$4"
              height="$4"
              borderRadius="$10"
              backgroundColor="transparent"
              animation="quick"
              hoverStyle={{
                backgroundColor: '$backgroundHover',
                scale: 1.08,
                opacity: 0.9,
              }}
              pressStyle={{
                scale: 0.92,
                backgroundColor: '$color10',
                opacity: 0.75,
              }}
              focusStyle={{
                borderWidth: 1,
                borderColor: '$color7',
                opacity: 0.9,
              }}
              onPress={onNotificationPress}
              cursor="pointer"
              accessibilityRole="button"
              accessibilityLabel={
                notificationBadgeCount > 0
                  ? `Notifications: ${notificationBadgeCount} unread`
                  : 'Notifications'
              }
              icon={
                <Bell
                  size="$1.5"
                  color={iconColor}
                />
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
                  color="$color12"
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
            width="$4"
            height="$4"
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
            animation="quick"
            hoverStyle={{
              backgroundColor: '$backgroundHover',
              scale: 1.08,
              opacity: 0.9,
            }}
            pressStyle={{
              scale: 0.92,
              backgroundColor: '$color10',
              opacity: 0.75,
            }}
            focusStyle={{
              borderWidth: 1,
              borderColor: '$color7',
              opacity: 0.9,
            }}
            onPress={onProfilePress}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Open profile"
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
        <GlassButton
          disabled
          blurIntensity={10}
          blurTint="dark"
          minWidth={80}
          minHeight={32}
          borderRadius="$6"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.15)"
          overlayOpacity={0.6}
          edgeGlowIntensity={0.1}
          accessibilityLabel={`Recording time: ${timerValue}`}
        >
          <Text
            fontSize="$5"
            fontFamily="$body"
            fontWeight="600"
            color="$color12"
            textAlign="center"
          >
            {timerValue}
          </Text>
        </GlassButton>
      )
    }

    return (
      <Text
        fontSize="$6"
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
      height={44}
      paddingHorizontal="$2"
      gap="$2"
      flexDirection="row"
    >
      <XStack
        width={44}
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
        width={44}
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
      color="$color12"
      textAlign="center"
      accessibilityRole="text"
      accessibilityLabel={`Recording time: ${formatTime(duration)}`}
    >
      {formatTime(duration)}
    </Text>
  )
}
