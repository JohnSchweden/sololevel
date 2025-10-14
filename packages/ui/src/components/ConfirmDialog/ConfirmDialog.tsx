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
}: ConfirmDialogProps): React.ReactElement {
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
          backgroundColor="$black"
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
        >
          <YStack
            gap="$4"
            padding="$4"
          >
            {/* Title */}
            <Dialog.Title>
              <Text
                fontSize="$7"
                fontWeight="600"
                color="$color12"
              >
                {title}
              </Text>
            </Dialog.Title>

            {/* Message */}
            <Dialog.Description>
              <Text
                fontSize="$5"
                color="$gray11"
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
              <Button
                unstyled
                onPress={onCancel}
                disabled={isProcessing}
                paddingHorizontal="$5"
                paddingVertical="$3"
                borderRadius="$4"
                backgroundColor="$gray3"
                pressStyle={{ backgroundColor: '$gray4', scale: 0.98 }}
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

              <Button
                unstyled
                onPress={onConfirm}
                disabled={isProcessing}
                paddingHorizontal="$5"
                paddingVertical="$3"
                borderRadius="$4"
                backgroundColor="$red8"
                pressStyle={{ backgroundColor: '$red9', scale: 0.98 }}
                testID={`${testID}-confirm-button`}
              >
                {isProcessing ? (
                  <Spinner
                    size="small"
                    color="$white"
                  />
                ) : (
                  <Text
                    fontSize="$4"
                    fontWeight="500"
                    color="$white"
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
              top="$2"
              right="$2"
              size="$2"
              circular
              onPress={onCancel}
              testID={`${testID}-close-button`}
            >
              ×
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
