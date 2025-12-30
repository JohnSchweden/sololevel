import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from '@tamagui/linear-gradient'
import { Bell, ChevronLeft, Menu, MoreHorizontal, Settings, User } from '@tamagui/lucide-icons'
import { type ComponentProps, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { BlurView } from '../BlurView/BlurView'

// PERF: Extract platform check to module-level constant
const IS_IOS = Platform.OS === 'ios'

import { NotificationSheet } from '@ui/components/BottomSheets'
import { RecordingSettingsSheet } from '@ui/components/BottomSheets'
import { VideoSettingsSheet } from '@ui/components/BottomSheets'
import { Image } from 'expo-image'
import { Circle, Text, Theme, XStack, YStack } from 'tamagui'
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
  topInset = 0,
  disableBlur = false,
}: AppHeaderProps) {
  // Notification sheet state
  const [notificationSheetOpen, setNotificationSheetOpen] = useState(false)
  // Video settings sheet state
  const [videoSettingsSheetOpen, setVideoSettingsSheetOpen] = useState(false)
  // Recording settings sheet state
  const [recordingSettingsSheetOpen, setRecordingSettingsSheetOpen] = useState(false)

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

    // Show recording settings icon only in recording mode
    if (isRecording) {
      return 'recordingSettings'
    }

    if (mode !== 'recording' && mode !== 'camera') {
      return 'notifications'
    }

    return 'none'
  }, [rightAction, rightSlot, isVideoSettings, isAnalysis, isRecording, mode])

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
  // Handle both local assets (require()) and remote URIs (strings)
  const profileImageSource = useMemo(() => {
    if (!profileImageUri) return null
    // If it's a string, treat as remote URI
    if (typeof profileImageUri === 'string') {
      return { uri: profileImageUri }
    }
    // Otherwise, it's a local asset from require() - use directly
    return profileImageUri
  }, [profileImageUri])

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
        minWidth={44}
        minHeight={44}
        borderRadius="$10"
        backgroundColor="transparent"
        borderWidth={0}
        animation="quick" // Kept for critical UI feedback, optimized elsewhere
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
            minWidth={44}
            minHeight={44}
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
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
            minWidth={44}
            minHeight={44}
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
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

      case 'recordingSettings':
        return (
          <Button
            chromeless
            minWidth={44}
            minHeight={44}
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
            hoverStyle={buttonHoverStyle}
            pressStyle={buttonPressStyle}
            focusStyle={buttonFocusStyle}
            onPress={() => setRecordingSettingsSheetOpen(true)}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Camera settings"
            icon={
              <Settings
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
              minWidth={44}
              minHeight={44}
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
              top={4}
              right={4}
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
            minWidth={44}
            minHeight={44}
            borderRadius="$10"
            backgroundColor="transparent"
            borderWidth={0}
            hoverStyle={buttonHoverStyle}
            pressStyle={buttonPressStyle}
            focusStyle={buttonFocusStyle}
            onPress={onProfilePress}
            cursor="pointer"
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {profileImageSource ? (
              <Image
                source={profileImageSource}
                contentFit="cover"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                }}
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <User
                size="$1.5"
                color={iconColor}
              />
            )}
          </Button>
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

    const textElement = (
      <Text
        fontSize="$6"
        fontFamily="$heading"
        fontWeight="600"
        color={foreground}
        textAlign={titleAlignment}
        numberOfLines={1}
        letterSpacing={0.2}
        lineHeight={IS_IOS ? undefined : 20}
        accessibilityRole="header"
        accessibilityLabel="header"
        {...(IS_IOS
          ? {}
          : {
              // Android-specific: Remove font padding for better vertical alignment
              includeFontPadding: false,
            })}
      >
        {title}
      </Text>
    )

    // On Android, wrap in container with explicit height for vertical centering
    if (IS_IOS) {
      return textElement
    }

    return (
      <YStack
        height={44}
        justifyContent="center"
        alignItems={titleAlignment === 'center' ? 'center' : 'flex-start'}
      >
        {textElement}
      </YStack>
    )
  })()

  // Calculate total height: status bar area + header content (44px)
  const totalHeight = useMemo(() => topInset + 44, [topInset])

  // Memoize header background styles for iOS 16 Photos-style blur effect
  const headerBlurViewStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none' as const,
    }),
    []
  )

  // Memoize MaskedView styles for blur gradient transition
  const maskedViewStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none' as const,
    }),
    []
  )

  const linearGradientStyle = useMemo(() => ({ flex: 1 as const }), [])

  // PERF: Memoize headerContent - depends on computed values, not render functions
  // renderLeft/Right are called inline, React handles their re-renders efficiently
  const headerContent = useMemo(
    () => (
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
    ),
    // Dependencies: values that affect what renderLeft/Right/titleContent return
    [
      leftSlot,
      rightSlot,
      titleSlot,
      computedLeftAction,
      computedRightAction,
      isRecording,
      titleContent,
      titleAlignment,
      onBackPress,
      onMenuPress,
      onNotificationPress,
      onProfilePress,
      notificationBadgeCount,
      profileImageSource,
    ]
  )

  // PERF: Memoize blur content to prevent re-creation
  const blurContent = useMemo(() => {
    if (disableBlur) return null

    return IS_IOS ? (
      <MaskedView
        style={maskedViewStyle}
        maskElement={
          <LinearGradient
            colors={['$color1', 'transparent']} // mask from blurred → visible
            start={{ x: 0.5, y: 0.6 }}
            end={{ x: 0.5, y: 1 }}
            style={linearGradientStyle}
          />
        }
      >
        <BlurView
          intensity={15}
          tint="dark"
          style={headerBlurViewStyle}
        />
      </MaskedView>
    ) : (
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.75)', 'rgba(0, 0, 0, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={headerBlurViewStyle}
      />
    )
  }, [disableBlur, maskedViewStyle, linearGradientStyle, headerBlurViewStyle])

  // iOS 16 Photos-style header: BlurView + dark gradient overlay
  // Android: Uses LinearGradient background (BlurView causes flickering when content changes)
  // Extends to top edge (status bar area) when topInset is provided
  // iOS BlurView transitions from full blur at top to no blur at bottom
  // Can be disabled when parent already provides blur (e.g., CoachScreen)
  // PERF: Memoize headerWithBlur to prevent re-creation on every render
  const headerWithBlur = useMemo(
    () => (
      <YStack
        position="relative"
        height={totalHeight}
        marginTop={topInset > 0 ? -topInset : 0}
        overflow="visible"
      >
        {/* BlurView background with gradient transition - full blur at top, no blur at bottom */}
        {blurContent}

        {/* Content positioned at bottom (44px header area) */}
        <YStack
          position="absolute"
          top={topInset}
          left={0}
          right={0}
          height={44}
          pointerEvents="box-none"
        >
          {headerContent}
        </YStack>
      </YStack>
    ),
    [totalHeight, topInset, blurContent, headerContent]
  )

  const content = themeName ? <Theme name={themeName}>{headerWithBlur}</Theme> : headerWithBlur

  return (
    <>
      {content}

      {/* PERFORMANCE FIX: Always mount sheets to avoid mounting BlurView during animation */}
      {/* Conditional mounting causes JS frame drops (5fps) when sheet opens */}
      <NotificationSheet
        open={notificationSheetOpen}
        onOpenChange={setNotificationSheetOpen}
        notificationBadgeCount={notificationBadgeCount}
      />

      <VideoSettingsSheet
        open={videoSettingsSheetOpen}
        onOpenChange={setVideoSettingsSheetOpen}
      />

      <RecordingSettingsSheet
        open={recordingSettingsSheetOpen}
        onOpenChange={setRecordingSettingsSheetOpen}
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
