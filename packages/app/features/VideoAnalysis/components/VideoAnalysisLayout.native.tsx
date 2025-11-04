import { log } from '@my/logging'
import { GlassBackground } from '@my/ui'
import { ProfilerWrapper } from '@ui/components/Performance'
import type { RefObject } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Dimensions } from 'react-native'
import type { ViewStyle } from 'react-native'
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'
import type { AnimatedRef, AnimatedStyle, SharedValue } from 'react-native-reanimated'
import { YStack } from 'tamagui'

import {
  type PersistentProgressBarProps,
  ProgressBar,
  type VideoControlsRef,
} from '@ui/components/VideoAnalysis'

import { useRenderDiagnostics } from '@app/hooks/useRenderDiagnostics'
import type { AnalysisPhase } from '../hooks/useAnalysisState'
import type { AudioControllerState } from '../hooks/useAudioController'
import type { FeedbackPanelItem } from '../types'
import { FeedbackSection } from './FeedbackSection'
import { ProcessingIndicator } from './ProcessingIndicator'
import { UploadErrorState } from './UploadErrorState'
import { VideoPlayerSection } from './VideoPlayerSection'
import { toggleControlsVisibilityOnTap } from './toggleControlsVisibility'

// Animation constants - Mode-based system
const { height: SCREEN_H } = Dimensions.get('window')

// Discrete video heights per mode (for contentContainerStyle)
const VIDEO_HEIGHTS = {
  max: SCREEN_H, // 100% - full screen
  normal: Math.round(SCREEN_H * 0.6), // 60% - default viewing
  min: Math.round(SCREEN_H * 0.33), // 33% - collapsed dock
} as const

// Mode transition scroll positions (for persistent progress bar positioning)
const MODE_SCROLL_POSITIONS = {
  max: 0,
  normal: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.normal, // 40% of screen
  min: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.min, // 67% of screen
} as const

/**
 * Props for VideoAnalysisLayout (Native)
 *
 * This component handles the native-specific render tree with gesture integration
 * and animated layout transitions. It receives all orchestrated state and handlers
 * from the parent VideoAnalysisScreen.
 */
export interface VideoAnalysisLayoutProps {
  // Gesture & Animation controllers
  gesture: {
    rootPan: GestureType
    feedbackScrollEnabled: boolean
    blockFeedbackScrollCompletely: boolean
    isPullingToRevealJS: boolean
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
    rootPanRef: RefObject<any>
  }
  animation: {
    scrollY: SharedValue<number>
    collapseProgress: SharedValue<number>
    headerStyle: AnimatedStyle<ViewStyle>
    feedbackSectionStyle: AnimatedStyle<ViewStyle>
    pullIndicatorStyle: AnimatedStyle<ViewStyle>
    scrollRef: AnimatedRef<Animated.ScrollView>
    feedbackContentOffsetY: SharedValue<number>
  }

  // Video state
  video: {
    uri: string
    posterUri?: string
    isReady: boolean
    isProcessing: boolean
  }

  // Playback state
  playback: {
    isPlaying: boolean
    videoEnded: boolean
    pendingSeek: number | null
    shouldPlayVideo: boolean
  }

  // Feedback state
  feedback: {
    items: FeedbackPanelItem[]
    panelFraction: number
    activeTab: 'feedback' | 'insights' | 'comments'
    selectedFeedbackId: string | null
    currentTime: number
    phase: AnalysisPhase
    progress: {
      upload: number
      analysis: number
      feedback: number
    }
    channelExhausted: boolean
  }

  // Audio URLs and errors - passed separately to prevent unnecessary VideoAnalysisLayout re-renders
  // VideoAnalysisLayout doesn't use these directly, only passes them to FeedbackSection
  feedbackAudioUrls: Record<string, string>
  feedbackErrors: Record<string, string>

  // Handlers
  handlers: {
    onPlay: () => void
    onPause: () => void
    onReplay: () => void
    onEnd: () => void
    onSeek: (time: number) => void
    onSeekComplete: (time: number | null) => void
    onVideoLoad: (data: { duration: number }) => void
    onSignificantProgress: (time: number) => void
    onFeedbackItemPress: (item: FeedbackPanelItem) => void
    onCollapsePanel: () => void
    onRetry: () => void
    onShare: () => void
    onLike: () => void
    onComment: () => void
    onBookmark: () => void
    onSelectAudio: (feedbackId: string) => void
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
    onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
    onExpand: () => void
    onRetryFeedback: (feedbackId: string) => void
    onDismissError: (feedbackId: string) => void
  }

  // Component refs
  videoControlsRef: RefObject<VideoControlsRef | null>

  // Display state
  controls: {
    showControls: boolean
    onControlsVisibilityChange: (visible: boolean, isUserInteraction?: boolean) => void
  }

  // Error state
  error: {
    visible: boolean
    message: string | null
    onRetry: () => void
    onBack: () => void
  }

  // Audio controller
  audioController: AudioControllerState

  // Bubble state
  bubbleState: {
    visible: boolean
    currentIndex: number | null
    items: FeedbackPanelItem[]
  }

  // Audio overlay
  audioOverlay: {
    shouldShow: boolean
    activeAudio: { id: string; url: string } | null
    onClose?: () => void
    onInactivity?: () => void
    onInteraction?: () => void
    audioDuration?: number
  }

  // Coach speaking state
  coachSpeaking: boolean

  // Social counts
  socialCounts: {
    likes: number
    comments: number
    bookmarks: number
    shares: number
  }

  // Video URI - passed directly instead of context to prevent memo bypass
  videoUri: string

  // Persistent progress bar props - lifted from local state to prevent memo bypass
  persistentProgressBarProps: PersistentProgressBarProps | null
  onPersistentProgressBarPropsChange: (props: PersistentProgressBarProps | null) => void
}

/**
 * Custom comparison function for VideoAnalysisLayout memo
 * Compares props to prevent unnecessary re-renders when parent re-renders
 */
// Track calls to arePropsEqual for diagnostics
// NOTE: Module-level refs can be reset by Fast Refresh/HMR in dev mode
// We use a global object to persist across hot reloads
// CRITICAL: Always read from global store, never cache in module-level refs
function getGlobalTracking() {
  const existing = (
    global as typeof globalThis & {
      __videoAnalysisLayoutTracking?: {
        arePropsEqualCallCount: number
        arePropsEqualReturnTrueCount: number
        lastReturnTrueTime?: number
        lastReturnTrueCallNumber?: number
      }
    }
  ).__videoAnalysisLayoutTracking

  if (existing) {
    // Backward compatibility: Add timing fields if they don't exist (from old global store)
    if (typeof existing.lastReturnTrueTime === 'undefined') {
      existing.lastReturnTrueTime = 0
    }
    if (typeof existing.lastReturnTrueCallNumber === 'undefined') {
      existing.lastReturnTrueCallNumber = 0
    }
    return existing as typeof existing & {
      lastReturnTrueTime: number
      lastReturnTrueCallNumber: number
    }
  }

  // Initialize if it doesn't exist
  const newStore = {
    arePropsEqualCallCount: 0,
    arePropsEqualReturnTrueCount: 0,
    lastReturnTrueTime: 0,
    lastReturnTrueCallNumber: 0,
  }
  ;(
    global as typeof globalThis & {
      __videoAnalysisLayoutTracking: typeof newStore
    }
  ).__videoAnalysisLayoutTracking = newStore
  return newStore
}

// Module-level refs that sync with global store on each access
// These are just for component-level tracking, actual counts come from global
const arePropsEqualCallCountRef = { current: 0 }
const arePropsEqualReturnTrueCountRef = { current: 0 }

function arePropsEqual(
  prevProps: VideoAnalysisLayoutProps,
  nextProps: VideoAnalysisLayoutProps
): boolean {
  // Always read from global store (persists across HMR)
  const globalTracking = getGlobalTracking()

  // Increment in global store directly
  globalTracking.arePropsEqualCallCount += 1
  const callNumber = globalTracking.arePropsEqualCallCount

  // Sync local ref for component-level tracking
  arePropsEqualCallCountRef.current = callNumber

  // Commented out verbose logging - only log when returning true or when props changed
  // if (__DEV__) {
  //   log.info('VideoAnalysisLayout.arePropsEqual', '🔍 Comparison called', {
  //     callNumber,
  //     globalStoreValue: globalTracking.arePropsEqualCallCount,
  //     returnTrueCount: globalTracking.arePropsEqualReturnTrueCount,
  //     globalStoreObject: globalTracking,
  //     globalStoreAddress: String(globalTracking),
  //     timestamp: Date.now(),
  //   })
  // }

  // Compare primitive values
  if (prevProps.coachSpeaking !== nextProps.coachSpeaking) {
    if (__DEV__) {
      log.debug('VideoAnalysisLayout.arePropsEqual', 'coachSpeaking changed', {
        callNumber,
        prev: prevProps.coachSpeaking,
        next: nextProps.coachSpeaking,
      })
    }
    return false
  }

  // Compare object references (should be stable if parent memoizes correctly)
  const changedProps: string[] = []
  if (prevProps.gesture !== nextProps.gesture) changedProps.push('gesture')
  if (prevProps.animation !== nextProps.animation) changedProps.push('animation')
  if (prevProps.video !== nextProps.video) changedProps.push('video')
  if (prevProps.playback !== nextProps.playback) changedProps.push('playback')
  if (prevProps.feedback !== nextProps.feedback) changedProps.push('feedback')
  if (prevProps.handlers !== nextProps.handlers) changedProps.push('handlers')
  if (prevProps.videoControlsRef !== nextProps.videoControlsRef)
    changedProps.push('videoControlsRef')
  if (prevProps.controls !== nextProps.controls) changedProps.push('controls')
  if (prevProps.error !== nextProps.error) changedProps.push('error')
  if (prevProps.audioController !== nextProps.audioController) changedProps.push('audioController')
  if (prevProps.bubbleState !== nextProps.bubbleState) changedProps.push('bubbleState')
  if (prevProps.audioOverlay !== nextProps.audioOverlay) changedProps.push('audioOverlay')
  if (prevProps.socialCounts !== nextProps.socialCounts) changedProps.push('socialCounts')
  if (prevProps.videoUri !== nextProps.videoUri) changedProps.push('videoUri')
  if (prevProps.feedbackAudioUrls !== nextProps.feedbackAudioUrls)
    changedProps.push('feedbackAudioUrls')
  if (prevProps.feedbackErrors !== nextProps.feedbackErrors) changedProps.push('feedbackErrors')
  if (prevProps.persistentProgressBarProps !== nextProps.persistentProgressBarProps)
    changedProps.push('persistentProgressBarProps')
  if (prevProps.onPersistentProgressBarPropsChange !== nextProps.onPersistentProgressBarPropsChange)
    changedProps.push('onPersistentProgressBarPropsChange')

  if (changedProps.length > 0) {
    // Commented out verbose logging - props changed is expected
    // if (__DEV__) {
    //   const globalStoreAtReturn = getGlobalTracking()
    //   log.debug('VideoAnalysisLayout.arePropsEqual', 'Props changed - allowing render', {
    //     callNumber,
    //     changedProps,
    //     globalStoreCallCount: globalStoreAtReturn.arePropsEqualCallCount,
    //     globalStoreReturnTrueCount: globalStoreAtReturn.arePropsEqualReturnTrueCount,
    //   })
    // }
    return false
  }

  // ⚠️ CRITICAL: All props are same reference - memo should prevent render
  // Always read from global store (persists across HMR)
  const globalTrackingForReturn = getGlobalTracking()

  // Increment in global store directly
  globalTrackingForReturn.arePropsEqualReturnTrueCount += 1

  // Sync local ref for component-level tracking
  arePropsEqualReturnTrueCountRef.current = globalTrackingForReturn.arePropsEqualReturnTrueCount

  // Track timing in global store to detect if props change between arePropsEqual and render
  const now = Date.now()
  const previousReturnTrueTime = globalTrackingForReturn.lastReturnTrueTime
  globalTrackingForReturn.lastReturnTrueTime = now
  globalTrackingForReturn.lastReturnTrueCallNumber = callNumber

  if (__DEV__) {
    log.warn(
      'VideoAnalysisLayout.arePropsEqual',
      '⚠️ RETURNING TRUE - props are equal, memo should prevent render',
      {
        callNumber,
        returnTrueCount: globalTrackingForReturn.arePropsEqualReturnTrueCount,
        // This log means arePropsEqual returned true, but component still rendered
        // This indicates React.memo is being bypassed somehow
        prevPropsKeys: Object.keys(prevProps),
        nextPropsKeys: Object.keys(nextProps),
        timestamp: now,
        timeSinceLastReturnTrue: previousReturnTrueTime > 0 ? now - previousReturnTrueTime : 0,
        // Verify timing is stored in global store
        storedLastReturnTrueTime: globalTrackingForReturn.lastReturnTrueTime,
        storedLastReturnTrueCallNumber: globalTrackingForReturn.lastReturnTrueCallNumber,
        globalStoreObject: globalTrackingForReturn,
      }
    )
  }

  return true
}

/**
 * VideoAnalysisLayout - Native Implementation
 *
 * Renders the native-specific layout with gesture handling and animated transitions.
 * This component is automatically selected by the bundler when Platform.OS !== 'web'.
 *
 * Features:
 * - YouTube-style gesture delegation (pull-to-reveal, swipe modes)
 * - Animated header collapse/expand
 * - Feedback panel with scroll integration
 * - Processing indicator overlay
 * - Error state handling
 *
 * Performance:
 * - Memoized with React.memo to prevent re-renders when props haven't changed
 * - Props are memoized at VideoAnalysisScreen level for stability
 * - Custom comparison function prevents re-renders when parent re-renders without prop changes
 *
 * @param props - All orchestrated state and handlers from VideoAnalysisScreen
 */
function VideoAnalysisLayoutComponent(props: VideoAnalysisLayoutProps) {
  // Destructure props for use
  const { feedbackAudioUrls, feedbackErrors } = props

  // Detailed prop diagnostics using useRenderDiagnostics
  useRenderDiagnostics('VideoAnalysisLayout', props as unknown as Record<string, unknown>, {
    logToConsole: __DEV__,
    logOnlyChanges: true,
  })

  // Debug: Track render count and prop changes
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef(props)
  const prevRenderCountRef = useRef(0)
  const prevArePropsEqualCallCountRef = useRef(0)
  const prevReturnTrueCountRef = useRef(0)

  renderCountRef.current += 1

  const lastRenderTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Calculate time since last render (for both first and subsequent renders)
    const now = Date.now()
    const timeSinceLastRender = renderCountRef.current > 1 ? now - lastRenderTimeRef.current : 0
    if (renderCountRef.current > 1) {
      lastRenderTimeRef.current = now

      // 🔍 DIAGNOSTIC: Check if arePropsEqual was called and what it returned
      // IMPORTANT: arePropsEqual is called DURING React's reconciliation phase, BEFORE this component renders
      // If arePropsEqual returns true, React should skip rendering (but StrictMode might still render)
      // If arePropsEqual returns false OR is not called, React will render this component
      //
      // We read the counts AFTER render (in useEffect), so:
      // - If arePropsEqual was called for this render, the count will be > prevCount
      // - If arePropsEqual was NOT called, the count will be == prevCount (memo was bypassed)

      // Always read from global store (persists across HMR)
      const globalTracking = getGlobalTracking()

      // Sync local refs with global store (for component-level tracking)
      arePropsEqualCallCountRef.current = globalTracking.arePropsEqualCallCount
      arePropsEqualReturnTrueCountRef.current = globalTracking.arePropsEqualReturnTrueCount

      const currentCallCount = globalTracking.arePropsEqualCallCount
      const currentReturnTrueCount = globalTracking.arePropsEqualReturnTrueCount

      // Compare with what we stored after the LAST render (component-level refs)
      const prevCallCount = prevArePropsEqualCallCountRef.current
      const prevReturnTrueCount = prevReturnTrueCountRef.current

      // Commented out verbose tracking logs - we have timing data now
      // if (__DEV__ && renderCountRef.current <= 3) {
      //   const globalStoreValue = globalTracking?.arePropsEqualCallCount ?? 'no global store'
      //   const globalStoreTrueValue = globalTracking?.arePropsEqualReturnTrueCount ?? 'no global store'
      //   log.debug('VideoAnalysisLayout', '🔍 Tracking refs raw values', {
      //     renderCount: renderCountRef.current,
      //     moduleRefCurrent: arePropsEqualCallCountRef.current,
      //     moduleRefTrueCount: arePropsEqualReturnTrueCountRef.current,
      //     componentRefCurrent: prevArePropsEqualCallCountRef.current,
      //     componentRefTrueCount: prevReturnTrueCountRef.current,
      //     globalStoreCallCount: globalStoreValue,
      //     globalStoreReturnTrueCount: globalStoreTrueValue,
      //     hasGlobalStore: !!globalTracking,
      //     moduleRefObject: arePropsEqualCallCountRef,
      //     componentRefObject: prevArePropsEqualCallCountRef,
      //   })
      // }

      // Detect if arePropsEqual was called during reconciliation for THIS render
      // If arePropsEqual was called, currentCallCount > prevCallCount
      const arePropsEqualWasCalled = currentCallCount > prevCallCount

      // Detect if arePropsEqual returned true during reconciliation for THIS render
      // If arePropsEqual returned true, currentReturnTrueCount > prevReturnTrueCount
      const arePropsEqualReturnedTrueBeforeThisRender = currentReturnTrueCount > prevReturnTrueCount

      if (__DEV__) {
        // 🔍 CRITICAL DIAGNOSTIC: If arePropsEqual returned true but we still rendered, memo is bypassed
        const memoBypassed = arePropsEqualReturnedTrueBeforeThisRender && renderCountRef.current > 1

        if (memoBypassed) {
          // Calculate time between arePropsEqual returning true and this render
          // Read from global store (persists across HMR)
          const globalTrackingForTiming = getGlobalTracking()
          const lastReturnTrueTime = globalTrackingForTiming.lastReturnTrueTime
          const lastReturnTrueCallNumber = globalTrackingForTiming.lastReturnTrueCallNumber
          const timeBetweenReturnTrueAndRender =
            lastReturnTrueTime > 0 ? now - lastReturnTrueTime : -1

          log.error(
            'VideoAnalysisLayout',
            '🚨 MEMO BYPASSED - arePropsEqual returned true but component still rendered!',
            {
              renderCount: renderCountRef.current,
              timeSinceLastRender,
              arePropsEqualWasCalled,
              arePropsEqualReturnedTrueBeforeThisRender,
              // Diagnostic values to verify tracking
              currentCallCount,
              prevCallCount,
              currentReturnTrueCount,
              prevReturnTrueCount,
              arePropsEqualCallCount: arePropsEqualCallCountRef.current,
              arePropsEqualReturnTrueCount: arePropsEqualReturnTrueCountRef.current,
              // Timing analysis to detect race conditions (from global store)
              lastReturnTrueCallNumber,
              lastReturnTrueTime,
              currentTime: now,
              timeBetweenReturnTrueAndRender,
              // Verify global store state
              globalStoreCallCount: globalTrackingForTiming.arePropsEqualCallCount,
              globalStoreReturnTrueCount: globalTrackingForTiming.arePropsEqualReturnTrueCount,
              globalStoreLastReturnTrueTime: globalTrackingForTiming.lastReturnTrueTime,
              globalStoreLastReturnTrueCallNumber: globalTrackingForTiming.lastReturnTrueCallNumber,
              globalStoreObject: globalTrackingForTiming,
              // Analysis of what triggered this render
              likelyCause: !arePropsEqualWasCalled
                ? 'Parent forced re-render (arePropsEqual not called)'
                : arePropsEqualReturnedTrueBeforeThisRender
                  ? timeBetweenReturnTrueAndRender > 0 && timeBetweenReturnTrueAndRender < 100
                    ? 'Possible race condition - props may have changed between arePropsEqual check and render'
                    : 'React.memo bypassed despite arePropsEqual returning true (React 19 concurrent mode?)'
                  : 'Unknown',
            }
          )
        } else if (!arePropsEqualWasCalled) {
          // ⚠️ CRITICAL: arePropsEqual was NOT called, meaning React.memo was bypassed
          // This happens when hooks inside the component trigger re-renders
          log.warn(
            'VideoAnalysisLayout',
            '⚠️ MEMO BYPASSED - arePropsEqual was NOT called, React re-rendered directly!',
            {
              renderCount: renderCountRef.current,
              timeSinceLastRender,
              arePropsEqualWasCalled: false,
              reason:
                'Hooks inside component likely triggered re-render (useState, useContext, store subscriptions, etc.)',
              // Diagnostic values to verify tracking
              currentCallCount,
              prevCallCount,
              currentReturnTrueCount,
              prevReturnTrueCount,
              arePropsEqualCallCount: arePropsEqualCallCountRef.current,
              arePropsEqualReturnTrueCount: arePropsEqualReturnTrueCountRef.current,
            }
          )
        } else {
          // Commented out verbose logging - only log critical memo bypass issues
          // log.debug('VideoAnalysisLayout', '🔍 Render occurred', {
          //   renderCount: renderCountRef.current,
          //   timeSinceLastRender,
          //   arePropsEqualWasCalled,
          //   arePropsEqualReturnedTrueBeforeThisRender,
          //   arePropsEqualCallCount: arePropsEqualCallCountRef.current,
          //   arePropsEqualReturnTrueCount: arePropsEqualReturnTrueCountRef.current,
          //   prevReturnTrueCount,
          // })
        }
      }

      // Update tracking refs AFTER logging
      // Store the current counts for next comparison
      // These will be compared in the NEXT render's useEffect
      prevArePropsEqualCallCountRef.current = currentCallCount
      prevReturnTrueCountRef.current = currentReturnTrueCount
      prevRenderCountRef.current = renderCountRef.current
    } else {
      // First render - initialize tracking refs
      // On first render, arePropsEqual is NOT called (only called for subsequent renders)
      // So we initialize with the current counts (which should be 0)
      prevArePropsEqualCallCountRef.current = arePropsEqualCallCountRef.current
      prevReturnTrueCountRef.current = arePropsEqualReturnTrueCountRef.current
      prevRenderCountRef.current = renderCountRef.current
      lastRenderTimeRef.current = now // Initialize time tracking
    }

    // Track prop changes (for both first and subsequent renders)
    if (renderCountRef.current > 1) {
      const prev = prevPropsRef.current
      const changed: string[] = []

      // Check ALL props to identify what's actually changing
      // Object references with value inspection
      if (prev.gesture !== props.gesture) {
        const gestureChanged =
          prev.gesture?.feedbackScrollEnabled !== props.gesture?.feedbackScrollEnabled ||
          prev.gesture?.blockFeedbackScrollCompletely !==
            props.gesture?.blockFeedbackScrollCompletely ||
          prev.gesture?.isPullingToRevealJS !== props.gesture?.isPullingToRevealJS
        if (gestureChanged) {
          changed.push(
            `gesture: values changed (scrollEnabled: ${prev.gesture?.feedbackScrollEnabled}→${props.gesture?.feedbackScrollEnabled}, blockScroll: ${prev.gesture?.blockFeedbackScrollCompletely}→${props.gesture?.blockFeedbackScrollCompletely})`
          )
        } else {
          changed.push('gesture (REF)')
        }
      }
      if (prev.animation !== props.animation) changed.push('animation (ref)')
      if (prev.video !== props.video) changed.push('video (ref)')
      if (prev.playback !== props.playback) {
        const playbackChanged =
          prev.playback?.isPlaying !== props.playback?.isPlaying ||
          prev.playback?.videoEnded !== props.playback?.videoEnded ||
          prev.playback?.pendingSeek !== props.playback?.pendingSeek ||
          prev.playback?.shouldPlayVideo !== props.playback?.shouldPlayVideo
        if (playbackChanged) {
          changed.push(
            `playback: values changed (isPlaying: ${prev.playback?.isPlaying}→${props.playback?.isPlaying}, pendingSeek: ${prev.playback?.pendingSeek}→${props.playback?.pendingSeek})`
          )
        } else {
          changed.push('playback (REF)')
        }
      }
      if (prev.feedback !== props.feedback) changed.push('feedback (ref)')
      if (prev.handlers !== props.handlers) changed.push('handlers (ref)')
      if (prev.videoControlsRef !== props.videoControlsRef) changed.push('videoControlsRef (ref)')
      if (prev.controls !== props.controls) {
        const controlsChanged = prev.controls?.showControls !== props.controls?.showControls
        if (controlsChanged) {
          changed.push(
            `controls: showControls changed (${prev.controls?.showControls}→${props.controls?.showControls})`
          )
        } else {
          changed.push('controls (REF)')
        }
      }
      if (prev.error !== props.error) changed.push('error (ref)')
      if (prev.audioController !== props.audioController) changed.push('audioController (ref)')
      if (prev.bubbleState !== props.bubbleState) changed.push('bubbleState (ref)')
      if (prev.audioOverlay !== props.audioOverlay) changed.push('audioOverlay (ref)')
      if (prev.coachSpeaking !== props.coachSpeaking) changed.push('coachSpeaking')
      if (prev.socialCounts !== props.socialCounts) changed.push('socialCounts (ref)')
      if (prev.feedbackAudioUrls !== props.feedbackAudioUrls)
        changed.push('feedbackAudioUrls (ref)')
      if (prev.feedbackErrors !== props.feedbackErrors) changed.push('feedbackErrors (ref)')

      // Check key props that change frequently (for detailed logging)
      if (prev.gesture?.feedbackScrollEnabled !== props.gesture?.feedbackScrollEnabled)
        changed.push('gesture.feedbackScrollEnabled')
      if (
        prev.gesture?.blockFeedbackScrollCompletely !== props.gesture?.blockFeedbackScrollCompletely
      )
        changed.push('gesture.blockFeedbackScrollCompletely')
      if (prev.gesture?.isPullingToRevealJS !== props.gesture?.isPullingToRevealJS)
        changed.push('gesture.isPullingToRevealJS')
      if (prev.feedback?.selectedFeedbackId !== props.feedback?.selectedFeedbackId)
        changed.push('feedback.selectedFeedbackId')
      if (prev.playback?.isPlaying !== props.playback?.isPlaying) changed.push('playback.isPlaying')
      if (prev.controls?.showControls !== props.controls?.showControls)
        changed.push('controls.showControls')

      // Deep comparison for nested objects
      if (prev.bubbleState && props.bubbleState) {
        if (prev.bubbleState.visible !== props.bubbleState.visible)
          changed.push('bubbleState.visible')
        if (prev.bubbleState.currentIndex !== props.bubbleState.currentIndex)
          changed.push('bubbleState.currentIndex')
        if (prev.bubbleState.items !== props.bubbleState.items) changed.push('bubbleState.items')
      }
      if (prev.audioOverlay && props.audioOverlay) {
        if (prev.audioOverlay.shouldShow !== props.audioOverlay.shouldShow)
          changed.push('audioOverlay.shouldShow')
        if (prev.audioOverlay.activeAudio !== props.audioOverlay.activeAudio) {
          changed.push('audioOverlay.activeAudio')
          log.debug('VideoAnalysisLayout', '🔍 audioOverlay.activeAudio changed', {
            prevId: prev.audioOverlay.activeAudio?.id ?? 'null',
            newId: props.audioOverlay.activeAudio?.id ?? 'null',
            prevRef: prev.audioOverlay.activeAudio ? 'exists' : 'null',
            newRef: props.audioOverlay.activeAudio ? 'exists' : 'null',
            sameObject: prev.audioOverlay.activeAudio === props.audioOverlay.activeAudio,
          })
        }
      } else if (prev.audioOverlay !== props.audioOverlay) {
        // One is null/undefined
        changed.push('audioOverlay (null check)')
        log.debug('VideoAnalysisLayout', '🔍 audioOverlay null/undefined changed', {
          prevExists: !!prev.audioOverlay,
          newExists: !!props.audioOverlay,
        })
      }

      if (changed.length > 0) {
        log.debug('VideoAnalysisLayout', '🔍 Props changed', {
          renderCount: renderCountRef.current,
          changedProps: changed,
          timeSinceLastRender,
          gestureFeedbackScrollEnabled: props.gesture?.feedbackScrollEnabled,
          gestureBlockFeedbackScrollCompletely: props.gesture?.blockFeedbackScrollCompletely,
        })
      } else {
        // Commented out verbose logging - we have better tracking now:
        // 1. Parent props tracking (VideoAnalysisScreen) shows which props changed
        // 2. Orchestrator tracking shows when controls object is recreated
        // 3. Critical "MEMO BYPASSED" error logs show the race condition
        // This log was redundant and added noise without actionable info
        // log.warn('VideoAnalysisLayout', '⚠️ Re-rendered WITHOUT tracked prop changes', {
        //   renderCount: renderCountRef.current,
        //   renderCountDiff: renderCountRef.current - prevRenderCountRef.current,
        //   timeSinceLastRender,
        //   isRapid: timeSinceLastRender < 16,
        //   propRefs: {
        //     gesture: prev.gesture === props.gesture ? 'same' : 'changed',
        //     animation: prev.animation === props.animation ? 'same' : 'changed',
        //     video: prev.video === props.video ? 'same' : 'changed',
        //     playback: prev.playback === props.playback ? 'same' : 'changed',
        //     feedback: prev.feedback === props.feedback ? 'same' : 'changed',
        //     handlers: prev.handlers === props.handlers ? 'same' : 'changed',
        //     controls: prev.controls === props.controls ? 'same' : 'changed',
        //     audioOverlay: prev.audioOverlay === props.audioOverlay ? 'same' : 'changed',
        //     bubbleState: prev.bubbleState === props.bubbleState ? 'same' : 'changed',
        //     audioController: prev.audioController === props.audioController ? 'same' : 'changed',
        //     videoUri: prev.videoUri === props.videoUri ? 'same' : 'changed',
        //     coachSpeaking: prev.coachSpeaking === props.coachSpeaking ? 'same' : 'changed',
        //     socialCounts: prev.socialCounts === props.socialCounts ? 'same' : 'changed',
        //   },
        //   stackTrace:
        //     timeSinceLastRender < 16
        //       ? new Error().stack?.split('\n').slice(1, 10).join('\n')
        //       : undefined,
        // })
      }
      prevPropsRef.current = props
      prevRenderCountRef.current = renderCountRef.current
    }
  })

  const {
    gesture,
    animation,
    video,
    playback,
    feedback,
    handlers,
    videoControlsRef,
    controls,
    error,
    audioController,
    bubbleState,
    audioOverlay,
    coachSpeaking,
    socialCounts,
    videoUri,
  } = props

  // Persistent progress bar props - now passed as props from parent (lifted state)
  const { persistentProgressBarProps, onPersistentProgressBarPropsChange } = props

  // Toggle controls visibility on tap; guard with latest visibility state
  const handleTap = useCallback(() => {
    toggleControlsVisibilityOnTap(controls.showControls, controls.onControlsVisibilityChange)
  }, [controls])

  // Memoize social action handlers to prevent VideoPlayerSection re-renders
  const socialActionHandlers = useMemo(
    () => ({
      onShare: handlers.onShare,
      onLike: handlers.onLike,
      onComment: handlers.onComment,
      onBookmark: handlers.onBookmark,
    }),
    [handlers.onShare, handlers.onLike, handlers.onComment, handlers.onBookmark]
  )

  // Memoize inline calculations to prevent VideoPlayerSection re-renders
  const computedShowControls = useMemo(
    () => video.isReady && controls.showControls,
    [video.isReady, controls.showControls]
  )

  const computedVideoAreaScale = useMemo(() => 1 - feedback.panelFraction, [feedback.panelFraction])

  // Animated style for persistent progress bar positioning
  // Positions it at the bottom of the video header (top = headerHeight)
  const persistentProgressBarPositionStyle = useAnimatedStyle(() => {
    const scrollValue = animation.scrollY.value

    // Calculate headerHeight from scrollY (same logic as useAnimationController)
    let headerHeight: number
    if (scrollValue < 0) {
      // Pull-to-reveal: expand beyond max
      const pullDistance = Math.abs(scrollValue)
      const easedPull = interpolate(pullDistance, [0, 200], [0, 200 * 1.4], Extrapolation.CLAMP)
      headerHeight = VIDEO_HEIGHTS.max + easedPull
    } else if (scrollValue <= MODE_SCROLL_POSITIONS.normal) {
      // Phase 1: Max → Normal
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.max, MODE_SCROLL_POSITIONS.normal],
        [VIDEO_HEIGHTS.max, VIDEO_HEIGHTS.normal],
        Extrapolation.CLAMP
      )
    } else {
      // Phase 2: Normal → Min
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.normal, MODE_SCROLL_POSITIONS.min],
        [VIDEO_HEIGHTS.normal, VIDEO_HEIGHTS.min],
        Extrapolation.CLAMP
      )
    }

    return {
      top: headerHeight,
    }
  }, [animation.scrollY])

  // Performance tracking: Track header collapse animations
  // Reanimated animations are harder to track directly, so we track:
  // - Frame drops during animations (only when gesture is blocking scroll)
  // - Render performance
  // Note: Can't read SharedValue.value during render, so we use gesture state instead
  // When feedbackScrollEnabled is false, that indicates a gesture is active and animations are happening

  return (
    <ProfilerWrapper
      id="VideoAnalysisLayout"
      logToConsole={__DEV__}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlassBackground
          flex={1}
          backgroundColor="$color3"
          testID="video-analysis-screen"
        >
          <UploadErrorState
            visible={error.visible}
            errorMessage={error.message}
            onRetry={error.onRetry}
            onBack={error.onBack}
          />

          {!error.visible && (
            <GestureDetector gesture={gesture.rootPan}>
              <YStack flex={1}>
                {/* Collapsible header (video) */}
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 2,
                      overflow: 'hidden',
                    },
                    animation.headerStyle,
                  ]}
                  testID="video-analysis-collapsible-header"
                >
                  <VideoPlayerSection
                    videoUri={videoUri}
                    videoControlsRef={videoControlsRef}
                    pendingSeek={playback.pendingSeek}
                    userIsPlaying={playback.isPlaying}
                    videoShouldPlay={playback.shouldPlayVideo}
                    videoEnded={playback.videoEnded}
                    showControls={computedShowControls}
                    isProcessing={video.isProcessing}
                    videoAreaScale={computedVideoAreaScale}
                    posterUri={video.posterUri}
                    onPlay={handlers.onPlay}
                    onPause={handlers.onPause}
                    onReplay={handlers.onReplay}
                    onSeek={handlers.onSeek}
                    onSeekComplete={handlers.onSeekComplete}
                    onSignificantProgress={handlers.onSignificantProgress}
                    onLoad={handlers.onVideoLoad}
                    onEnd={handlers.onEnd}
                    onTap={handleTap}
                    onControlsVisibilityChange={controls.onControlsVisibilityChange}
                    audioPlayerController={audioController}
                    bubbleState={bubbleState}
                    audioOverlay={audioOverlay}
                    coachSpeaking={coachSpeaking}
                    panelFraction={feedback.panelFraction}
                    socialCounts={socialCounts}
                    onSocialAction={socialActionHandlers}
                    collapseProgress={animation.collapseProgress}
                    onPersistentProgressBarPropsChange={onPersistentProgressBarPropsChange}
                  />
                </Animated.View>

                {/* Pull-to-reveal indicator */}
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: VIDEO_HEIGHTS.normal - 40, // Show indicator at normal video height
                      left: 0,
                      right: 0,
                      zIndex: 3,
                      alignItems: 'center',
                      pointerEvents: 'none',
                    },
                    animation.pullIndicatorStyle,
                  ]}
                  testID="pull-to-reveal-indicator"
                >
                  {/* Indicator content commented out in original - keeping same */}
                </Animated.View>

                {/* Persistent Progress Bar - Positioned at bottom of video header */}
                {persistentProgressBarProps && (
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        pointerEvents: 'box-none',
                      },
                      persistentProgressBarPositionStyle,
                    ]}
                    testID="persistent-progress-bar-container"
                  >
                    <ProgressBar
                      variant="persistent"
                      progress={persistentProgressBarProps.progress}
                      isScrubbing={persistentProgressBarProps.isScrubbing}
                      controlsVisible={persistentProgressBarProps.controlsVisible}
                      progressBarWidth={persistentProgressBarProps.progressBarWidth}
                      animatedStyle={persistentProgressBarProps.animatedStyle}
                      combinedGesture={persistentProgressBarProps.combinedGesture}
                      mainGesture={persistentProgressBarProps.mainGesture}
                      onLayout={persistentProgressBarProps.onLayout}
                      onFallbackPress={persistentProgressBarProps.onFallbackPress}
                      testID="persistent-progress-bar"
                    />
                  </Animated.View>
                )}

                {/* Single scroll source with content starting below header */}
                <Animated.ScrollView
                  ref={animation.scrollRef}
                  scrollEnabled={false}
                  pointerEvents="none"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingTop: VIDEO_HEIGHTS.max, // Start content below full video (100%)
                    paddingBottom: 0,
                  }}
                  testID="video-analysis-scroll-container"
                />

                {/* Processing Indicator - positioned absolutely to overlay above video section */}
                <ProcessingIndicator
                  phase={
                    video.isReady && feedback.phase === 'generating-feedback'
                      ? ('ready' as AnalysisPhase)
                      : video.isReady
                        ? feedback.phase
                        : 'analyzing'
                  }
                  progress={feedback.progress}
                  channelExhausted={feedback.channelExhausted}
                />

                {/* Feedback positioned absolutely below video header - tracks exact height */}
                {/* OPTIMIZED: feedbackSectionStyle now includes merged transform */}
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 1,
                    },
                    animation.feedbackSectionStyle,
                  ]}
                  testID="feedback-section-container"
                >
                  <FeedbackSection
                    panelFraction={feedback.panelFraction}
                    activeTab={feedback.activeTab}
                    feedbackItems={feedback.items}
                    selectedFeedbackId={feedback.selectedFeedbackId}
                    currentVideoTime={feedback.currentTime}
                    videoDuration={0}
                    errors={feedbackErrors}
                    audioUrls={feedbackAudioUrls}
                    onTabChange={handlers.onTabChange}
                    onExpand={handlers.onExpand}
                    onCollapse={handlers.onCollapsePanel}
                    onItemPress={handlers.onFeedbackItemPress}
                    onSeek={handlers.onSeek}
                    onRetryFeedback={handlers.onRetryFeedback}
                    onDismissError={handlers.onDismissError}
                    onSelectAudio={handlers.onSelectAudio}
                    onScrollYChange={handlers.onFeedbackScrollY}
                    onScrollEndDrag={handlers.onFeedbackMomentumScrollEnd}
                    scrollEnabled={
                      gesture.feedbackScrollEnabled && !gesture.blockFeedbackScrollCompletely
                    }
                    rootPanRef={gesture.rootPanRef}
                  />
                </Animated.View>
              </YStack>
            </GestureDetector>
          )}
        </GlassBackground>
      </GestureHandlerRootView>
    </ProfilerWrapper>
  )
}

// Wrap with memo
export const VideoAnalysisLayout = memo(VideoAnalysisLayoutComponent, arePropsEqual)
