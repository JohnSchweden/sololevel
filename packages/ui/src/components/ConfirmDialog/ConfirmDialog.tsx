import React from 'react'
import { Platform, type StyleProp, type ViewStyle, useWindowDimensions } from 'react-native'
import { Button, Dialog, Spinner, Text, XStack, YStack } from 'tamagui'
import { BlurView } from '../BlurView/BlurView'

// Stable style constants - prevent re-renders from inline objects
const OVERLAY_ENTER_STYLE = { opacity: 0 } as const
const OVERLAY_EXIT_STYLE = { opacity: 0 } as const
const CONTENT_ENTER_STYLE = { x: 0, y: -20, opacity: 0, scale: 0.9 } as const
const CONTENT_EXIT_STYLE = { x: 0, y: 10, opacity: 0, scale: 0.95 } as const
const CONTENT_ANIMATION: [
  'quick',
  {
    opacity: {
      overshootClamping: true
    }
  },
] = [
  'quick',
  {
    opacity: {
      overshootClamping: true,
    },
  },
]
const BLUR_STYLE: StyleProp<ViewStyle> = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 24,
}
const ANDROID_FALLBACK_STYLE: StyleProp<ViewStyle> = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 16,
}
const CANCEL_PRESS_STYLE = { backgroundColor: '$color4', scale: 0.98 } as const
const CONFIRM_PRESS_STYLE_DESTRUCTIVE = { backgroundColor: '$red9', scale: 0.98 } as const
const CONFIRM_PRESS_STYLE_SUCCESS = { backgroundColor: '$blue10', scale: 0.98 } as const

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

  /**
   * Maximum width of the dialog
   * @default undefined (uses responsive width: screenWidth - 36)
   */
  maxWidth?: number | string

  /**
   * Width of the dialog (overrides maxWidth for full-width dialogs)
   * @default undefined (uses responsive width: screenWidth - 36)
   */
  width?: number | string
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
export const ConfirmDialog = React.memo(function ConfirmDialog({
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
  maxWidth,
  width,
}: ConfirmDialogProps): React.ReactElement {
  const { width: screenWidth } = useWindowDimensions()

  // Calculate responsive width: screenWidth - 36 (18px padding on each side)
  // This ensures consistent dialog width across all screen sizes
  const responsiveWidth = screenWidth - 36

  // Use provided width, or maxWidth, or default to responsive width
  const dialogWidth =
    width !== undefined
      ? typeof width === 'number'
        ? width
        : Number.parseInt(String(width), 10)
      : maxWidth !== undefined
        ? undefined // Let maxWidth be applied
        : responsiveWidth

  const dialogMaxWidth =
    width === undefined && maxWidth !== undefined
      ? typeof maxWidth === 'number'
        ? maxWidth
        : Number.parseInt(String(maxWidth), 10)
      : undefined

  const confirmButtonColor = variant === 'success' ? '$blue9' : '$red8'
  const confirmPressStyle =
    variant === 'success' ? CONFIRM_PRESS_STYLE_SUCCESS : CONFIRM_PRESS_STYLE_DESTRUCTIVE

  // Stable callback for dialog open change
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) onCancel()
    },
    [onCancel]
  )

  return (
    <Dialog
      modal
      open={visible}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={OVERLAY_ENTER_STYLE}
          exitStyle={OVERLAY_EXIT_STYLE}
          backgroundColor="$color1"
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={CONTENT_ANIMATION}
          enterStyle={CONTENT_ENTER_STYLE}
          exitStyle={CONTENT_EXIT_STYLE}
          {...(dialogWidth !== undefined ? { width: dialogWidth } : {})}
          {...(dialogMaxWidth !== undefined ? { maxWidth: dialogMaxWidth } : {})}
          testID={testID}
          position="relative"
          overflow="hidden"
          backgroundColor="transparent"
          borderRadius="$6"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.3)"
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={20}
              tint="light"
              style={BLUR_STYLE}
            />
          ) : (
            <YStack
              backgroundColor="rgba(0, 0, 0, 0.7)"
              style={ANDROID_FALLBACK_STYLE}
            />
          )}
          <YStack
            gap="$4"
            //padding="$4"
            position="relative"
            zIndex={1}
          >
            {/* Title */}
            <Dialog.Title>
              <Text
                fontSize="$5"
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
                fontSize="$4"
                color="$color11"
                lineHeight="$6"
              >
                {message}
              </Text>
            </Dialog.Description>

            {/* Actions */}
            <XStack
              gap="$3"
              marginTop="$2"
            >
              {variant === 'destructive' && (
                <Button
                  unstyled
                  flex={1}
                  onPress={onCancel}
                  disabled={isProcessing}
                  paddingHorizontal="$5"
                  paddingVertical="$3"
                  borderRadius="$4"
                  backgroundColor="$color3"
                  animation="quick"
                  pressStyle={CANCEL_PRESS_STYLE}
                  testID={`${testID}-cancel-button`}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    fontSize="$4"
                    fontWeight="500"
                    color="$color12"
                    textAlign="center"
                  >
                    {cancelLabel}
                  </Text>
                </Button>
              )}

              <Button
                unstyled
                flex={variant === 'destructive' ? 1 : undefined}
                width={variant === 'destructive' ? undefined : '100%'}
                onPress={onConfirm}
                disabled={isProcessing}
                paddingHorizontal="$5"
                paddingVertical="$3"
                borderRadius="$4"
                backgroundColor={confirmButtonColor}
                animation="quick"
                pressStyle={confirmPressStyle}
                testID={`${testID}-confirm-button`}
                alignItems="center"
                justifyContent="center"
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
                    textAlign="center"
                  >
                    {confirmLabel}
                  </Text>
                )}
              </Button>
            </XStack>
          </YStack>

          {/* <Dialog.Close asChild>
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
          </Dialog.Close> */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
})

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(ConfirmDialog as unknown as { whyDidYouRender: boolean }).whyDidYouRender = true
}
