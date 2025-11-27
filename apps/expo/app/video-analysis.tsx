import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import {
  usePersistentProgressStore,
  useVideoPlayerStore,
} from '@my/app/features/VideoAnalysis/stores'
import { useAnalysisJobStatus } from '@my/app/features/VideoAnalysis/stores/analysisStatus'
import { useFeedbackAudioStore } from '@my/app/features/VideoAnalysis/stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '@my/app/features/VideoAnalysis/stores/feedbackCoordinatorStore'
import { log } from '@my/logging'
// import { GlassBackground, StateDisplay } from '@my/ui'
//import { useHeaderHeight } from '@react-navigation/elements'
import { useFocusEffect } from '@react-navigation/native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
// import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { YStack } from 'tamagui'

// Lazy load VideoAnalysisScreen - heaviest screen with video player
// This defers loading VideoAnalysisScreen code until route is accessed
// const LazyVideoAnalysisScreen = React.lazy(() =>
//   import('@my/app/features/VideoAnalysis/VideoAnalysisScreen').then((module) => ({
//     default: module.VideoAnalysisScreen,
//   }))
// )

/**
 * Loading fallback for lazy-loaded Video Analysis screen
 */
// function VideoAnalysisLoadingFallback() {
//   return (
//     <GlassBackground
//       backgroundColor="$color3"
//       testID="video-analysis-loading-fallback"
//     >
//       <StateDisplay
//         type="loading"
//         title="Loading..."
//         testID="video-analysis-loading-state"
//       />
//     </GlassBackground>
//   )
// }

const resetPlaybackStores = ({
  reason,
  analysisJobId,
}: {
  reason: string
  analysisJobId?: string
}) => {
  log.debug('VideoAnalysisRoute', '🧹 Resetting playback stores', { reason, analysisJobId })
  useFeedbackCoordinatorStore.getState().reset()
  useVideoPlayerStore.getState().reset()
  useFeedbackAudioStore.getState().reset()
  usePersistentProgressStore.getState().reset()
}

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

  // Get processing state from store instead of local state
  const jobStatus = useAnalysisJobStatus(analysisJobId ? Number.parseInt(analysisJobId, 10) : 0)
  const isProcessing = analysisJobId ? jobStatus.isProcessing : true

  // Reset feedback coordinator store synchronously before rendering VideoAnalysisScreen
  // This ensures clean state for each video analysis session
  const [isUserInteraction, setIsUserInteraction] = useState(false)
  const userInteractionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Animation state tracking to prevent setOptions during animations
  const isAnimatingRef = useRef(false)

  // Track which analysisJobId we've reset for to avoid duplicate resets
  const lastResetAnalysisIdRef = useRef<string | undefined>(undefined)

  // Reset feedback coordinator store synchronously if we haven't for this analysis
  if (lastResetAnalysisIdRef.current !== analysisJobId) {
    log.debug('VideoAnalysis', '🔄 Initialising playback stores for new video analysis', {
      analysisJobId,
      lastReset: lastResetAnalysisIdRef.current,
    })
    resetPlaybackStores({ reason: 'analysis-change', analysisJobId })
    lastResetAnalysisIdRef.current = analysisJobId
  }
  const pendingOptionsRef = useRef<any>(null)
  const pendingOptionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  //const headerHeight = useHeaderHeight()

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetPlaybackStores({ reason: 'focus-cleanup', analysisJobId })
      }
    }, [analysisJobId])
  )

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      resetPlaybackStores({ reason: 'before-remove', analysisJobId })
    })

    return unsubscribe
  }, [analysisJobId, navigation])

  const handleBack = useCallback(() => {
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
  }, [analysisJobId, router])

  const handleMenuPress = useCallback(() => {
    // Handle menu press - could open a menu or settings
    log.info('VideoAnalysis', '🎛️ Menu pressed')
  }, [])

  // Animation durations for header visibility transitions
  // Based on NavigationAppHeader animation configs:
  // - quick: 200ms Reanimated withTiming
  // - lazy: 400ms Reanimated withTiming
  // Using safe margins to ensure flag doesn't reset before animation completes
  const ANIMATION_TIMEOUTS = {
    quick: 300, // Quick animation (200ms) + 100ms margin
    lazy: 500, // Lazy animation (400ms) + 100ms margin
  } as const

  // Use refs for state values that are only used for logging to prevent callback recreation
  const controlsVisibleRef = useRef(controlsVisible)
  const isUserInteractionRef = useRef(isUserInteraction)

  // Update refs in effect to avoid blocking re-renders (video progress updates every 250ms)
  useEffect(() => {
    controlsVisibleRef.current = controlsVisible
    isUserInteractionRef.current = isUserInteraction
  }, [controlsVisible, isUserInteraction])

  // Track when controls visibility changes are user-initiated vs automatic
  // Memoize to prevent VideoAnalysisScreen re-renders when route component re-renders
  const handleControlsVisibilityChange = useCallback(
    (visible: boolean, isUserInteraction = false) => {
      const prevVisible = controlsVisibleRef.current
      const prevIsUserInteraction = isUserInteractionRef.current

      if (prevVisible === visible && prevIsUserInteraction === isUserInteraction) {
        return
      }

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
        const headerOptions = {
          // @ts-ignore: custom appHeaderProps not in base type
          appHeaderProps: {
            mode: 'videoSettings',
            onBackPress: handleBack,
            onMenuPress: handleMenuPress,
            disableBlur: true,
          },
          headerShown: true, // Always keep header mounted, control visibility via opacity
          // @ts-ignore: custom isUserInteraction not in base type
          isUserInteraction: true,
          // @ts-ignore: custom headerVisible not in base type
          headerVisible: headerShown,
          // @ts-ignore: custom isHistoryMode not in base type
          isHistoryMode: !!analysisJobId,
        }

        const previousOptions = pendingOptionsRef.current
        const headerOptionsChanged =
          !previousOptions ||
          previousOptions.headerVisible !== headerOptions.headerVisible ||
          previousOptions.isUserInteraction !== headerOptions.isUserInteraction

        if (headerOptionsChanged) {
          navigation.setOptions(headerOptions)
          pendingOptionsRef.current = headerOptions
        }

        // Failsafe: reset animation flag after max animation duration if callback doesn't fire
        pendingOptionsTimeoutRef.current = setTimeout(() => {
          if (pendingOptionsRef.current) {
            log.debug('VideoAnalysis', 'Resetting animation flag (failsafe timeout)')
            // Reset flag only - header manages isUserInteraction internally
            isAnimatingRef.current = false
            pendingOptionsRef.current = null
          }
          pendingOptionsTimeoutRef.current = null
        }, ANIMATION_TIMEOUTS.quick + 100) // Add 100ms buffer
      }

      // Update state immediately (but setOptions will be deferred during animations)
      controlsVisibleRef.current = visible
      isUserInteractionRef.current = isUserInteraction

      if (prevVisible !== visible) {
        if (__DEV__) {
          log.debug('VideoAnalysisRoute', '🔍 WDYR: controlsVisible state changed', {
            prevVisible,
            newVisible: visible,
            isUserInteraction,
            willCauseRerender: true, // This state change will cause route component re-render
          })
        }
        setControlsVisible(visible)
      }

      if (prevIsUserInteraction !== isUserInteraction) {
        setIsUserInteraction(isUserInteraction)
      }

      // Reset user interaction flag after animation completes
      // Let header component manage isUserInteraction internally instead of sending second setOptions
      if (isUserInteraction) {
        // Clear existing timeout to prevent duplicate resets during rapid interactions
        if (userInteractionTimeoutRef.current) {
          clearTimeout(userInteractionTimeoutRef.current)
          userInteractionTimeoutRef.current = null
        }

        userInteractionTimeoutRef.current = setTimeout(() => {
          // Mark animation complete
          isAnimatingRef.current = false

          // Clear pending options - no second setOptions call needed
          pendingOptionsRef.current = null

          // Update local state only - header manages its own isUserInteraction reset
          isUserInteractionRef.current = false
          setIsUserInteraction(false)
          userInteractionTimeoutRef.current = null
        }, ANIMATION_TIMEOUTS.quick)
      }
    },
    [isProcessing, analysisJobId, navigation, handleBack, handleMenuPress, ANIMATION_TIMEOUTS.quick]
  )

  // Set header props for Video Analysis mode
  useLayoutEffect(() => {
    // Skip if animation is in progress - we already applied options immediately in handleControlsVisibilityChange
    // This prevents duplicate setOptions calls during the same interaction
    if (isAnimatingRef.current) {
      return
    }

    // Determine if header visibility change is user-initiated:
    // - true if isUserInteraction is true (user tapped)
    // - false if only isProcessing changed (automatic)
    const headerIsUserInteraction = isUserInteraction
    const headerShown = isProcessing || controlsVisible

    const options = {
      // @ts-ignore: custom appHeaderProps not in base type
      appHeaderProps: {
        mode: 'videoSettings',
        onBackPress: handleBack,
        onMenuPress: handleMenuPress,
        disableBlur: true,
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
  }, [
    navigation,
    controlsVisible,
    isProcessing,
    isUserInteraction,
    analysisJobId,
    handleBack,
    handleMenuPress,
  ])

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
      {/* <Suspense fallback={<VideoAnalysisLoadingFallback />}> */}
      <VideoAnalysisScreen
        analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
        videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
        videoUri={videoUri} // Pass the video URI from navigation params
        onBack={handleBack}
        onControlsVisibilityChange={handleControlsVisibilityChange}
      />
      {/* </Suspense> */}
    </YStack>
  )
}
