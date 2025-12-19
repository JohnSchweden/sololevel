import { Camera, Grid3x3, Highlighter, Zap } from '@tamagui/lucide-icons'
import { Platform } from 'react-native'
import { BlurView } from '../../BlurView/BlurView'

import { Button } from '@ui/components/Button'
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

export interface RecordingSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flashEnabled?: boolean
  gridEnabled?: boolean
  qualityPreset?: 'low' | 'medium' | 'high'
  onFlashToggle?: () => void
  onGridToggle?: () => void
  onQualityChange?: (preset: 'low' | 'medium' | 'high') => void
}

export function RecordingSettingsSheet({
  open,
  onOpenChange,
  flashEnabled = false,
  gridEnabled = false,
  qualityPreset = 'high',
  onFlashToggle,
  onGridToggle,
  onQualityChange: _onQualityChange, // TODO: Implement quality selection
}: RecordingSettingsSheetProps): React.ReactElement {
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
                Recording Settings
              </Text>
              <Text
                fontSize="$4"
                color="$color11"
              >
                Adjust camera and recording options
              </Text>
            </YStack>

            {/* Settings Options */}
            <YStack gap="$3">
              {/* Flash */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  onFlashToggle?.()
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
                    <Zap
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
                      Flash
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      {flashEnabled ? 'On' : 'Off'}
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Grid */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  onGridToggle?.()
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
                    <Grid3x3
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
                      Grid
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      {gridEnabled ? 'On' : 'Off'}
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
                    //backgroundColor="rgba(59, 130, 246, 0.2)"
                    borderRadius="$3"
                  >
                    <Highlighter
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
                      Quality
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      {qualityPreset === 'high'
                        ? 'High (1080p)'
                        : qualityPreset === 'medium'
                          ? 'Medium (720p)'
                          : 'Low (480p)'}
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              {/* Camera Type */}
              <Button
                chromeless
                size="$5"
                backgroundColor="transparent"
                borderRadius="$4"
                onPress={() => {
                  // TODO: Implement camera type selection
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
                    <Camera
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
                      Camera
                    </Text>
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      Back Camera
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
