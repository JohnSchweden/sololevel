import { Download, FileDown, Gauge, Settings, Share } from '@tamagui/lucide-icons'
import { BlurView } from 'expo-blur'

import { Button } from '@ui/components/Button'
import { Sheet, Text, XStack, YStack } from 'tamagui'

// Shared BlurView style for bottom sheets (memoized at module level)
// Reduced intensity from 50 to 35 for better performance while maintaining visual separation
const BOTTOM_SHEET_BLUR_STYLE = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
}

export interface VideoSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoSettingsSheet({
  open,
  onOpenChange,
}: VideoSettingsSheetProps): React.ReactElement {
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
          intensity={35}
          tint="dark"
          style={BOTTOM_SHEET_BLUR_STYLE}
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
                Video Settings
              </Text>
              <Text
                fontSize="$4"
                color="$color11"
              >
                Adjust playback and quality settings
              </Text>
            </YStack>

            {/* Settings Options */}
            <YStack gap="$3">
              {/* Playback Speed */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement playback speed selection
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
                    //backgroundColor="rgba(59, 130, 246, 0.2)"
                    borderRadius="$3"
                  >
                    <Gauge
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
                      Playback Speed
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      1.0x (Normal)
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Quality */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement quality selection
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
                    //backgroundColor="rgba(168, 85, 247, 0.2)"
                    borderRadius="$3"
                  >
                    <Settings
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
                      Video Quality
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      High (1080p)
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Share Video */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement share video
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
                    //backgroundColor="rgba(34, 197, 94, 0.2)"
                    borderRadius="$3"
                  >
                    <Share
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
                      Share Video
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      Share via social media or link
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Download Video */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement download video
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
                    //backgroundColor="rgba(251, 191, 36, 0.2)"
                    borderRadius="$3"
                  >
                    <Download
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
                      Download Video
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      Save video to device
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Export Analysis */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement export analysis
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
                    //backgroundColor="rgba(239, 68, 68, 0.2)"
                    borderRadius="$3"
                  >
                    <FileDown
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
                      Export Analysis
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      Export feedback and insights
                    </Text>
                  </YStack>
                </XStack>
              </Button>
            </YStack>
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
