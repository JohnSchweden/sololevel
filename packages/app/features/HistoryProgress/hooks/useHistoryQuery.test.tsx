// Use real TanStack Query implementation (override any global mocks)
jest.unmock('@tanstack/react-query')
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import * as FileSystem from 'expo-file-system'
import type { ReactNode } from 'react'
import { Platform } from 'react-native'
import { useVideoHistoryStore } from '../stores/videoHistory'

// Use the global mock provided in test-utils/setup.ts and get the handle
import { getUserAnalysisJobs } from '@my/api'
const mockGetUserAnalysisJobs = getUserAnalysisJobs as jest.MockedFunction<
  typeof getUserAnalysisJobs
>

import * as thumbnailCache from '../utils/thumbnailCache'
import { useHistoryQuery } from './useHistoryQuery'

// Mock thumbnailCache module
jest.mock('../utils/thumbnailCache', () => ({
  ensureThumbnailDirectory: jest.fn().mockResolvedValue(undefined),
  getCachedThumbnailPath: jest.fn(
    (videoId: number) => `file:///documents/thumbnails/${videoId}.jpg`
  ),
  persistThumbnailFile: jest.fn().mockResolvedValue('file:///documents/thumbnails/10.jpg'),
}))

const mockPersistThumbnailFile = thumbnailCache.persistThumbnailFile as jest.MockedFunction<
  typeof thumbnailCache.persistThumbnailFile
>

const mockGetInfoAsync = FileSystem.getInfoAsync as jest.MockedFunction<
  typeof FileSystem.getInfoAsync
>

type ExistingFileInfo = Extract<FileSystem.FileInfo, { exists: true }>
type MissingFileInfo = Extract<FileSystem.FileInfo, { exists: false }>

const createExistingFileInfo = (overrides: Partial<ExistingFileInfo> = {}): ExistingFileInfo => ({
  exists: true,
  uri: 'file://placeholder',
  size: 0,
  isDirectory: false,
  modificationTime: 0,
  ...overrides,
})

const createMissingFileInfo = (overrides: Partial<MissingFileInfo> = {}): MissingFileInfo => ({
  exists: false,
  uri: 'file://placeholder',
  isDirectory: false,
  ...overrides,
})

// Sanity: ensure mock is defined for all tests below
if (!mockGetUserAnalysisJobs || typeof mockGetUserAnalysisJobs !== 'function') {
  throw new Error('getUserAnalysisJobs mock not initialized')
}

beforeEach(() => {
  mockGetUserAnalysisJobs.mockReset()
  mockGetUserAnalysisJobs.mockResolvedValue([])
  mockGetInfoAsync.mockReset()
  mockPersistThumbnailFile.mockReset()
  mockPersistThumbnailFile.mockResolvedValue('file:///documents/thumbnails/10.jpg')
  mockGetInfoAsync.mockResolvedValue(
    createExistingFileInfo({
      exists: true,
      uri: 'file://mock-video.mp4',
    })
  )
  const { clearCache } = useVideoHistoryStore.getState()
  clearCache()
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
})

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

// Test wrapper with QueryClient
function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return Wrapper
}

// Mock analysis job data
const mockJob = {
  id: 1,
  user_id: 'user-123',
  video_recording_id: 10,
  status: 'completed' as const,
  title: 'Test Analysis',
  created_at: '2025-10-11T10:00:00Z',
  updated_at: '2025-10-11T10:01:00Z',
  error_message: null,
  processing_started_at: '2025-10-11T10:00:00Z',
  processing_completed_at: '2025-10-11T10:01:00Z',
  processing_time_ms: 60000,
  video_source_type: null,
  progress_percentage: 100,
  total_frames: 900,
  processed_frames: 900,
  results: {
    pose_analysis: {
      keypoints: [],
      confidence_score: 0.85,
      frame_count: 30,
    },
  },
  pose_data: {},
  video_recordings: {
    id: 10,
    filename: 'video.mp4',
    original_filename: 'video.mp4',
    storage_path: 'user-id/video.mp4',
    duration_seconds: 30,
    created_at: '2025-10-11T09:55:00Z',
    metadata: {
      localUri: 'file:///local/path/to/video.mp4',
      thumbnailUri: 'https://example.com/thumb.jpg',
    },
  },
}

/**
 * TODO: Fix Jest manual mock loading for @my/api workspace package
 *
 * ISSUE: __mockGetUserAnalysisJobs is undefined when imported from manual mock
 * ROOT CAUSE: Jest has trouble loading TypeScript manual mocks from __mocks__/ for workspace packages
 *
 * INVESTIGATION DONE:
 * - ✅ Added getUserAnalysisJobs to __mocks__/@my/api.ts
 * - ✅ Tried .ts and .js extensions for manual mock
 * - ✅ Tried inline factory mocks with jest.fn()
 * - ✅ Tried various import strategies
 * - ❌ Manual mock __mockGetUserAnalysisJobs always imports as undefined
 *
 * WORKAROUNDS ATTEMPTED:
 * 1. jest.mock('@my/api', () => ({ getUserAnalysisJobs: jest.fn() })) - FAILED (hoisting issue)
 * 2. Import __mockGetUserAnalysisJobs from manual mock - FAILED (undefined)
 * 3. Using jest.mocked() helper - FAILED (undefined)
 *
 * NEXT STEPS:
 * - Option 1: Move to Vitest (better TS mock support)
 * - Option 2: Use integration tests with real Supabase mock server
 * - Option 3: Restructure to avoid mocking workspace packages
 */
describe('useHistoryQuery', () => {
  // ARRANGE: Setup
  // ACT: Hook execution
  // ASSERT: Results

  it('SANITY CHECK: mock function exists and can be called', async () => {
    // ARRANGE: Clear state
    useVideoHistoryStore.getState().clearCache()
    // ARRANGE & ACT
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])
    const result = await mockGetUserAnalysisJobs()

    // ASSERT
    expect(result).toEqual([mockJob])
    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)
  })

  it('should fetch from database on first load (cache miss)', async () => {
    // ARRANGE: Ensure cache is empty and mock API response
    const cache = useVideoHistoryStore.getState()
    expect(cache.getAllCached()).toEqual([]) // Verify cache is empty
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for query to complete
    await waitFor(
      () => {
        // If error, fail with details
        if (result.current.isError) {
          throw new Error(`Query failed: ${result.current.error}`)
        }
        // Wait for success
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 5000 }
    )

    // Verify mock was called
    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)

    // ASSERT: Transformed data (title from date)
    expect(result.current.data).toEqual([
      {
        id: 1,
        videoId: 10,
        title: 'Analysis 10/11/2025',
        createdAt: '2025-10-11T10:00:00Z',
        thumbnailUri: 'https://example.com/thumb.jpg',
      },
    ])
    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)
  })

  it('should use TanStack Query cache within staleTime (5 minutes)', async () => {
    // ARRANGE: First query populates TanStack Query cache
    const queryClient = createTestQueryClient()
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])

    // ACT: First render - fetches from API
    const { result, rerender } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)

    // Reset mock call count
    mockGetUserAnalysisJobs.mockClear()

    // ACT: Second render within staleTime - should use TanStack Query cache
    rerender()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toBeDefined()
    })

    // ASSERT: TanStack Query returns cached data without API call
    expect(mockGetUserAnalysisJobs).not.toHaveBeenCalled()
    expect(result.current.data).toEqual([
      {
        id: 1,
        videoId: 10,
        title: 'Analysis 10/11/2025',
        createdAt: '2025-10-11T10:00:00Z',
        thumbnailUri: 'https://example.com/thumb.jpg',
      },
    ])
  })

  it('should fetch from database on first load', async () => {
    // Note: TanStack Query always fetches on mount for data freshness
    // Zustand cache is used for AsyncStorage persistence, not query caching
    // ARRANGE: Ensure cache is empty and mock API response
    const cache = useVideoHistoryStore.getState()
    expect(cache.getAllCached()).toEqual([]) // Verify cache is empty
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify mock was called
    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)

    // ASSERT: Fetched from database (title from date)
    expect(mockGetUserAnalysisJobs).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual([
      {
        id: 1,
        videoId: 10,
        title: 'Analysis 10/11/2025',
        createdAt: '2025-10-11T10:00:00Z',
        thumbnailUri: 'https://example.com/thumb.jpg',
      },
    ])
  })

  it('should filter only completed jobs', async () => {
    // ARRANGE: Mock with completed and non-completed jobs
    const pendingJob = { ...mockJob, id: 2, status: 'pending' as const }
    const failedJob = { ...mockJob, id: 3, status: 'failed' as const }

    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob, pendingJob, failedJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Only completed job returned
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe(1)
  })

  it('should update cache after database fetch', async () => {
    // ARRANGE: Empty cache, mock API
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Cache updated (title from date)
    const cache = useVideoHistoryStore.getState()
    const cached = cache.getCached(1)

    expect(cached).not.toBeNull()
    expect(cached?.title).toBe('Analysis 10/11/2025')
    expect(cached?.videoId).toBe(10)
  })

  it('should sort results by createdAt descending (most recent first)', async () => {
    // ARRANGE: Mock multiple jobs with different dates
    const oldJob = { ...mockJob, id: 1, created_at: '2025-10-01T10:00:00Z' }
    const newJob = { ...mockJob, id: 2, created_at: '2025-10-11T10:00:00Z' }
    const midJob = { ...mockJob, id: 3, created_at: '2025-10-05T10:00:00Z' }

    mockGetUserAnalysisJobs.mockResolvedValueOnce([oldJob, newJob, midJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Sorted by date (newest first)
    expect(result.current.data).toEqual([
      expect.objectContaining({ id: 2, createdAt: '2025-10-11T10:00:00Z' }),
      expect.objectContaining({ id: 3, createdAt: '2025-10-05T10:00:00Z' }),
      expect.objectContaining({ id: 1, createdAt: '2025-10-01T10:00:00Z' }),
    ])
  })

  it('should handle API errors gracefully', async () => {
    // ARRANGE: Mock API error
    mockGetUserAnalysisJobs.mockRejectedValueOnce(new Error('Network error'))

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for error state
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(new Error('Network error'))
  })

  it('should generate title from date', async () => {
    // ARRANGE: Job with date-based title generation
    mockGetUserAnalysisJobs.mockResolvedValueOnce([mockJob])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Title generated from date
    expect(result.current.data?.[0].title).toBe('Analysis 10/11/2025')
  })

  it('should handle empty result from API', async () => {
    // ARRANGE: Empty API response
    mockGetUserAnalysisJobs.mockResolvedValueOnce([])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Empty array returned
    expect(result.current.data).toEqual([])
  })

  it('should extract thumbnailUri from metadata (local device URI)', async () => {
    // ARRANGE: Mock Platform.OS as ios and file exists
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockGetInfoAsync.mockResolvedValueOnce(
      createExistingFileInfo({
        uri: 'file:///local/path/to/thumbnail.jpg',
      })
    )

    // ARRANGE: Job with metadata containing local thumbnail URI
    // Note: localUri must include 'recordings/' to be indexed by the store
    const jobWithMetadata = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        metadata: {
          localUri: 'file:///documents/recordings/video.mp4',
          thumbnailUri: 'file:///local/path/to/thumbnail.jpg',
        },
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithMetadata])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Local thumbnail URI extracted from metadata (title from date)
    expect(result.current.data).toEqual([
      {
        id: 1,
        videoId: 10,
        title: 'Analysis 10/11/2025',
        createdAt: '2025-10-11T10:00:00Z',
        thumbnailUri: 'file:///local/path/to/thumbnail.jpg',
      },
    ])

    const { getLocalUri, getCached } = useVideoHistoryStore.getState()
    expect(getLocalUri('user-id/video.mp4')).toBe('file:///documents/recordings/video.mp4')
    expect(getCached(1)?.videoUri).toBe('file:///documents/recordings/video.mp4')
  })

  it('should prioritize metadata thumbnailUri over thumbnail_url when local file exists', async () => {
    // ARRANGE: Mock Platform.OS as ios and file exists
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockGetInfoAsync.mockResolvedValueOnce(
      createExistingFileInfo({
        uri: 'file:///local/path/to/thumbnail.jpg',
      })
    )

    // ARRANGE: Job with both metadata thumbnailUri and thumbnail_url
    // Note: localUri must include 'recordings/' to be indexed by the store
    const jobWithBoth = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        thumbnail_url: 'https://example.com/cloud-thumb.jpg',
        metadata: {
          localUri: 'file:///documents/recordings/video.mp4',
          thumbnailUri: 'file:///local/path/to/thumbnail.jpg',
        },
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithBoth])
    mockGetInfoAsync
      .mockResolvedValueOnce(createMissingFileInfo()) // metadata missing
      .mockResolvedValueOnce(createMissingFileInfo()) // persistent cache missing

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Wait for store to be updated (localUriIndex is updated in addMultipleToCache)
    await waitFor(() => {
      const { getLocalUri, getCached } = useVideoHistoryStore.getState()
      expect(getLocalUri('user-id/video.mp4')).toBeTruthy()
      expect(getCached(1)?.videoUri).toBeTruthy()
    })

    // ASSERT: metadata thumbnailUri takes precedence when file exists
    expect(result.current.data?.[0].thumbnailUri).toBe('file:///local/path/to/thumbnail.jpg')
    const { getLocalUri, getCached } = useVideoHistoryStore.getState()
    expect(getLocalUri('user-id/video.mp4')).toBe('file:///documents/recordings/video.mp4')
    expect(getCached(1)?.videoUri).toBe('file:///documents/recordings/video.mp4')
  })

  it('should prefer metadata thumbnail even when local file check fails', async () => {
    // ARRANGE: Mock Platform.OS as ios and file does NOT exist
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockGetInfoAsync
      .mockResolvedValueOnce(
        createMissingFileInfo({
          uri: 'file:///local/path/to/thumbnail.jpg',
        })
      )
      .mockResolvedValueOnce(createMissingFileInfo())

    // ARRANGE: Job with both metadata thumbnailUri and thumbnail_url
    const jobWithBoth = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        thumbnail_url: 'https://example.com/cloud-thumb.jpg',
        metadata: {
          localUri: 'file:///local/path/to/video.mp4',
          thumbnailUri: 'file:///local/path/to/thumbnail.jpg',
        },
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithBoth])

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Metadata thumbnail still returned immediately (fallback handled asynchronously)
    expect(result.current.data?.[0].thumbnailUri).toBe('file:///local/path/to/thumbnail.jpg')
  })

  it('should not trigger cloud persistence when metadata thumbnail is present', async () => {
    // ARRANGE: Mock Platform.OS as ios and file does NOT exist (fallback to cloud)
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockGetInfoAsync
      .mockResolvedValueOnce(
        createMissingFileInfo({
          uri: 'file:///local/path/to/thumbnail.jpg',
        })
      )
      .mockResolvedValueOnce(
        createExistingFileInfo({
          uri: 'file:///documents/thumbnails/10.jpg',
        })
      )

    // ARRANGE: Job with thumbnail_url but no existing local file
    const jobWithCloudThumbnail = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        thumbnail_url: 'https://example.com/cloud-thumb.jpg',
        metadata: {
          localUri: 'file:///local/path/to/video.mp4',
          thumbnailUri: 'file:///local/path/to/thumbnail.jpg', // Temp file missing
        },
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithCloudThumbnail])
    mockPersistThumbnailFile.mockResolvedValueOnce('file:///documents/thumbnails/10.jpg')

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Persistence not triggered because metadata thumbnail is still preferred
    expect(mockPersistThumbnailFile).not.toHaveBeenCalled()
    expect(result.current.data?.[0].thumbnailUri).toBe('file:///local/path/to/thumbnail.jpg')
  })

  it('should handle thumbnail persistence failure gracefully', async () => {
    // ARRANGE: Mock Platform.OS as ios and file does NOT exist
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockGetInfoAsync.mockResolvedValueOnce(
      createMissingFileInfo({
        uri: 'file:///local/path/to/thumbnail.jpg',
      })
    )

    // ARRANGE: Job with thumbnail_url
    const jobWithCloudThumbnail = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        thumbnail_url: 'https://example.com/cloud-thumb.jpg',
        metadata: {
          localUri: 'file:///local/path/to/video.mp4',
          thumbnailUri: undefined,
        },
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithCloudThumbnail])

    // ARRANGE: Persistence fails (non-blocking)
    mockPersistThumbnailFile.mockRejectedValueOnce(new Error('Network error'))

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data (should not fail)
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Cloud URL still returned despite persistence failure
    expect(result.current.data?.[0].thumbnailUri).toBe('https://example.com/cloud-thumb.jpg')
    expect(mockPersistThumbnailFile).toHaveBeenCalledTimes(1)
  })

  it('should fallback to cloud when persistent disk cache does not exist', async () => {
    // ARRANGE: Mock Platform.OS as ios
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })

    // ARRANGE: Persistent disk cache does NOT exist
    const cachedThumbnailPath = 'file:///documents/thumbnails/10.jpg'
    mockGetInfoAsync.mockResolvedValueOnce(
      createMissingFileInfo({
        uri: cachedThumbnailPath,
      })
    )

    // ARRANGE: Job with only thumbnail_url (no metadata thumbnailUri)
    const jobWithOnlyCloudThumbnail = {
      ...mockJob,
      video_recordings: {
        id: 10,
        filename: 'video.mp4',
        original_filename: 'video.mp4',
        storage_path: 'user-id/video.mp4',
        duration_seconds: 30,
        created_at: '2025-10-11T09:55:00Z',
        thumbnail_url: 'https://example.com/cloud-thumb.jpg',
        metadata: {}, // No thumbnailUri in metadata
      },
    }
    mockGetUserAnalysisJobs.mockResolvedValueOnce([jobWithOnlyCloudThumbnail])
    mockPersistThumbnailFile.mockResolvedValueOnce('file:///documents/thumbnails/10.jpg')

    // ACT: Render hook
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(queryClient),
    })

    // ASSERT: Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ASSERT: Cloud URL used (disk cache missing)
    expect(result.current.data?.[0].thumbnailUri).toBe('https://example.com/cloud-thumb.jpg')
    // ASSERT: Should persist to disk
    expect(mockPersistThumbnailFile).toHaveBeenCalledTimes(1)
    expect(mockPersistThumbnailFile).toHaveBeenCalledWith(10, 'https://example.com/cloud-thumb.jpg')
  })
})
