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
  // Based on Tamagui animation configs:
  // - quick: ~200ms spring animation
  // - lazy: ~600ms spring animation
  // Using safe margins to ensure flag doesn't reset before animation completes
  const ANIMATION_TIMEOUTS = {
    quick: 400, // Quick animation + margin
    lazy: 800, // Lazy animation + margin
  } as const

  // Track when controls visibility changes are user-initiated vs automatic
  const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
    log.debug('VideoAnalysis', 'Controls visibility changed', {
      visible,
      isProcessing,
      previousControlsVisible: controlsVisible,
      isUserInteraction,
    })

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
        setIsUserInteraction(false)
        userInteractionTimeoutRef.current = null
      }, ANIMATION_TIMEOUTS.quick)
    }
  }

  // Set header props for Video Analysis mode
  useLayoutEffect(() => {
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

    navigation.setOptions({
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
    })
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
