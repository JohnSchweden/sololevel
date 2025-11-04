import { NavigationAppHeader } from '@app/components/navigation'
import { useTabNavigation } from '@app/features/CameraRecording/hooks/useTabNavigation'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'
import { useRenderDiagnostics } from '@app/hooks/useRenderDiagnostics'
import { log } from '@my/logging'
import { BottomNavigation, BottomNavigationContainer } from '@my/ui'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { useCallback, useMemo, useRef } from 'react'

export default function TabsLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTab, setActiveTab, isLoading } = useTabPersistence()

  // Stable router ref for navigation
  const routerRef = useRef(router)
  routerRef.current = router

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

  // Track useTabNavigation hook return stability (should be memoized now)
  useRenderDiagnostics(
    'TabsLayout[useTabNavigation]',
    tabNavigationResult as unknown as Record<string, unknown>,
    {
      logToConsole: __DEV__,
      logOnlyChanges: true,
    }
  )

  // Memoize header renderer to prevent re-renders
  const headerRenderer = useCallback((props: any) => <NavigationAppHeader {...props} />, [])

  // Stable navigation ref to avoid recreating callbacks
  const navigationRef = useRef<any>(null)

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
  // Accept this behavior: return component tree directly with stable props
  // The BottomNavigation component itself handles memoization internally
  const tabBarRenderer = useCallback(
    (props: any) => {
      navigationRef.current = props.navigation
      return (
        <BottomNavigationContainer>
          <BottomNavigation
            activeTab={activeTab}
            disabled={false}
            onTabChange={handleTabChangeStable}
          />
        </BottomNavigationContainer>
      )
    },
    [activeTab, handleTabChangeStable]
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

  const coachOptions = useMemo(
    () => ({
      title: 'Chat/Mirror',
      lazy: true,
      // @ts-ignore: custom appHeaderProps extension
      appHeaderProps: {
        onMenuPress: handleMenuPress,
      },
    }),
    [handleMenuPress]
  )

  const insightsOptions = useMemo(
    () => ({
      title: 'Insights',
      lazy: true,
      // @ts-ignore: custom appHeaderProps extension
      appHeaderProps: {
        onMenuPress: handleMenuPress,
      },
    }),
    [handleMenuPress]
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
