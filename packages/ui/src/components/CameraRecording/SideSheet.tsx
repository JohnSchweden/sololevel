import { ChevronLeft, History } from '@tamagui/lucide-icons'
import { Dialog, ScrollView, XStack, YStack } from 'tamagui'
import { shadows } from '@my/config'
import { Button, Text } from 'tamagui'

export interface SideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Side Sheet Navigation - Placeholder Implementation
 * Basic drawer with video history and navigation options
 * Implements US-RU-12: Side-sheet with previous videos
 */
export function SideSheet({ open, onOpenChange }: SideSheetProps) {
  return (
    <Dialog
      modal
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          {...shadows.xlarge}
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          exitStyle={{ x: 0, y: 0, opacity: 0, scale: 0.95 }}
          x={0}
          y={0}
          opacity={1}
          scale={1}
          width="80%"
          maxWidth={320}
          height="100%"
          position="absolute"
          left={0}
          top={0}
          bottom={0}
        >
          <YStack
            flex={1}
            backgroundColor="$background"
          >
            {/* Header */}
            <XStack
              padding="$4"
              alignItems="center"
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
            >
              <Button
                chromeless
                size="$3"
                onPress={() => onOpenChange(false)}
                icon={ChevronLeft}
              />
              <Text
                fontSize="$6"
                fontWeight="600"
                marginLeft="$2"
              >
                History
              </Text>
            </XStack>

            {/* Content */}
            <ScrollView
              flex={1}
              padding="$4"
            >
              <YStack gap="$4">
                {/* Placeholder content - to be replaced with actual video history */}
                <YStack
                  padding="$4"
                  backgroundColor="$backgroundHover"
                  borderRadius="$4"
                  alignItems="center"
                  gap="$2"
                >
                  <History
                    size={48}
                    color="$color"
                  />
                  <Text
                    fontSize="$4"
                    textAlign="center"
                  >
                    Video History
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color"
                    textAlign="center"
                  >
                    Previous recordings will appear here
                  </Text>
                </YStack>

                {/* Placeholder items */}
                {[1, 2, 3].map((item) => (
                  <XStack
                    key={item}
                    padding="$3"
                    backgroundColor="$backgroundHover"
                    borderRadius="$4"
                    alignItems="center"
                    gap="$3"
                  >
                    <YStack
                      width={60}
                      height={60}
                      backgroundColor="$background"
                      borderRadius="$2"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text
                        fontSize="$3"
                        color="$color"
                      >
                        Video {item}
                      </Text>
                    </YStack>
                    <YStack flex={1}>
                      <Text
                        fontSize="$4"
                        fontWeight="500"
                      >
                        Recording {item}
                      </Text>
                      <Text
                        fontSize="$3"
                        color="$color"
                      >
                        {item} day{item !== 1 ? 's' : ''} ago
                      </Text>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
