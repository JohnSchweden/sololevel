/**
 * MMKV Storage Adapter
 *
 * Cross-platform storage adapters using MMKV for native platforms.
 * MMKV provides ~30x faster performance than AsyncStorage through C++ JSI bindings.
 *
 * @module storage
 * @see https://github.com/mrousavy/react-native-mmkv
 */

import type { StateStorage } from 'zustand/middleware'

// Lazy-load MMKV to avoid import errors on web/non-native platforms
let mmkvInstance: MMKV | null = null

// Type definition for MMKV (to avoid importing when not available)
interface MMKV {
  getString: (key: string) => string | undefined
  set: (key: string, value: string | number | boolean) => void
  delete: (key: string) => void
  contains: (key: string) => boolean
  clearAll: () => void
}

/**
 * Get or create the singleton MMKV instance.
 * Returns null on web/non-native platforms.
 */
function getMMKV(): MMKV | null {
  if (mmkvInstance !== null) {
    return mmkvInstance
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV: MMKVClass } = require('react-native-mmkv')
    mmkvInstance = new MMKVClass({ id: 'sololevel-storage' })
    return mmkvInstance
  } catch {
    // MMKV not available (web or Node.js)
    return null
  }
}

/**
 * Zustand-compatible storage adapter for MMKV.
 *
 * Use with Zustand persist middleware:
 * ```typescript
 * import { createJSONStorage } from 'zustand/middleware'
 * import { mmkvStorage } from '@my/config'
 *
 * persist(
 *   (set, get) => ({ ... }),
 *   {
 *     name: 'my-store',
 *     storage: createJSONStorage(() => mmkvStorage),
 *   }
 * )
 * ```
 *
 * @remarks
 * - Synchronous operations (no async overhead)
 * - ~30x faster than AsyncStorage
 * - Fallback to null on web/non-native platforms
 */
export const mmkvStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const mmkv = getMMKV()
    if (!mmkv) return null
    return mmkv.getString(name) ?? null
  },
  setItem: (name: string, value: string): void => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.set(name, value)
  },
  removeItem: (name: string): void => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.delete(name)
  },
}

/**
 * Async wrapper for Supabase auth storage.
 * Supabase client expects Promise-based storage API.
 *
 * Use with Supabase client:
 * ```typescript
 * import { createClient } from '@supabase/supabase-js'
 * import { mmkvStorageAsync } from '@my/config'
 *
 * const supabase = createClient(url, key, {
 *   auth: {
 *     storage: mmkvStorageAsync,
 *   },
 * })
 * ```
 *
 * @remarks
 * - Operations are still synchronous (instant Promise resolution)
 * - Provides async interface for Supabase compatibility
 * - Fallback to null on web (Supabase uses localStorage automatically)
 */
export const mmkvStorageAsync = {
  getItem: async (key: string): Promise<string | null> => {
    const mmkv = getMMKV()
    if (!mmkv) return null
    return mmkv.getString(key) ?? null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.set(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.delete(key)
  },
}

/**
 * Direct MMKV access for non-Zustand usage.
 * Provides low-level synchronous API for manual storage operations.
 *
 * Use for direct key-value operations:
 * ```typescript
 * import { mmkvDirect } from '@my/config'
 *
 * // Save tab selection
 * mmkvDirect.setString('last-tab', 'practice')
 *
 * // Load tab selection
 * const lastTab = mmkvDirect.getString('last-tab') ?? 'practice'
 *
 * // Check if key exists
 * if (mmkvDirect.contains('user-preferences')) {
 *   // ...
 * }
 *
 * // Clear all storage (use with caution!)
 * mmkvDirect.clearAll()
 * ```
 *
 * @remarks
 * - All operations are synchronous
 * - No serialization overhead (raw string storage)
 * - Returns null on web/non-native platforms
 */
export const mmkvDirect = {
  getString: (key: string): string | null => {
    const mmkv = getMMKV()
    if (!mmkv) return null
    return mmkv.getString(key) ?? null
  },
  setString: (key: string, value: string): void => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.set(key, value)
  },
  delete: (key: string): void => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.delete(key)
  },
  contains: (key: string): boolean => {
    const mmkv = getMMKV()
    if (!mmkv) return false
    return mmkv.contains(key)
  },
  clearAll: (): void => {
    const mmkv = getMMKV()
    if (!mmkv) return
    mmkv.clearAll()
  },
}

/**
 * Direct access to the MMKV instance for advanced usage.
 * Returns null on web/non-native platforms.
 *
 * @remarks
 * - Prefer using mmkvStorage, mmkvStorageAsync, or mmkvDirect adapters
 * - Only use for advanced scenarios requiring full MMKV API
 * - Check for null before using
 */
export const mmkv = getMMKV()
