jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}))

// Use manual mock from __mocks__ to get proper default behaviors
jest.mock('expo-file-system')

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
import type { AnalysisJob } from '@my/api'
import { createSignedDownloadUrl, getAnalysisJob, supabase } from '@my/api'

import { useHistoricalAnalysis } from './useHistoricalAnalysis'

// Import FileSystem to get typed mock reference
import * as FileSystem from 'expo-file-system'

// Get typed mock references
const mockGetAnalysisJob = getAnalysisJob as jest.MockedFunction<typeof getAnalysisJob>
const mockCreateSignedDownloadUrl = createSignedDownloadUrl as jest.MockedFunction<
  typeof createSignedDownloadUrl
>
const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>

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
    mockFileSystem.getInfoAsync.mockReset()
    const { clearCache } = useVideoHistoryStore.getState()
    clearCache()

    // Default: Files don't exist (will be overridden in specific tests)
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: false,
      uri: '',
      isDirectory: false,
    })

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

      // File exists for the cached local URI
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: 'file:///cached/video.mp4',
        size: 1024,
        isDirectory: false,
        modificationTime: Date.now(),
      })

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should return cached data immediately (optimistic rendering)
      // Returns cached videoUri immediately, file validation happens async
      expect(result.current.data).toMatchObject({
        ...mockCachedData,
        videoUri: 'https://signed.example.com/videos/test-video.mp4', // Optimistic: returns cached URI
      })
      expect(result.current.data?.cachedAt).toBeDefined()
      expect(result.current.data?.lastAccessed).toBeDefined()
      expect(mockGetAnalysisJob).not.toHaveBeenCalled()
    })

    it('should fallback to database when cache miss', async () => {
      // Arrange
      const mockDbData: AnalysisJob = {
        id: 1,
        user_id: 'user-123',
        video_recording_id: 100,
        status: 'completed',
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
        processing_time_ms: null,
        video_source_type: null,
        // Voice snapshot fields (nullable for legacy data)
        coach_gender: null,
        coach_mode: null,
        voice_name_used: null,
        avatar_asset_key_used: null,
      }

      const metadataLocalUri = 'file:///local/video.mp4'
      const directPath = `${FileSystem.documentDirectory}recordings/analysis_1.mp4`

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 100,
          filename: 'test-video.mp4',
          storage_path: 'user-123/video.mp4',
          duration_seconds: 30,
          metadata: {
            localUri: metadataLocalUri,
          },
        },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = jest
        .fn()
        .mockReturnValue({ select: mockSelect }) as typeof mockSupabase.from

      mockGetAnalysisJob.mockResolvedValue(mockDbData)

      // Mock file system: metadata URI exists, direct path doesn't (so it uses metadata.localUri)
      mockFileSystem.getInfoAsync.mockImplementation((path: string) => {
        if (path === metadataLocalUri) {
          return Promise.resolve({
            exists: true,
            uri: metadataLocalUri,
            size: 1024,
            isDirectory: false,
            modificationTime: Date.now(),
          })
        }
        if (path === directPath) {
          return Promise.resolve({
            exists: false,
            uri: directPath,
            isDirectory: false,
          })
        }
        return Promise.resolve({
          exists: false,
          uri: path,
          isDirectory: false,
        })
      })

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
      const mockDbData: AnalysisJob & { video_recordings?: { storage_path: string } } = {
        id: 2,
        user_id: 'user-abc',
        video_recording_id: 200,
        status: 'completed',
        results: null,
        pose_data: null,
        created_at: '2025-10-12T00:00:00Z',
        updated_at: '2025-10-12T00:00:00Z',
        progress_percentage: null,
        error_message: null,
        processing_started_at: null,
        processing_completed_at: null,
        processing_time_ms: null,
        video_source_type: null,
        // Voice snapshot fields (nullable for legacy data)
        coach_gender: null,
        coach_mode: null,
        voice_name_used: null,
        avatar_asset_key_used: null,
        video_recordings: {
          storage_path: 'user-abc/video.mp4',
        },
      }

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
      mockSupabase.from = jest
        .fn()
        .mockReturnValue({ select: mockSelect }) as typeof mockSupabase.from

      mockGetAnalysisJob.mockResolvedValue(mockDbData)
      mockCreateSignedDownloadUrl.mockResolvedValue({ data: null, error: 'failed' })

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

    it('should return cached URI immediately (optimistic) and defer file validation', async () => {
      // Arrange - Add cached data with file:// URI
      const cachedVideoUri = 'file:///cached/video.mp4'
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
        videoUri: cachedVideoUri,
      }

      const { addToCache } = useVideoHistoryStore.getState()
      addToCache(mockCachedData)

      // Mock title fetch (lightweight, doesn't block)
      const mockSingle = jest.fn().mockResolvedValue({
        data: { title: 'Updated Title' },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = jest.fn().mockReturnValue({ select: mockSelect })

      // File validation will happen async - initially return exists: true, then we'll test failure
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: cachedVideoUri,
        isDirectory: false,
        size: 0,
        modificationTime: Date.now(),
      })

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert - Should return immediately with cached URI (optimistic)
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should return cached URI immediately (optimistic rendering)
      expect(result.current.data?.videoUri).toBe(cachedVideoUri)
      // PERF FIX: Title now comes from cache immediately (no blocking DB query)
      // Title is already fresh from prefetch (usePrefetchVideoAnalysis calls this same queryFn)
      expect(result.current.data?.title).toBe('Test Analysis') // Cached title

      // File validation should happen async (non-blocking)
      // Wait a bit to ensure validation runs
      await waitFor(
        () => {
          expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(cachedVideoUri)
        },
        { timeout: 1000 }
      )

      // Note: Title refresh removed - title is already fresh from prefetch
      // No need to refresh on mount since prefetch already fetches latest title
      // Cache should still have original cached title (not updated from DB query)
      const { getCached } = useVideoHistoryStore.getState()
      const updatedCache = getCached(1)
      expect(updatedCache?.title).toBe('Test Analysis') // Still cached title (no refresh)
    })

    it('should re-resolve URI if cached file validation fails', async () => {
      // Arrange - Add cached data with missing file:// URI
      const cachedVideoUri = 'file:///cached/missing-video.mp4'
      const resolvedVideoUri = 'https://signed.example.com/videos/test-video.mp4'
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
        videoUri: cachedVideoUri,
      }

      const { addToCache } = useVideoHistoryStore.getState()
      addToCache(mockCachedData)

      // Mock title fetch
      const mockSingle = jest.fn().mockResolvedValue({
        data: { title: 'Test Analysis' },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = jest.fn().mockReturnValue({ select: mockSelect })

      // File validation fails (file doesn't exist)
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: cachedVideoUri,
        isDirectory: false,
      })

      // Mock signed URL generation for re-resolution
      mockCreateSignedDownloadUrl.mockResolvedValue({
        data: {
          signedUrl: resolvedVideoUri,
          path: 'user-123/video.mp4',
        },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useHistoricalAnalysis(1), { wrapper })

      // Assert - Should return immediately with cached URI (optimistic)
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.videoUri).toBe(cachedVideoUri) // Optimistic URI

      // Wait for async validation and re-resolution
      await waitFor(
        () => {
          const { getCached } = useVideoHistoryStore.getState()
          const updatedCache = getCached(1)
          // Cache should be updated with resolved URI after validation failure
          expect(updatedCache?.videoUri).toBe(resolvedVideoUri)
        },
        { timeout: 2000 }
      )

      // Verify file validation was called
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(cachedVideoUri)
      // Verify re-resolution was triggered
      expect(mockCreateSignedDownloadUrl).toHaveBeenCalled()
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
      // Use unique storage path to avoid cache pollution from other tests
      // The signed URL cache is module-level and persists across tests
      const uniqueStoragePath = `user-123/session-cache-test-${Date.now()}.mp4`

      // Arrange - DB data with storage path (no local URI)
      const mockDbData: AnalysisJob = {
        id: 1,
        user_id: 'user-123',
        video_recording_id: 100,
        status: 'completed',
        results: null,
        pose_data: null,
        created_at: '2025-10-12T00:00:00Z',
        updated_at: '2025-10-12T00:00:00Z',
        progress_percentage: null,
        error_message: null,
        processing_started_at: null,
        processing_completed_at: null,
        processing_time_ms: null,
        video_source_type: null,
        // Voice snapshot fields (nullable for legacy data)
        coach_gender: null,
        coach_mode: null,
        voice_name_used: null,
        avatar_asset_key_used: null,
      }

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 100,
          filename: 'test-video.mp4',
          storage_path: uniqueStoragePath,
          duration_seconds: 30,
          metadata: {},
        },
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = jest
        .fn()
        .mockReturnValue({ select: mockSelect }) as typeof mockSupabase.from

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
      expect(mockCreateSignedDownloadUrl).toHaveBeenCalledWith('raw', uniqueStoragePath, 3600)
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
