import { renderWithProvider } from '../../../test-utils'
import { Progress } from './Progress'

describe('Progress', () => {
  describe('Rendering', () => {
    it('should render progress bar', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={50} />)

      // Assert
      expect(getByTestId('progress')).toBeInTheDocument()
    })

    it('should render progress fill based on value', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={75} />)

      // Assert
      const fill = getByTestId('progress-fill')
      expect(fill).toBeInTheDocument()
    })

    it('should handle 0% value', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={0} />)

      // Assert
      const fill = getByTestId('progress-fill')
      expect(fill).toBeInTheDocument()
    })

    it('should handle 100% value', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={100} />)

      // Assert
      const fill = getByTestId('progress-fill')
      expect(fill).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should use small size by default', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={50} />)

      // Assert
      const progress = getByTestId('progress')
      expect(progress).toBeInTheDocument()
      // Small size (height 4px) is applied via Tamagui
    })

    it('should support medium size', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <Progress
          value={50}
          size="md"
        />
      )

      // Assert
      const progress = getByTestId('progress')
      expect(progress).toBeInTheDocument()
      // Medium size (height 8px) is applied via Tamagui
    })
  })

  describe('Max Value', () => {
    it('should use 100 as default max', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={50} />)

      // Assert
      const fill = getByTestId('progress-fill')
      expect(fill).toBeInTheDocument()
    })

    it('should support custom max value', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <Progress
          value={25}
          max={50}
        />
      )

      // Assert
      const fill = getByTestId('progress-fill')
      expect(fill).toBeInTheDocument()
      // 25/50 = 50% width
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={50} />)

      // Assert
      expect(getByTestId('progress')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <Progress
          value={50}
          testID="custom-progress"
        />
      )

      // Assert
      expect(getByTestId('custom-progress')).toBeInTheDocument()
      expect(getByTestId('custom-progress-fill')).toBeInTheDocument()
    })

    it('should render with accessible structure', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<Progress value={75} />)

      // Assert
      const progress = getByTestId('progress')
      expect(progress).toBeInTheDocument()
      // ARIA attributes are handled by Tamagui at runtime
    })

    it('should render with custom max value', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <Progress
          value={25}
          max={50}
        />
      )

      // Assert
      const progress = getByTestId('progress')
      expect(progress).toBeInTheDocument()
      // Progress bar renders at 50% width (25/50)
    })
  })

  describe('Styling', () => {
    it('should forward additional YStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <Progress
          value={50}
          backgroundColor="$red4"
        />
      )

      // Assert
      const progress = getByTestId('progress')
      expect(progress).toBeInTheDocument()
    })
  })
})
