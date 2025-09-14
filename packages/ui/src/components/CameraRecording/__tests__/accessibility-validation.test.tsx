import { render, screen } from '@testing-library/react-native'
import { IdleControls } from '../CameraControls/IdleControls'

describe('IdleControls Accessibility Validation', () => {
  it('should have minimum 44x44px touch targets for all interactive elements', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
      />
    )

    // Test will fail initially - this is our RED state
    const recordButton = screen.getByLabelText('Start recording')
    const uploadButton = screen.getByLabelText('Upload video file')
    const cameraSwapButton = screen.getByLabelText('Switch camera')

    // Verify buttons exist and have proper accessibility roles
    expect(recordButton).toBeTruthy()
    expect(uploadButton).toBeTruthy()
    expect(cameraSwapButton).toBeTruthy()

    // Touch target size validation - buttons should be at least 44x44px
    // Record button: 88x88px (exceeds minimum)
    expect(
      recordButton.props.style?.minHeight || recordButton.props.children?.props?.height
    ).toBeGreaterThanOrEqual(44)
    expect(
      recordButton.props.style?.minWidth || recordButton.props.children?.props?.width
    ).toBeGreaterThanOrEqual(44)

    // Upload and Camera Swap buttons: 56x56px (exceeds minimum)
    expect(uploadButton.props.style?.minHeight).toBeGreaterThanOrEqual(44)
    expect(uploadButton.props.style?.minWidth).toBeGreaterThanOrEqual(44)
    expect(cameraSwapButton.props.style?.minHeight).toBeGreaterThanOrEqual(44)
    expect(cameraSwapButton.props.style?.minWidth).toBeGreaterThanOrEqual(44)
  })

  it('should provide proper accessibility labels and hints', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
      />
    )

    // Test accessibility labels exist and are descriptive
    expect(screen.getByLabelText('Start recording')).toBeTruthy()
    expect(screen.getByLabelText('Upload video file')).toBeTruthy()
    expect(screen.getByLabelText('Switch camera')).toBeTruthy()

    // Test accessibility hints provide context
    const recordButton = screen.getByLabelText('Start recording')
    const uploadButton = screen.getByLabelText('Upload video file')
    const cameraSwapButton = screen.getByLabelText('Switch camera')

    // Verify accessibility props exist - Pressable uses accessibilityHint, Tamagui Button uses aria-describedby
    expect(recordButton.props.accessibilityHint).toBe('Press to start recording a new video')
    expect(uploadButton.props['aria-describedby']).toBe(
      'Select an existing video to upload for analysis'
    )
    expect(cameraSwapButton.props['aria-describedby']).toBe('Switch between front and back camera')
  })

  it('should handle disabled state accessibility correctly', () => {
    render(
      <IdleControls
        onStartRecording={() => {}}
        onUploadVideo={() => {}}
        onCameraSwap={() => {}}
        disabled={true}
      />
    )

    const recordButton = screen.getByLabelText('Start recording')
    const uploadButton = screen.getByLabelText('Upload video file')
    const cameraSwapButton = screen.getByLabelText('Switch camera')

    // Disabled buttons should be announced to screen readers
    // Tamagui uses aria-disabled for disabled state
    expect(recordButton.props['aria-disabled']).toBe(true)
    expect(uploadButton.props['aria-disabled']).toBe(true)
    expect(cameraSwapButton.props['aria-disabled']).toBe(true)
  })
})
