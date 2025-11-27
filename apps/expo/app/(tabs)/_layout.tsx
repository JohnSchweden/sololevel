import { NavigationAppHeader } from '@app/components/navigation'
import { useTabNavigation } from '@app/features/CameraRecording/hooks/useTabNavigation'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'
import { log } from '@my/logging'
import { BottomNavigation, BottomNavigationContainer } from '@my/ui'
import { Image } from 'expo-image'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { YStack } from 'tamagui'

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

      // Disable blur on coach tab (CoachScreen has its own BlurView)
      const isCoachTab = activeTabRef.current === 'coach'

      return (
        <BottomNavigationContainer disableBlur={isCoachTab}>
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

  // Logo image for record tab header - defined statically so it's visible immediately
  // before camera screen mounts
  const recordHeaderLogo = useMemo(
    () => (
      <YStack
        paddingBottom={4}
        alignItems="center"
        justifyContent="center"
      >
        <Image
          source={require('../../assets/icon_sololevel_header.png')}
          contentFit="contain"
          style={{
            height: 44,
            width: 220,
          }}
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel="Solo:Level"
          testID="header-logo"
        />
      </YStack>
    ),
    []
  )

  // Stable options objects for each screen
  const recordAppHeaderProps = useMemo(
    () => ({
      title: 'Record',
      mode: 'camera-idle' as const,
      showTimer: false,
      timerValue: '00:00',
      titleSlot: recordHeaderLogo, // Show logo statically in header
      leftAction: 'sidesheet' as const,
      onMenuPress: handleMenuPress,
      cameraProps: { isRecording: false },
      disableBlur: true,
    }),
    [handleMenuPress, recordHeaderLogo]
  )

  const recordOptions = useMemo(
    () => ({
      title: '',
      lazy: true,
      // @ts-ignore: custom appHeaderProps extension
      appHeaderProps: recordAppHeaderProps,
    }),
    [recordAppHeaderProps]
  )

  const coachAppHeaderProps = useMemo(
    () => ({
      onMenuPress: handleMenuPress,
      disableBlur: true, // CoachScreen has its own BlurView covering the header area
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
      title: 'Chat',
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
  // Return dark background placeholder to prevent white flash during loading
  if (!shouldRender) {
    return <View style={{ flex: 1, backgroundColor: '#363636' }} />
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
