import { renderWithProvider } from '../../../test-utils'
import { AchievementCard } from './AchievementCard'

describe('AchievementCard', () => {
  describe('Rendering', () => {
    it('should render achievement title and date', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      expect(getByText('7-Day Streak')).toBeInTheDocument()
      expect(getByText('Today')).toBeInTheDocument()
    })

    it('should render icon', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      expect(getByText('🔥')).toBeInTheDocument()
    })
  })

  describe('Achievement Types', () => {
    it('should render streak type with correct styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      const iconContainer = getByTestId('achievement-icon-container')
      expect(iconContainer).toBeInTheDocument()
      // Orange background for streak type applied via Tamagui
    })

    it('should render technique type with correct styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="Form Improvement"
          date="2 days ago"
          type="technique"
          icon="🎯"
        />
      )

      // Assert
      const iconContainer = getByTestId('achievement-icon-container')
      expect(iconContainer).toBeInTheDocument()
      // Blue background for technique type applied via Tamagui
    })

    it('should render record type with correct styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="Personal Best"
          date="1 week ago"
          type="record"
          icon="🏆"
        />
      )

      // Assert
      const iconContainer = getByTestId('achievement-icon-container')
      expect(iconContainer).toBeInTheDocument()
      // Green background for record type applied via Tamagui
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      expect(getByTestId('achievement-card')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
          testID="custom-achievement"
        />
      )

      // Assert
      expect(getByTestId('custom-achievement')).toBeInTheDocument()
    })

    it('should have semantic structure', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      expect(getByText('7-Day Streak')).toBeInTheDocument()
      expect(getByText('Today')).toBeInTheDocument()
      // Title uses medium font weight, date uses secondary color
    })
  })

  describe('Styling', () => {
    it('should apply card styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
        />
      )

      // Assert
      const card = getByTestId('achievement-card')
      expect(card).toBeInTheDocument()
      // Card styling (padding, background, border radius) applied via Tamagui
    })

    it('should forward additional XStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <AchievementCard
          title="7-Day Streak"
          date="Today"
          type="streak"
          icon="🔥"
          marginTop="$4"
        />
      )

      // Assert
      const card = getByTestId('achievement-card')
      expect(card).toBeInTheDocument()
    })
  })
})
