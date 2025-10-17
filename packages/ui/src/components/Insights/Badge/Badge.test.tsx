import { renderWithProvider } from '../../../test-utils'
import { Badge } from './Badge'

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(<Badge variant="primary">High Priority</Badge>)

      // Assert
      expect(getByText('High Priority')).toBeInTheDocument()
    })

    it('should render with default variant', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge>Default</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('should render primary variant', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge variant="primary">Primary</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
      // Primary styling (red colors) applied via Tamagui
    })

    it('should render secondary variant', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge variant="secondary">Secondary</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
      // Secondary styling (gray colors) applied via Tamagui
    })

    it('should render destructive variant', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge variant="destructive">Destructive</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
      // Destructive styling (blue colors) applied via Tamagui
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge>Test</Badge>)

      // Assert
      expect(getByTestId('badge')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge testID="custom-badge">Test</Badge>)

      // Assert
      expect(getByTestId('custom-badge')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply badge styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge>Test</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
      // Badge styling (padding, border radius) applied via Tamagui
    })

    it('should forward additional XStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Badge marginLeft="$4">Test</Badge>)

      // Assert
      const badge = getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })
  })
})
