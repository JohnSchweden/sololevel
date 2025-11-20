import { X } from '@tamagui/lucide-icons'
import { BlurView } from 'expo-blur'
import type React from 'react'
import { Button, Dialog, Spinner, Text, XStack, YStack } from 'tamagui'

export interface ConfirmDialogProps {
  /**
   * Whether the dialog is visible
   */
  visible: boolean

  /**
   * Dialog title
   */
  title: string

  /**
   * Dialog message/description
   */
  message: string

  /**
   * Confirm button label
   * @default "Confirm"
   */
  confirmLabel?: string

  /**
   * Cancel button label
   * @default "Cancel"
   */
  cancelLabel?: string

  /**
   * Whether the confirm action is processing
   * @default false
   */
  isProcessing?: boolean

  /**
   * Callback when user confirms
   */
  onConfirm: () => void

  /**
   * Callback when user cancels
   */
  onCancel: () => void

  /**
   * Test ID for testing
   */
  testID?: string

  /**
   * Dialog variant
   * @default "destructive"
   */
  variant?: 'destructive' | 'success'
}

/**
 * ConfirmDialog Component
 *
 * Modal dialog for confirming destructive or important actions.
 * Cross-platform design with clear confirm/cancel actions.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   visible={isVisible}
 *   title="Log out"
 *   message="Are you sure you want to log out?"
 *   confirmLabel="Log out"
 *   onConfirm={handleLogout}
 *   onCancel={() => setIsVisible(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isProcessing = false,
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
  variant = 'destructive',
}: ConfirmDialogProps): React.ReactElement {
  const confirmButtonColor = variant === 'success' ? '$blue9' : '$red8'
  const confirmButtonPressColor = variant === 'success' ? '$blue10' : '$red9'
  return (
    <Dialog
      modal
      open={visible}
      onOpenChange={(open) => !open && onCancel()}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$color1"
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          maxWidth={400}
          testID={testID}
          position="relative"
          overflow="hidden"
          backgroundColor="transparent"
          borderRadius="$8"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.3)"
        >
          <BlurView
            intensity={20}
            tint="light"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 24,
            }}
          />
          <YStack
            gap="$4"
            padding="$4"
            position="relative"
            zIndex={1}
          >
            {/* Title */}
            <Dialog.Title>
              <Text
                fontSize="$7"
                fontWeight="600"
                color="$color12"
                letterSpacing={0}
              >
                {title}
              </Text>
            </Dialog.Title>

            {/* Message */}
            <Dialog.Description>
              <Text
                fontSize="$5"
                color="$color11"
                lineHeight="$6"
              >
                {message}
              </Text>
            </Dialog.Description>

            {/* Actions */}
            <XStack
              gap="$3"
              justifyContent="flex-end"
              marginTop="$2"
            >
              {variant === 'destructive' && (
                <Button
                  unstyled
                  onPress={onCancel}
                  disabled={isProcessing}
                  paddingHorizontal="$5"
                  paddingVertical="$3"
                  borderRadius="$4"
                  backgroundColor="$color3"
                  animation="quick"
                  pressStyle={{ backgroundColor: '$color4', scale: 0.98 }}
                  testID={`${testID}-cancel-button`}
                >
                  <Text
                    fontSize="$4"
                    fontWeight="500"
                    color="$color12"
                  >
                    {cancelLabel}
                  </Text>
                </Button>
              )}

              <Button
                unstyled
                onPress={onConfirm}
                disabled={isProcessing}
                paddingHorizontal="$5"
                paddingVertical="$3"
                borderRadius="$4"
                backgroundColor={confirmButtonColor}
                animation="quick"
                pressStyle={{ backgroundColor: confirmButtonPressColor, scale: 0.98 }}
                testID={`${testID}-confirm-button`}
              >
                {isProcessing ? (
                  // @ts-ignore - TS union type complexity limit
                  <Spinner
                    size="small"
                    color="$color12"
                  />
                ) : (
                  <Text
                    fontSize="$4"
                    fontWeight="500"
                    color="$color12"
                  >
                    {confirmLabel}
                  </Text>
                )}
              </Button>
            </XStack>
          </YStack>

          <Dialog.Close asChild>
            <Button
              position="absolute"
              top="$1"
              right="$1"
              unstyled
              padding="$2"
              minWidth={44}
              minHeight={44}
              alignItems="center"
              justifyContent="center"
              onPress={onCancel}
              testID={`${testID}-close-button`}
              zIndex={2}
              animation="quick"
              hoverStyle={{ opacity: 0.7, scale: 1.1 }}
              pressStyle={{ opacity: 0.5, scale: 0.95 }}
            >
              <X
                size="$1"
                color="$color12"
              />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
