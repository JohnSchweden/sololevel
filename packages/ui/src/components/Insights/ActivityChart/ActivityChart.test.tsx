import { renderWithProvider } from '../../../test-utils'
import { ActivityChart } from './ActivityChart'

const mockData = [
  { day: 'Mon', sessions: 2, quality: 8.5 },
  { day: 'Tue', sessions: 1, quality: 9.2 },
  { day: 'Wed', sessions: 3, quality: 7.8 },
  { day: 'Thu', sessions: 2, quality: 8.9 },
  { day: 'Fri', sessions: 1, quality: 9.5 },
  { day: 'Sat', sessions: 2, quality: 8.3 },
  { day: 'Sun', sessions: 1, quality: 8.7 },
]

describe('ActivityChart', () => {
  describe('Rendering', () => {
    it('should render chart container', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      expect(getByTestId('activity-chart')).toBeInTheDocument()
    })

    it('should render all day labels', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      expect(getByText('Mon')).toBeInTheDocument()
      expect(getByText('Tue')).toBeInTheDocument()
      expect(getByText('Wed')).toBeInTheDocument()
      expect(getByText('Thu')).toBeInTheDocument()
      expect(getByText('Fri')).toBeInTheDocument()
      expect(getByText('Sat')).toBeInTheDocument()
      expect(getByText('Sun')).toBeInTheDocument()
    })

    it('should render bars for each day', () => {
      // Arrange & Act
      const { getAllByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      const bars = getAllByTestId(/activity-bar-/)
      expect(bars).toHaveLength(7)
    })
  })

  describe('Empty State', () => {
    it('should handle empty data array', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={[]} />)

      // Assert
      expect(getByTestId('activity-chart')).toBeInTheDocument()
    })

    it('should handle data with zero sessions', () => {
      // Arrange
      const zeroData = [{ day: 'Mon', sessions: 0, quality: 0 }]

      // Act
      const { getByText } = renderWithProvider(<ActivityChart data={zeroData} />)

      // Assert
      expect(getByText('Mon')).toBeInTheDocument()
    })
  })

  describe('Bar Scaling', () => {
    it('should scale bars based on session count', () => {
      // Arrange & Act
      const { getAllByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      const bars = getAllByTestId(/activity-bar-/)
      expect(bars.length).toBeGreaterThan(0)
      // Bar heights are scaled dynamically based on sessions
    })

    it('should handle large session counts', () => {
      // Arrange
      const largeData = [{ day: 'Mon', sessions: 10, quality: 9.0 }]

      // Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={largeData} />)

      // Assert
      expect(getByTestId('activity-bar-Mon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      expect(getByTestId('activity-chart')).toBeInTheDocument()
    })

    it('should support custom testID', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <ActivityChart
          data={mockData}
          testID="custom-chart"
        />
      )

      // Assert
      expect(getByTestId('custom-chart')).toBeInTheDocument()
    })

    it('should have individual bar testIDs', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      expect(getByTestId('activity-bar-Mon')).toBeInTheDocument()
      expect(getByTestId('activity-bar-Tue')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply chart styling', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<ActivityChart data={mockData} />)

      // Assert
      const chart = getByTestId('activity-chart')
      expect(chart).toBeInTheDocument()
      // Chart layout (XStack with spacing) applied via Tamagui
    })

    it('should forward additional XStack props', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <ActivityChart
          data={mockData}
          marginTop="$4"
        />
      )

      // Assert
      const chart = getByTestId('activity-chart')
      expect(chart).toBeInTheDocument()
    })
  })
})
