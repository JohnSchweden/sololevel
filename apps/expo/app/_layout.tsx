import React, { useEffect } from 'react'

// React 19 + Hermes: Ensure React is globally available for JSX
if (typeof global !== 'undefined') {
  global.React = React
}

import { NavigationAppHeader } from '@app/components/navigation'
import { Provider } from '@app/provider'
import { JosefinSans_400Regular, JosefinSans_700Bold } from '@expo-google-fonts/josefin-sans'
import { log } from '@my/logging'
import { NativeToast } from '@my/ui'
//import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { ErrorBoundary } from '@ui/components/ErrorBoundary'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Platform, StatusBar } from 'react-native'
import { AuthGate } from '../components/AuthGate'
//import { useColorScheme } from 'react-native'
//import * as Linking from 'expo-linking'

// Ensure keep-awake is deactivated on app start to clear any previous session state
// expo-keep-awake uses reference counting, so we call deactivate multiple times to reset
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, deprecation/deprecation
    const { deactivateKeepAwake } = require('expo-keep-awake')
    // Call deactivate 5 times to ensure any lingering activations are cleared
    // This is safe - extra deactivate calls are ignored once the counter hits 0
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line deprecation/deprecation
      deactivateKeepAwake()
    }
  } catch (error) {
    // Ignore errors during deactivation
  }
}

// React internals should not be accessed in app code

// Removed unsafe React internals polyfills; rely on supported APIs only

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

// Profile image for header
const profileImage = require('../assets/profile.png')

export default function App() {
  const [interLoaded, interError] = useFonts({
    InterRegular: require('@tamagui/font-inter/otf/Inter-Regular.otf'),
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterSemiBold: require('@tamagui/font-inter/otf/Inter-SemiBold.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
    JosefinSans: JosefinSans_400Regular,
    JosefinSansBold: JosefinSans_700Bold,
  })

  // Network logging can be enabled via logger utils when needed

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  try {
    return <RootLayoutNav />
  } catch (error) {
    log.error('_layout.tsx', 'Error in JSX return:', {
      error: error instanceof Error ? error.message : String(error),
    })
    log.error('_layout.tsx', 'Error stack:', (error as any)?.stack)
    throw error
  }
}

function RootLayoutNav() {
  //const colorScheme = useColorScheme()

  // // Auto-deeplink to Metro on simulator startup (prevents Expo Dev Launcher)
  // const didOpen = useRef(false)
  // useEffect(() => {
  //   if (__DEV__ && !didOpen.current) {
  //     didOpen.current = true
  //     const devUrl = 'exp+sololevel://expo-development-client/?url=http://localhost:8081'
  //     log.info('_layout.tsx', 'Auto-opening dev URL:', devUrl)
  //     Linking.openURL(devUrl).catch((error) => {
  //       log.warn('_layout.tsx', 'Failed to auto-open dev URL:', error)
  //     })
  //   }
  // }, [])

  return (
    <ErrorBoundary>
      <Provider>
        {/*<ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>*/}
        {/* Android: Set transparent status bar globally */}
        {Platform.OS === 'android' && (
          <StatusBar
            backgroundColor="transparent"
            translucent
            barStyle="light-content"
          />
        )}
        <AuthGate>
          <Stack>
            {/* Auth routes - public (not protected) */}
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
              }}
            />

            {/* Tabs Layout - Main app navigation */}
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />

            {/* Modal routes - outside tabs */}
            <Stack.Screen
              name="video-analysis"
              options={{
                title: '',
                headerShown: true,
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
                header: (props) => <NavigationAppHeader {...props} />,
              }}
            />
            <Stack.Screen
              name="history-progress"
              options={({ navigation }) =>
                ({
                  title: 'History & Progress',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  contentStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  animation: 'fade', // Changed from 'slide_from_left' to reduce JS thread load during animation
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'profile',
                    profileImageUri: profileImage,
                    onProfilePress: () => {
                      log.info('_layout', 'Navigate to settings from history-progress')
                      navigation.navigate('settings' as any)
                    },
                  },
                }) as any
              }
            />
            <Stack.Screen
              name="coaching-session"
              options={{
                title: 'Coach',
                headerShown: true,
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
                header: (props) => <NavigationAppHeader {...props} />,
                animation: 'slide_from_right',
                // @ts-ignore: custom appHeaderProps extension
                appHeaderProps: {
                  mode: 'default',
                  leftAction: 'back',
                  rightAction: 'none',
                },
              }}
            />
            <Stack.Screen
              name="settings"
              options={
                {
                  title: 'Settings',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/account"
              options={
                {
                  title: 'Account',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/personalisation"
              options={
                {
                  title: 'Personalisation',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/give-feedback"
              options={
                {
                  title: 'Give Feedback',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/data-controls"
              options={
                {
                  title: 'Data Controls',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/security"
              options={
                {
                  title: 'Security',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="settings/about"
              options={
                {
                  title: 'About',
                  headerShown: true,
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  header: (props: any) => <NavigationAppHeader {...props} />,
                  appHeaderProps: {
                    mode: 'default',
                    leftAction: 'back',
                    rightAction: 'none',
                  },
                } as any
              }
            />
            <Stack.Screen
              name="dev/compress-test"
              options={{
                title: 'Compression Test',
                headerShown: true,
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="dev/pipeline-test"
              options={{
                title: 'Pipeline Test',
                headerShown: true,
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack>
        </AuthGate>
        <NativeToast />
        {/*</ThemeProvider>*/}
      </Provider>
    </ErrorBoundary>
  )
}
