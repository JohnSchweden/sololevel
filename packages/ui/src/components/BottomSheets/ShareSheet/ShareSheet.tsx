import { Copy, Link, Mail } from '@tamagui/lucide-icons'
import { memo } from 'react'
import { Platform } from 'react-native'
import { BlurView } from '../../BlurView/BlurView'

import { Button } from '@ui/components/Button'
import { Sheet, Text, XStack, YStack } from 'tamagui'

// Shared background style for bottom sheets (memoized at module level)
// iOS: Uses BlurView with intensity 30
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

export interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ShareSheet = memo(function ShareSheet({
  open,
  onOpenChange,
}: ShareSheetProps): React.ReactElement {
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
            intensity={30}
            tint="dark"
            style={BOTTOM_SHEET_BLUR_STYLE}
          />
        ) : (
          <YStack
            backgroundColor="rgba(0, 0, 0, 0.75)"
            style={BOTTOM_SHEET_BLUR_STYLE}
          />
        )}
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
              Share Video
            </Text>
            <Text
              fontSize="$4"
              color="$color11"
            >
              Choose how you want to share
            </Text>
          </YStack>

          {/* Share Options */}
          <YStack gap="$3">
            {/* Copy Link */}
            <Button
              chromeless
              size="$5"
              backgroundColor="transparent"
              borderRadius="$4"
              onPress={() => {
                // TODO: Implement copy link
                onOpenChange(false)
              }}
            >
              <XStack
                alignItems="center"
                gap="$3"
                width="100%"
                justifyContent="flex-start"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="transparent"
                  borderRadius="$3"
                >
                  <Link
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
                    fontWeight="500"
                    color="$color12"
                  >
                    Copy Link
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color11"
                  >
                    Share via URL
                  </Text>
                </YStack>
              </XStack>
            </Button>

            {/* Email */}
            <Button
              chromeless
              size="$5"
              backgroundColor="transparent"
              borderRadius="$4"
              onPress={() => {
                // TODO: Implement email share
                onOpenChange(false)
              }}
            >
              <XStack
                alignItems="center"
                gap="$3"
                width="100%"
                justifyContent="flex-start"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="transparent"
                  borderRadius="$3"
                >
                  <Mail
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
                    fontWeight="500"
                    color="$color12"
                  >
                    Email
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color11"
                  >
                    Share via email
                  </Text>
                </YStack>
              </XStack>
            </Button>

            {/* Copy Video */}
            <Button
              chromeless
              size="$5"
              backgroundColor="transparent"
              borderRadius="$4"
              onPress={() => {
                // TODO: Implement copy video
                onOpenChange(false)
              }}
            >
              <XStack
                alignItems="center"
                gap="$3"
                width="100%"
                justifyContent="flex-start"
              >
                <YStack
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="transparent"
                  borderRadius="$3"
                >
                  <Copy
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
                    fontWeight="500"
                    color="$color12"
                  >
                    Copy Video
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color11"
                  >
                    Copy video file
                  </Text>
                </YStack>
              </XStack>
            </Button>
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
})
