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
 * UUID mapping entry with timestamp for TTL management
 */
export interface UuidMappingEntry {
  uuid: string
  cachedAt: number
}

export type UuidMapping = Map<number, UuidMappingEntry> // jobId -> { uuid, cachedAt }

/**
 * Video history store state
 */
export interface VideoHistoryState {
  cache: Map<number, CachedAnalysis>
  lastSync: number
  version: number
  localUriIndex: LocalUriMap
  uuidMapping: UuidMapping // Persisted mapping of jobId -> { uuid, cachedAt } for fast lookups with TTL
}

/**
 * Serialized state for persistence (Maps converted to arrays for JSON)
 */
export interface PersistedVideoHistoryState {
  cache: [number, CachedAnalysis][]
  localUriIndex: [string, string][]
  uuidMapping: [number, UuidMappingEntry][] // New format with timestamps
  lastSync: number
  version: number
}

/**
 * Video history store actions
 */
export interface VideoHistoryActions {
  // Cache operations
  addToCache: (analysis: Omit<CachedAnalysis, 'cachedAt' | 'lastAccessed'>) => void
  addMultipleToCache: (
    analyses: CachedAnalysis[],
    localUriUpdates?: Array<[string, string]>
  ) => void
  updateCache: (id: number, updates: Partial<CachedAnalysis>) => void
  getCached: (id: number) => CachedAnalysis | null
  getAllCached: () => CachedAnalysis[]
  removeFromCache: (id: number) => void

  // Local URI management
  setLocalUri: (storagePath: string, localUri: string) => void
  getLocalUri: (storagePath: string) => string | null
  clearLocalUri: (storagePath: string) => void

  // UUID mapping management
  setUuid: (jobId: number, uuid: string) => void
  getUuid: (jobId: number) => string | null
  clearUuid: (jobId: number) => void

  // Cache management
  clearCache: () => void
  resetAll: () => void
  evictStale: () => void
  evictLRU: () => void

  // Sync management
  updateLastSync: () => void

  // Lazy hydration (for memory optimization)
  ensureHydrated: () => Promise<void>
  _isHydrated: boolean
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
 * Check if UUID mapping is stale based on TTL
 */
function isUuidStale(entry: UuidMappingEntry): boolean {
  const now = Date.now()
  const age = now - entry.cachedAt
  const ttl = TTL_DAYS * 24 * 60 * 60 * 1000
  return age > ttl
}

/**
 * Video history store with persistence and cache management
 */
export const useVideoHistoryStore = create<VideoHistoryStore>()(
  subscribeWithSelector(
    persist<VideoHistoryStore, [], [['zustand/immer', never]], PersistedVideoHistoryState>(
      immer((set, get) => {
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
          uuidMapping: new Map<number, UuidMappingEntry>(),
          _isHydrated: false,

          // Lazy hydration method - manually triggers hydration when needed
          ensureHydrated: async () => {
            const state = get()
            if (state._isHydrated) {
              return // Already hydrated
            }
            // With skipHydration: true, we need to manually trigger rehydration
            // Access persist API via store instance
            const persistApi = (useVideoHistoryStore as any).persist
            if (persistApi && persistApi.rehydrate) {
              await persistApi.rehydrate()
            } else {
              // Fallback: wait for hydration to complete (shouldn't happen with skipHydration)
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          },

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
              // Only index persisted paths (recordings/), not temporary cache paths
              if (
                analysis.storagePath &&
                analysis.videoUri?.startsWith('file://') &&
                analysis.videoUri.includes('recordings/') &&
                !analysis.videoUri.includes('Caches/') &&
                !analysis.videoUri.includes('temp/') &&
                !analysis.videoUri.includes('ExponentAsset-')
              ) {
                draft.localUriIndex.set(analysis.storagePath, analysis.videoUri)
              }
            })

            // Evict LRU if over limit (outside of set to avoid circular dependency)
            if (get().cache.size > MAX_CACHE_ENTRIES) {
              get().evictLRU()
            }
          },

          // Batch add to cache - single store update prevents cascade re-renders
          addMultipleToCache: (analyses, localUriUpdates = []) => {
            set((draft) => {
              // Add all cache entries in a single transaction
              analyses.forEach((entry) => {
                draft.cache.set(entry.id, entry)
                // Only index persisted paths (recordings/), not temporary cache paths
                if (
                  entry.storagePath &&
                  entry.videoUri?.startsWith('file://') &&
                  entry.videoUri.includes('recordings/') &&
                  !entry.videoUri.includes('Caches/') &&
                  !entry.videoUri.includes('temp/') &&
                  !entry.videoUri.includes('ExponentAsset-')
                ) {
                  draft.localUriIndex.set(entry.storagePath, entry.videoUri)
                }
              })
              // Apply any additional localUri updates
              localUriUpdates.forEach(([storagePath, localUri]) => {
                draft.localUriIndex.set(storagePath, localUri)
              })
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
                // Only index persisted paths (recordings/), not temporary cache paths
                const videoUri = updates.videoUri
                const storagePath = updates.storagePath || entry.storagePath
                const isPersistedPath =
                  videoUri?.startsWith('file://') &&
                  videoUri.includes('recordings/') &&
                  !videoUri.includes('Caches/') &&
                  !videoUri.includes('temp/') &&
                  !videoUri.includes('ExponentAsset-')

                if (storagePath && videoUri && isPersistedPath) {
                  draft.localUriIndex.set(storagePath, videoUri)
                } else if (storagePath && videoUri && !isPersistedPath) {
                  // Remove index entry if we're updating to a temporary path (shouldn't happen, but defensive)
                  draft.localUriIndex.delete(storagePath)
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

            const isPersistedPath = localUri.includes('recordings/')
            const previousUri = get().localUriIndex.get(storagePath)

            set((draft) => {
              draft.localUriIndex.set(storagePath, localUri)
            })

            log.debug('VideoHistoryStore', 'setLocalUri called', {
              storagePath,
              localUri: localUri.substring(0, 150) + '...',
              isPersistedPath,
              previousUri: previousUri ? previousUri.substring(0, 150) + '...' : null,
              indexSize: get().localUriIndex.size,
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

          // UUID mapping management with TTL
          setUuid: (jobId, uuid) => {
            if (!jobId || !uuid) {
              return
            }
            set((draft) => {
              draft.uuidMapping.set(jobId, {
                uuid,
                cachedAt: Date.now(),
              })
            })
          },

          getUuid: (jobId) => {
            if (!jobId) {
              return null
            }
            const entry = get().uuidMapping.get(jobId)
            if (!entry) {
              return null
            }
            // Check TTL: return null if stale
            if (isUuidStale(entry)) {
              // Auto-cleanup stale entry
              set((draft) => {
                draft.uuidMapping.delete(jobId)
              })
              return null
            }
            return entry.uuid
          },

          clearUuid: (jobId) => {
            if (!jobId) {
              return
            }
            set((draft) => {
              draft.uuidMapping.delete(jobId)
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
              draft.uuidMapping.clear()
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
              draft.uuidMapping.clear()
            })

            log.debug('VideoHistoryStore', 'resetAll() completed', {
              lastSyncAfterReset: get().lastSync,
              cacheSizeAfterReset: get().cache.size,
            })
          },

          // Evict stale entries (TTL expired or too old)
          evictStale: () => {
            let evictedCount = 0
            let evictedUuidCount = 0
            set((draft) => {
              const entries = Array.from(draft.cache.entries())

              for (const [id, entry] of entries) {
                if (isStale(entry) || isTooOld(entry)) {
                  if (entry.storagePath) {
                    draft.localUriIndex.delete(entry.storagePath)
                  }
                  // Also clear UUID mapping when evicting entry
                  draft.uuidMapping.delete(id)
                  draft.cache.delete(id)
                  evictedCount++
                }
              }

              // Also evict stale UUID mappings that aren't tied to cache entries
              const uuidEntries = Array.from(draft.uuidMapping.entries())
              for (const [jobId, entry] of uuidEntries) {
                if (isUuidStale(entry)) {
                  draft.uuidMapping.delete(jobId)
                  evictedUuidCount++
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
              // Also clear UUID mapping when evicting entry
              draft.uuidMapping.delete(oldestId)
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
        skipHydration: true, // Defer hydration until ensureHydrated() is called
        partialize: (state: VideoHistoryStore) => ({
          // Convert Maps to arrays for JSON serialization
          cache: Array.from(state.cache.entries()),
          localUriIndex: Array.from(state.localUriIndex.entries()),
          uuidMapping: Array.from(state.uuidMapping.entries()),
          lastSync: state.lastSync,
          version: state.version,
        }),
        // Convert arrays back to Maps on rehydration
        merge: (persistedState: unknown, currentState: VideoHistoryStore): VideoHistoryStore => {
          // Type guard for persisted state structure
          // uuidMapping can be old format [number, string] or new format [number, UuidMappingEntry]
          type PersistedState = {
            cache?: [number, CachedAnalysis][]
            localUriIndex?: [string, string][]
            uuidMapping?: [number, string | UuidMappingEntry][]
            lastSync?: number
            version?: number
          }

          function isPersistedState(state: unknown): state is PersistedState {
            return (
              typeof state === 'object' &&
              state !== null &&
              ('cache' in state ||
                'localUriIndex' in state ||
                'uuidMapping' in state ||
                'lastSync' in state ||
                'version' in state)
            )
          }

          const persisted = isPersistedState(persistedState) ? persistedState : {}

          log.debug('VideoHistoryStore', 'Rehydrating from AsyncStorage', {
            hasPersistedState: !!persistedState,
            persistedVersion: persisted.version,
            persistedLastSync: persisted.lastSync,
            persistedLastSyncDate:
              persisted.lastSync && persisted.lastSync > 0
                ? new Date(persisted.lastSync).toISOString()
                : 'never',
            persistedCacheSize: persisted.cache?.length ?? 0,
            persistedLocalUriIndexSize: persisted.localUriIndex?.length ?? 0,
            currentVersion: currentState.version,
            currentLastSync: currentState.lastSync,
            CACHE_VERSION,
          })

          // Handle UUID mapping migration: convert old format [number, string] to new format [number, UuidMappingEntry]
          const uuidMappingEntries: [number, UuidMappingEntry][] = []
          if (persisted.uuidMapping) {
            for (const [jobId, value] of persisted.uuidMapping) {
              // Old format: value is string
              if (typeof value === 'string') {
                uuidMappingEntries.push([jobId, { uuid: value, cachedAt: Date.now() }])
              } else {
                // New format: value is UuidMappingEntry
                uuidMappingEntries.push([jobId, value])
              }
            }
          }

          const merged: VideoHistoryStore = {
            ...currentState,
            cache: new Map(persisted.cache ?? []),
            localUriIndex: new Map(persisted.localUriIndex ?? []),
            uuidMapping: new Map(uuidMappingEntries),
            lastSync: persisted.lastSync ?? currentState.lastSync,
            version: persisted.version ?? currentState.version,
          }

          // Clean up stale localUriIndex entries on rehydration
          // Stale entries point to temporary cache paths (Library/Caches/) that get cleared
          // Valid entries point to documentDirectory/recordings/ which persist
          const cleanedIndex = new Map<string, string>()
          let staleIndexCount = 0
          for (const [storagePath, localUri] of Array.from(merged.localUriIndex.entries())) {
            // Keep entries that point to persisted documentDirectory paths
            // Check for both 'recordings/' (our persisted directory) and ensure it's NOT in Caches/
            const hasRecordingsDir = localUri.includes('recordings/')
            const isTemporaryPath =
              localUri.includes('Caches/') ||
              localUri.includes('temp/') ||
              localUri.includes('ExponentAsset-')

            if (hasRecordingsDir && !isTemporaryPath) {
              cleanedIndex.set(storagePath, localUri)
              // log.debug('VideoHistoryStore', 'Kept valid localUriIndex entry on rehydration', {
              //   storagePath,
              //   localUri: localUri.substring(0, 150) + '...',
              // })
            } else {
              // Remove entries pointing to temporary cache paths
              staleIndexCount++
              log.debug('VideoHistoryStore', 'Removed stale localUriIndex entry on rehydration', {
                storagePath,
                staleLocalUri: localUri.substring(0, 150) + '...',
                reason: isTemporaryPath
                  ? 'points to temporary cache path that gets cleared'
                  : 'does not point to persisted recordings/ directory',
                hasRecordingsDir,
                isTemporaryPath,
              })
            }
          }
          merged.localUriIndex = cleanedIndex

          // Note: We don't clean stale videoUri in cache entries here because:
          // 1. The resolution logic (resolveHistoricalVideoUri) will skip stale paths automatically
          // 2. Cache entries will be rebuilt via direct file check when accessed
          // 3. Cleaning localUriIndex ensures tryResolveLocalUri falls back to direct check correctly

          log.debug('VideoHistoryStore', 'Rehydration complete', {
            finalVersion: merged.version,
            finalLastSync: merged.lastSync,
            finalLastSyncDate:
              merged.lastSync > 0 ? new Date(merged.lastSync).toISOString() : 'never',
            finalCacheSize: merged.cache.size,
            finalLocalUriIndexSize: merged.localUriIndex.size,
            finalUuidMappingSize: merged.uuidMapping.size,
            staleIndexEntriesRemoved: staleIndexCount,
            note:
              staleIndexCount > 0
                ? 'Stale index entries removed - will be rebuilt via direct file check'
                : 'All index entries valid',
          })

          // Mark as hydrated
          merged._isHydrated = true

          return merged
        },
        onRehydrateStorage: () => (state) => {
          // Mark store as hydrated when rehydration completes
          if (state) {
            state._isHydrated = true
          }
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
