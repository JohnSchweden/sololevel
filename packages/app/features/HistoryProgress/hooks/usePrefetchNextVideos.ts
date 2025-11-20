import { VideoStorageService } from '@app/features/CameraRecording/services/videoStorageService'
import { log } from '@my/logging'
import * as FileSystem from 'expo-file-system'
import React from 'react'
import { Platform } from 'react-native'
import { resolveHistoricalVideoUri } from '../../VideoAnalysis/hooks/useHistoricalAnalysis'
import { useVideoHistoryStore } from '../stores/videoHistory'
import { getCachedThumbnailPath, persistThumbnailFile } from '../utils/thumbnailCache'
import type { VideoItem } from './useHistoryQuery'

/**
 * Configuration for prefetch behavior
 */
export interface PrefetchConfig {
  /**
   * Number of items ahead of visible items to prefetch
   * @default 3
   */
  lookAhead: number

  /**
   * Maximum number of concurrent downloads
   * @default 2
   */
  concurrency: number

  /**
   * Enable/disable prefetch
   * @default true
   */
  enabled: boolean
}

/**
 * State of prefetch operations
 */
export interface PrefetchState {
  /**
   * Analysis IDs currently being prefetched
   */
  prefetching: number[]

  /**
   * Analysis IDs successfully prefetched
   */
  prefetched: number[]

  /**
   * Analysis IDs that failed to prefetch
   */
  failed: number[]
}

/**
 * Default prefetch configuration
 */
const DEFAULT_CONFIG: PrefetchConfig = {
  lookAhead: 3,
  concurrency: 2,
  enabled: true,
}

/**
 * Hook to prefetch next videos/thumbnails based on visible items
 *
 * Strategy:
 * 1. Calculate next N items based on visible items and lookAhead
 * 2. Prefetch thumbnails first (small, fast)
 * 3. Prefetch videos in background (large, slower)
 * 4. Limit concurrent downloads to prevent overwhelming network
 * 5. Skip already-cached items
 * 6. Track prefetch state (prefetching, prefetched, failed)
 *
 * Prefetch Priority:
 * - Thumbnails: Priority 1 (small, fast)
 * - Videos: Priority 2 (large, background)
 * - Audio: Deferred (on-demand when user taps feedback)
 *
 * @param allItems - All available video items (used to calculate prefetch targets)
 * @param visibleItems - Currently visible video items (used to determine prefetch start point)
 * @param config - Optional prefetch configuration
 * @returns Prefetch state (prefetching, prefetched, failed)
 *
 * @example
 * ```tsx
 * const { prefetching, prefetched } = usePrefetchNextVideos(allItems, visibleItems, {
 *   lookAhead: 3,
 *   concurrency: 2,
 * })
 * ```
 */
export function usePrefetchNextVideos(
  allItems: VideoItem[],
  visibleItems: VideoItem[],
  config?: Partial<PrefetchConfig>
): PrefetchState {
  const finalConfig = React.useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])

  // CRITICAL FIX: Use ref for state to prevent parent re-renders
  // Parent component was re-rendering every time prefetch state changed
  // (prefetching array updates, prefetched array updates) causing cascade
  const stateRef = React.useRef<PrefetchState>({
    prefetching: [],
    prefetched: [],
    failed: [],
  })

  const getCached = useVideoHistoryStore((state) => state.getCached)
  const activeDownloadsRef = React.useRef<Set<number>>(new Set())
  const abortControllersRef = React.useRef<Map<number, AbortController>>(new Map())
  const cancelledRef = React.useRef(false)

  /**
   * Check if thumbnail is already cached on disk
   */
  const isThumbnailCached = React.useCallback(async (videoId: number): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false
    }

    try {
      const cachedPath = getCachedThumbnailPath(videoId)
      const fileInfo = await FileSystem.getInfoAsync(cachedPath)
      return fileInfo.exists
    } catch (error) {
      log.warn('usePrefetchNextVideos', 'Failed to check thumbnail cache', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }, [])

  /**
   * Check if video is already cached
   */
  const isVideoCached = React.useCallback(
    (analysisId: number): boolean => {
      const cached = getCached(analysisId)
      if (!cached?.storagePath) {
        return false
      }

      // If video URI is already a local file path, it's cached
      return cached.videoUri?.startsWith('file://') ?? false
    },
    [getCached]
  )

  /**
   * Prefetch thumbnail for a video item
   */
  const prefetchThumbnail = React.useCallback(
    async (item: VideoItem, signal?: AbortSignal): Promise<boolean> => {
      if (Platform.OS === 'web') {
        return false
      }

      if (signal?.aborted) {
        return false
      }

      // Skip if already cached
      const cached = await isThumbnailCached(item.videoId)
      if (cached) {
        log.debug('usePrefetchNextVideos', 'Thumbnail already cached, skipping', {
          analysisId: item.id,
          videoId: item.videoId,
        })
        return true
      }

      // Skip if no thumbnail URL
      if (!item.thumbnailUri || !item.thumbnailUri.startsWith('http')) {
        return false
      }

      try {
        await persistThumbnailFile(item.videoId, item.thumbnailUri, { signal })
        if (signal?.aborted) {
          return false
        }
        log.debug('usePrefetchNextVideos', 'Thumbnail prefetched', {
          analysisId: item.id,
          videoId: item.videoId,
        })
        return true
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          log.debug('usePrefetchNextVideos', 'Thumbnail prefetch aborted', {
            analysisId: item.id,
            videoId: item.videoId,
          })
          return false
        }
        log.warn('usePrefetchNextVideos', 'Thumbnail prefetch failed', {
          analysisId: item.id,
          videoId: item.videoId,
          error: error instanceof Error ? error.message : String(error),
        })
        return false
      }
    },
    [isThumbnailCached]
  )

  /**
   * Prefetch video for a video item
   */
  const prefetchVideo = React.useCallback(
    async (item: VideoItem, signal?: AbortSignal): Promise<boolean> => {
      if (Platform.OS === 'web') {
        return false
      }

      if (signal?.aborted) {
        return false
      }

      // Skip if already cached
      if (isVideoCached(item.id)) {
        log.debug('usePrefetchNextVideos', 'Video already cached, skipping', {
          analysisId: item.id,
        })
        return true
      }

      // Get cached analysis to find storage path
      const cached = getCached(item.id)
      if (!cached?.storagePath) {
        log.debug('usePrefetchNextVideos', 'No storage path found, skipping video prefetch', {
          analysisId: item.id,
        })
        return false
      }

      try {
        // Resolve video URI (generates signed URL if needed)
        const videoUri = await resolveHistoricalVideoUri(cached.storagePath, {
          analysisId: item.id,
          localUriHint: cached.videoUri?.startsWith('file://') ? cached.videoUri : undefined,
          signal,
        })

        if (signal?.aborted) {
          return false
        }

        // If already a local file, skip download
        if (videoUri.startsWith('file://')) {
          return true
        }

        // If it's a signed URL (http/https), download it
        if (videoUri.startsWith('http')) {
          await VideoStorageService.downloadVideo(videoUri, item.id, { signal })
          if (signal?.aborted) {
            return false
          }
          log.debug('usePrefetchNextVideos', 'Video prefetched', {
            analysisId: item.id,
          })
          return true
        }

        return false
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          log.debug('usePrefetchNextVideos', 'Video prefetch aborted', {
            analysisId: item.id,
          })
          return false
        }
        log.warn('usePrefetchNextVideos', 'Video prefetch failed', {
          analysisId: item.id,
          error: error instanceof Error ? error.message : String(error),
        })
        return false
      }
    },
    [isVideoCached, getCached]
  )

  /**
   * Prefetch a single item (thumbnail + video)
   */
  const prefetchItem = React.useCallback(
    async (item: VideoItem): Promise<void> => {
      if (cancelledRef.current) {
        return
      }

      const controller = new AbortController()
      abortControllersRef.current.set(item.id, controller)

      // Mark as prefetching (update ref only, no parent re-render)
      stateRef.current = {
        ...stateRef.current,
        prefetching: stateRef.current.prefetching.includes(item.id)
          ? stateRef.current.prefetching
          : [...stateRef.current.prefetching, item.id],
      }

      try {
        // Prefetch thumbnail first (priority 1)
        await prefetchThumbnail(item, controller.signal)

        if (controller.signal.aborted || cancelledRef.current) {
          return
        }

        // Prefetch video (priority 2)
        // CRITICAL: Await video download to maintain concurrency limit
        // The semaphore (activeDownloadsRef) must remain held until video completes
        try {
          await prefetchVideo(item, controller.signal)
        } catch (error) {
          // Check cancelledRef before logging to prevent side effects after unmount
          if (controller.signal.aborted || cancelledRef.current) {
            return
          }
          log.warn('usePrefetchNextVideos', 'Video prefetch failed', {
            analysisId: item.id,
            error: error instanceof Error ? error.message : String(error),
          })
          // Mark as failed instead of prefetched
          stateRef.current = {
            ...stateRef.current,
            prefetching: stateRef.current.prefetching.filter((id) => id !== item.id),
            failed: stateRef.current.failed.includes(item.id)
              ? stateRef.current.failed
              : [...stateRef.current.failed, item.id],
          }
          return
        }

        if (controller.signal.aborted || cancelledRef.current) {
          return
        }

        // Mark as prefetched (update ref only, no parent re-render)
        stateRef.current = {
          ...stateRef.current,
          prefetching: stateRef.current.prefetching.filter((id) => id !== item.id),
          prefetched: stateRef.current.prefetched.includes(item.id)
            ? stateRef.current.prefetched
            : [...stateRef.current.prefetched, item.id],
          failed: stateRef.current.failed.filter((id) => id !== item.id),
        }
      } catch (error) {
        // Fix: Check cancelledRef before updating state in catch block
        // Prevents state updates after component unmount
        if (controller.signal.aborted || cancelledRef.current) {
          stateRef.current = {
            ...stateRef.current,
            prefetching: stateRef.current.prefetching.filter((id) => id !== item.id),
            failed: stateRef.current.failed.filter((id) => id !== item.id),
          }
          return
        }
        // Mark as failed (update ref only, no parent re-render)
        // Only update if not cancelled to prevent leaks
        if (!cancelledRef.current) {
          stateRef.current = {
            ...stateRef.current,
            prefetching: stateRef.current.prefetching.filter((id) => id !== item.id),
            failed: stateRef.current.failed.includes(item.id)
              ? stateRef.current.failed
              : [...stateRef.current.failed, item.id],
          }
        }
      } finally {
        // Cleanup: Remove abort controller and release semaphore
        abortControllersRef.current.delete(item.id)
        activeDownloadsRef.current.delete(item.id)
      }
    },
    [prefetchThumbnail, prefetchVideo]
  )

  // Track previous counts for logging (prevent spam logs on ref updates)
  const prevStateRef = React.useRef({ prefetching: 0, prefetched: 0, failed: 0 })

  // Periodic logging of prefetch state changes
  // Since we use ref for state, we need to trigger logging externally
  React.useEffect(() => {
    const logInterval = setInterval(() => {
      const currentCounts = {
        prefetching: stateRef.current.prefetching.length,
        prefetched: stateRef.current.prefetched.length,
        failed: stateRef.current.failed.length,
      }

      if (
        prevStateRef.current.prefetching !== currentCounts.prefetching ||
        prevStateRef.current.prefetched !== currentCounts.prefetched ||
        prevStateRef.current.failed !== currentCounts.failed
      ) {
        log.debug('usePrefetchNextVideos', 'Prefetch state changed', currentCounts)
        prevStateRef.current = currentCounts
      }
    }, 1000) // Log every 1s instead of on every state change

    return () => clearInterval(logInterval)
  }, [])

  /**
   * Process prefetch queue with concurrency limit
   */
  const processPrefetchQueue = React.useCallback(
    async (itemsToPrefetch: VideoItem[]): Promise<void> => {
      if (!finalConfig.enabled || itemsToPrefetch.length === 0) {
        return
      }

      // Filter and check cache BEFORE adding to queue to avoid unnecessary state updates
      const availableItems: VideoItem[] = []
      const newlyPrefetched: number[] = []

      for (const item of itemsToPrefetch) {
        // Skip if already in progress or prefetched
        if (
          stateRef.current.prefetching.includes(item.id) ||
          stateRef.current.prefetched.includes(item.id) ||
          activeDownloadsRef.current.has(item.id)
        ) {
          continue
        }

        // Quick cache check: skip if both thumbnail and video are already cached
        const thumbnailCached = await isThumbnailCached(item.videoId)
        const videoCached = isVideoCached(item.id)
        const needsThumbnail = item.thumbnailUri?.startsWith('http') && !thumbnailCached
        const needsVideo = !videoCached

        // If fully cached, mark as prefetched immediately without processing
        if (!needsThumbnail && !needsVideo) {
          newlyPrefetched.push(item.id)
          continue
        }

        // Needs prefetching
        availableItems.push(item)
      }

      // Batch update state for all newly discovered cached items (update ref only)
      if (newlyPrefetched.length > 0) {
        const alreadyPrefetched = newlyPrefetched.filter((id) =>
          stateRef.current.prefetched.includes(id)
        )
        if (alreadyPrefetched.length < newlyPrefetched.length) {
          // Only update if there are new items to add
          const deduped = [
            ...stateRef.current.prefetched,
            ...newlyPrefetched.filter((id) => !stateRef.current.prefetched.includes(id)),
          ]
          stateRef.current = {
            ...stateRef.current,
            prefetched: deduped,
            failed: stateRef.current.failed.filter((id) => !newlyPrefetched.includes(id)),
          }
        }
      }

      // Skip if nothing to do
      if (availableItems.length === 0) {
        return
      }

      // Process with concurrency limit
      const queue: Promise<void>[] = []
      for (const item of availableItems) {
        // Wait if we've reached concurrency limit
        while (activeDownloadsRef.current.size >= finalConfig.concurrency) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          if (cancelledRef.current) {
            return
          }
        }

        // Skip if cancelled
        if (cancelledRef.current) {
          return
        }

        // Mark as active and start prefetch
        activeDownloadsRef.current.add(item.id)
        queue.push(prefetchItem(item))
      }

      // Wait for all prefetches to complete (or fail)
      await Promise.allSettled(queue)
    },
    [finalConfig.enabled, finalConfig.concurrency, prefetchItem, isThumbnailCached, isVideoCached]
  )

  // Track previous prefetch target to avoid recalculating for same items
  const prevPrefetchTargetRef = React.useRef<string>('')

  /**
   * Calculate which items to prefetch based on visible items
   */
  React.useEffect(() => {
    if (!finalConfig.enabled || allItems.length === 0 || Platform.OS === 'web') {
      return
    }

    // If no visible items (e.g., on mount), start from beginning
    let lastVisibleIndex = -1
    if (visibleItems.length === 0) {
      // On mount with no scroll yet: prefetch from index 0
      lastVisibleIndex = -1 // Will be incremented to 0 below
    } else {
      // Find the index of the last visible item in allItems
      const lastVisibleItem = visibleItems[visibleItems.length - 1]
      lastVisibleIndex = allItems.findIndex((item) => item.id === lastVisibleItem.id)
    }

    // Only error if we expected to find visible items but couldn't
    if (lastVisibleIndex === -1 && visibleItems.length > 0) {
      log.debug('usePrefetchNextVideos', 'Last visible item not found in all items', {
        lastVisibleId: visibleItems[visibleItems.length - 1]?.id,
      })
      return
    }

    // Calculate items to prefetch: next N items after last visible item
    // If lastVisibleIndex is -1 (no visible items), start from 0
    const startIndex = Math.max(0, lastVisibleIndex + 1)
    const endIndex = Math.min(startIndex + finalConfig.lookAhead, allItems.length)
    const itemsToPrefetch = allItems.slice(startIndex, endIndex)

    // Create stable key for prefetch target (which items we'd prefetch)
    const prefetchTargetKey = itemsToPrefetch.map((item) => item.id).join(',')

    // Skip if we're already prefetching/prefetched these exact items
    if (prevPrefetchTargetRef.current === prefetchTargetKey) {
      return // Skip calculation - prefetch target unchanged
    }

    prevPrefetchTargetRef.current = prefetchTargetKey
    cancelledRef.current = false

    // Only log when prefetch target actually changes
    log.debug('usePrefetchNextVideos', 'Calculating prefetch targets', {
      visibleCount: visibleItems.length,
      lastVisibleIndex,
      itemsToPrefetch: itemsToPrefetch.length,
      lookAhead: finalConfig.lookAhead,
    })

    // Process prefetch queue
    void processPrefetchQueue(itemsToPrefetch)

    return () => {
      cancelledRef.current = true
      abortControllersRef.current.forEach((controller) => controller.abort())
      abortControllersRef.current.clear()
      activeDownloadsRef.current.clear()
    }
  }, [allItems, visibleItems, finalConfig.enabled, finalConfig.lookAhead, processPrefetchQueue])

  // Return stable ref state - never triggers parent re-renders
  // All state updates go to ref, parent always gets same object reference
  return stateRef.current
}
