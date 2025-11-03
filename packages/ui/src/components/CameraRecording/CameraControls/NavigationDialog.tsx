import { shadows } from '@my/config'
import { AlertTriangle } from '@tamagui/lucide-icons'
import { Dialog, XStack, YStack } from 'tamagui'
import { Button } from 'tamagui'

export interface NavigationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  onCancel: () => void
  recordingDuration?: number
  title?: string
  message?: string
}

/**
 * Navigation Confirmation Dialog
 * Warning modal for navigation during recording to prevent data loss
 * Implements US-RU-07: Confirm navigation away while recording
 */
export function NavigationDialog({
  open,
  onOpenChange,
  onDiscard,
  onCancel,
  recordingDuration = 0,
  title = 'Discard Recording?',
  message,
}: NavigationDialogProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const defaultMessage =
    recordingDuration > 0
      ? `You have an unsaved recording (${formatDuration(recordingDuration)}). If you navigate away now, this recording will be lost.`
      : 'You have an active recording session. If you navigate away now, your progress will be lost.'

  const finalMessage = message || defaultMessage

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          {...shadows.xlarge}
          key="content"
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          maxWidth={400}
          backgroundColor="$background"
          borderRadius="$4"
        >
          {/* Header with Warning Icon */}
          <XStack
            alignItems="center"
            gap="$3"
            paddingTop="$2"
          >
            <YStack
              backgroundColor="$color2"
              padding="$2"
              borderRadius="$4"
              alignItems="center"
              justifyContent="center"
            >
              <AlertTriangle
                size="$1.5"
                color="$color10"
              />
            </YStack>

            <Dialog.Title
              fontSize="$6"
              fontWeight="600"
              color="$color12"
              flex={1}
            >
              {title}
            </Dialog.Title>
          </XStack>

          {/* Warning Message */}
          <Dialog.Description
            fontSize="$4"
            color="$color11"
            lineHeight="$5"
          >
            {finalMessage}
          </Dialog.Description>

          {/* Action Buttons */}
          <XStack
            gap="$3"
            paddingTop="$2"
          >
            <Dialog.Close
              displayWhenAdapted
              asChild
            >
              <Button
                flex={1}
                variant="outlined"
                onPress={onCancel}
                minHeight={44}
                accessibilityRole="button"
                accessibilityLabel="Cancel navigation"
                accessibilityHint="Keep recording and stay on this screen"
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Dialog.Close
              displayWhenAdapted
              asChild
            >
              <Button
                flex={1}
                backgroundColor="$red9"
                color="white"
                onPress={onDiscard}
                minHeight={44}
                animation="quick"
                hoverStyle={{ backgroundColor: '$red10' }}
                pressStyle={{ backgroundColor: '$red10', scale: 0.98 }}
                accessibilityRole="button"
                accessibilityLabel="Discard recording"
                accessibilityHint="Delete the current recording and navigate away"
              >
                Discard
              </Button>
            </Dialog.Close>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'warning' | 'error' | 'info'
}

/**
 * Generic Confirmation Dialog
 * Reusable dialog for various confirmation scenarios
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
}: ConfirmationDialogProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case 'error':
        return {
          iconColor: '$color10',
          iconBg: '$color2',
          buttonColor: '$color9',
          buttonHover: '$color10',
          icon: (
            <AlertTriangle
              size="$1.5"
              color="$color10"
            />
          ),
        }
      case 'info':
        return {
          iconColor: '$color10',
          iconBg: '$color2',
          buttonColor: '$color9',
          buttonHover: '$color10',
          icon: (
            <AlertTriangle
              size="$1.5"
              color="$color10"
            />
          ),
        }
      default:
        return {
          iconColor: '$color10',
          iconBg: '$color2',
          buttonColor: '$color9',
          buttonHover: '$color10',
          icon: (
            <AlertTriangle
              size="$1.5"
              color="$color10"
            />
          ),
        }
    }
  }

  const config = getVariantConfig()

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          {...shadows.xlarge}
          key="content"
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          maxWidth={400}
          backgroundColor="$background"
          borderRadius="$4"
        >
          {/* Header */}
          <XStack
            alignItems="center"
            gap="$3"
            paddingTop="$2"
          >
            <YStack
              backgroundColor="$color2"
              padding="$2"
              borderRadius="$4"
              alignItems="center"
              justifyContent="center"
            >
              {config.icon}
            </YStack>

            <Dialog.Title
              fontSize="$6"
              fontWeight="600"
              color="$color12"
              flex={1}
            >
              {title}
            </Dialog.Title>
          </XStack>

          {/* Message */}
          <Dialog.Description
            fontSize="$4"
            color="$color11"
            lineHeight="$5"
          >
            {message}
          </Dialog.Description>

          {/* Action Buttons */}
          <XStack
            gap="$3"
            paddingTop="$2"
          >
            <Dialog.Close
              displayWhenAdapted
              asChild
            >
              <Button
                flex={1}
                variant="outlined"
                onPress={onCancel}
                minHeight={44}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                {cancelLabel}
              </Button>
            </Dialog.Close>

            <Dialog.Close
              displayWhenAdapted
              asChild
            >
              <Button
                flex={1}
                backgroundColor="$color9"
                color="white"
                onPress={onConfirm}
                minHeight={44}
                animation="quick"
                hoverStyle={{ backgroundColor: '$color10' }}
                pressStyle={{ backgroundColor: '$color10', scale: 0.98 }}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
              >
                {confirmLabel}
              </Button>
            </Dialog.Close>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
