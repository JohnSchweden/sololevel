import { log } from '@my/logging'
import { useQuery } from '@tanstack/react-query'

/**
 * Daily activity data point
 */
export interface DailyActivity {
  day: string
  sessions: number
  quality: number
}

/**
 * Weekly statistics overview
 */
export interface WeeklyStats {
  totalSessions: number
  improvement: number
  weeklyProgress: number
  dailyActivity: DailyActivity[]
}

/**
 * Focus area/goal with progress
 */
export interface FocusArea {
  title: string
  progress: number
  priority: 'high' | 'medium' | 'low'
}

/**
 * Achievement entry
 */
export interface Achievement {
  title: string
  date: string
  type: 'streak' | 'technique' | 'record'
  icon: string
}

/**
 * Quick stats summary
 */
export interface QuickStats {
  streakDays: number
  avgSessionTime: number
}

/**
 * Complete insights data structure
 */
export interface InsightsData {
  weeklyStats: WeeklyStats
  focusAreas: FocusArea[]
  achievements: Achievement[]
  quickStats: QuickStats
}

/**
 * Mock data for development
 * TODO: Replace with actual API calls in backend integration phase
 */
const mockInsightsData: InsightsData = {
  weeklyStats: {
    totalSessions: 127,
    improvement: 23,
    weeklyProgress: 85,
    dailyActivity: [
      { day: 'Mon', sessions: 2, quality: 8.5 },
      { day: 'Tue', sessions: 1, quality: 9.2 },
      { day: 'Wed', sessions: 3, quality: 7.8 },
      { day: 'Thu', sessions: 2, quality: 8.9 },
      { day: 'Fri', sessions: 1, quality: 9.5 },
      { day: 'Sat', sessions: 2, quality: 8.3 },
      { day: 'Sun', sessions: 1, quality: 8.7 },
    ],
  },
  focusAreas: [
    { title: 'Perfect Squat Form', progress: 78, priority: 'high' },
    { title: 'Deadlift Technique', progress: 92, priority: 'medium' },
    { title: 'Push-up Endurance', progress: 34, priority: 'high' },
  ],
  achievements: [
    { title: '7-Day Streak', date: 'Today', type: 'streak', icon: '🔥' },
    { title: 'Form Improvement', date: '2 days ago', type: 'technique', icon: '🎯' },
    { title: 'Personal Best', date: '1 week ago', type: 'record', icon: '🏆' },
  ],
  quickStats: {
    streakDays: 12,
    avgSessionTime: 45,
  },
}

/**
 * Hook for fetching insights data
 *
 * Currently returns mock data for UI development.
 * Will be replaced with actual API integration in backend phase.
 *
 * @returns Query result with insights data
 */
export function useInsightsData() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async (): Promise<InsightsData> => {
      const startTime = Date.now()

      //  Simulate API call delay (disabled in test environment)
      if (process.env.NODE_ENV !== 'test') {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const duration = Date.now() - startTime

      log.debug('useInsightsData', 'Mock data loaded', {
        duration,
        weeklySessionsCount: mockInsightsData.weeklyStats.totalSessions,
        focusAreasCount: mockInsightsData.focusAreas.length,
        achievementsCount: mockInsightsData.achievements.length,
      })

      return mockInsightsData
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}
