import { Bell, ChevronLeft, Menu, MoreHorizontal, User } from '@tamagui/lucide-icons'
import { BlurView } from 'expo-blur'
import { type ComponentProps, useMemo, useState } from 'react'

import { NotificationSheet } from '@ui/components/BottomSheets'
import { VideoSettingsSheet } from '@ui/components/BottomSheets'
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
  // Notification sheet state
  const [notificationSheetOpen, setNotificationSheetOpen] = useState(false)
  // Video settings sheet state
  const [videoSettingsSheetOpen, setVideoSettingsSheetOpen] = useState(false)

  // Derive state from mode - memoize to prevent recalculation on every render
  const isRecording = useMemo(
    () => mode === 'recording' || cameraProps?.isRecording,
    [mode, cameraProps?.isRecording]
  )
  const isAnalysis = useMemo(() => mode === 'analysis', [mode])
  const isVideoSettings = useMemo(() => mode === 'videoSettings', [mode])

  // Memoize computed actions to prevent recalculation when dependencies haven't changed
  const computedLeftAction = useMemo(() => {
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
  }, [leftAction, leftSlot, isRecording, isAnalysis, isVideoSettings])

  const computedRightAction = useMemo(() => {
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
  }, [rightAction, rightSlot, isVideoSettings, isAnalysis, mode])

  type IconColor = ComponentProps<typeof Bell>['color']
  type TextColor = ComponentProps<typeof Text>['color']

  // Memoize color constants (never change, but prevents re-creation)
  const foreground = useMemo(() => '$color' as TextColor, [])
  const iconColor = useMemo(() => '$color' as IconColor, [])

  // Memoize shared Button style objects to prevent re-renders
  const buttonHoverStyle = useMemo(
    () => ({
      backgroundColor: '$backgroundHover' as const,
      scale: 1.08,
      opacity: 0.9,
    }),
    []
  )

  const buttonPressStyle = useMemo(
    () => ({
      scale: 0.82,
      backgroundColor: 'rgba(255, 255, 255, 0.1)' as const,
      opacity: 0.85,
    }),
    []
  )

  const buttonFocusStyle = useMemo(
    () => ({
      borderWidth: 1,
      borderColor: '$color7' as const,
      opacity: 0.9,
    }),
    []
  )

  const leftButtonHoverStyle = useMemo(
    () => ({
      backgroundColor: '$backgroundPress' as const,
      scale: 1.08,
      opacity: 0.9,
    }),
    []
  )

  // Memoize BlurView timer style (static, no deps needed)
  const blurViewStyle = useMemo(
    () => ({
      minWidth: 80,
      minHeight: 32,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 12,
    }),
    []
  )

  // Memoize Image source object (depends on profileImageUri)
  const profileImageSource = useMemo(
    () => (profileImageUri ? { uri: profileImageUri } : null),
    [profileImageUri]
  )

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
        hoverStyle={leftButtonHoverStyle}
        pressStyle={buttonPressStyle}
        focusStyle={buttonFocusStyle}
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
            hoverStyle={buttonHoverStyle}
            pressStyle={buttonPressStyle}
            focusStyle={buttonFocusStyle}
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
            hoverStyle={buttonHoverStyle}
            pressStyle={buttonPressStyle}
            focusStyle={buttonFocusStyle}
            onPress={() => {
              setVideoSettingsSheetOpen(true)
              onMenuPress?.()
            }}
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
              borderWidth={0}
              animation="quick"
              hoverStyle={buttonHoverStyle}
              pressStyle={buttonPressStyle}
              focusStyle={buttonFocusStyle}
              onPress={() => {
                setNotificationSheetOpen(true)
                onNotificationPress?.()
              }}
              cursor="pointer"
              accessibilityRole="button"
              accessibilityLabel={
                notificationBadgeCount > 0
                  ? `Notifications: ${notificationBadgeCount} unread`
                  : 'Notifications: 4 recent updates'
              }
              icon={
                <Bell
                  size="$1.5"
                  color={iconColor}
                />
              }
            />

            <Circle
              backgroundColor="$red9"
              alignItems="center"
              justifyContent="center"
              position="absolute"
              top={-2}
              right={-2}
              minWidth={16}
              minHeight={16}
              paddingHorizontal={2}
            >
              <Text
                fontSize={10}
                color="$color12"
                fontWeight="600"
                textAlign="center"
                lineHeight={16}
              >
                {notificationBadgeCount > 0
                  ? notificationBadgeCount > 9
                    ? '9+'
                    : notificationBadgeCount
                  : '4'}
              </Text>
            </Circle>
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
            hoverStyle={buttonHoverStyle}
            pressStyle={buttonPressStyle}
            focusStyle={buttonFocusStyle}
            onPress={onProfilePress}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            icon={
              profileImageSource ? (
                <Image
                  source={profileImageSource}
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
        <BlurView
          intensity={10}
          tint="dark"
          style={blurViewStyle}
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
        </BlurView>
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

  return (
    <>
      {themeName ? <Theme name={themeName}>{content}</Theme> : content}

      <NotificationSheet
        open={notificationSheetOpen}
        onOpenChange={setNotificationSheetOpen}
        notificationBadgeCount={notificationBadgeCount}
      />

      <VideoSettingsSheet
        open={videoSettingsSheetOpen}
        onOpenChange={setVideoSettingsSheetOpen}
      />
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
      color="$color12"
      textAlign="center"
      accessibilityRole="text"
      accessibilityLabel={`Recording time: ${formatTime(duration)}`}
    >
      {formatTime(duration)}
    </Text>
  )
}

// Enable why-did-you-render tracking for AppHeader
if (process.env.NODE_ENV === 'development') {
  AppHeader.whyDidYouRender = false
}
