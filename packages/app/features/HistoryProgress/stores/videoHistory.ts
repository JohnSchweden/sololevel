import type { AnalysisResults, PoseData } from '@my/api'
import { log } from '@my/logging'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { recordEviction } from '../utils/cacheMetrics'

// Constants
const MAX_CACHE_ENTRIES = 50
const TTL_DAYS = 7
const MAX_AGE_DAYS = 30
const CACHE_VERSION = 4 // Incremented to regenerate cache with public URLs from storage_path

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
  videoUri?: string
  storagePath?: string
  results: AnalysisResults
  poseData?: PoseData
  cachedAt: number
  lastAccessed: number
}

export type LocalUriMap = Map<string, string>

/**
 * Video history store state
 */
export interface VideoHistoryState {
  cache: Map<number, CachedAnalysis>
  lastSync: number
  version: number
  localUriIndex: LocalUriMap
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

  // Local URI management
  setLocalUri: (storagePath: string, localUri: string) => void
  getLocalUri: (storagePath: string) => string | null
  clearLocalUri: (storagePath: string) => void

  // Cache management
  clearCache: () => void
  resetAll: () => void
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
    persist(
      immer<VideoHistoryStore>((set, get) => {
        log.debug('VideoHistoryStore', 'Initializing store', {
          CACHE_VERSION,
          initialLastSync: 0,
          timestamp: Date.now(),
        })

        return {
          // Initial state
          cache: new Map<number, CachedAnalysis>(),
          lastSync: 0,
          version: CACHE_VERSION,
          localUriIndex: new Map<string, string>(),

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
              if (analysis.storagePath && analysis.videoUri?.startsWith('file://')) {
                draft.localUriIndex.set(analysis.storagePath, analysis.videoUri)
              }
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
                if (updates.storagePath && updates.videoUri?.startsWith('file://')) {
                  draft.localUriIndex.set(updates.storagePath, updates.videoUri)
                } else if (entry.storagePath && updates.videoUri?.startsWith('file://')) {
                  draft.localUriIndex.set(entry.storagePath, updates.videoUri)
                }
              }
            })
          },

          // Get cached entry (read-only, no side effects)
          getCached: (id) => {
            const state = get()

            // Check version and clear cache if outdated
            if (state.version !== CACHE_VERSION) {
              log.warn('VideoHistoryStore', 'Cache version mismatch, clearing cache', {
                storedVersion: state.version,
                expectedVersion: CACHE_VERSION,
                cacheSize: state.cache.size,
                lastSync: state.lastSync,
                lastSyncDate: state.lastSync > 0 ? new Date(state.lastSync).toISOString() : 'never',
              })

              const lastSyncBeforeReset = state.lastSync
              state.resetAll() // Use resetAll for version mismatch

              log.warn('VideoHistoryStore', 'Version mismatch - full reset', {
                lastSyncBeforeReset,
                lastSyncAfterReset: get().lastSync,
                timestamp: Date.now(),
              })

              set((draft) => {
                draft.version = CACHE_VERSION
              })
              return null
            }

            const entry = state.cache.get(id)
            if (!entry) return null

            // Check if stale (before updating lastAccessed)
            if (isStale(entry) || isTooOld(entry)) {
              state.removeFromCache(id)
              return null
            }

            // Return entry without side effects
            // Note: lastAccessed updates should be done via updateCache() after initial read
            return entry
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
              const entry = draft.cache.get(id)
              if (entry?.storagePath) {
                draft.localUriIndex.delete(entry.storagePath)
              }
              draft.cache.delete(id)
            })
          },

          // Local URI management
          setLocalUri: (storagePath, localUri) => {
            if (!storagePath || !localUri) {
              return
            }

            set((draft) => {
              draft.localUriIndex.set(storagePath, localUri)
            })
          },

          getLocalUri: (storagePath) => {
            if (!storagePath) {
              return null
            }
            return get().localUriIndex.get(storagePath) ?? null
          },

          clearLocalUri: (storagePath) => {
            if (!storagePath) {
              return
            }
            set((draft) => {
              draft.localUriIndex.delete(storagePath)
            })
          },

          // Clear entire cache (preserves lastSync for cache freshness tracking)
          clearCache: () => {
            const stateBeforeClear = get()
            log.debug('VideoHistoryStore', 'clearCache() called', {
              cacheSize: stateBeforeClear.cache.size,
              lastSync: stateBeforeClear.lastSync,
              lastSyncDate:
                stateBeforeClear.lastSync > 0
                  ? new Date(stateBeforeClear.lastSync).toISOString()
                  : 'never',
              version: stateBeforeClear.version,
              stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
            })

            set((draft) => {
              draft.cache.clear()
              // Don't reset lastSync - it's a sync timestamp, not cached data
              // lastSync preserved to maintain cache freshness tracking
              draft.localUriIndex.clear()
            })

            log.debug('VideoHistoryStore', 'clearCache() completed', {
              lastSyncAfterClear: get().lastSync,
              cacheSizeAfterClear: get().cache.size,
              note: 'lastSync preserved',
            })
          },

          // Full reset (clears cache AND resets lastSync)
          resetAll: () => {
            const stateBeforeReset = get()
            log.debug('VideoHistoryStore', 'resetAll() called', {
              cacheSize: stateBeforeReset.cache.size,
              lastSync: stateBeforeReset.lastSync,
              lastSyncDate:
                stateBeforeReset.lastSync > 0
                  ? new Date(stateBeforeReset.lastSync).toISOString()
                  : 'never',
              version: stateBeforeReset.version,
            })

            set((draft) => {
              draft.cache.clear()
              draft.lastSync = 0
              draft.localUriIndex.clear()
            })

            log.debug('VideoHistoryStore', 'resetAll() completed', {
              lastSyncAfterReset: get().lastSync,
              cacheSizeAfterReset: get().cache.size,
            })
          },

          // Evict stale entries (TTL expired or too old)
          evictStale: () => {
            let evictedCount = 0
            set((draft) => {
              const entries = Array.from(draft.cache.entries())

              for (const [id, entry] of entries) {
                if (isStale(entry) || isTooOld(entry)) {
                  if (entry.storagePath) {
                    draft.localUriIndex.delete(entry.storagePath)
                  }
                  draft.cache.delete(id)
                  evictedCount++
                }
              }
            })
            // Record evictions (for both thumbnail and video cache entries)
            if (evictedCount > 0) {
              recordEviction('thumbnail')
              recordEviction('video') // Mixed cache entries may contain both
            }
          },

          // Evict least recently used entry
          evictLRU: () => {
            set((draft) => {
              const entries = Array.from(draft.cache.entries())

              if (entries.length === 0) return

              // Sort by last accessed (oldest first)
              entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

              // Remove oldest entry
              const [oldestId, oldestEntry] = entries[0]
              if (oldestEntry?.storagePath) {
                draft.localUriIndex.delete(oldestEntry.storagePath)
              }
              draft.cache.delete(oldestId)
              // Record eviction (for both thumbnail and video cache entries)
              recordEviction('thumbnail')
              recordEviction('video') // Mixed cache entries may contain both
            })
          },

          // Update last sync timestamp
          updateLastSync: () => {
            const previousLastSync = get().lastSync
            const newLastSync = Date.now()

            set((draft) => {
              draft.lastSync = newLastSync
            })

            log.debug('VideoHistoryStore', 'updateLastSync() called', {
              previousLastSync,
              previousLastSyncDate:
                previousLastSync > 0 ? new Date(previousLastSync).toISOString() : 'never',
              newLastSync,
              newLastSyncDate: new Date(newLastSync).toISOString(),
              ageDifference: previousLastSync > 0 ? newLastSync - previousLastSync : 'first sync',
            })
          },
        }
      }),
      {
        name: 'video-history-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Maps to arrays for JSON serialization
          cache: Array.from(state.cache.entries()),
          localUriIndex: Array.from(state.localUriIndex.entries()),
          lastSync: state.lastSync,
          version: state.version,
        }),
        // Convert arrays back to Maps on rehydration
        merge: (persistedState: any, currentState: any) => {
          log.debug('VideoHistoryStore', 'Rehydrating from AsyncStorage', {
            hasPersistedState: !!persistedState,
            persistedVersion: persistedState?.version,
            persistedLastSync: persistedState?.lastSync,
            persistedLastSyncDate:
              persistedState?.lastSync > 0
                ? new Date(persistedState.lastSync).toISOString()
                : 'never',
            persistedCacheSize: persistedState?.cache?.length || 0,
            currentVersion: currentState.version,
            currentLastSync: currentState.lastSync,
            CACHE_VERSION,
          })

          const merged = {
            ...currentState,
            cache: new Map(persistedState.cache || []),
            localUriIndex: new Map(persistedState.localUriIndex || []),
            lastSync: persistedState.lastSync || currentState.lastSync,
            version: persistedState.version || currentState.version,
          }

          log.debug('VideoHistoryStore', 'Rehydration complete', {
            finalVersion: merged.version,
            finalLastSync: merged.lastSync,
            finalLastSyncDate:
              merged.lastSync > 0 ? new Date(merged.lastSync).toISOString() : 'never',
            finalCacheSize: merged.cache.size,
          })

          return merged
        },
      }
    )
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
 * Subscribe to auth state changes to clear cache on user change (logout or switch user)
 * This should be called in the app provider or root component
 *
 * Battle-tested pattern: Only clear cache when user actually changes, not on initial auth state
 */
export function setupVideoHistoryCacheCleanup(authStore: {
  subscribe: (callback: (state: any) => void) => () => void
}): () => void {
  let previousUserId: string | null = null

  return authStore.subscribe((state) => {
    const currentUserId = state.user?.id || null

    // Only clear cache when user changes (logout or switch user)
    // Don't clear on initial auth state (when previousUserId is null)
    if (previousUserId && currentUserId !== previousUserId) {
      log.info('VideoHistoryStore', 'User changed, clearing cache', {
        previousUserId,
        currentUserId,
      })
      useVideoHistoryStore.getState().clearCache()
    }

    previousUserId = currentUserId
  })
}
