import { log } from '@my/logging'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

/**
 * Custom hook for persisting tab state across app sessions
 * Uses AsyncStorage to save and restore the active tab
 */
export function useTabPersistence() {
  const [activeTab, setActiveTabState] = useState<TabType>(DEFAULT_TAB)
  const [isLoading, setIsLoading] = useState(true)

  const loadSavedTab = useCallback(async () => {
    try {
      const savedTab = await AsyncStorage.getItem(TAB_STORAGE_KEY)

      if (savedTab && isValidTab(savedTab)) {
        setActiveTabState(savedTab as TabType)
        log.info('useTabPersistence', 'Loaded saved tab state', { tab: savedTab })
      } else {
        // Use default tab if no valid saved state
        setActiveTabState(DEFAULT_TAB)
        log.info('useTabPersistence', 'Using default tab state', { tab: DEFAULT_TAB })
      }
    } catch (error) {
      log.error('useTabPersistence', 'Failed to load saved tab state', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Fallback to default tab on error
      setActiveTabState(DEFAULT_TAB)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load saved tab state on mount
  useEffect(() => {
    loadSavedTab()
  }, [loadSavedTab])

  const saveTab = useCallback(async (tab: TabType) => {
    try {
      await AsyncStorage.setItem(TAB_STORAGE_KEY, tab)
      log.debug('useTabPersistence', 'Saved tab state', { tab })
    } catch (error) {
      log.error('useTabPersistence', 'Failed to save tab state', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  const setActiveTab = useCallback(
    (tab: TabType) => {
      if (!isValidTab(tab)) {
        log.warn('useTabPersistence', 'Invalid tab value provided', { tab })
        return
      }

      setActiveTabState(tab)
      saveTab(tab)
    },
    [saveTab]
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
