import { useState } from 'react'

export interface ConfirmDialogState {
  /**
   * Whether the dialog is visible
   */
  isVisible: boolean

  /**
   * Show the confirmation dialog
   */
  show: () => void

  /**
   * Hide the dialog (cancel action)
   */
  hide: () => void

  /**
   * Confirm the action and hide dialog
   */
  confirm: () => void

  /**
   * Whether the action is currently processing
   */
  isProcessing: boolean
}

/**
 * useConfirmDialog Hook
 *
 * Manages confirmation dialog state for destructive actions.
 *
 * @param onConfirm - Callback when user confirms the action
 * @returns Dialog state and control methods
 *
 * @example
 * ```tsx
 * const logoutDialog = useConfirmDialog(async () => {
 *   await signOut()
 *   router.push('/login')
 * })
 *
 * // Trigger dialog
 * <Button onPress={logoutDialog.show}>Log out</Button>
 *
 * // Render dialog
 * <ConfirmDialog
 *   visible={logoutDialog.isVisible}
 *   onConfirm={logoutDialog.confirm}
 *   onCancel={logoutDialog.hide}
 * />
 * ```
 */
export function useConfirmDialog(onConfirm: () => void | Promise<void>): ConfirmDialogState {
  const [isVisible, setIsVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const show = (): void => {
    setIsVisible(true)
  }

  const hide = (): void => {
    setIsVisible(false)
  }

  const confirm = async (): Promise<void> => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
      setIsVisible(false)
    }
  }

  return {
    isVisible,
    show,
    hide,
    confirm,
    isProcessing,
  }
}
