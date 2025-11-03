import { log } from '@my/logging'
import type { NativeStackHeaderProps } from '@react-navigation/native-stack'
import { AppHeader, type AppHeaderProps } from '@ui/components/AppHeader'
// import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View, type ViewStyle, useColorScheme } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
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
export function NavigationAppHeader(props: NativeStackHeaderProps) {
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

  // Reanimated shared value for opacity (runs on UI thread)
  // Initial value: 0 if history mode, 1 if visible, 0 if hidden, or 1 if not in video analysis mode
  const initialOpacity = isVideoAnalysisMode
    ? isHistoryMode
      ? 0
      : (navOptions.headerVisible ?? !isHistoryMode)
        ? 1
        : 0
    : 1
  const opacityValue = useSharedValue(initialOpacity)

  // Track previous headerVisible prop for animation detection (prop updates synchronously)
  // Use prop instead of state because state updates are async and might lag behind prop changes
  const currentHeaderVisibleForRef = useMemo(
    () => headerVisibleValue ?? !isHistoryMode,
    [headerVisibleValue, isHistoryMode]
  )
  const prevHeaderVisibleForAnimationRef = useRef(
    isVideoAnalysisMode ? currentHeaderVisibleForRef : (options.headerShown ?? true)
  )
  // Track previous animation speed to detect changes
  const prevAnimationSpeedRef = useRef<'quick' | 'lazy'>(animationSpeed)
  // Track previous isVisible state for direction detection (used for logging)
  const prevIsVisibleForDirectionRef = useRef(isVisible)

  // Track the target opacity value for completion detection
  // Use headerVisible prop (synchronous) instead of isVisible state (async) to match change detection
  // Use memoized value to prevent unnecessary re-computations
  const currentHeaderVisible = useMemo(
    () => headerVisibleValue ?? !isHistoryMode,
    [headerVisibleValue, isHistoryMode]
  )
  // Memoize targetOpacity to prevent unnecessary re-computations and effect triggers
  const targetOpacity = useMemo(
    () => (isVideoAnalysisMode ? (currentHeaderVisible ? 1 : 0) : isVisible ? 1 : 0),
    [isVideoAnalysisMode, currentHeaderVisible, isVisible]
  )

  // Update opacity animation when visibility changes
  useEffect(() => {
    if (!isVideoAnalysisMode || !hasInitialized) {
      // Non-video-analysis mode or not initialized: set immediately
      opacityValue.value = targetOpacity
      return
    }

    // Use headerVisible prop (synchronous) instead of isVisible state (async) for change detection
    // This ensures we detect visibility changes immediately when setOptions is called
    // Use memoized value to prevent unnecessary re-computations
    const headerVisibleChanged = prevHeaderVisibleForAnimationRef.current !== currentHeaderVisible
    const animationSpeedChanged = prevAnimationSpeedRef.current !== animationSpeed

    if (!headerVisibleChanged && animationSpeedChanged) {
      // Only animation speed changed but visibility didn't - don't restart animation
      // The current animation should continue with its original speed
      // Update the ref so we don't keep checking this
      prevAnimationSpeedRef.current = animationSpeed
      return
    }

    // If visibility changed, always restart animation (even if animation speed also changed)
    // Cancel any in-progress animation only if visibility changed
    if (headerVisibleChanged) {
      cancelAnimation(opacityValue)
    }

    // Animate to target with appropriate timing
    const duration =
      animationSpeed === 'quick' ? ANIMATION_DURATIONS.quick : ANIMATION_DURATIONS.lazy
    opacityValue.value = withTiming(targetOpacity, {
      duration,
      easing: Easing.out(Easing.ease),
    })

    // Update refs after starting animation
    prevHeaderVisibleForAnimationRef.current = currentHeaderVisible
    prevAnimationSpeedRef.current = animationSpeed
  }, [
    isVisible,
    hasInitialized,
    isVideoAnalysisMode,
    targetOpacity,
    headerVisibleValue,
    isHistoryMode,
    opacityValue,
    animationSpeed,
    currentHeaderVisible,
  ])

  // Update direction ref when isVisible state changes (for logging/completion tracking)
  useEffect(() => {
    prevIsVisibleForDirectionRef.current = isVisible
  }, [isVisible])

  // Animated style (runs on UI thread)
  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    return {
      opacity: opacityValue.value,
    }
  })

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
    <SafeAreaView
      // Avoid using the top edge on iOS to prevent layout shifts when status bar shows/hides
      edges={safeAreaEdges}
      style={safeAreaStyle}
    >
      {Platform.OS === 'ios' ? <View style={topInsetStyle} /> : null}
      <View style={styles.wrapper}>
        {isVideoAnalysisMode ? (
          <Animated.View style={animatedStyle}>
            <AppHeader {...appHeaderProps} />
          </Animated.View>
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
