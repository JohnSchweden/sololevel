import React, { useCallback, useEffect, useRef } from 'react'

// React 19 + Hermes: Ensure React is globally available for JSX
if (typeof global !== 'undefined') {
  global.React = React
}

import { NavigationAppHeader } from '@app/components/navigation'
import { Provider } from '@app/provider'
import { JosefinSans_400Regular, JosefinSans_700Bold } from '@expo-google-fonts/josefin-sans'
import { log } from '@my/logging'
import { NativeToast } from '@my/ui'
import * as Sentry from '@sentry/react-native'
//import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { ErrorBoundary } from '@ui/components/ErrorBoundary'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Platform, StatusBar } from 'react-native'

// Sentry initialization for crash reporting and performance monitoring
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    // Production-recommended sampling: 10% of transactions
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Prevent Hermes GC crashes during error stack generation + sample non-fatal events
    beforeSend(event) {
      // Sample non-fatal events to reduce noise while keeping errors
      if (event.level === 'info' && Math.random() > 0.05) {
        return null // Drop 95% of info events
      }
      if (event.level === 'warning' && Math.random() > 0.2) {
        return null // Drop 80% of warnings
      }

      // Strip stack traces from TurboModule exceptions to prevent GC allocation during error handling
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.stacktrace?.frames) {
            // Keep only top 5 frames to minimize GC pressure
            exception.stacktrace.frames = exception.stacktrace.frames.slice(0, 5)
          }
        }
      }
      return event
    },
  })
} else if (!__DEV__) {
  // Log warning in production if DSN is missing (shouldn't happen with EAS)
  log.warn('_layout.tsx', 'EXPO_PUBLIC_SENTRY_DSN is not set - crash reporting disabled')
}

// Global error handler to catch unhandled exceptions before they trigger Hermes GC crashes
// This prevents the "NO_CRASH_STACK" issue where Hermes crashes during error stack generation
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log error without generating full stack trace (prevents GC allocation)
    log.error('_layout.tsx', 'Unhandled error caught', {
      message: error?.message || String(error),
      isFatal,
      // Don't access error.stack - this triggers Hermes GC allocation
    })

    // Report to Sentry (with stripped stack from beforeSend)
    if (sentryDsn) {
      Sentry.captureException(error)
    }

    // Call original handler if it exists
    if (originalHandler) {
      originalHandler(error, isFatal)
    }
  })
}

import { AuthGate } from '../components/AuthGate'
//import { useColorScheme } from 'react-native'
//import * as Linking from 'expo-linking'

// React internals should not be accessed in app code

// Removed unsafe React internals polyfills; rely on supported APIs only

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

// Profile image for header
const profileImage = require('../assets/profile.png')

export default function App() {
  // Fonts load progressively - UI renders immediately with system fallbacks
  // Tamagui will use system fonts until custom fonts are ready
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_fontsLoaded] = useFonts({
    InterRegular: require('@tamagui/font-inter/otf/Inter-Regular.otf'),
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterSemiBold: require('@tamagui/font-inter/otf/Inter-SemiBold.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
    JosefinSans: JosefinSans_400Regular,
    JosefinSansBold: JosefinSans_700Bold,
  })

  // Network logging can be enabled via logger utils when needed

  // Track when root background View is ready to prevent white flash
  const rootViewReadyRef = useRef(false)
  const splashHideAttemptedRef = useRef(false)

  // Ensure keep-awake is deactivated on app start (runs after React is ready)
  // Clean up any stale tagged activations from previous session
  // CRITICAL: Call without tag to deactivate ALL keep-awake activations (including untagged)
  // This prevents app from staying awake when starting on non-record tabs
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, deprecation/deprecation
        const { deactivateKeepAwake } = require('expo-keep-awake')
        // Deactivate ALL keep-awake activations (untagged + all tags)
        // This ensures clean state regardless of how keep-awake was activated
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake() // Deactivate all (no tag = deactivate everything)
        // Also deactivate known tag explicitly for safety (redundant but harmless)
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake('record-tab')
      } catch (error) {
        // Ignore errors during deactivation
      }
    }
  }, [])

  // Hide splash screen only after root background View is confirmed rendered
  // This prevents white flash between splash screen and app content
  const handleRootViewReady = useCallback(() => {
    rootViewReadyRef.current = true

    // Hide splash screen now that background is confirmed rendered
    if (!splashHideAttemptedRef.current) {
      splashHideAttemptedRef.current = true
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors - splash may already be hidden
      })
    }
  }, [])

  // Fallback: Hide splash screen after timeout if root view doesn't report ready
  // This ensures splash screen doesn't stay visible forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!splashHideAttemptedRef.current) {
        splashHideAttemptedRef.current = true
        SplashScreen.hideAsync().catch(() => {
          // Ignore errors
        })
      }
    }, 1000) // 1 second timeout

    return () => clearTimeout(timeout)
  }, [])

  // Render UI immediately - fonts load progressively in background
  // Tamagui will use system fallbacks until custom fonts are ready

  try {
    return <RootLayoutNav onRootViewReady={handleRootViewReady} />
  } catch (error) {
    log.error('_layout.tsx', 'Error in JSX return:', {
      error: error instanceof Error ? error.message : String(error),
    })
    log.error('_layout.tsx', 'Error stack:', (error as any)?.stack)
    throw error
  }
}

function RootLayoutNav({ onRootViewReady }: { onRootViewReady?: () => void }) {
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo.componentStack,
          },
        })
      }}
    >
      <Provider onRootViewReady={onRootViewReady}>
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
          <Stack
            screenOptions={{
              // Set dark background to prevent white flash during navigation transitions
              // Matches GlassBackground backgroundColor="$color3" (#313131 in dark theme)
              contentStyle: { backgroundColor: '#363636' },
            }}
          >
            {/* Auth routes - public (not protected) */}
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
                animation: 'fade', // Fade transition from splash screen
              }}
            />

            {/* Tabs Layout - Main app navigation */}
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                animation: 'fade', // Fade transition - smooth without sliding
              }}
            />

            {/* Modal routes - outside tabs */}
            <Stack.Screen
              name="video-analysis"
              options={{
                title: '',
                headerShown: true,
                animation: 'fade', // Fade transition - smooth without sliding
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
                    disableBlur: true, // Disable blur for cleaner look with GlassBackground
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
                  disableBlur: true, // CoachScreen has its own BlurView covering the header area
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
                    disableBlur: true, // Disable blur for cleaner look with GlassBackground
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
