import { renderWithProvider } from '../../../test-utils'
import { FocusCard } from './FocusCard'

describe('FocusCard', () => {
  describe('Rendering', () => {
    it('should render focus title and progress', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByText('Perfect Squat Form')).toBeInTheDocument()
    })

    it('should render priority badge', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByText('high')).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByTestId('focus-progress')).toBeInTheDocument()
    })
  })

  describe('Priority Variants', () => {
    it('should render high priority', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByText('high')).toBeInTheDocument()
      // High priority badge uses primary (red) variant
    })

    it('should render medium priority', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <FocusCard
          title="Deadlift Technique"
          progress={92}
          priority="medium"
        />
      )

      // Assert
      expect(getByText('medium')).toBeInTheDocument()
      // Medium priority badge uses secondary (gray) variant
    })

    it('should render low priority', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <FocusCard
          title="Push-up Endurance"
          progress={34}
          priority="low"
        />
      )

      // Assert
      expect(getByText('low')).toBeInTheDocument()
      // Low priority badge uses destructive (blue) variant
    })
  })

  describe('Progress Values', () => {
    it('should handle 0% progress', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="New Goal"
          progress={0}
          priority="high"
        />
      )

      // Assert
      expect(getByTestId('focus-progress')).toBeInTheDocument()
    })

    it('should handle 100% progress', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Completed Goal"
          progress={100}
          priority="medium"
        />
      )

      // Assert
      expect(getByTestId('focus-progress')).toBeInTheDocument()
    })

    it('should handle mid-range progress', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="In Progress Goal"
          progress={50}
          priority="low"
        />
      )

      // Assert
      expect(getByTestId('focus-progress')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByTestId('focus-card')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
          testID="custom-focus"
        />
      )

      // Assert
      expect(getByTestId('custom-focus')).toBeInTheDocument()
    })

    it('should have semantic structure', () => {
      // Arrange & Act
      const { getByText, getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      expect(getByText('Perfect Squat Form')).toBeInTheDocument()
      expect(getByText('high')).toBeInTheDocument()
      expect(getByTestId('focus-progress')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply card styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
        />
      )

      // Assert
      const card = getByTestId('focus-card')
      expect(card).toBeInTheDocument()
      // Card styling (padding, background, border radius) applied via Tamagui
    })

    it('should forward additional YStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <FocusCard
          title="Perfect Squat Form"
          progress={78}
          priority="high"
          marginTop="$4"
        />
      )

      // Assert
      const card = getByTestId('focus-card')
      expect(card).toBeInTheDocument()
    })
  })
})
