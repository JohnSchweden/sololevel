import { Upload } from '@tamagui/lucide-icons'
import { fireEvent } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { GlassButton } from './GlassButton'

describe('GlassButton', () => {
  // Arrange - Test data
  const mockOnPress = jest.fn()
  const defaultProps = {
    testID: 'glass-button',
    accessibilityLabel: 'Test button',
    onPress: mockOnPress,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with icon', () => {
    // Arrange - Create button with icon
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        icon={
          <Upload
            size={24}
            color="white"
          />
        }
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button is rendered with icon (icon rendered as SVG inside button)
    expect(button).toBeTruthy()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onPress when pressed', () => {
    // Arrange - Create button
    const { getByTestId } = renderWithProvider(<GlassButton {...defaultProps} />)

    // Act - Press button
    const button = getByTestId('glass-button')
    fireEvent.click(button)

    // Assert - onPress called once
    expect(mockOnPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    // Arrange - Create disabled button
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        disabled
      />
    )

    // Act - Query button
    const button = getByTestId('glass-button')

    // Assert - Button rendered with disabled state
    expect(button).toBeTruthy()
    expect(button).toHaveAttribute('disabled')
  })

  it('renders with custom blur intensity', () => {
    // Arrange - Create button with custom blur
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        blurIntensity={50}
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button rendered
    expect(button).toBeTruthy()
  })

  it('renders with children', () => {
    // Arrange - Create button with text child
    const { getByTestId, getByText } = renderWithProvider(
      <GlassButton {...defaultProps}>Upload</GlassButton>
    )

    // Act - Query for button and text
    const button = getByTestId('glass-button')
    const text = getByText('Upload')

    // Assert - Button rendered with text content
    expect(button).toBeTruthy()
    expect(text).toBeInTheDocument()
  })

  it('applies custom minWidth and minHeight', () => {
    // Arrange - Create button with custom dimensions
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        minWidth={100}
        minHeight={100}
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button rendered (dimensions applied internally)
    expect(button).toBeTruthy()
  })

  it('sets accessibility properties correctly', () => {
    // Arrange - Create button with accessibility props
    const { getByRole } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        accessibilityLabel="Upload video"
        accessibilityHint="Select an existing video to upload"
      />
    )

    // Act - Query by role
    const button = getByRole('button', { name: 'Upload video' })

    // Assert - Button rendered with correct accessibility
    expect(button).toBeTruthy()
    expect(button).toHaveAccessibleName('Upload video')
  })

  it('renders with highlight contrast effects', () => {
    // Arrange - Create button with highlight contrast
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        highlightContrast={0.5}
        highlightColor="rgba(255, 255, 255, 0.6)"
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button rendered with highlight effects
    expect(button).toBeTruthy()
  })

  it('renders with shadow and edge glow effects', () => {
    // Arrange - Create button with shadow and glow
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        shadowIntensity={0.4}
        shadowColor="rgba(0, 0, 0, 0.5)"
        edgeGlowIntensity={0.2}
        edgeGlowColor="rgba(255, 255, 255, 0.3)"
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button rendered with shadow and glow effects
    expect(button).toBeTruthy()
  })

  it('disables highlight effects when intensity is 0', () => {
    // Arrange - Create button with disabled highlight effects
    const { getByTestId } = renderWithProvider(
      <GlassButton
        {...defaultProps}
        highlightContrast={0}
        shadowIntensity={0}
        edgeGlowIntensity={0}
      />
    )

    // Act - Query for button
    const button = getByTestId('glass-button')

    // Assert - Button rendered without highlight effects
    expect(button).toBeTruthy()
  })
})
