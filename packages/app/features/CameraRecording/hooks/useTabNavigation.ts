import { log } from '@my/logging'
import type { Router } from 'expo-router'
import { startTransition, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { TabType } from './useTabPersistence'

/**
 * Helper to extract current tab from pathname
 */
function extractTabFromPathname(pathname: string): 'coach' | 'record' | 'insights' | null {
  const currentTab = pathname.split('/').pop()
  if (currentTab === 'record' || currentTab === 'coach' || currentTab === 'insights') {
    return currentTab
  }
  return null
}

export interface UseTabNavigationParams {
  pathname: string
  router: Router
  activeTab: TabType | null
  setActiveTab: (tab: TabType) => void
  isLoading: boolean
}

export interface UseTabNavigationReturn {
  currentTab: 'coach' | 'record' | 'insights' | null
  shouldRender: boolean
  markUserInitiatedChange: () => void
}

/**
 * Custom hook that consolidates tab navigation logic
 *
 * Encapsulates:
 * - Persisted tab restoration
 * - Navigation timing (useLayoutEffect)
 * - Route sync
 * - User-initiated vs automatic navigation detection
 *
 * Eliminates effect cascade by consolidating two effects into one logical unit
 * with proper ref guards to prevent render loops.
 */
export function useTabNavigation({
  pathname,
  router,
  activeTab,
  setActiveTab,
  isLoading,
}: UseTabNavigationParams): UseTabNavigationReturn {
  // Extract current tab from pathname
  const currentTab = extractTabFromPathname(pathname)

  // Ref guards to prevent render loops
  const userInitiatedChange = useRef(false)
  const persistedTabApplied = useRef(false)
  const applyingPersistedTab = useRef(false)
  const hasNavigated = useRef(false)

  // Stable refs for navigation
  const routerRef = useRef(router)
  routerRef.current = router

  const setActiveTabRef = useRef(setActiveTab)
  setActiveTabRef.current = setActiveTab

  // Consolidated effect: handles both persisted tab restoration and route sync
  // Single useLayoutEffect prevents cascade by consolidating logic with ref guards
  useLayoutEffect(() => {
    // Skip during initial load
    if (isLoading) {
      return
    }

    // Case 1: Apply persisted tab on initial load
    if (activeTab && !hasNavigated.current) {
      if (currentTab && currentTab !== activeTab) {
        // Navigate to persisted tab
        log.info('useTabNavigation', 'Applying persisted tab', {
          persistedTab: activeTab,
          currentTab,
        })
        hasNavigated.current = true
        applyingPersistedTab.current = true
        // Type assertion needed for Expo Router route types
        // Web uses stricter Href types, but string routes work at runtime
        const route = `/(tabs)/${activeTab}` as any
        routerRef.current.replace(route)
        return
      }
      if (currentTab && currentTab === activeTab) {
        // Already on persisted tab
        hasNavigated.current = true
        persistedTabApplied.current = true
        applyingPersistedTab.current = false
        return
      }
    }

    // Case 2: Handle completion of persisted tab application
    if (applyingPersistedTab.current) {
      if (currentTab === activeTab) {
        log.info('useTabNavigation', 'Persisted tab application complete', {
          tab: activeTab,
        })
        applyingPersistedTab.current = false
        persistedTabApplied.current = true
      }
      return
    }

    // Case 3: Sync active tab with route (only after persisted tab is applied)
    if (!persistedTabApplied.current) {
      return
    }

    // External navigation: sync state when route changes without user action
    if (currentTab && currentTab !== activeTab && !userInitiatedChange.current) {
      log.info('useTabNavigation', 'Syncing active tab with route', {
        currentTab,
        activeTab,
      })
      // Use startTransition for non-urgent state updates to batch with other updates
      startTransition(() => {
        setActiveTabRef.current(currentTab)
      })
      // Reset navigation state
      hasNavigated.current = true
      persistedTabApplied.current = true
      return
    }

    // Reset user-initiated flag after processing
    if (userInitiatedChange.current) {
      userInitiatedChange.current = false
    }
  }, [isLoading, activeTab, currentTab])

  // Determine if component should render
  const shouldRender = (() => {
    if (isLoading) {
      return false
    }

    const isOnTabRoute = currentTab !== null

    // Don't render if we're on the wrong tab and haven't navigated yet
    if (isOnTabRoute && currentTab !== activeTab) {
      // If we haven't initiated navigation yet, wait for it
      if (!hasNavigated.current) {
        return false
      }
      // If we've navigated but route hasn't updated yet, wait
      if (applyingPersistedTab.current) {
        return false
      }
    }

    return true
  })()

  // Expose function to mark user-initiated changes - stable reference
  const markUserInitiatedChange = useCallback(() => {
    userInitiatedChange.current = true
  }, [])

  // Memoize return object to prevent unnecessary re-renders in consumers
  // This ensures stable reference when dependencies haven't changed
  return useMemo(
    () => ({
      currentTab,
      shouldRender,
      markUserInitiatedChange,
    }),
    [currentTab, shouldRender, markUserInitiatedChange]
  )
}
