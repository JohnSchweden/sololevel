import { log } from '@my/logging'
import type { NativeStackHeaderProps } from '@react-navigation/native-stack'
import { AppHeader, type AppHeaderProps } from '@ui/components/AppHeader'
import { ProfilerWrapper } from '@ui/components/Performance'
// import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View, type ViewStyle, useColorScheme } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

// Animation durations for Reanimated withTiming animations
// 'quick': 200ms for user-initiated interactions (tap, swipe)
// 'lazy': 400ms for automatic changes (processing complete, auto-hide)
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
function NavigationAppHeaderImpl(props: NativeStackHeaderProps) {
  const { navigation, back, options, route } = props
  const navOptions = options as unknown as NavAppHeaderOptions
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  const isInitialMountRef = useRef(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const prevIsUserInteractionRef = useRef<boolean | undefined>(undefined)

  // Memoize navOptions-derived values to prevent unnecessary effect triggers
  // when options object reference changes but values haven't
  const isUserInteractionValue = useMemo(
    () => navOptions.isUserInteraction ?? false,
    [navOptions.isUserInteraction]
  )
  const headerVisibleValue = useMemo(() => navOptions.headerVisible, [navOptions.headerVisible])
  const isHistoryModeValue = useMemo(() => navOptions.isHistoryMode, [navOptions.isHistoryMode])

  // Determine animation speed: quick for user interaction, lazy for automatic
  // Memoize to prevent unnecessary re-renders when value hasn't changed
  const animationSpeed = useMemo(
    () => (isUserInteractionValue ? 'quick' : 'lazy'),
    [isUserInteractionValue]
  )

  // Detect VideoAnalysis mode early from route params BEFORE first setOptions
  // - History mode: has `analysisJobId` param
  // - Analysis mode: has `videoRecordingId` param
  // Memoize route param extraction to prevent re-computation when route.params object reference changes
  const routeParams = route.params as Record<string, unknown> | undefined
  const analysisJobIdFromParams = useMemo(
    () => routeParams?.analysisJobId,
    [routeParams?.analysisJobId]
  )
  const videoRecordingIdFromParams = useMemo(
    () => routeParams?.videoRecordingId,
    [routeParams?.videoRecordingId]
  )
  const isVideoAnalysisRoute = useMemo(
    () => !!analysisJobIdFromParams || !!videoRecordingIdFromParams,
    [analysisJobIdFromParams, videoRecordingIdFromParams]
  )

  // Detect history mode: prefer explicit flag, fallback to route params
  // History mode: data is prefetched/cached, isProcessing should be false quickly → start hidden
  // Analysis mode: isProcessing starts as true → start visible
  // Memoize to prevent re-computation when values haven't changed
  const isHistoryMode = useMemo(
    () => isHistoryModeValue ?? Boolean(analysisJobIdFromParams),
    [isHistoryModeValue, analysisJobIdFromParams]
  )

  // VideoAnalysis mode: Control visibility via opacity (when headerVisible is explicitly set)
  // Applies to both live analysis and history mode (both use /video-analysis route)
  // Other screens: Normal React Navigation mount/unmount behavior via headerShown
  // Check route params to detect VideoAnalysis mode BEFORE first setOptions
  // Memoize to prevent re-computation when values haven't changed
  const isVideoAnalysisMode = useMemo(
    () => headerVisibleValue !== undefined || isVideoAnalysisRoute,
    [headerVisibleValue, isVideoAnalysisRoute]
  )

  const [isVisible, setIsVisible] = useState(() => {
    // Compute initial visibility synchronously - defer logging to useEffect to prevent frame drops
    if (isVideoAnalysisMode || isVideoAnalysisRoute) {
      // In VideoAnalysis mode, initialize visibility based on mode:
      // - Analysis mode: Start visible (isProcessing = true, header should show immediately)
      // - History mode: Start hidden (data prefetched, isProcessing false quickly)
      if (isHistoryMode) {
        // History mode: start hidden (data is prefetched, isProcessing will be false quickly)
        return false
      }
      // Analysis mode: start visible (isProcessing = true initially)
      // Use headerVisible if set, otherwise default to true for analysis mode
      return navOptions.headerVisible ?? true
    }
    return options.headerShown ?? true
  })

  // Keep a stable top inset on iOS to avoid header jumping when status bar toggles
  // On Android we continue relying on SafeAreaView's top edge behavior
  // Memoize to prevent re-computation when insets object reference changes
  // Calculate early so it can be used in render profiling
  const topInset = useMemo(
    () => (Platform.OS === 'ios' ? Math.max(insets.top, 0) : insets.top),
    [insets.top]
  )

  // Render profiling - enable in dev only
  // Track props that might change to identify re-render causes
  // useRenderProfile({
  //   componentName: 'NavigationAppHeader',
  //   enabled: __DEV__,
  //   logInterval: 5,
  //   trackProps: {
  //     isVisible,
  //     animationSpeed,
  //     isUserInteraction: isUserInteractionValue,
  //     headerShown: options.headerShown,
  //     headerVisible: headerVisibleValue,
  //     isVideoAnalysisMode,
  //     isHistoryMode,
  //     // Track route params to detect React Navigation updates
  //     routeName: route.name,
  //     hasBack: Boolean(back),
  //     // Track hooks that might cause re-renders
  //     colorScheme,
  //     topInset,
  //   },
  // })

  // Track previous visibility for ARIA announcements
  const prevVisibilityRef = useRef(isVisible)
  const [announcementText, setAnnouncementText] = useState<string>('')
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track previous isVisible state for direction detection (used for logging)
  const prevIsVisibleForDirectionRef = useRef(isVisible)

  // Track the target opacity value for completion detection
  // Use headerVisible prop (synchronous) instead of isVisible state (async) to match change detection
  // Use memoized value to prevent unnecessary re-computations
  const currentHeaderVisible = useMemo(
    () => headerVisibleValue ?? !isHistoryMode,
    [headerVisibleValue, isHistoryMode]
  )
  const initialOpacity = useMemo(() => {
    if (!isVideoAnalysisMode) {
      return 1
    }

    if (isHistoryMode) {
      return 0
    }

    return (navOptions.headerVisible ?? !isHistoryMode) ? 1 : 0
  }, [isVideoAnalysisMode, isHistoryMode, navOptions.headerVisible])

  // Memoize targetOpacity to prevent unnecessary re-computations and effect triggers
  const targetOpacity = useMemo(
    () => (isVideoAnalysisMode ? (currentHeaderVisible ? 1 : 0) : isVisible ? 1 : 0),
    [isVideoAnalysisMode, currentHeaderVisible, isVisible]
  )

  // Update direction ref when isVisible state changes (for logging/completion tracking)
  useEffect(() => {
    prevIsVisibleForDirectionRef.current = isVisible
  }, [isVisible])

  // Disable animation completion tracking for Reanimated-based animations
  // as shared values can't be read during render

  // Disable smoothness and frame drop tracking for Reanimated animations
  // These hooks are designed for declarative Tamagui animations, not imperative Reanimated
  // Reanimated runs on UI thread, so JS-side metrics would be misleading anyway

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

  // Log component mount and mode detection - deferred to prevent frame drops on first render
  useEffect(() => {
    // Log initial state detection that was computed in useState initializer
    if (isVideoAnalysisMode || isVideoAnalysisRoute) {
      if (isHistoryMode) {
        log.debug('NavigationAppHeader', '🔍 [INIT] History mode detected - starting hidden', {
          isHistoryMode: true,
          analysisJobIdFromParams,
          explicitFlag: navOptions.isHistoryMode,
          routeParams: routeParams ? Object.keys(routeParams) : null,
          initialVisibility: isVisible,
        })
      } else {
        log.debug('NavigationAppHeader', '🔍 [INIT] Analysis mode detected - starting visible', {
          isHistoryMode: false,
          analysisJobIdFromParams,
          explicitFlag: navOptions.isHistoryMode,
          headerVisible: navOptions.headerVisible,
          initialVisibility: isVisible,
        })
      }
    } else {
      log.debug('NavigationAppHeader', '🔍 [INIT] Standard mode - using headerShown', {
        isVideoAnalysisMode: false,
        headerShown: options.headerShown,
        initialVisibility: isVisible,
      })
    }

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
    // Use memoized value to prevent unnecessary re-computations
    const shouldBeVisible = headerVisibleValue ?? !isHistoryMode
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
        startTransition(() => {
          setIsVisible(shouldBeVisible)
          // Announce visibility change for screen readers
          if (hasInitialized) {
            setAnnouncementText(shouldBeVisible ? 'Header shown' : 'Header hidden')
          }
        })
      }
      // Mark as initialized in transition to prevent blocking render
      // Defer to prevent synchronous state update causing immediate re-render
      startTransition(() => {
        isInitialMountRef.current = false
        setHasInitialized(true)
      })
      return
    }

    // Handle initial mount: set visibility and initialize in transition to prevent frame drops
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
      // Wrap initialization in transition to prevent blocking render
      startTransition(() => {
        isInitialMountRef.current = false
        if (isVisible !== shouldBeVisible) {
          setIsVisible(shouldBeVisible)
        }
        setHasInitialized(true)
      })
      return
    }

    // Subsequent updates: animate normally
    // Only update if visibility actually changed and we're initialized (to avoid announcements on mount)
    // CRITICAL: Compare with current state (isVisible) to prevent redundant updates
    // If state already matches desired value, skip update to prevent re-render cascade
    if (hasInitialized && isVisible !== shouldBeVisible) {
      // Batch state updates using startTransition to prevent rapid re-renders
      // This ensures setIsVisible and setAnnouncementText happen in a single render cycle
      startTransition(() => {
        setIsVisible(shouldBeVisible)
        // Announce visibility change for screen readers
        setAnnouncementText(shouldBeVisible ? 'Header shown' : 'Header hidden')
      })
    }

    prevVisibilityRef.current = shouldBeVisible
  }, [
    options.headerShown,
    headerVisibleValue,
    isUserInteractionValue,
    isVideoAnalysisMode,
    isVisible,
    hasInitialized,
    isHistoryMode,
  ])

  // Memoize options-derived values to prevent re-computation when options object reference changes
  const tintColor = useMemo(() => options.headerTintColor ?? undefined, [options.headerTintColor])
  const isTransparent = useMemo(
    () => options.headerTransparent ?? false,
    [options.headerTransparent]
  )
  const headerStyle = options.headerStyle
  const backgroundColor = useMemo(() => {
    return typeof headerStyle === 'object' && headerStyle && 'backgroundColor' in headerStyle
      ? (headerStyle.backgroundColor ?? 'transparent')
      : 'transparent'
  }, [headerStyle])
  const titleAlignment = useMemo(
    () => (options.headerTitleAlign === 'left' ? 'left' : 'center'),
    [options.headerTitleAlign]
  )

  const computedLeftAction = useMemo(() => (back ? 'back' : 'sidesheet'), [back])

  // Stable navigation ref to avoid dependency on navigation object identity
  const navigationRef = useRef(navigation)
  navigationRef.current = navigation

  // Stable default back handler to prevent inline function creation
  const defaultBackHandler = useCallback(() => {
    navigationRef.current.goBack()
  }, [])

  // Memoize default back handler conditional - only create if back is available
  const memoizedDefaultBackHandler = useMemo(
    () => (back ? defaultBackHandler : undefined),
    [back, defaultBackHandler]
  )

  // Extract primitive values from navOptions.appHeaderProps BEFORE useMemo
  // This prevents object reference changes from triggering unnecessary re-renders
  const navHeaderProps = navOptions.appHeaderProps ?? {}
  const navMode = navHeaderProps.mode
  const navShowTimer = navHeaderProps.showTimer
  const navTimerValue = navHeaderProps.timerValue
  const navTitle = navHeaderProps.title
  const navTitleAlignment = navHeaderProps.titleAlignment
  const navLeftAction = navHeaderProps.leftAction
  const navRightAction = navHeaderProps.rightAction
  const navThemeName = navHeaderProps.themeName
  const navProfileImageUri = navHeaderProps.profileImageUri
  const navNotificationBadgeCount = navHeaderProps.notificationBadgeCount
  // Callbacks - extracted but compared separately (may be stable or new references)
  const navOnBackPress = navHeaderProps.onBackPress
  const navOnMenuPress = navHeaderProps.onMenuPress
  const navOnNotificationPress = navHeaderProps.onNotificationPress
  const navOnProfilePress = navHeaderProps.onProfilePress
  // Complex objects - extracted but compared by reference
  const navLeftSlot = navHeaderProps.leftSlot
  const navRightSlot = navHeaderProps.rightSlot
  const navTitleSlot = navHeaderProps.titleSlot
  const navCameraProps = navHeaderProps.cameraProps

  const appHeaderProps: AppHeaderProps = useMemo(() => {
    const leftSlot =
      navLeftSlot ??
      (options.headerLeft
        ? options.headerLeft({
            canGoBack: Boolean(back),
            label: options.headerBackTitle,
            tintColor,
          })
        : undefined)

    const rightSlot =
      navRightSlot ??
      (options.headerRight
        ? options.headerRight({
            tintColor,
          })
        : undefined)

    const titleSlot =
      navTitleSlot ??
      (options.headerTitle && typeof options.headerTitle === 'function'
        ? options.headerTitle({
            children: typeof options.title === 'string' ? options.title : route.name,
            tintColor,
          })
        : undefined)

    return {
      title: typeof options.title === 'string' ? options.title : (navTitle ?? route.name),
      mode: navMode ?? 'default',
      showTimer: navShowTimer ?? false,
      timerValue: navTimerValue ?? '00:00:00',
      onBackPress: navOnBackPress ?? memoizedDefaultBackHandler,
      onMenuPress: navOnMenuPress,
      onNotificationPress: navOnNotificationPress,
      onProfilePress: navOnProfilePress,
      notificationBadgeCount: navNotificationBadgeCount ?? 0,
      cameraProps: navCameraProps,
      titleAlignment: navTitleAlignment ?? titleAlignment,
      leftAction: navLeftAction ?? (leftSlot ? 'none' : computedLeftAction),
      rightAction: navRightAction ?? (rightSlot ? 'none' : 'auto'),
      themeName: navThemeName ?? (isTransparent && colorScheme === 'dark' ? 'dark' : undefined),
      profileImageUri: navProfileImageUri,
      leftSlot,
      rightSlot,
      titleSlot,
    }
  }, [
    // Primitive values from navOptions.appHeaderProps (stable references)
    navMode,
    navShowTimer,
    navTimerValue,
    navTitle,
    navTitleAlignment,
    navLeftAction,
    navRightAction,
    navThemeName,
    navProfileImageUri,
    navNotificationBadgeCount,
    // Callbacks from navOptions.appHeaderProps (may change but compared directly)
    navOnBackPress,
    navOnMenuPress,
    navOnNotificationPress,
    navOnProfilePress,
    // Complex objects from navOptions.appHeaderProps (compared by reference)
    navLeftSlot,
    navRightSlot,
    navTitleSlot,
    navCameraProps,
    // Options and other dependencies
    options.title,
    options.headerTitle,
    options.headerRight,
    options.headerLeft,
    options.headerBackTitle,
    isTransparent,
    tintColor,
    titleAlignment,
    route.name,
    back,
    colorScheme,
    memoizedDefaultBackHandler,
    computedLeftAction,
  ])

  // Stable edges array to prevent SafeAreaView re-renders
  const safeAreaEdges = useMemo(
    () =>
      Platform.OS === 'ios' ? (['left', 'right'] as const) : (['top', 'left', 'right'] as const),
    []
  )

  // Stable safe area style to prevent re-creation
  const safeAreaStyle = useMemo(() => [styles.safeArea, { backgroundColor }], [backgroundColor])

  // Stable top inset style for iOS
  const topInsetStyle = useMemo(
    () => ({ height: topInset, backgroundColor }),
    [topInset, backgroundColor]
  )

  return (
    <ProfilerWrapper
      id="NavigationAppHeader"
      logToConsole={__DEV__}
    >
      <SafeAreaView
        // Avoid using the top edge on iOS to prevent layout shifts when status bar shows/hides
        edges={safeAreaEdges}
        style={safeAreaStyle}
      >
        {Platform.OS === 'ios' ? <View style={topInsetStyle} /> : null}
        <View style={styles.wrapper}>
          {isVideoAnalysisMode ? (
            <VideoAnalysisAnimatedHeader
              appHeaderProps={appHeaderProps}
              initialOpacity={initialOpacity}
              targetOpacity={targetOpacity}
              hasInitialized={hasInitialized}
              animationSpeed={animationSpeed}
              currentHeaderVisible={currentHeaderVisible}
            />
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
    </ProfilerWrapper>
  )
}

interface VideoAnalysisAnimatedHeaderProps {
  appHeaderProps: AppHeaderProps
  initialOpacity: number
  targetOpacity: number
  hasInitialized: boolean
  animationSpeed: 'quick' | 'lazy'
  currentHeaderVisible: boolean
}

function VideoAnalysisAnimatedHeader({
  appHeaderProps,
  initialOpacity,
  targetOpacity,
  hasInitialized,
  animationSpeed,
  currentHeaderVisible,
}: VideoAnalysisAnimatedHeaderProps) {
  const opacityValue = useSharedValue(initialOpacity)

  useAnimatedReaction(
    () => opacityValue.value,
    () => {
      // Listener intentionally empty; registers the shared value with UI runtime
    }
  )

  const prevHeaderVisibleRef = useRef(currentHeaderVisible)
  const prevAnimationSpeedRef = useRef<'quick' | 'lazy'>(animationSpeed)

  useEffect(() => {
    if (!hasInitialized) {
      opacityValue.value = targetOpacity
      prevHeaderVisibleRef.current = currentHeaderVisible
      prevAnimationSpeedRef.current = animationSpeed
      return
    }

    const headerVisibleChanged = prevHeaderVisibleRef.current !== currentHeaderVisible
    const animationSpeedChanged = prevAnimationSpeedRef.current !== animationSpeed

    if (!headerVisibleChanged && animationSpeedChanged) {
      prevAnimationSpeedRef.current = animationSpeed
      return
    }

    if (headerVisibleChanged) {
      cancelAnimation(opacityValue)
    }

    const duration =
      animationSpeed === 'quick' ? ANIMATION_DURATIONS.quick : ANIMATION_DURATIONS.lazy

    opacityValue.value = withTiming(targetOpacity, {
      duration,
      easing: Easing.out(Easing.ease),
    })

    prevHeaderVisibleRef.current = currentHeaderVisible
    prevAnimationSpeedRef.current = animationSpeed
  }, [animationSpeed, currentHeaderVisible, hasInitialized, opacityValue, targetOpacity])

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: opacityValue.value,
  }))

  return (
    <Animated.View style={animatedStyle}>
      <AppHeader {...appHeaderProps} />
    </Animated.View>
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

/**
 * NavigationAppHeader with React.memo - compares option values, not references
 * React Navigation creates new options objects every render, so we need content-based comparison
 *
 * Note: During tab navigation transitions, React Navigation may legitimately trigger 2-3 renders:
 * 1. Mount render when navigating to new tab (expected)
 * 2. Transition update as React Navigation updates options (expected)
 * 3. Final state after transition (may be minimized but not always avoidable)
 *
 * Fast render times (< 1ms) on subsequent renders indicate React.memo is working correctly.
 */
export const NavigationAppHeader = React.memo(NavigationAppHeaderImpl, (prev, next) => {
  // Compare route identity (route.name should be stable)
  if (prev.route.name !== next.route.name) {
    return false
  }

  // Compare back button presence
  if (Boolean(prev.back) !== Boolean(next.back)) {
    return false
  }

  // Compare headerShown
  if (prev.options.headerShown !== next.options.headerShown) {
    return false
  }

  // Extract and compare custom navOptions values (content-based, not reference)
  const prevNavOptions = prev.options as unknown as NavAppHeaderOptions
  const nextNavOptions = next.options as unknown as NavAppHeaderOptions

  if (prevNavOptions.headerVisible !== nextNavOptions.headerVisible) {
    return false
  }

  if (prevNavOptions.isUserInteraction !== nextNavOptions.isUserInteraction) {
    return false
  }

  if (prevNavOptions.isHistoryMode !== nextNavOptions.isHistoryMode) {
    return false
  }

  // Compare route params for VideoAnalysis mode detection
  const prevParams = prev.route.params as Record<string, unknown> | undefined
  const nextParams = next.route.params as Record<string, unknown> | undefined
  if (prevParams?.analysisJobId !== nextParams?.analysisJobId) {
    return false
  }
  if (prevParams?.videoRecordingId !== nextParams?.videoRecordingId) {
    return false
  }

  // Compare appHeaderProps values (content-based)
  const prevAppHeaderProps = prevNavOptions.appHeaderProps
  const nextAppHeaderProps = nextNavOptions.appHeaderProps

  if (!prevAppHeaderProps && !nextAppHeaderProps) {
    // Both undefined - equal
  } else if (!prevAppHeaderProps || !nextAppHeaderProps) {
    return false // One defined, one not - different
  } else {
    // Compare key values from appHeaderProps
    if (
      prevAppHeaderProps.mode !== nextAppHeaderProps.mode ||
      prevAppHeaderProps.showTimer !== nextAppHeaderProps.showTimer ||
      prevAppHeaderProps.timerValue !== nextAppHeaderProps.timerValue ||
      prevAppHeaderProps.title !== nextAppHeaderProps.title ||
      prevAppHeaderProps.titleAlignment !== nextAppHeaderProps.titleAlignment ||
      prevAppHeaderProps.leftAction !== nextAppHeaderProps.leftAction ||
      prevAppHeaderProps.rightAction !== nextAppHeaderProps.rightAction ||
      prevAppHeaderProps.themeName !== nextAppHeaderProps.themeName ||
      prevAppHeaderProps.profileImageUri !== nextAppHeaderProps.profileImageUri ||
      prevAppHeaderProps.notificationBadgeCount !== nextAppHeaderProps.notificationBadgeCount
    ) {
      return false
    }

    // Compare callback references (if they changed, we need to re-render)
    // Note: Callbacks are compared by reference - if parent creates new callbacks, we re-render
    if (
      prevAppHeaderProps.onBackPress !== nextAppHeaderProps.onBackPress ||
      prevAppHeaderProps.onMenuPress !== nextAppHeaderProps.onMenuPress ||
      prevAppHeaderProps.onNotificationPress !== nextAppHeaderProps.onNotificationPress ||
      prevAppHeaderProps.onProfilePress !== nextAppHeaderProps.onProfilePress
    ) {
      return false
    }
  }

  // Compare options.headerLeft/Right/Title functions by reference
  // Only compare if they're actually set (not undefined) - React Navigation may recreate
  // undefined values during transitions without meaningful change
  if (
    (prev.options.headerLeft !== undefined || next.options.headerLeft !== undefined) &&
    prev.options.headerLeft !== next.options.headerLeft
  ) {
    return false
  }
  if (
    (prev.options.headerRight !== undefined || next.options.headerRight !== undefined) &&
    prev.options.headerRight !== next.options.headerRight
  ) {
    return false
  }
  if (
    (prev.options.headerTitle !== undefined || next.options.headerTitle !== undefined) &&
    prev.options.headerTitle !== next.options.headerTitle
  ) {
    return false
  }
  if (
    (prev.options.headerBackTitle !== undefined || next.options.headerBackTitle !== undefined) &&
    prev.options.headerBackTitle !== next.options.headerBackTitle
  ) {
    return false
  }

  // Compare options.title
  if (prev.options.title !== next.options.title) {
    return false
  }

  // Compare options.headerTitleAlign
  if (prev.options.headerTitleAlign !== next.options.headerTitleAlign) {
    return false
  }

  // Compare options.headerTintColor
  if (prev.options.headerTintColor !== next.options.headerTintColor) {
    return false
  }

  // Compare options.headerTransparent
  if (prev.options.headerTransparent !== next.options.headerTransparent) {
    return false
  }

  // Compare route.key (React Navigation uses this for route identity)
  // If route.key changes, it's a different route instance - need to re-render
  if (prev.route.key !== next.route.key) {
    return false
  }

  // Compare navigation objects by identity (should be stable, but check anyway)
  if (prev.navigation !== next.navigation) {
    // Navigation object identity changed - might need to re-render if we use it
    // But we use a ref, so this is usually safe to ignore
    // Only re-render if route also changed (caught above)
  }

  // Compare headerStyle object (React Navigation may recreate this)
  const prevHeaderStyle = prev.options.headerStyle
  const nextHeaderStyle = next.options.headerStyle
  if (prevHeaderStyle !== nextHeaderStyle) {
    // Compare by content, not reference
    if (
      typeof prevHeaderStyle === 'object' &&
      typeof nextHeaderStyle === 'object' &&
      prevHeaderStyle !== null &&
      nextHeaderStyle !== null
    ) {
      const prevBg = (prevHeaderStyle as any).backgroundColor
      const nextBg = (nextHeaderStyle as any).backgroundColor
      if (prevBg !== nextBg) {
        return false
      }
    } else if (prevHeaderStyle !== nextHeaderStyle) {
      return false
    }
  }

  // All relevant props are equal - skip re-render
  return true
})
