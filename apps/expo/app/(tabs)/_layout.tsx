import { NavigationAppHeader } from '@app/components/navigation'
import { useTabNavigation } from '@app/features/CameraRecording/hooks/useTabNavigation'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'
import { log } from '@my/logging'
import { BottomNavigation, BottomNavigationContainer } from '@my/ui'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'

export default function TabsLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTab, setActiveTab, isLoading } = useTabPersistence()

  // Stable router ref for navigation - only set once to avoid function recreation
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  // Stable setActiveTab ref for stable callbacks
  const setActiveTabRef = useRef(setActiveTab)
  setActiveTabRef.current = setActiveTab

  // Use custom hook for consolidated tab navigation logic
  const tabNavigationResult = useTabNavigation({
    pathname,
    router,
    activeTab,
    setActiveTab,
    isLoading,
  })
  const { shouldRender, markUserInitiatedChange } = tabNavigationResult

  // Memoize header renderer to prevent re-renders
  const headerRenderer = useCallback((props: any) => <NavigationAppHeader {...props} />, [])

  // Stable navigation ref to avoid recreating callbacks
  const navigationRef = useRef<any>(null)

  // Stable activeTab ref for tabBarRenderer - prevents callback recreation on tab changes
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // Memoize tab change handler - use ref to avoid dependency on setActiveTab prop
  // This makes the callback stable forever, preventing BottomNavigation re-renders
  const handleTabChangeStable = useCallback(
    (tab: 'coach' | 'record' | 'insights') => {
      log.info('TabsLayout', 'Tab changed', { tab })
      markUserInitiatedChange()
      setActiveTabRef.current(tab) // Use ref instead of prop
      if (navigationRef.current) {
        navigationRef.current.navigate(tab)
      }
    },
    [markUserInitiatedChange] // Only depends on stable function from hook
  )

  // TabBar renderer - Expo Router calls this function multiple times during navigation
  // Use ref for activeTab to prevent callback recreation - BottomNavigation's React.memo
  // will still receive the correct activeTab value via props, but the renderer callback
  // itself stays stable, eliminating cascading re-renders
  const tabBarRenderer = useCallback(
    (props: any) => {
      navigationRef.current = props.navigation

      // Only render bottom navigation when actually in tabs navigation context
      // Expo Router keeps tabs mounted even when navigating to Stack routes
      // Check pathname to determine if we're in tabs or external Stack route
      const currentPathname = pathname || ''
      const isInTabsContext =
        currentPathname.includes('/(tabs)/') ||
        currentPathname === '/coach' ||
        currentPathname === '/record' ||
        currentPathname === '/insights'

      if (!isInTabsContext) {
        return null // Don't render bottom nav outside tabs
      }

      return (
        <BottomNavigationContainer>
          <BottomNavigation
            activeTab={activeTabRef.current}
            disabled={false}
            onTabChange={handleTabChangeStable}
          />
        </BottomNavigationContainer>
      )
    },
    [handleTabChangeStable, pathname] // Depend on pathname to re-evaluate on route changes
  )

  // Stable objects for screen options - extract inline objects to prevent recreation
  const headerStyle = useMemo(() => ({ backgroundColor: 'transparent' }), [])
  const tabBarStyle = useMemo(() => ({ display: 'none' }), [])

  // Memoize screenOptions to prevent re-renders
  const screenOptions = useMemo(
    () => ({
      headerShown: true,
      headerTransparent: true,
      headerStyle,
      header: headerRenderer,
      tabBarStyle, // Hide default tab bar
    }),
    [headerRenderer, headerStyle, tabBarStyle]
  )

  // Memoize menu press handler using ref to avoid router dependency
  const handleMenuPress = useCallback(() => {
    routerRef.current.push('/history-progress')
  }, [])

  // Stable options objects for each screen
  const recordOptions = useMemo(
    () => ({
      title: 'Solo:Level',
      lazy: true,
    }),
    []
  )

  const coachAppHeaderProps = useMemo(
    () => ({
      onMenuPress: handleMenuPress,
    }),
    [handleMenuPress]
  )

  const insightsAppHeaderProps = useMemo(
    () => ({
      onMenuPress: handleMenuPress,
    }),
    [handleMenuPress]
  )

  const coachOptions = useMemo(
    () => ({
      title: 'Chat/Mirror',
      lazy: true,
      // @ts-ignore: custom appHeaderProps extension
      appHeaderProps: coachAppHeaderProps,
    }),
    [coachAppHeaderProps]
  )

  const insightsOptions = useMemo(
    () => ({
      title: 'Insights',
      lazy: true,
      // @ts-ignore: custom appHeaderProps extension
      appHeaderProps: insightsAppHeaderProps,
    }),
    [insightsAppHeaderProps]
  )

  // Don't render until hook determines it's safe (handles loading and navigation timing)
  if (!shouldRender) {
    return null
  }

  return (
    <Tabs
      initialRouteName={activeTab}
      screenOptions={screenOptions}
      tabBar={tabBarRenderer}
    >
      <Tabs.Screen
        name="record"
        options={recordOptions}
      />
      <Tabs.Screen
        name="coach"
        options={coachOptions}
      />
      <Tabs.Screen
        name="insights"
        options={insightsOptions}
      />
    </Tabs>
  )
}
