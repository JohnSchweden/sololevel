import { useStableTopInset } from '@app/provider/safe-area/use-safe-area'
import type { NativeStackHeaderProps } from '@react-navigation/native-stack'
import { AppHeader, type AppHeaderProps } from '@ui/components/AppHeader'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform, StyleSheet, View, type ViewStyle, useColorScheme } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Animation durations for Reanimated withTiming animations
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
 * Helper to compare appHeaderProps objects by value
 */
function compareAppHeaderProps(
  prev: Partial<AppHeaderProps> | undefined,
  next: Partial<AppHeaderProps> | undefined
): boolean {
  if (!prev && !next) return true
  if (!prev || !next) return false

  const checks = [
    { prop: 'mode', prev: prev.mode, next: next.mode },
    { prop: 'showTimer', prev: prev.showTimer, next: next.showTimer },
    { prop: 'timerValue', prev: prev.timerValue, next: next.timerValue },
    { prop: 'title', prev: prev.title, next: next.title },
    { prop: 'titleAlignment', prev: prev.titleAlignment, next: next.titleAlignment },
    { prop: 'leftAction', prev: prev.leftAction, next: next.leftAction },
    { prop: 'rightAction', prev: prev.rightAction, next: next.rightAction },
    { prop: 'themeName', prev: prev.themeName, next: next.themeName },
    { prop: 'profileImageUri', prev: prev.profileImageUri, next: next.profileImageUri },
    {
      prop: 'notificationBadgeCount',
      prev: prev.notificationBadgeCount,
      next: next.notificationBadgeCount,
    },
    { prop: 'onBackPress', prev: prev.onBackPress, next: next.onBackPress },
    { prop: 'onMenuPress', prev: prev.onMenuPress, next: next.onMenuPress },
    { prop: 'onNotificationPress', prev: prev.onNotificationPress, next: next.onNotificationPress },
    { prop: 'onProfilePress', prev: prev.onProfilePress, next: next.onProfilePress },
    { prop: 'leftSlot', prev: prev.leftSlot, next: next.leftSlot },
    { prop: 'rightSlot', prev: prev.rightSlot, next: next.rightSlot },
    { prop: 'titleSlot', prev: prev.titleSlot, next: next.titleSlot },
    { prop: 'cameraProps', prev: prev.cameraProps, next: next.cameraProps },
  ]

  for (const check of checks) {
    if (check.prev !== check.next) {
      return false
    }
  }

  return true
}

/**
 * NavigationAppHeader
 *
 * Adapter that bridges React Navigation's header API with the custom AppHeader component.
 * Works on Web, iOS, and Android without absolute positioning or fake safe-area hacks.
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
 * @param {NativeStackHeaderProps} props - React Navigation header props
 * @returns {JSX.Element} Rendered header component with SafeAreaView wrapper
 */
function NavigationAppHeaderImpl(props: NativeStackHeaderProps) {
  const { navigation, back, options, route } = props
  const navOptions = options as unknown as NavAppHeaderOptions
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()

  // Extract route params once
  const routeParams = route.params as Record<string, unknown> | undefined
  const analysisJobId = routeParams?.analysisJobId
  const videoRecordingId = routeParams?.videoRecordingId

  /**
   * Mode Detection
   * - VideoAnalysis route: Has analysisJobId or videoRecordingId in params
   * - History mode: Explicit flag OR has analysisJobId (prefetched data)
   * - VideoAnalysis mode: headerVisible prop set OR detected from route params
   * - Animation speed: 'quick' (200ms) for user interaction, 'lazy' (400ms) for automatic
   */
  const isVideoAnalysisRoute = Boolean(analysisJobId || videoRecordingId)
  const isHistoryMode = navOptions.isHistoryMode ?? Boolean(analysisJobId)
  const isVideoAnalysisMode = navOptions.headerVisible !== undefined || isVideoAnalysisRoute
  const isUserInteraction = navOptions.isUserInteraction ?? false
  const animationSpeed = isUserInteraction ? 'quick' : 'lazy'

  /**
   * Initialize visibility state synchronously
   * - VideoAnalysis mode: History starts hidden, Analysis starts visible
   * - Standard mode: Uses headerShown from React Navigation
   */
  const hasInitializedRef = useRef(false)
  const prevVideoAnalysisModeRef = useRef(false)
  const hasInitializedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isVideoAnalysisMode) {
      prevVideoAnalysisModeRef.current = false
      if (hasInitializedTimeoutRef.current) {
        clearTimeout(hasInitializedTimeoutRef.current)
        hasInitializedTimeoutRef.current = null
      }
      hasInitializedRef.current = true
      return
    }

    const isTransitioningIntoVideoAnalysis =
      !prevVideoAnalysisModeRef.current && isVideoAnalysisMode

    prevVideoAnalysisModeRef.current = true

    if (isTransitioningIntoVideoAnalysis || !hasInitializedRef.current) {
      if (hasInitializedTimeoutRef.current) {
        clearTimeout(hasInitializedTimeoutRef.current)
      }
      hasInitializedRef.current = false
      hasInitializedTimeoutRef.current = setTimeout(() => {
        hasInitializedRef.current = true
        hasInitializedTimeoutRef.current = null
      }, 0)
    }
  }, [isVideoAnalysisMode])

  useEffect(() => {
    return () => {
      if (hasInitializedTimeoutRef.current) {
        clearTimeout(hasInitializedTimeoutRef.current)
        hasInitializedTimeoutRef.current = null
      }
    }
  }, [])

  /**
   * Top inset (stable to prevent layout shifts)
   * On iOS and Android, we keep a stable top inset to avoid header jumping when status bar toggles.
   * We capture the initial top inset value and maintain it even when status bar is hidden.
   *
   * Uses shared stable inset hook to prevent initial 0-inset overlap on new screens
   */
  const topInset = useStableTopInset(insets)

  /**
   * Extract options-derived values
   * Direct access without memoization - these are simple primitives or simple computations
   */
  const tintColor = options.headerTintColor ?? undefined
  const isTransparent = options.headerTransparent ?? false
  const headerStyle = options.headerStyle
  const backgroundColor =
    typeof headerStyle === 'object' && headerStyle && 'backgroundColor' in headerStyle
      ? (headerStyle.backgroundColor ?? 'transparent')
      : 'transparent'
  const titleAlignment = options.headerTitleAlign === 'left' ? 'left' : 'center'
  const computedLeftAction = back ? 'back' : 'sidesheet'

  /**
   * Stable navigation ref to avoid dependency on navigation object identity
   * Navigation object may change reference, but we only need the goBack method
   */
  const navigationRef = useRef(navigation)
  navigationRef.current = navigation

  /**
   * Stable default back handler to prevent inline function creation
   * Only created if back button is available
   */
  const defaultBackHandler = useCallback(() => {
    navigationRef.current.goBack()
  }, [])

  const memoizedDefaultBackHandler = back ? defaultBackHandler : undefined

  /**
   * Extract appHeaderProps values
   * Extracted before useMemo to prevent object reference changes from triggering re-renders
   */
  const navHeaderProps = navOptions.appHeaderProps ?? {}

  /**
   * Split expensive computations into stable chunks to minimize recalculation
   * PERF: Each useMemo only recomputes when its specific deps change, not all 15 at once
   */

  // Stable base values that change less frequently
  const stableHeaderProps = useMemo(
    () => ({
      mode: navHeaderProps.mode ?? 'default',
      showTimer: navHeaderProps.showTimer ?? false,
      timerValue: navHeaderProps.timerValue ?? '00:00:00',
      titleAlignment: navHeaderProps.titleAlignment ?? titleAlignment,
      themeName:
        navHeaderProps.themeName ?? (isTransparent && colorScheme === 'dark' ? 'dark' : undefined),
      profileImageUri: navHeaderProps.profileImageUri,
      notificationBadgeCount: navHeaderProps.notificationBadgeCount ?? 0,
      cameraProps: navHeaderProps.cameraProps,
      disableBlur: navHeaderProps.disableBlur ?? false,
    }),
    [navHeaderProps, titleAlignment, isTransparent, colorScheme]
  )

  // Navigation-dependent slots (recalculate only when navigation changes)
  const navSlots = useMemo(
    () => ({
      leftSlot:
        navHeaderProps.leftSlot ??
        (options.headerLeft
          ? options.headerLeft({
              canGoBack: Boolean(back),
              label: options.headerBackTitle,
              tintColor,
            })
          : undefined),
      rightSlot:
        navHeaderProps.rightSlot ??
        (options.headerRight
          ? options.headerRight({
              tintColor,
            })
          : undefined),
      titleSlot:
        navHeaderProps.titleSlot ??
        (options.headerTitle && typeof options.headerTitle === 'function'
          ? options.headerTitle({
              children: typeof options.title === 'string' ? options.title : route.name,
              tintColor,
            })
          : undefined),
    }),
    [
      navHeaderProps,
      options.headerLeft,
      options.headerRight,
      options.headerTitle,
      options.headerBackTitle,
      back,
      tintColor,
      options.title,
      route.name,
    ]
  )

  // Final props object (combines stable + dynamic parts)
  const appHeaderProps: AppHeaderProps = useMemo(
    () => ({
      title:
        typeof options.title === 'string' ? options.title : (navHeaderProps.title ?? route.name),
      ...stableHeaderProps,
      onBackPress: navHeaderProps.onBackPress ?? memoizedDefaultBackHandler,
      onMenuPress: navHeaderProps.onMenuPress,
      onNotificationPress: navHeaderProps.onNotificationPress,
      onProfilePress: navHeaderProps.onProfilePress,
      leftAction: navHeaderProps.leftAction ?? (navSlots.leftSlot ? 'none' : computedLeftAction),
      rightAction: navHeaderProps.rightAction ?? (navSlots.rightSlot ? 'none' : 'auto'),
      ...navSlots,
    }),
    [
      options.title,
      navHeaderProps.title,
      route.name,
      stableHeaderProps,
      navHeaderProps.onBackPress,
      navHeaderProps.onMenuPress,
      navHeaderProps.onNotificationPress,
      navHeaderProps.onProfilePress,
      navHeaderProps.leftAction,
      navHeaderProps.rightAction,
      memoizedDefaultBackHandler,
      navSlots,
      computedLeftAction,
    ]
  )

  /**
   * Compute opacity values for VideoAnalysis mode
   * - currentHeaderVisible: Target visibility state (synchronous, from props)
   * - initialOpacity: Starting opacity (0 for history mode, 1 for analysis mode)
   * - targetOpacity: Target opacity for animation (1 = visible, 0 = hidden)
   */
  const currentHeaderVisible = navOptions.headerVisible ?? !isHistoryMode
  const headerShown = options.headerShown ?? true
  const initialOpacity = isVideoAnalysisMode
    ? isHistoryMode
      ? 0
      : navOptions.headerVisible === false
        ? 0
        : 1
    : 1
  const targetOpacity = isVideoAnalysisMode ? (currentHeaderVisible ? 1 : 0) : headerShown ? 1 : 0

  /**
   * PERF FIX: Remove SafeAreaView to eliminate synchronous native bridge calls on every navigation
   * Use View with manual inset padding instead. SafeAreaView blocks JS thread for 300-500ms
   * waiting for native measurement on every mount, causing frame drops to 5 FPS.
   */
  const containerStyle = useMemo(
    () => [
      styles.safeArea,
      { backgroundColor, paddingLeft: insets.left, paddingRight: insets.right },
    ],
    [backgroundColor, insets.left, insets.right]
  )
  const wrapperStyle = useMemo(
    () => [
      styles.wrapper,
      {
        overflow: 'visible' as const,
        paddingTop: topInset,
      },
    ],
    [topInset]
  )

  return (
    <View style={containerStyle}>
      <View style={wrapperStyle}>
        {isVideoAnalysisMode ? (
          <VideoAnalysisAnimatedHeader
            appHeaderProps={{ ...appHeaderProps, topInset }}
            initialOpacity={initialOpacity}
            targetOpacity={targetOpacity}
            hasInitializedRef={hasInitializedRef}
            animationSpeed={animationSpeed}
            currentHeaderVisible={currentHeaderVisible}
          />
        ) : (
          <AppHeader
            {...appHeaderProps}
            topInset={topInset}
          />
        )}
      </View>
    </View>
  )
}

interface VideoAnalysisAnimatedHeaderProps {
  appHeaderProps: AppHeaderProps
  initialOpacity: number
  targetOpacity: number
  hasInitializedRef: React.MutableRefObject<boolean>
  animationSpeed: 'quick' | 'lazy'
  currentHeaderVisible: boolean
}

/**
 * VideoAnalysisAnimatedHeader
 *
 * Wraps AppHeader with Reanimated opacity animation for VideoAnalysis mode.
 * Handles smooth fade in/out transitions based on visibility state.
 *
 * Behavior:
 * - Before initialization: Sets opacity immediately (no animation)
 * - After initialization: Animates opacity changes with duration based on animationSpeed
 * - Cancels in-progress animations when visibility changes
 *
 * PERF: Uses React.memo to prevent re-renders when props haven't changed.
 * This is critical for performance as Reanimated setup is expensive.
 */
const VideoAnalysisAnimatedHeader = React.memo(function VideoAnalysisAnimatedHeaderImpl({
  appHeaderProps,
  initialOpacity,
  targetOpacity,
  hasInitializedRef,
  animationSpeed,
  currentHeaderVisible,
}: VideoAnalysisAnimatedHeaderProps) {
  const opacityValue = useSharedValue(initialOpacity)
  const prevHeaderVisibleRef = useRef(currentHeaderVisible)
  const prevAnimationSpeedRef = useRef<'quick' | 'lazy'>(animationSpeed)

  /**
   * Register shared value with UI runtime
   * Empty listener ensures the shared value is tracked by Reanimated
   */
  useAnimatedReaction(
    () => opacityValue.value,
    () => {
      // Listener intentionally empty
    }
  )

  /**
   * Update opacity animation
   * - Before initialization: Set immediately without animation
   * - After initialization: Animate with duration based on animationSpeed
   * - Cancel in-progress animations when visibility changes
   */
  useEffect(() => {
    if (!hasInitializedRef.current) {
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
  }, [animationSpeed, currentHeaderVisible, hasInitializedRef, opacityValue, targetOpacity])

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: opacityValue.value,
  }))

  return (
    <Animated.View style={animatedStyle}>
      <AppHeader {...appHeaderProps} />
    </Animated.View>
  )
})

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
})

/**
 * NavigationAppHeader with React.memo - compares option values, not references
 *
 * React Navigation creates new options objects every render, so we need content-based comparison
 * to prevent unnecessary re-renders when option values haven't actually changed.
 *
 * Comparison strategy:
 * 1. Route identity (name, key)
 * 2. Back button presence
 * 3. Header shown state
 * 4. Custom nav options (headerVisible, isUserInteraction, isHistoryMode)
 * 5. Route params (analysisJobId, videoRecordingId)
 * 6. AppHeaderProps (content-based comparison via helper)
 * 7. Standard React Navigation options (title, tintColor, etc.)
 * 8. Header functions (by reference)
 * 9. Header style (backgroundColor comparison)
 *
 * Note: During tab navigation transitions, React Navigation may legitimately trigger 2-3 renders:
 * 1. Mount render when navigating to new tab (expected)
 * 2. Transition update as React Navigation updates options (expected)
 * 3. Final state after transition (may be minimized but not always avoidable)
 */
// WDYR: Track NavigationAppHeader re-renders to debug multiple renders
const NavigationAppHeaderImplWDYR = NavigationAppHeaderImpl
if (__DEV__) {
  ;(NavigationAppHeaderImplWDYR as any).whyDidYouRender = {
    logOnDifferentValues: true,
    trackHooks: true,
  }
}

export const NavigationAppHeader = React.memo(NavigationAppHeaderImplWDYR, (prev, next) => {
  // Quick identity check first - if exact same objects, no need for deep comparison
  if (prev === next) {
    return true
  }

  // Route identity
  if (prev.route.name !== next.route.name || prev.route.key !== next.route.key) {
    return false
  }

  // Back button
  if (Boolean(prev.back) !== Boolean(next.back)) {
    return false
  }

  // Header shown
  if (prev.options.headerShown !== next.options.headerShown) {
    return false
  }

  // Custom nav options
  const prevNavOptions = prev.options as unknown as NavAppHeaderOptions
  const nextNavOptions = next.options as unknown as NavAppHeaderOptions

  if (
    prevNavOptions.headerVisible !== nextNavOptions.headerVisible ||
    prevNavOptions.isUserInteraction !== nextNavOptions.isUserInteraction ||
    prevNavOptions.isHistoryMode !== nextNavOptions.isHistoryMode
  ) {
    return false
  }

  // Route params
  const prevParams = prev.route.params as Record<string, unknown> | undefined
  const nextParams = next.route.params as Record<string, unknown> | undefined
  if (
    prevParams?.analysisJobId !== nextParams?.analysisJobId ||
    prevParams?.videoRecordingId !== nextParams?.videoRecordingId
  ) {
    return false
  }

  // AppHeaderProps comparison
  if (!compareAppHeaderProps(prevNavOptions.appHeaderProps, nextNavOptions.appHeaderProps)) {
    return false
  }

  // Standard options
  if (
    prev.options.title !== next.options.title ||
    prev.options.headerTitleAlign !== next.options.headerTitleAlign ||
    prev.options.headerTintColor !== next.options.headerTintColor ||
    prev.options.headerTransparent !== next.options.headerTransparent
  ) {
    return false
  }

  // Header functions (by reference)
  if (
    prev.options.headerLeft !== next.options.headerLeft ||
    prev.options.headerRight !== next.options.headerRight ||
    prev.options.headerTitle !== next.options.headerTitle ||
    prev.options.headerBackTitle !== next.options.headerBackTitle
  ) {
    return false
  }

  // Header style (compare backgroundColor)
  const prevStyle = prev.options.headerStyle
  const nextStyle = next.options.headerStyle
  if (prevStyle !== nextStyle) {
    const prevBg =
      typeof prevStyle === 'object' && prevStyle && 'backgroundColor' in prevStyle
        ? prevStyle.backgroundColor
        : undefined
    const nextBg =
      typeof nextStyle === 'object' && nextStyle && 'backgroundColor' in nextStyle
        ? nextStyle.backgroundColor
        : undefined
    if (prevBg !== nextBg) {
      return false
    }
  }

  return true
})

// Enable why-did-you-render tracking for NavigationAppHeader
if (process.env.NODE_ENV === 'development') {
  NavigationAppHeader.whyDidYouRender = true
}
