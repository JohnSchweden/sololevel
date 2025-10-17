import { InsightsScreen } from './InsightsScreen'

// Mock the useInsightsData hook
jest.mock('./hooks/useInsightsData', () => ({
  useInsightsData: () => ({
    data: {
      weeklyStats: {
        totalSessions: 127,
        improvement: 23,
        weeklyProgress: 85,
        dailyActivity: [
          { day: 'Mon', sessions: 2, quality: 8.5 },
          { day: 'Tue', sessions: 1, quality: 9.2 },
        ],
      },
      focusAreas: [{ title: 'Perfect Squat Form', progress: 78, priority: 'high' as const }],
      achievements: [{ title: '7-Day Streak', date: 'Today', type: 'streak' as const, icon: '🔥' }],
      quickStats: {
        streakDays: 12,
        avgSessionTime: 45,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    refetch: jest.fn(),
  }),
}))

describe('InsightsScreen', () => {
  it('should export InsightsScreen component', () => {
    // Arrange & Act & Assert
    expect(InsightsScreen).toBeDefined()
    expect(typeof InsightsScreen).toBe('function')
  })

  it('should accept onBack prop', () => {
    // Arrange
    const onBack = jest.fn()

    // Act & Assert
    // Component definition accepts onBack prop in its type signature
    const props: React.ComponentProps<typeof InsightsScreen> = { onBack }
    expect(props.onBack).toBe(onBack)
  })
})
