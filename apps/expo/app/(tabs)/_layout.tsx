import { NavigationAppHeader } from '@app/components/navigation'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'
import { log } from '@my/logging'
import { BottomNavigation, BottomNavigationContainer } from '@my/ui'
import { Tabs, usePathname } from 'expo-router'
import { useEffect } from 'react'

export default function TabsLayout() {
  const pathname = usePathname()
  const { activeTab, setActiveTab, isLoading } = useTabPersistence()

  // Sync active tab with current route
  useEffect(() => {
    const currentTab = pathname.split('/').pop()
    if (
      currentTab &&
      (currentTab === 'record' || currentTab === 'coach' || currentTab === 'insights')
    ) {
      if (currentTab !== activeTab) {
        log.info('TabsLayout', 'Syncing active tab with route', { currentTab, activeTab })
        setActiveTab(currentTab)
      }
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
              setActiveTab(tab)
              props.navigation.navigate(tab)
            }}
          />
        </BottomNavigationContainer>
      )}
    >
      <Tabs.Screen
        name="record"
        options={{ title: 'Solo:Level' }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: 'Chat/Mirror' }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights' }}
      />
    </Tabs>
  )
}
