import { log } from '@my/logging'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type TabType = 'coach' | 'record' | 'insights'

/**
 * Type definition for tab navigation parameters
 * Used for type safety in Expo Router tab navigation
 */
export type TabParamList = {
  record: undefined
  coach: undefined
  insights: undefined
}

const TAB_STORAGE_KEY = 'activeTab'
const DEFAULT_TAB: TabType = 'record'

// Module-level cache to prevent redundant AsyncStorage reads on remount
// When component remounts (e.g., due to shouldRender toggle), we use cached value
let cachedTab: TabType | null = null
let hasLoadedFromStorage = false

/**
 * Custom hook for persisting tab state across app sessions
 * Uses AsyncStorage to save and restore the active tab
 *
 * Note: Uses module-level cache to prevent double-loading on component remount
 */
export function useTabPersistence() {
  // Use cached value if already loaded (prevents double AsyncStorage read)
  const [activeTab, setActiveTabState] = useState<TabType>(cachedTab ?? DEFAULT_TAB)
  const [isLoading, setIsLoading] = useState(!hasLoadedFromStorage)

  const loadSavedTab = useCallback(async () => {
    // Skip if already loaded from storage (module-level guard)
    if (hasLoadedFromStorage) {
      return
    }

    try {
      const savedTab = await AsyncStorage.getItem(TAB_STORAGE_KEY)

      if (savedTab && isValidTab(savedTab)) {
        cachedTab = savedTab as TabType
        setActiveTabState(cachedTab)
        log.info('useTabPersistence', 'Loaded saved tab state', { tab: savedTab })
      } else {
        // Use default tab if no valid saved state
        cachedTab = DEFAULT_TAB
        setActiveTabState(DEFAULT_TAB)
        log.info('useTabPersistence', 'Using default tab state', { tab: DEFAULT_TAB })
      }
    } catch (error) {
      log.error('useTabPersistence', 'Failed to load saved tab state', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Fallback to default tab on error
      cachedTab = DEFAULT_TAB
      setActiveTabState(DEFAULT_TAB)
    } finally {
      hasLoadedFromStorage = true
      setIsLoading(false)
    }
  }, [])

  // Load saved tab state on mount
  useEffect(() => {
    loadSavedTab()
  }, [loadSavedTab])

  // Use ref for saveTab to keep setActiveTab stable (prevents cascade re-renders)
  // Create stable callback first, then assign to ref
  const saveTabCallback = useCallback(async (tab: TabType) => {
    try {
      await AsyncStorage.setItem(TAB_STORAGE_KEY, tab)
      log.debug('useTabPersistence', 'Saved tab state', { tab })
    } catch (error) {
      log.error('useTabPersistence', 'Failed to save tab state', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  const saveTabRef = useRef(saveTabCallback)
  saveTabRef.current = saveTabCallback

  // Stable setActiveTab callback - no dependencies means it never changes reference
  const setActiveTab = useCallback(
    (tab: TabType) => {
      if (!isValidTab(tab)) {
        log.warn('useTabPersistence', 'Invalid tab value provided', { tab })
        return
      }

      // Update module-level cache so remounts don't reset state
      cachedTab = tab
      setActiveTabState(tab)
      saveTabRef.current(tab)
    },
    [] // No dependencies - callback is stable forever
  )

  // Memoize return object to prevent unnecessary re-renders in consumers
  // This is critical - without memoization, every render creates a new object identity
  // which breaks memoization in TabsLayout (useTabPersistence result is in dependency arrays)
  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
      isLoading,
    }),
    [activeTab, setActiveTab, isLoading]
  )
}

/**
 * Validates if a string is a valid tab type
 */
function isValidTab(value: string): value is TabType {
  return ['coach', 'record', 'insights'].includes(value)
}
