import React, { useEffect } from 'react'

// React 19 + Hermes: Ensure React is globally available for JSX
if (typeof global !== 'undefined') {
  global.React = React
}
import { Provider } from '@app/provider'
import { NativeToast } from '@my/ui'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { useColorScheme } from 'react-native'
//import * as Linking from 'expo-linking'

import { log } from '@my/logging'
log.info('_layout.tsx', 'Module loaded, React version:', React.version)
// React internals should not be accessed in app code

// Removed unsafe React internals polyfills; rely on supported APIs only

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function App() {
  log.info('_layout.tsx', 'App component called')

  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  log.info('_layout.tsx', 'useFonts result - loaded:', interLoaded, 'error:', interError)

  // Network logging can be enabled via logger utils when needed

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    log.info('_layout.tsx', 'Returning null (fonts not loaded)')
    return null
  }

  log.info('_layout.tsx', 'About to return RootLayoutNav component')
  try {
    return <RootLayoutNav />
  } catch (error) {
    log.error('_layout.tsx', 'Error in JSX return:', error as unknown)
    log.error('_layout.tsx', 'Error stack:', (error as any)?.stack)
    throw error
  }
}

function RootLayoutNav() {
  log.info('_layout.tsx', 'RootLayoutNav function called')
  const colorScheme = useColorScheme()
  log.info('_layout.tsx', 'Color scheme:', colorScheme)

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

  try {
    log.info('_layout.tsx', 'About to render Provider')
    return (
      <Provider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {(() => {
            log.info('_layout.tsx', 'About to render Stack')
            try {
              return (
                <Stack>
                  {/* Auth routes - public */}
                  <Stack.Screen
                    name="auth"
                    options={{
                      headerShown: false,
                    }}
                  />

                  {/* Protected routes */}
                  <Stack.Screen
                    name="index"
                    options={{
                      title: 'Camera Recording',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="video-analysis"
                    options={{
                      title: 'Video Analysis',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="dev/compress-test"
                    options={{
                      title: 'Compression Test',
                      headerShown: true,
                    }}
                  />
                  <Stack.Screen
                    name="dev/pipeline-test"
                    options={{
                      title: 'Pipeline Test',
                      headerShown: true,
                    }}
                  />
                </Stack>
              )
            } catch (error) {
              log.error('_layout.tsx', 'Error rendering Stack:', error as unknown)
              throw error
            }
          })()}
          <NativeToast />
        </ThemeProvider>
      </Provider>
    )
  } catch (error) {
    log.error('_layout.tsx', 'Error in RootLayoutNav JSX:', error as unknown)
    log.error('_layout.tsx', 'Error stack:', (error as any)?.stack)
    throw error
  }
}
