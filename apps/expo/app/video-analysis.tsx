import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { log } from '@my/logging'
//import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { YStack } from 'tamagui'

/**
 * Video Analysis Route (Native)
 *
 * Supports two modes:
 * 1. Live analysis: /video-analysis?videoUri=...&videoRecordingId=...
 * 2. History mode: /video-analysis?analysisJobId=...
 *
 * Route: /video-analysis
 * Auth: Protected (requires authentication)
 */
export default function VideoAnalysis() {
  const router = useRouter()
  const navigation = useNavigation()
  const [controlsVisible, setControlsVisible] = useState(false)
  const { videoUri, videoRecordingId, analysisJobId } = useLocalSearchParams<{
    videoUri: string
    videoRecordingId?: string
    analysisJobId?: string
  }>()

  // Initialize isProcessing based on mode:
  // - History mode: false (data is prefetched, processing completes quickly)
  // - Analysis mode: true (live processing starts immediately)
  const isHistoryMode = !!analysisJobId
  const [isProcessing, setIsProcessing] = useState(() => {
    const initialProcessing = !isHistoryMode
    log.debug('VideoAnalysis', '🔍 [INIT] Initializing processing state', {
      isHistoryMode,
      analysisJobId,
      initialProcessing,
      reason: isHistoryMode ? 'History mode - data prefetched' : 'Analysis mode - live processing',
    })
    return initialProcessing
  })
  const [isUserInteraction, setIsUserInteraction] = useState(false)
  const userInteractionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Animation state tracking to prevent setOptions during animations
  const isAnimatingRef = useRef(false)
  const pendingOptionsRef = useRef<any>(null)
  const pendingOptionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track when we just applied queued options to prevent redundant effect execution
  const justAppliedQueuedOptionsRef = useRef(false)
  //const headerHeight = useHeaderHeight()

  const handleBack = () => {
    if (analysisJobId) {
      // History mode: use proper back navigation to return to previous screen
      router.back()
    } else {
      // Live mode: return to camera with reset
      router.replace({
        pathname: '/',
        params: { resetToIdle: 'true' },
      })
    }
  }

  const handleMenuPress = () => {
    // Handle menu press - could open a menu or settings
    log.info('VideoAnalysis', '🎛️ Menu pressed')
  }

  // Animation durations for header visibility transitions
  // Based on NavigationAppHeader animation configs:
  // - quick: 200ms Reanimated withTiming
  // - lazy: 400ms Reanimated withTiming
  // Using safe margins to ensure flag doesn't reset before animation completes
  const ANIMATION_TIMEOUTS = {
    quick: 300, // Quick animation (200ms) + 100ms margin
    lazy: 500, // Lazy animation (400ms) + 100ms margin
  } as const

  // Track when controls visibility changes are user-initiated vs automatic
  const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
    log.debug('VideoAnalysis', 'Controls visibility changed', {
      visible,
      isProcessing,
      previousControlsVisible: controlsVisible,
      isUserInteraction,
    })

    // Mark animation start for user interactions
    if (isUserInteraction) {
      isAnimatingRef.current = true

      // Clear any pending options timeout
      if (pendingOptionsTimeoutRef.current) {
        clearTimeout(pendingOptionsTimeoutRef.current)
        pendingOptionsTimeoutRef.current = null
      }

      // Apply header options immediately for user interactions to avoid React state/effect delay
      // This ensures header animation starts at the same time as video controls
      const headerShown = isProcessing || visible
      const options = {
        // @ts-ignore: custom appHeaderProps not in base type
        appHeaderProps: {
          mode: 'videoSettings',
          onBackPress: handleBack,
          onMenuPress: handleMenuPress,
        },
        headerShown: true, // Always keep header mounted, control visibility via opacity
        // @ts-ignore: custom isUserInteraction not in base type
        isUserInteraction: true,
        // @ts-ignore: custom headerVisible not in base type
        headerVisible: headerShown,
        // @ts-ignore: custom isHistoryMode not in base type
        isHistoryMode: !!analysisJobId,
      }

      log.debug('VideoAnalysis', 'Applying header options immediately (user interaction)', {
        controlsVisible: visible,
        isProcessing,
        headerShown,
        headerIsUserInteraction: true,
      })

      navigation.setOptions(options)
      pendingOptionsRef.current = options

      // Failsafe: reset animation flag after max animation duration if callback doesn't fire
      pendingOptionsTimeoutRef.current = setTimeout(() => {
        if (pendingOptionsRef.current) {
          log.debug('VideoAnalysis', 'Resetting animation flag (failsafe timeout)')
          // Reset flag and apply options with isUserInteraction=false for future updates
          isAnimatingRef.current = false
          navigation.setOptions({
            ...pendingOptionsRef.current,
            isUserInteraction: false,
          })
          pendingOptionsRef.current = null
        }
        pendingOptionsTimeoutRef.current = null
      }, ANIMATION_TIMEOUTS.quick + 100) // Add 100ms buffer
    }

    // Update state immediately (but setOptions will be deferred during animations)
    setIsUserInteraction(isUserInteraction)
    setControlsVisible(visible)

    // Reset user interaction flag after animation completes
    // Use quick timeout for user interactions, lazy for automatic changes
    if (isUserInteraction) {
      // Clear existing timeout to prevent duplicate resets during rapid interactions
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current)
        userInteractionTimeoutRef.current = null
      }

      userInteractionTimeoutRef.current = setTimeout(() => {
        log.debug('VideoAnalysis', 'Resetting user interaction flag after quick animation')

        // Mark animation complete BEFORE applying pending options
        isAnimatingRef.current = false

        // Apply any pending header options with isUserInteraction=false for future updates
        // The header already received isUserInteraction=true to start the quick animation
        if (pendingOptionsRef.current) {
          log.debug('VideoAnalysis', 'Applying pending header options with isUserInteraction reset')

          // Mark that we're applying queued options to skip redundant effect execution
          justAppliedQueuedOptionsRef.current = true

          navigation.setOptions({
            ...pendingOptionsRef.current,
            // Reset isUserInteraction to false for future updates (header animation already started)
            isUserInteraction: false,
          })
          pendingOptionsRef.current = null

          // Reset flag after microtask to allow effect to run normally for future updates
          setTimeout(() => {
            justAppliedQueuedOptionsRef.current = false
          }, 0)
        }

        // Update state after applying options
        // Effect will see this but skip execution due to justAppliedQueuedOptionsRef
        setIsUserInteraction(false)
        userInteractionTimeoutRef.current = null
      }, ANIMATION_TIMEOUTS.quick)
    }
  }

  // Set header props for Video Analysis mode
  useLayoutEffect(() => {
    // Skip if we just applied queued options with this exact state
    // This prevents redundant setOptions calls after animation completes
    if (justAppliedQueuedOptionsRef.current) {
      log.debug(
        'VideoAnalysis',
        'Skipping redundant setOptions - just applied queued options with updated state'
      )
      return
    }

    // Skip if animation is in progress - we already applied options immediately in handleControlsVisibilityChange
    // This prevents duplicate setOptions calls during the same interaction
    if (isAnimatingRef.current) {
      log.debug(
        'VideoAnalysis',
        'Skipping setOptions - animation in progress, already applied in callback'
      )
      return
    }

    // Determine if header visibility change is user-initiated:
    // - true if isUserInteraction is true (user tapped)
    // - false if only isProcessing changed (automatic)
    const headerIsUserInteraction = isUserInteraction
    const headerShown = isProcessing || controlsVisible

    log.debug('VideoAnalysis', 'Updating header options', {
      controlsVisible,
      isProcessing,
      isUserInteraction,
      headerIsUserInteraction,
      headerShown,
      reason: isProcessing ? 'processing' : controlsVisible ? 'controls' : 'hidden',
      willShowHeader: headerShown,
      willHideHeader: !headerShown,
    })

    const options = {
      // @ts-ignore: custom appHeaderProps not in base type
      appHeaderProps: {
        mode: 'videoSettings',
        onBackPress: handleBack,
        onMenuPress: handleMenuPress,
      },
      headerShown: true, // Always keep header mounted, control visibility via opacity
      // @ts-ignore: custom isUserInteraction not in base type
      isUserInteraction: headerIsUserInteraction,
      // @ts-ignore: custom headerVisible not in base type
      headerVisible: headerShown,
      // @ts-ignore: custom isHistoryMode not in base type
      isHistoryMode: !!analysisJobId,
    }

    // Apply options immediately - no animation tracking needed in effect
    // Animation tracking is handled in handleControlsVisibilityChange callback
    navigation.setOptions(options)
  }, [navigation, controlsVisible, isProcessing, isUserInteraction, analysisJobId])

  const handleProcessingChange = (processing: boolean) => {
    const headerShown = processing || controlsVisible
    log.debug('VideoAnalysis', 'Processing state changed', {
      isProcessing: processing,
      controlsVisible,
      isUserInteraction,
      headerShown,
      willShowHeader: headerShown,
      willHideHeader: !headerShown,
    })
    setIsProcessing(processing)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current)
        userInteractionTimeoutRef.current = null
      }
      if (pendingOptionsTimeoutRef.current) {
        clearTimeout(pendingOptionsTimeoutRef.current)
        pendingOptionsTimeoutRef.current = null
      }
    }
  }, [])

  return (
    <YStack
      flex={1}
      //paddingTop={headerHeight-60}
      backgroundColor="$background"
    >
      <VideoAnalysisScreen
        analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
        videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
        videoUri={videoUri} // Pass the video URI from navigation params
        onBack={handleBack}
        onControlsVisibilityChange={handleControlsVisibilityChange}
        onProcessingChange={handleProcessingChange}
      />
    </YStack>
  )
}
