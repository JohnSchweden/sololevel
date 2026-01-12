import { type CoachMode, VOICE_TEXT_CONFIG } from '@my/config'
import { Dumbbell, Flame, TrendingUp, Trophy } from '@tamagui/lucide-icons'
import { memo, useMemo } from 'react'
import { Platform } from 'react-native'
import { BlurView } from '../../BlurView/BlurView'

import { Sheet, Text, XStack, YStack } from 'tamagui'

// Shared background style for bottom sheets (memoized at module level)
// iOS: Uses BlurView with intensity 35
// Android: Uses plain semi-transparent background (BlurView causes flickering when content changes)
const BOTTOM_SHEET_BLUR_STYLE = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
}

export interface NotificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificationBadgeCount?: number
  voiceMode?: CoachMode
}

export const NotificationSheet = memo(function NotificationSheet({
  open,
  onOpenChange,
  notificationBadgeCount = 0,
  voiceMode = 'roast',
}: NotificationSheetProps): React.ReactElement {
  // Get voice mode-specific notifications
  const notifications = useMemo(
    () => VOICE_TEXT_CONFIG[voiceMode].notifications.demoNotifications,
    [voiceMode]
  )

  // Map notification types to icons and background colors
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return Trophy
      case 'progress':
        return TrendingUp
      case 'reminder':
        return Dumbbell
      case 'streak':
        return Flame
      default:
        return Trophy
    }
  }

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'achievement':
        return 'rgba(34, 197, 94, 0.2)'
      case 'progress':
        return 'rgba(59, 130, 246, 0.2)'
      case 'reminder':
        return 'rgba(168, 85, 247, 0.2)'
      case 'streak':
        return 'rgba(251, 191, 36, 0.2)'
      default:
        return 'rgba(34, 197, 94, 0.2)'
    }
  }

  return (
    <Sheet
      modal
      dismissOnSnapToBottom
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[40]}
      animation="medium"
    >
      <Sheet.Overlay
        backgroundColor="$shadowColor"
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        backgroundColor="transparent"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={35}
            tint="dark"
            style={BOTTOM_SHEET_BLUR_STYLE}
          />
        ) : (
          <YStack
            backgroundColor="rgba(20, 20, 20, 0.85)"
            style={BOTTOM_SHEET_BLUR_STYLE}
          />
        )}
        <Sheet.ScrollView>
          <YStack
            padding="$4"
            gap="$4"
            position="relative"
            zIndex={1}
          >
            {/* Header */}
            <YStack gap="$2">
              <Text
                fontSize="$6"
                fontWeight="600"
                color="$color12"
              >
                Notifications
              </Text>
              <Text
                fontSize="$4"
                color="$color11"
              >
                {notificationBadgeCount > 0
                  ? `${notificationBadgeCount} unread notification${notificationBadgeCount !== 1 ? 's' : ''}`
                  : '4 recent updates'}
              </Text>
            </YStack>

            {/* Notification Content */}
            <YStack gap="$1">
              {notifications.map((notification, index) => {
                const IconComponent = getNotificationIcon(notification.type)
                const bgColor = getNotificationBgColor(notification.type)

                return (
                  <XStack
                    key={index}
                    gap="$3"
                    padding="$3"
                    borderRadius="$4"
                  >
                    <YStack
                      width={40}
                      height={40}
                      alignItems="center"
                      justifyContent="center"
                      backgroundColor={bgColor}
                      borderRadius="$8"
                    >
                      <IconComponent
                        size={20}
                        color="$color12"
                      />
                    </YStack>
                    <YStack
                      flex={1}
                      gap="$1"
                    >
                      <Text
                        fontSize="$4"
                        fontWeight="600"
                        color="$color12"
                      >
                        {notification.title}
                      </Text>
                      <Text
                        fontSize="$3"
                        lineHeight={18}
                        color="$color12"
                      >
                        {notification.body}
                      </Text>
                    </YStack>
                  </XStack>
                )
              })}
            </YStack>
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
})
