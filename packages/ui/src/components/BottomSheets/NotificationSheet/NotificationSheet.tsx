import { Dumbbell, Flame, TrendingUp, Trophy } from '@tamagui/lucide-icons'
import { BlurView } from 'expo-blur'

import { Sheet, Text, XStack, YStack } from 'tamagui'

export interface NotificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificationBadgeCount?: number
}

export function NotificationSheet({
  open,
  onOpenChange,
  notificationBadgeCount = 0,
}: NotificationSheetProps): React.ReactElement {
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
        <BlurView
          intensity={50}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        />
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
              {/* Achievement: Milestone */}
              <XStack
                gap="$3"
                padding="$3"
                borderRadius="$4"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(34, 197, 94, 0.2)"
                  borderRadius="$8"
                >
                  <Trophy
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
                    Level Up Unlocked!
                  </Text>
                  <Text
                    fontSize="$3"
                    lineHeight={18}
                    color="$color12"
                  >
                    You've analyzed 10 videos. Your posture is still trash, but at least you're
                    consistent.
                  </Text>
                </YStack>
              </XStack>

              {/* Progress: Improvement */}
              <XStack
                gap="$3"
                padding="$3"
                borderRadius="$4"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(59, 130, 246, 0.2)"
                  borderRadius="$8"
                >
                  <TrendingUp
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
                    "Some" Progress Detected
                  </Text>
                  <Text
                    fontSize="$3"
                    lineHeight={18}
                    color="$color12"
                  >
                    Your vocal variety improved 23% since last week. Only 77% more to go!
                  </Text>
                </YStack>
              </XStack>

              {/* Reminder: Practice */}
              <XStack
                gap="$3"
                padding="$3"
                borderRadius="$4"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(168, 85, 247, 0.2)"
                  borderRadius="$8"
                >
                  <Dumbbell
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
                    Daily Drill Reminder
                  </Text>
                  <Text
                    fontSize="$3"
                    lineHeight={18}
                    color="$color12"
                  >
                    Time to practice that hand gesture exercise. Your last video looked like you
                    were swatting flies.
                  </Text>
                </YStack>
              </XStack>

              {/* Achievement: Streak */}
              <XStack
                gap="$3"
                padding="$3"
                borderRadius="$4"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="rgba(251, 191, 36, 0.2)"
                  borderRadius="$8"
                >
                  <Flame
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
                    7-Day Streak!
                  </Text>
                  <Text
                    fontSize="$3"
                    lineHeight={18}
                    color="$color12"
                  >
                    You've recorded every day this week. The grind doesn't stop—neither should you.
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
