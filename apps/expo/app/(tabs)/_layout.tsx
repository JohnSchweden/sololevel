import { NavigationAppHeader } from '@app/components/navigation'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'
import { log } from '@my/logging'
import { BottomNavigation, BottomNavigationContainer } from '@my/ui'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'

export default function TabsLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTab, setActiveTab, isLoading } = useTabPersistence()
  const userInitiatedChange = useRef(false)

  // Sync active tab with current route (only for external navigation)
  useEffect(() => {
    const currentTab = pathname.split('/').pop()
    if (
      currentTab &&
      (currentTab === 'record' || currentTab === 'coach' || currentTab === 'insights')
    ) {
      if (currentTab !== activeTab && !userInitiatedChange.current) {
        log.info('TabsLayout', 'Syncing active tab with route', { currentTab, activeTab })
        setActiveTab(currentTab)
      }
      // Reset the flag after processing
      userInitiatedChange.current = false
    }
  }, [pathname, activeTab, setActiveTab])

  if (isLoading) {
    return null // Don't render until we've loaded the saved tab
  }

  return (
    <Tabs
      initialRouteName="record"
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerStyle: { backgroundColor: 'transparent' },
        header: (props: any) => <NavigationAppHeader {...props} />,
        tabBarStyle: { display: 'none' }, // Hide default tab bar
      }}
      tabBar={(props) => (
        <BottomNavigationContainer>
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              log.info('TabsLayout', 'Tab changed', { tab })
              userInitiatedChange.current = true
              setActiveTab(tab)
              props.navigation.navigate(tab)
            }}
          />
        </BottomNavigationContainer>
      )}
    >
      <Tabs.Screen
        name="record"
        options={{
          title: 'Solo:Level',
          lazy: true, // ✅ Lazy load for better performance
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Chat/Mirror',
          lazy: true, // ✅ Lazy load for better performance
          // @ts-ignore: custom appHeaderProps extension
          appHeaderProps: {
            onMenuPress: () => router.push('/history-progress'),
          },
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          lazy: true, // ✅ Lazy load for better performance
          // @ts-ignore: custom appHeaderProps extension
          appHeaderProps: {
            onMenuPress: () => router.push('/history-progress'),
          },
        }}
      />
    </Tabs>
  )
}
