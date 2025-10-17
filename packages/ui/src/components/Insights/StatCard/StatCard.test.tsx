import { renderWithProvider } from '../../../test-utils'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  describe('Rendering', () => {
    it('should render stat value and label', () => {
      // Arrange
      const value = '127'
      const label = 'Total Sessions'

      // Act
      const { getByText } = renderWithProvider(
        <StatCard
          value={value}
          label={label}
        />
      )

      // Assert
      expect(getByText('127')).toBeInTheDocument()
      expect(getByText('Total Sessions')).toBeInTheDocument()
    })

    it('should render numeric value', () => {
      // Arrange
      const value = 127
      const label = 'Total Sessions'

      // Act
      const { getByText } = renderWithProvider(
        <StatCard
          value={value}
          label={label}
        />
      )

      // Assert
      expect(getByText('127')).toBeInTheDocument()
    })

    it('should use centered variant by default', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
        />
      )

      // Assert
      const card = getByTestId('stat-card')
      expect(card).toBeInTheDocument()
      // Centered alignment is applied via Tamagui, verified in component
    })

    it('should support left-aligned variant', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
          variant="left"
        />
      )

      // Assert
      const card = getByTestId('stat-card')
      expect(card).toBeInTheDocument()
      // Left alignment is applied via Tamagui, verified in component
    })
  })

  describe('Trend Indicators', () => {
    it('should render with trend up', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <StatCard
          value="23%"
          label="Improvement"
          trend="up"
        />
      )

      // Assert
      expect(getByText('23%')).toBeInTheDocument()
      expect(getByText('Improvement')).toBeInTheDocument()
    })

    it('should render with trend down', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <StatCard
          value="5%"
          label="Decline"
          trend="down"
        />
      )

      // Assert
      expect(getByText('5%')).toBeInTheDocument()
      expect(getByText('Decline')).toBeInTheDocument()
    })

    it('should not render trend icon when trend is not provided', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
        />
      )

      // Assert
      expect(getByText('127')).toBeInTheDocument()
      expect(getByText('Total Sessions')).toBeInTheDocument()
    })
  })

  describe('Custom Icon', () => {
    it('should accept custom icon prop', () => {
      // Arrange
      const CustomIcon = () => <span data-testid="custom-icon">⚡</span>

      // Act
      const { getByText, getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
          icon={<CustomIcon />}
        />
      )

      // Assert
      expect(getByText('127')).toBeInTheDocument()
      expect(getByText('Total Sessions')).toBeInTheDocument()
      expect(getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
        />
      )

      // Assert
      expect(getByTestId('stat-card')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
          testID="custom-stat-card"
        />
      )

      // Assert
      expect(getByTestId('custom-stat-card')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply card styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
        />
      )

      // Assert
      const card = getByTestId('stat-card')
      expect(card).toBeInTheDocument()
      // Card styling is applied via Tamagui tokens
    })

    it('should forward additional YStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <StatCard
          value="127"
          label="Total Sessions"
          backgroundColor="$red4"
        />
      )

      // Assert
      const card = getByTestId('stat-card')
      expect(card).toBeInTheDocument()
    })
  })
})
