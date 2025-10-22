jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}))

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}))

// Use real TanStack Query implementation
jest.unmock('@tanstack/react-query')

// Mock @my/api before importing
jest.mock('@my/api', () => {
  // Mock supabase query chain
  const mockSingle = jest.fn()
  const mockEq = jest.fn(() => ({ single: mockSingle }))
  const mockSelect = jest.fn(() => ({ eq: mockEq }))
  const mockFrom = jest.fn(() => ({ select: mockSelect }))

  return {
    ...jest.requireActual('@my/api'),
    getAnalysisJob: jest.fn(),
    createSignedDownloadUrl: jest.fn(),
    supabase: {
      from: mockFrom,
    },
  }
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { createSignedDownloadUrl, getAnalysisJob, supabase } from '@my/api'

import { useHistoricalAnalysis } from './useHistoricalAnalysis'

// Get typed mock references
const mockGetAnalysisJob = getAnalysisJob as jest.MockedFunction<typeof getAnalysisJob>
const mockCreateSignedDownloadUrl = createSignedDownloadUrl as jest.MockedFunction<
  typeof createSignedDownloadUrl
>
const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Verify mocks are initialized
if (!mockGetAnalysisJob || typeof mockGetAnalysisJob !== 'function') {
  throw new Error('getAnalysisJob mock not initialized')
}
if (!mockSupabase || typeof mockSupabase.from !== 'function') {
  throw new Error('supabase mock not initialized')
}

describe('useHistoricalAnalysis', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    })

    // Clear mocks and real Zustand store
    jest.clearAllMocks()
    mockGetAnalysisJob.mockReset()
    mockCreateSignedDownloadUrl.mockReset()
    const { clearCache } = useVideoHistoryStore.getState()
    clearCache()

    // Setup default supabase mock response
    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 100,
        filename: 'test-video.mp4',
        storage_path: 'user-123/video.mp4',
        duration_seconds: 30,
        metadata: {},
      },
      error: null,
    })
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from = jest.fn().mockReturnValue({ select: mockSelect })

    mockCreateSignedDownloadUrl.mockResolvedValue({
      data: {
        signedUrl: 'https://signed.example.com/videos/test-video.mp4',
        path: 'user-123/video.mp4',
      },
      error: null,
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('Cache-first loading', () => {
    it('should return cached data immediately when available', async () => {
      // Arrange - Add to real Zustand store
      const mockCachedData = {
        id: 1,
        videoId: 100,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: '2025-10-12T00:00:00Z',
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
        storagePath: 'user-123/video.mp4',
        videoUri: 'https://signed.example.com/videos/test-video.mp4',
      }

      const { addToCache, setLocalUri } = useVideoHistoryStore.getState()
      addToCache(mockCachedData)
      setLocalUri('user-123/video.mp4', 'file:///cached/video.mp4')

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should return cached data with cachedAt/lastAccessed added
      expect(result.current.data).toMatchObject({
        ...mockCachedData,
        videoUri: 'file:///cached/video.mp4',
      })
      expect(result.current.data?.cachedAt).toBeDefined()
      expect(result.current.data?.lastAccessed).toBeDefined()
      expect(mockGetAnalysisJob).not.toHaveBeenCalled()
    })

    it('should fallback to database when cache miss', async () => {
      // Arrange
      const mockDbData = {
        id: 1,
        user_id: 'user-123',
        video_recording_id: 100,
        status: 'completed' as const,
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
        pose_data: null,
        created_at: '2025-10-12T00:00:00Z',
        updated_at: '2025-10-12T00:00:00Z',
        progress_percentage: 100,
        error_message: null,
        processing_started_at: '2025-10-12T00:00:00Z',
        processing_completed_at: '2025-10-12T00:00:01Z',
        total_frames: 100,
        processed_frames: 100,
        summary_text: 'Test summary',
      } as any // Use any to bypass strict DB type checking in tests

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 100,
          filename: 'test-video.mp4',
          storage_path: 'user-123/video.mp4',
          duration_seconds: 30,
          metadata: {
            localUri: 'file:///local/video.mp4',
          },
        },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      ;(mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect })

      mockGetAnalysisJob.mockResolvedValue(mockDbData)

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should NOT call createSignedDownloadUrl because local URI from metadata is used
      expect(mockCreateSignedDownloadUrl).not.toHaveBeenCalled()

      // Should update cache and return cached entry using local URI from metadata
      expect(result.current.data).toMatchObject({
        id: 1,
        videoId: 100,
        userId: 'user-123',
        videoUri: 'file:///local/video.mp4',
        storagePath: 'user-123/video.mp4',
      })
      expect(result.current.data?.cachedAt).toBeDefined()
      expect(result.current.data?.lastAccessed).toBeDefined()
      expect(result.current.data?.results).toBeDefined()

      // Verify cache was updated
      const { getCached, getLocalUri } = useVideoHistoryStore.getState()
      const cached = getCached(1)
      expect(cached).not.toBeNull()
      expect(cached?.id).toBe(1)
      expect(cached?.videoUri).toBe('file:///local/video.mp4')

      // Wait for useEffect to complete and verify local URI mapping was set
      await waitFor(() => {
        expect(getLocalUri('user-123/video.mp4')).toBe('file:///local/video.mp4')
      })
    })

    it('falls back to sample video when signed URL resolution fails', async () => {
      const mockDbData = {
        id: 2,
        user_id: 'user-abc',
        video_recording_id: 200,
        status: 'completed' as const,
        results: {},
        pose_data: null,
        created_at: '2025-10-12T00:00:00Z',
        video_recordings: {
          storage_path: 'user-abc/video.mp4',
        },
      } as any

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 200,
          filename: 'test-video.mp4',
          storage_path: 'user-abc/video.mp4',
          duration_seconds: 30,
          metadata: {},
        },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      ;(mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect })

      mockGetAnalysisJob.mockResolvedValue(mockDbData)
      mockCreateSignedDownloadUrl.mockResolvedValue({ data: null, error: 'failed' as any })

      const { result } = renderHook(() => useHistoricalAnalysis(2), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCreateSignedDownloadUrl).toHaveBeenCalledWith('raw', 'user-abc/video.mp4', 3600)
      const { getCached, getLocalUri } = useVideoHistoryStore.getState()
      const cached = getCached(2)
      expect(cached?.videoUri).toBe(FALLBACK_VIDEO_URI)
      expect(getLocalUri('user-abc/video.mp4')).toBeNull()
    })

    it('should not query database when analysisId is null', async () => {
      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(null), { wrapper })

      // Assert - Query should be disabled
      expect(result.current.data).toBeNull()
      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetAnalysisJob).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      mockGetAnalysisJob.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(new Error('Database connection failed'))

      // Verify cache was not updated
      const { getCached } = useVideoHistoryStore.getState()
      expect(getCached(1)).toBeNull()
    })

    it('should handle missing analysis job (404)', async () => {
      // Arrange
      mockGetAnalysisJob.mockResolvedValue(null)

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()

      // Verify cache was not updated
      const { getCached } = useVideoHistoryStore.getState()
      expect(getCached(1)).toBeNull()
    })
  })

  describe('RLS filtering', () => {
    it('should respect RLS filtering (getAnalysisJob handles this)', async () => {
      // Arrange - Simulate RLS blocking access (returns null)
      mockGetAnalysisJob.mockResolvedValue(null)

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(999), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
      expect(mockGetAnalysisJob).toHaveBeenCalledWith(999)
    })
  })

  describe('Cache configuration', () => {
    it('should use staleTime: Infinity for historical data', async () => {
      // Arrange - Add to cache
      const mockCachedData = {
        id: 1,
        videoId: 100,
        userId: 'user-123',
        title: 'Test Analysis',
        createdAt: '2025-10-12T00:00:00Z',
        results: {
          pose_analysis: {
            keypoints: [],
            confidence_score: 0.85,
            frame_count: 30,
          },
        },
      }

      const { addToCache } = useVideoHistoryStore.getState()
      addToCache(mockCachedData)

      // Act
      const { result, rerender } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert - First render
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const firstData = result.current.data

      // Rerender - should not refetch (staleTime: Infinity)
      rerender()

      expect(mockGetAnalysisJob).not.toHaveBeenCalled()
      expect(result.current.data).toEqual(firstData)
    })
  })

  describe('Signed URL session caching (Task 35 Module 2)', () => {
    it('should reuse signed URL within session instead of regenerating', async () => {
      // Arrange - DB data with storage path (no local URI)
      const mockDbData = {
        id: 1,
        user_id: 'user-123',
        video_recording_id: 100,
        status: 'completed' as const,
        results: {},
        pose_data: null,
        created_at: '2025-10-12T00:00:00Z',
        updated_at: '2025-10-12T00:00:00Z',
      } as any

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 100,
          filename: 'test-video.mp4',
          storage_path: 'user-123/video.mp4',
          duration_seconds: 30,
          metadata: {},
        },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      ;(mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect })

      mockGetAnalysisJob.mockResolvedValue(mockDbData)
      mockCreateSignedDownloadUrl.mockResolvedValue({
        data: {
          signedUrl: 'https://signed.example.com/videos/test-video.mp4?token=abc123',
          path: 'user-123/video.mp4',
        },
        error: null,
      })

      // Act - First render fetches and generates signed URL
      const { result, rerender } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCreateSignedDownloadUrl).toHaveBeenCalledTimes(1)
      expect(mockCreateSignedDownloadUrl).toHaveBeenCalledWith('raw', 'user-123/video.mp4', 3600)
      expect(result.current.data?.videoUri).toBe(
        'https://signed.example.com/videos/test-video.mp4?token=abc123'
      )

      // Act - Clear cache and rerender (simulates remount within same session)
      const { clearCache } = useVideoHistoryStore.getState()
      clearCache()
      queryClient.clear()
      mockCreateSignedDownloadUrl.mockClear()

      rerender()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert - Signed URL should be reused (no new call to createSignedDownloadUrl)
      // The module-level cache persists across component remounts within same session
      expect(mockCreateSignedDownloadUrl).toHaveBeenCalledTimes(0) // No new calls
      expect(result.current.data?.videoUri).toBe(
        'https://signed.example.com/videos/test-video.mp4?token=abc123'
      )
    })
  })
})
