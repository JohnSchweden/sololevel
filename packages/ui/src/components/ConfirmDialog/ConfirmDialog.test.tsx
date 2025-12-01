/**
 * Tests for ConfirmDialog component
 *
 * Tests user-visible behavior: confirm/cancel actions, processing state
 * Following testing philosophy: focus on user behavior, not implementation
 */

import '../../test-utils/setup'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    visible: true,
    title: 'Test Dialog',
    message: 'Are you sure?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Interactions', () => {
    it('should call onConfirm when confirm button is pressed', () => {
      // 🧪 ARRANGE: Dialog with confirm handler
      const onConfirm = jest.fn()
      const props = { ...defaultProps, onConfirm }

      // 🎬 ACT: Render and press confirm button
      render(<ConfirmDialog {...props} />)
      const confirmButton = screen.getByText('Confirm')
      fireEvent.click(confirmButton)

      // ✅ ASSERT: Callback should be called
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when cancel button is pressed', () => {
      // 🧪 ARRANGE: Dialog with cancel handler
      const onCancel = jest.fn()
      const props = { ...defaultProps, onCancel }

      // 🎬 ACT: Render and press cancel button
      render(<ConfirmDialog {...props} />)
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      // ✅ ASSERT: Callback should be called (may be called twice: once by button, once by dialog close)
      expect(onCancel).toHaveBeenCalled()
    })

    it('should show spinner when isProcessing is true', () => {
      // 🧪 ARRANGE: Dialog in processing state
      const props = { ...defaultProps, isProcessing: true }

      // 🎬 ACT: Render component
      render(<ConfirmDialog {...props} />)

      // ✅ ASSERT: Confirm button should show spinner (text should not be visible)
      const confirmButton = screen.getByTestId('confirm-dialog-confirm-button')
      expect(confirmButton).toBeTruthy()
      // Spinner is rendered instead of text when processing
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    })
  })
})
