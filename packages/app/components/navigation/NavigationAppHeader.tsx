import { log } from '@my/logging'
import type { NativeStackHeaderProps } from '@react-navigation/native-stack'
import { AppHeader, type AppHeaderProps } from '@ui/components/AppHeader'
import { useAnimationCompletion } from '@ui/hooks/useAnimationCompletion'
import { useFrameDropDetection } from '@ui/hooks/useFrameDropDetection'
import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { useSmoothnessTracking } from '@ui/hooks/useSmoothnessTracking'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'tamagui'

// Animation duration estimates based on Tamagui spring configs
// 'quick': damping: 20, stiffness: 250, mass: 1.2 → ~200ms effective duration
// 'lazy': damping: 18, stiffness: 50 → ~400ms effective duration
const ANIMATION_DURATIONS = {
  quick: 200,
  lazy: 400,
} as const

/**
 * Custom header options extended onto React Navigation options
 */
export type NavAppHeaderOptions = {
  appHeaderProps?: Partial<AppHeaderProps>
  /** Whether header visibility change is user-initiated (for quick animation) vs automatic (lazy animation) */
  isUserInteraction?: boolean
  /** Whether header should be visible (controls opacity when headerShown is always true) */
  headerVisible?: boolean
  /** Whether this is history mode (data prefetched) vs analysis mode (live processing) - used for initial visibility */
  isHistoryMode?: boolean
}

/**
 * NavigationAppHeader
 *
 * Adapter that bridges React Navigation's header API with the custom AppHeader component.
 * Works on Web, iOS, and Android without absolute positioning or fake safe-area hacks.
 *
 * @component
 * @example
 * // Static header in _layout.tsx
 * <Stack.Screen
 *   name="route-name"
 *   options={{
 *     headerShown: true,
 *     header: (props) => <NavigationAppHeader {...props} />,
 *   }}
 * />
 *
 * @example
 * // Dynamic state updates from screen
 * useLayoutEffect(() => {
 *   navigation.setOptions({
 *     appHeaderProps: { mode, showTimer, timerValue, onMenuPress }
 *   })
 * }, [deps])
 *
 * ## Animation & Visibility Flow
 *
 * The component operates in two distinct modes:
 *
 * ### 1. Standard Mode (headerVisible undefined)
 * - React Navigation controls mount/unmount via `headerShown`
 * - No opacity animations - header either exists or doesn't
 *
 * ### 2. VideoAnalysis Mode (headerVisible explicitly set)
 * - Header always mounted, visibility controlled via opacity
 * - Prevents mount/unmount flashing during rapid state changes
 * - Two initialization paths:
 *   - **Analysis mode**: Start visible (isProcessing = true)
 *   - **History mode**: Start hidden (data prefetched, isProcessing false quickly)
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │ COMPONENT MOUNT                                             │
 * └───────────────┬─────────────────────────────────────────────┘
 *                 │
 *                 v
 *         ┌───────────────┐
 *         │ isVideoAnalysis? │────No──┐
 *         └───────┬───────┘           │
 *                Yes                  │
 *                 │                   v
 *                 v           ┌──────────────┐
 *         ┌───────────────┐  │ Standard Mode│
 *         │ isHistoryMode? │  │ headerShown  │
 *         └───────┬───────┘  │ controls     │
 *                 │          │ mount/unmount│
 *       ┌─────────┴─────────┐ └──────────────┘
 *       │                   │
 *      Yes                 No
 *       │                   │
 *       v                   v
 * ┌─────────────┐    ┌─────────────┐
 * │ History Mode│    │ Analysis Mode│
 * │ Start hidden│    │ Start visible│
 * │ opacity: 0  │    │ opacity: 1   │
 * └──────┬──────┘    └──────┬───────┘
 *        │                  │
 *        └────────┬─────────┘
 *                 │
 *                 v
 *    ┌─────────────────────┐
 *    │ IMMEDIATE INIT      │
 *    │ Set hasInitialized  │
 *    │ = true              │
 *    │ Apply visibility    │
 *    │ (no animation)      │
 *    └──────────┬──────────┘
 *               │
 *               v
 *    ┌─────────────────────┐
 *    │ SUBSEQUENT CHANGES  │
 *    └──────────┬──────────┘
 *               │
 *    ┌──────────┴───────────┐
 *    │                      │
 *    v                      v
 * ┌──────────────────┐   ┌──────────────────┐
 * │ isUserInteraction │   │ !isUserInteraction│
 * │ = true            │   │ = false          │
 * │ Animation: 'quick'│   │ Animation: 'lazy'│
 * │ (fast fade)       │   │ (slow fade)      │
 * └──────────────────┘   └──────────────────┘
 *
 * TRANSITION DETECTION:
 * ┌─────────────────────────────────────────┐
 * │ Non-VideoAnalysis → VideoAnalysis Mode  │
 * └──────────────┬──────────────────────────┘
 *                v
 *      ┌──────────────────────┐
 *      │ Set visibility      │
 *      │ Set hasInitialized  │
 *      │ = true              │
 *      │ (prevents flash)    │
 *      └─────────────────────┘
 * ```
 *
 * @remarks
 * **Mode Detection:**
 * - History mode: Detected via `route.params.analysisJobId` (data prefetched/cached)
 * - Analysis mode: No `analysisJobId` in params (live processing)
 *
 * **Initial Visibility:**
 * - **Analysis mode**: Starts visible (isProcessing = true initially)
 * - **History mode**: Starts hidden (isProcessing should be false quickly, data already loaded)
 *
 * **Initialization:**
 * - Sets visibility immediately on mount/transition
 * - Marks as initialized immediately to enable animations for subsequent changes
 * - No grace period - initial state is correct, so no batching needed
 *
 * **Animation Speed:**
 * - `quick`: User-initiated actions (swipe, tap) - instant feedback
 * - `lazy`: Automatic changes (processing complete) - smoother transition
 *
 * **Transition Handling:**
 * - Detects entry into VideoAnalysis mode from other modes
 * - Sets visibility and initializes immediately without animation
 * - Prevents flash from previous mode's visibility state
 *
 * @param {NativeStackHeaderProps} props - React Navigation header props
 * @returns {JSX.Element} Rendered header component with SafeAreaView wrapper
 */
export function NavigationAppHeader(props: NativeStackHeaderProps) {
  const { navigation, back, options, route } = props
  const navOptions = options as unknown as NavAppHeaderOptions
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  const isInitialMountRef = useRef(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const prevIsUserInteractionRef = useRef<boolean | undefined>(undefined)

  // Determine animation speed: quick for user interaction, lazy for automatic
  const animationSpeed = navOptions.isUserInteraction ? 'quick' : 'lazy'
  const isUserInteractionValue = navOptions.isUserInteraction ?? false

  // Detect VideoAnalysis mode early from route params BEFORE first setOptions
  // - History mode: has `analysisJobId` param
  // - Analysis mode: has `videoRecordingId` param
  const routeParams = route.params as Record<string, unknown> | undefined
  const analysisJobIdFromParams = routeParams?.analysisJobId
  const videoRecordingIdFromParams = routeParams?.videoRecordingId
  const isVideoAnalysisRoute = !!analysisJobIdFromParams || !!videoRecordingIdFromParams

  // Detect history mode: prefer explicit flag, fallback to route params
  // History mode: data is prefetched/cached, isProcessing should be false quickly → start hidden
  // Analysis mode: isProcessing starts as true → start visible
  const isHistoryMode = navOptions.isHistoryMode ?? Boolean(analysisJobIdFromParams)

  // VideoAnalysis mode: Control visibility via opacity (when headerVisible is explicitly set)
  // Applies to both live analysis and history mode (both use /video-analysis route)
  // Other screens: Normal React Navigation mount/unmount behavior via headerShown
  // Check route params to detect VideoAnalysis mode BEFORE first setOptions
  const isVideoAnalysisMode = navOptions.headerVisible !== undefined || isVideoAnalysisRoute

  const [isVisible, setIsVisible] = useState(() => {
    if (isVideoAnalysisMode || isVideoAnalysisRoute) {
      // In VideoAnalysis mode, initialize visibility based on mode:
      // - Analysis mode: Start visible (isProcessing = true, header should show immediately)
      // - History mode: Start hidden (data prefetched, isProcessing false quickly)
      if (isHistoryMode) {
        // History mode: start hidden (data is prefetched, isProcessing will be false quickly)
        log.debug('NavigationAppHeader', '🔍 [INIT] History mode detected - starting hidden', {
          isHistoryMode: true,
          analysisJobIdFromParams,
          explicitFlag: navOptions.isHistoryMode,
          routeParams: routeParams ? Object.keys(routeParams) : null,
          initialVisibility: false,
        })
        return false
      }
      // Analysis mode: start visible (isProcessing = true initially)
      // Use headerVisible if set, otherwise default to true for analysis mode
      const initialVisibility = navOptions.headerVisible ?? true
      log.debug('NavigationAppHeader', '🔍 [INIT] Analysis mode detected - starting visible', {
        isHistoryMode: false,
        analysisJobIdFromParams,
        explicitFlag: navOptions.isHistoryMode,
        headerVisible: navOptions.headerVisible,
        initialVisibility,
      })
      return initialVisibility
    }
    const standardVisibility = options.headerShown ?? true
    log.debug('NavigationAppHeader', '🔍 [INIT] Standard mode - using headerShown', {
      isVideoAnalysisMode: false,
      headerShown: options.headerShown,
      initialVisibility: standardVisibility,
    })
    return standardVisibility
  })

  // Render profiling - enable in dev only
  useRenderProfile({
    componentName: 'NavigationAppHeader',
    enabled: __DEV__,
    logInterval: 5,
    trackProps: {
      isVisible,
      animationSpeed,
      isUserInteraction: isUserInteractionValue,
      headerShown: options.headerShown,
      headerVisible: navOptions.headerVisible,
      isVideoAnalysisMode,
    },
  })

  // Track previous visibility for ARIA announcements
  const prevVisibilityRef = useRef(isVisible)
  const [announcementText, setAnnouncementText] = useState<string>('')
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track previous isVisible for direction detection
  const prevIsVisibleForAnimationRef = useRef(isVisible)

  // Determine animation direction
  const animationDirection =
    prevIsVisibleForAnimationRef.current !== isVisible
      ? isVisible
        ? 'fade-in'
        : 'fade-out'
      : 'stable'

  // Update previous value
  useEffect(() => {
    prevIsVisibleForAnimationRef.current = isVisible
  }, [isVisible])

  // 1. True animation completion detection
  const completion = useAnimationCompletion({
    currentValue: isVisible ? 1 : 0,
    targetValue: isVisible ? 1 : 0,
    estimatedDuration: ANIMATION_DURATIONS[animationSpeed],
    componentName: 'NavigationAppHeader',
    animationName: `header-opacity-${animationSpeed}`,
    direction: animationDirection !== 'stable' ? animationDirection : undefined,
    tolerance: 0.01,
    requiredStableFrames: 2,
  })

  // 2. Smoothness tracking
  const smoothness = useSmoothnessTracking({
    duration: completion.actualDuration,
    componentName: 'NavigationAppHeader',
    animationName: `header-opacity-${animationSpeed}`,
    windowSize: 10,
  })
  void smoothness

  // 3. Frame drop detection
  const frameDrops = useFrameDropDetection({
    isActive: completion.isComplete === false && hasInitialized,
    componentName: 'NavigationAppHeader',
    animationName: `header-opacity-${animationSpeed}`,
  })
  void frameDrops

  // Clear announcement text after it's been read by screen readers
  useEffect(() => {
    if (announcementText) {
      // Clear any existing timeout
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }
      // Clear announcement after screen readers have time to read it (500ms)
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncementText('')
        announcementTimeoutRef.current = null
      }, 500)
    }
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }
    }
  }, [announcementText])

  // Log component mount and mode detection
  useEffect(() => {
    log.debug('NavigationAppHeader', '🚀 [MOUNT] Component mounted', {
      routeName: route.name,
      isVideoAnalysisMode,
      isHistoryMode,
      initialVisibility: isVisible,
      headerVisible: navOptions.headerVisible,
      headerShown: options.headerShown,
      animationSpeed,
      isUserInteraction: navOptions.isUserInteraction,
      routeParams: routeParams ? Object.keys(routeParams) : null,
      analysisJobId: analysisJobIdFromParams,
      explicitIsHistoryMode: navOptions.isHistoryMode,
    })
  }, []) // Only log on mount

  // Log animation speed changes when user interaction mode changes
  useEffect(() => {
    // Skip logging on initial mount - mount log already includes animation speed
    if (prevIsUserInteractionRef.current === undefined) {
      prevIsUserInteractionRef.current = isUserInteractionValue
      return
    }

    // Only log if the value actually changed
    if (prevIsUserInteractionRef.current === isUserInteractionValue) {
      return
    }
    prevIsUserInteractionRef.current = isUserInteractionValue

    log.debug('NavigationAppHeader', '⚡ [ANIMATION] Animation speed updated', {
      isUserInteraction: navOptions.isUserInteraction,
      animationSpeed,
      headerShown: options.headerShown,
      headerVisible: navOptions.headerVisible,
      isVideoAnalysisMode,
      isHistoryMode,
      isVisible,
      routeParams: route.params,
    })
  }, [isUserInteractionValue])

  // Track previous VideoAnalysis mode to detect transitions
  const prevVideoAnalysisModeRef = useRef(false)

  // Update visibility when headerVisible or headerShown changes
  useEffect(() => {
    // Only control visibility via opacity in VideoAnalysis mode
    // For other screens, React Navigation handles mount/unmount via headerShown
    if (!isVideoAnalysisMode) {
      prevVideoAnalysisModeRef.current = false
      return
    }

    const isTransitioningIntoVideoAnalysis =
      !prevVideoAnalysisModeRef.current && isVideoAnalysisMode
    // Use isHistoryMode to determine visibility when headerVisible isn't set yet during transition
    const shouldBeVisible = navOptions.headerVisible ?? !isHistoryMode
    prevVideoAnalysisModeRef.current = true

    // Handle transition into VideoAnalysis mode: set visibility and initialize immediately
    if (isTransitioningIntoVideoAnalysis) {
      log.debug('NavigationAppHeader', '🔄 [TRANSITION] Entering VideoAnalysis mode', {
        currentIsVisible: isVisible,
        shouldBeVisible,
        isHistoryMode,
        headerVisible: navOptions.headerVisible,
        willSetTo: shouldBeVisible,
        reason: isHistoryMode
          ? 'History mode - using headerVisible (should be false, isProcessing=false)'
          : 'Analysis mode - using headerVisible (should be true, isProcessing=true)',
      })
      // Only update state if visibility actually needs to change
      if (isVisible !== shouldBeVisible) {
        setIsVisible(shouldBeVisible)
        // Announce visibility change for screen readers
        if (hasInitialized) {
          setAnnouncementText(shouldBeVisible ? 'Header shown' : 'Header hidden')
        }
      }
      // Mark as initialized immediately - no grace period needed
      isInitialMountRef.current = false
      setHasInitialized(true)
      return
    }

    // Handle initial mount: set visibility and initialize immediately
    if (isInitialMountRef.current) {
      log.debug(
        'NavigationAppHeader',
        '🚀 [INIT] Initial mount - setting visibility and initializing',
        {
          shouldBeVisible,
          currentIsVisible: isVisible,
          isHistoryMode,
          headerVisible: navOptions.headerVisible,
        }
      )
      isInitialMountRef.current = false
      if (isVisible !== shouldBeVisible) {
        setIsVisible(shouldBeVisible)
      }
      setHasInitialized(true)
      return
    }

    // Subsequent updates: animate normally
    log.debug('NavigationAppHeader', '👁️ [VISIBILITY] Header visibility changing', {
      headerShown: options.headerShown,
      headerVisible: navOptions.headerVisible,
      isVideoAnalysisMode,
      isHistoryMode,
      shouldBeVisible,
      isUserInteraction: navOptions.isUserInteraction,
      animationSpeed,
      currentIsVisible: isVisible,
      willChange: shouldBeVisible !== isVisible,
      hasInitialized,
    })

    // Only update if visibility actually changed and we're initialized (to avoid announcements on mount)
    if (hasInitialized && prevVisibilityRef.current !== shouldBeVisible) {
      setIsVisible(shouldBeVisible)
      // Announce visibility change for screen readers
      setAnnouncementText(shouldBeVisible ? 'Header shown' : 'Header hidden')
    }

    prevVisibilityRef.current = shouldBeVisible
  }, [
    options.headerShown,
    navOptions.headerVisible,
    navOptions.isUserInteraction,
    isVideoAnalysisMode,
    isVisible,
    hasInitialized,
  ])

  // Keep a stable top inset on iOS to avoid header jumping when status bar toggles
  // On Android we continue relying on SafeAreaView's top edge behavior
  const topInset = Platform.OS === 'ios' ? Math.max(insets.top, 0) : insets.top

  const tintColor = options.headerTintColor ?? undefined
  const isTransparent = options.headerTransparent ?? false
  const headerStyle = options.headerStyle
  const backgroundColor =
    typeof headerStyle === 'object' && headerStyle && 'backgroundColor' in headerStyle
      ? (headerStyle.backgroundColor ?? 'transparent')
      : 'transparent'
  const titleAlignment = options.headerTitleAlign === 'left' ? 'left' : 'center'

  const computedLeftAction = back ? 'back' : 'sidesheet'

  const appHeaderProps: AppHeaderProps = useMemo(() => {
    const override = navOptions.appHeaderProps ?? {}

    const leftSlot =
      override.leftSlot ??
      (options.headerLeft
        ? options.headerLeft({
            canGoBack: Boolean(back),
            label: options.headerBackTitle,
            tintColor,
          })
        : undefined)

    const rightSlot =
      override.rightSlot ??
      (options.headerRight
        ? options.headerRight({
            tintColor,
          })
        : undefined)

    const titleSlot =
      override.titleSlot ??
      (options.headerTitle && typeof options.headerTitle === 'function'
        ? options.headerTitle({
            children: typeof options.title === 'string' ? options.title : route.name,
            tintColor,
          })
        : undefined)

    return {
      title: typeof options.title === 'string' ? options.title : (override.title ?? route.name),
      mode: override.mode ?? 'default',
      showTimer: override.showTimer ?? false,
      timerValue: override.timerValue ?? '00:00:00',
      onBackPress: override.onBackPress ?? (back ? () => navigation.goBack() : undefined),
      onMenuPress: override.onMenuPress,
      onNotificationPress: override.onNotificationPress,
      onProfilePress: override.onProfilePress,
      notificationBadgeCount: override.notificationBadgeCount ?? 0,
      cameraProps: override.cameraProps,
      titleAlignment: override.titleAlignment ?? titleAlignment,
      leftAction: override.leftAction ?? (leftSlot ? 'none' : computedLeftAction),
      rightAction: override.rightAction ?? (rightSlot ? 'none' : 'auto'),
      themeName:
        override.themeName ?? (isTransparent && colorScheme === 'dark' ? 'dark' : undefined),
      profileImageUri: override.profileImageUri,
      leftSlot,
      rightSlot,
      titleSlot,
    }
  }, [
    navOptions.appHeaderProps,
    options.title,
    options.headerTitle,
    options.headerRight,
    options.headerLeft,
    options.headerBackTitle,
    isTransparent,
    tintColor,
    titleAlignment,
    navigation,
    route.name,
    back,
    colorScheme,
  ])

  return (
    <SafeAreaView
      // Avoid using the top edge on iOS to prevent layout shifts when status bar shows/hides
      edges={Platform.OS === 'ios' ? ['left', 'right'] : ['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor }]}
    >
      {Platform.OS === 'ios' ? <View style={{ height: topInset, backgroundColor }} /> : null}
      <View style={styles.wrapper}>
        {isVideoAnalysisMode ? (
          <Stack
            animation={hasInitialized ? animationSpeed : undefined}
            opacity={isVisible ? 1 : 0}
            enterStyle={{
              opacity: isVisible ? 1 : 0,
            }}
            exitStyle={{
              opacity: 0,
            }}
          >
            <AppHeader {...appHeaderProps} />
          </Stack>
        ) : (
          <AppHeader {...appHeaderProps} />
        )}
      </View>
      {/* ARIA live region for screen reader announcements */}
      <Text
        style={styles.ariaLiveRegion}
        accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : undefined}
        aria-live={Platform.OS === 'web' ? 'polite' : undefined}
        {...(Platform.OS === 'web' ? { 'aria-atomic': true } : {})}
        testID="header-visibility-announcement"
      >
        {announcementText}
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 100,
  },
  wrapper: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
        }
      : {}),
  },
  ariaLiveRegion: {
    position: 'absolute',
    left: -10000,
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    ...(Platform.OS === 'web'
      ? {
          // Web-specific: ensure screen readers can access it
          clip: 'rect(0, 0, 0, 0)',
          clipPath: 'inset(50%)',
        }
      : {}),
  },
})
