import type { AnalysisResults, PoseData } from '@api/src/validation/cameraRecordingSchemas'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Constants
const MAX_CACHE_ENTRIES = 50
const TTL_DAYS = 7
const MAX_AGE_DAYS = 30
const CACHE_VERSION = 1

/**
 * Cached analysis entry with metadata for cache management
 */
export interface CachedAnalysis {
  id: number
  videoId: number
  userId: string
  title: string
  createdAt: string
  thumbnail?: string
  results: AnalysisResults
  poseData?: PoseData
  cachedAt: number
  lastAccessed: number
}

/**
 * Video history store state
 */
export interface VideoHistoryState {
  cache: Map<number, CachedAnalysis>
  lastSync: number
  version: number
}

/**
 * Video history store actions
 */
export interface VideoHistoryActions {
  // Cache operations
  addToCache: (analysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'>) => void
  updateCache: (id: number, updates: Partial<CachedAnalysis>) => void
  getCached: (id: number) => CachedAnalysis | null
  getAllCached: () => CachedAnalysis[]
  removeFromCache: (id: number) => void

  // Cache management
  clearCache: () => void
  evictStale: () => void
  evictLRU: () => void

  // Sync management
  updateLastSync: () => void
}

/**
 * Combined video history store interface
 */
export type VideoHistoryStore = VideoHistoryState & VideoHistoryActions

/**
 * Calculate if an entry is stale based on TTL
 */
function isStale(entry: CachedAnalysis): boolean {
  const now = Date.now()
  const age = now - entry.lastAccessed
  const ttl = TTL_DAYS * 24 * 60 * 60 * 1000
  return age > ttl
}

/**
 * Calculate if an entry is too old based on max age
 */
function isTooOld(entry: CachedAnalysis): boolean {
  const now = Date.now()
  const age = now - entry.cachedAt
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return age > maxAge
}

/**
 * Video history store with persistence and cache management
 */
export const useVideoHistoryStore = create<VideoHistoryStore>()(
  subscribeWithSelector(
    immer<VideoHistoryStore>((set, get) => ({
      // Initial state
      cache: new Map<number, CachedAnalysis>(),
      lastSync: 0,
      version: CACHE_VERSION,

      // Add to cache
      addToCache: (analysis) => {
        const now = Date.now()
        const entry: CachedAnalysis = {
          ...analysis,
          cachedAt: now,
          lastAccessed: now,
        }

        set((draft) => {
          draft.cache.set(analysis.id, entry)
        })

        // Evict LRU if over limit (outside of set to avoid circular dependency)
        if (get().cache.size > MAX_CACHE_ENTRIES) {
          get().evictLRU()
        }
      },

      // Update cache entry
      updateCache: (id, updates) => {
        set((draft) => {
          const entry = draft.cache.get(id)
          if (entry) {
            Object.assign(entry, updates)
            entry.lastAccessed = Date.now()
          }
        })
      },

      // Get cached entry
      getCached: (id) => {
        const entry = get().cache.get(id)
        if (!entry) return null

        // Check if stale (before updating lastAccessed)
        if (isStale(entry) || isTooOld(entry)) {
          get().removeFromCache(id)
          return null
        }

        // Update last accessed time (only if not stale)
        set((draft) => {
          const draftEntry = draft.cache.get(id)
          if (draftEntry) {
            draftEntry.lastAccessed = Date.now()
          }
        })

        // Return fresh reference after update
        return get().cache.get(id) || null
      },

      // Get all cached entries
      getAllCached: () => {
        const entries = Array.from(get().cache.values())

        // Filter out stale and old entries
        return entries.filter((entry) => !isStale(entry) && !isTooOld(entry))
      },

      // Remove from cache
      removeFromCache: (id) => {
        set((draft) => {
          draft.cache.delete(id)
        })
      },

      // Clear entire cache
      clearCache: () => {
        set((draft) => {
          draft.cache.clear()
          draft.lastSync = 0
        })
      },

      // Evict stale entries (TTL expired or too old)
      evictStale: () => {
        set((draft) => {
          const entries = Array.from(draft.cache.entries())

          for (const [id, entry] of entries) {
            if (isStale(entry) || isTooOld(entry)) {
              draft.cache.delete(id)
            }
          }
        })
      },

      // Evict least recently used entry
      evictLRU: () => {
        set((draft) => {
          const entries = Array.from(draft.cache.entries())

          if (entries.length === 0) return

          // Sort by last accessed (oldest first)
          entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

          // Remove oldest entry
          const [oldestId] = entries[0]
          draft.cache.delete(oldestId)
        })
      },

      // Update last sync timestamp
      updateLastSync: () => {
        set((draft) => {
          draft.lastSync = Date.now()
        })
      },
    }))
  )
)

/**
 * Selector hook for cache statistics
 */
export const useVideoHistoryCacheStats = () => {
  const cache = useVideoHistoryStore((state) => state.cache)
  const lastSync = useVideoHistoryStore((state) => state.lastSync)

  return {
    totalEntries: cache.size,
    lastSync,
    lastSyncDate: lastSync > 0 ? new Date(lastSync) : null,
  }
}

/**
 * Subscribe to auth state changes to clear cache on logout
 * This should be called in the app provider or root component
 */
export function setupVideoHistoryCacheCleanup(authStore: {
  subscribe: (callback: (state: any) => void) => () => void
}): () => void {
  return authStore.subscribe((state) => {
    // Clear cache when user logs out
    if (!state.user && !state.session) {
      useVideoHistoryStore.getState().clearCache()
    }
  })
}
