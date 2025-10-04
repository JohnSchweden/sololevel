import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { IdleControls } from '../CameraControls/IdleControls'

// Mocks are handled globally in src/test-utils/setup.ts

describe('IdleControls Accessibility Validation', () => {
  it('should have accessible interactive elements', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
      />
    )

    // Verify all interactive elements are accessible by their labels
    // This is the most important accessibility test
    const recordButton = screen.getByLabelText('Start recording')
    const uploadButton = screen.getByLabelText('Upload video file')
    const cameraSwapButton = screen.getByLabelText('Switch camera')

    // Verify buttons exist and are properly accessible
    expect(recordButton).toBeTruthy()
    expect(uploadButton).toBeTruthy()
    expect(cameraSwapButton).toBeTruthy()
  })

  it('should provide proper accessibility labels', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
      />
    )

    // Test that all interactive elements can be found by their accessibility labels
    // This verifies the accessibility implementation is working correctly
    expect(screen.getByLabelText('Start recording')).toBeTruthy()
    expect(screen.getByLabelText('Upload video file')).toBeTruthy()
    expect(screen.getByLabelText('Switch camera')).toBeTruthy()
  })

  it('should handle disabled state accessibility', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
        disabled={true}
      />
    )

    // Verify buttons are still accessible by their labels when disabled
    // This ensures screen readers can still find and announce the buttons
    expect(screen.getByLabelText('Start recording')).toBeTruthy()
    expect(screen.getByLabelText('Upload video file')).toBeTruthy()
    expect(screen.getByLabelText('Switch camera')).toBeTruthy()
  })
})
