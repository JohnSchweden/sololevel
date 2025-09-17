import { useCallback, useEffect, useRef, useState } from 'react'
import { YStack } from 'tamagui'

// Logger for debugging
import { log } from '@my/ui'

// UI Components from @my/ui
import { AppHeader } from '@my/ui'
import {
  AudioFeedback,
  FeedbackBubbles,
  MotionCaptureOverlay,
  ProcessingOverlay,
  VideoContainer,
  VideoControls,
  VideoControlsRef,
  VideoPlayer,
  VideoPlayerArea,
} from '@ui/components/VideoAnalysis'

// Simplified version - comment out complex components for now
// import { BottomSheet, SocialIcons } from '@ui/components/VideoAnalysis'

// Real-time integration hooks - comment out for simplified version
// import { useVideoAnalysisRealtime } from '../../hooks/useAnalysisRealtime'
// import { useVideoAnalysisStore } from '../../stores/videoAnalysisStore'
// import { useAnalysisStatusStore } from '../../stores/analysisStatus'

// API services - comment out for simplified version
// import { useQuery } from '@tanstack/react-query'
// Mock API services for now - will be implemented in Phase 3
// const getAnalysisJob = (_id: number) => Promise.resolve(null)
// const getAnalysisResults = (_job: any) => null

// Error handling components - comment out for simplified version
// import { ConnectionErrorBanner } from '../../components/ConnectionErrorBanner'

// Simplified inline type definitions - will be added back as needed

export interface VideoAnalysisScreenProps {
  analysisJobId: number
  videoRecordingId?: number
  videoUri?: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onMenuPress?: () => void
}

export function VideoAnalysisScreen({
  analysisJobId,
  videoUri,
  // videoRecordingId and initialStatus are available but not used in current implementation
  onBack,
  onMenuPress,
}: VideoAnalysisScreenProps) {
  // DEBUG: Track component re-renders with logger
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())

  renderCountRef.current++
  const now = Date.now()
  const timeSinceLastRender = now - lastRenderTimeRef.current
  lastRenderTimeRef.current = now

  // Log component initialization and re-renders
  if (log && log.info) {
    log.info('[VideoAnalysisScreen] Component rendered', {
      renderCount: renderCountRef.current,
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      analysisJobId,
      videoUri,
    })
  }

  // DEBUG: Check all imported components
  if (log && log.info) {
    log.info('[VideoAnalysisScreen] Component type checks', {
      YStackType: typeof YStack,
      AppHeaderType: typeof AppHeader,
      ProcessingOverlayType: typeof ProcessingOverlay,
      VideoPlayerType: typeof VideoPlayer,
      YStackUndefined: YStack === undefined,
      AppHeaderUndefined: AppHeader === undefined,
      ProcessingOverlayUndefined: ProcessingOverlay === undefined,
      VideoPlayerUndefined: VideoPlayer === undefined,
    })
  }

  // STEP 1: Ultra-minimalist version - just show video
  const [isProcessing, setIsProcessing] = useState(true)
  const videoControlsRef = useRef<VideoControlsRef>(null)

  // STEP 1: Use provided videoUri or fallback
  const recordedVideoUri =
    videoUri || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  if (log && log.info) {
    log.info('[VideoAnalysisScreen] Using video URI', { recordedVideoUri })
  }

  // STEP 1: Simple processing simulation - complete after 3 seconds
  useEffect(() => {
    if (log && log.info) {
      log.info('[VideoAnalysisScreen] Starting processing simulation')
    }

    const timer = setTimeout(() => {
      if (log && log.info) {
        log.info('[VideoAnalysisScreen] Processing completed')
      }
      setIsProcessing(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // STEP 1: Simple event handlers

  const handleVideoTap = useCallback(() => {
    log.info('[VideoAnalysisScreen] handleVideoTap called')
    // For now, just log - controls will be added later
  }, [])

  // Handler for menu press from AppHeader - triggers fly-out menu in VideoControls
  const handleMenuPress = useCallback(() => {
    log.info('[VideoAnalysisScreen] handleMenuPress called')
    // First call the parent's onMenuPress callback if provided
    onMenuPress?.()
    // Then trigger the fly-out menu in VideoControls
    if (videoControlsRef.current) {
      videoControlsRef.current.triggerMenu()
    }
  }, [onMenuPress])

  return (
    <VideoContainer>
      <VideoPlayerArea>
        {isProcessing ? (
          <YStack
            flex={1}
            backgroundColor="$backgroundSubtle"
            justifyContent="center"
            alignItems="center"
          >
            <ProcessingOverlay
              progress={45}
              currentStep="Processing video analysis..."
              estimatedTime={30}
              onCancel={() => {
                log.info('[VideoAnalysisScreen] Processing cancelled')
                onBack?.()
              }}
              onViewResults={() => {
                log.info('[VideoAnalysisScreen] View results clicked')
                /* Analysis complete, already showing results */
              }}
              isComplete={false}
            />
          </YStack>
        ) : (
          <YStack
            flex={1}
            position="relative"
            onPress={handleVideoTap}
            testID="video-player-container"
          >
            {recordedVideoUri && (
              <VideoPlayer
                videoUri={recordedVideoUri}
                isPlaying={true}
              />
            )}

            {/* Overlay Components */}
            <MotionCaptureOverlay
              poseData={[]} // TODO: Connect to pose detection data
              isVisible={true}
            />

            <FeedbackBubbles
              messages={[]} // TODO: Connect to feedback messages
              onBubbleTap={(message) => {
                log.info('[VideoAnalysisScreen] Feedback bubble tapped', { message })
              }}
            />

            <AudioFeedback
              audioUrl={null} // TODO: Connect to audio feedback
              isPlaying={false}
              currentTime={0}
              duration={0}
              onPlayPause={() => {
                log.info('[VideoAnalysisScreen] Audio play/pause')
              }}
              onSeek={(time) => {
                log.info('[VideoAnalysisScreen] Audio seek', { time })
              }}
              onClose={() => {
                log.info('[VideoAnalysisScreen] Audio close')
              }}
              isVisible={false}
            />

            {/* Video Controls Overlay */}
            <VideoControls
              ref={videoControlsRef}
              isPlaying={true}
              currentTime={15}
              duration={60} // TODO: Connect to actual video duration
              showControls={true}
              onPlay={() => {
                log.info('[VideoAnalysisScreen] Video play')
              }}
              onPause={() => {
                log.info('[VideoAnalysisScreen] Video pause')
              }}
              onSeek={(time) => {
                log.info('[VideoAnalysisScreen] Video seek', { time })
              }}
              headerComponent={
                <AppHeader
                  title="Video Analysis"
                  mode="videoSettings"
                  onBackPress={onBack}
                  onMenuPress={handleMenuPress}
                />
              }
            />
          </YStack>
        )}
      </VideoPlayerArea>
    </VideoContainer>
  )
}
