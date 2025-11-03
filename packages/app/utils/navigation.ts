import type { Router } from 'expo-router'
import type { TabType } from '../features/CameraRecording/hooks/useTabPersistence'

/**
 * Valid tab routes in the app
 */
export type TabRoute = `/(tabs)/${TabType}`

/**
 * Type guard to validate if a string is a valid tab route
 */
export function isValidTabRoute(path: string): path is TabRoute {
  const tabRoutes: TabRoute[] = ['/(tabs)/coach', '/(tabs)/record', '/(tabs)/insights']
  return tabRoutes.includes(path as TabRoute)
}

/**
 * Create a type-safe tab route from a tab type
 */
export function createTabRoute(tab: TabType): TabRoute {
  return `/(tabs)/${tab}` as TabRoute
}

/**
 * Type-safe router navigation helper
 * Validates route before calling router.replace
 */
export function navigateToTabRoute(router: Router, tab: TabType): void {
  const route = createTabRoute(tab)
  if (isValidTabRoute(route)) {
    // TypeScript now knows route is valid
    router.replace(route)
  } else {
    throw new Error(`Invalid tab route: ${route}`)
  }
}
