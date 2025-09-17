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
  // DEBUG: Track component re-renders with logger (reduced logging for performance)
  const renderCountRef = useRef(0)
  renderCountRef.current++

  // Only log every 10th render to reduce performance impact
  if (renderCountRef.current % 10 === 1 && log && log.info) {
    log.info('[VideoAnalysisScreen] Component rendered', {
      renderCount: renderCountRef.current,
      analysisJobId,
      videoUri: videoUri ? 'provided' : 'fallback',
    })
  }

  // STEP 1: Ultra-minimalist version - just show video
  const [isProcessing, setIsProcessing] = useState(true)
  const videoControlsRef = useRef<VideoControlsRef>(null)

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pendingSeek, setPendingSeek] = useState<number | null>(null)

  // STEP 1: Use provided videoUri or fallback
  const recordedVideoUri =
    videoUri || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

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
      // Auto-start video playback when processing is complete
      setIsPlaying(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // Video control handlers
  const handlePlay = useCallback(() => {
    log.info('[VideoAnalysisScreen] handlePlay called')
    setIsPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    log.info('[VideoAnalysisScreen] handlePause called')
    setIsPlaying(false)
  }, [])

  const handleSeek = useCallback((time: number) => {
    log.info('[VideoAnalysisScreen] handleSeek called', { time })
    setPendingSeek(time)
  }, [])

  const handleVideoLoad = useCallback((data: { duration: number }) => {
    log.info('[VideoAnalysisScreen] handleVideoLoad called', { duration: data.duration })
    setDuration(data.duration)
  }, [])

  const handleVideoProgress = useCallback((data: { currentTime: number }) => {
    // Only update if not seeking to avoid conflicts
    setCurrentTime((prevTime) => {
      // Avoid unnecessary state updates if time hasn't changed significantly
      if (Math.abs(data.currentTime - prevTime) < 0.1) {
        return prevTime
      }
      return data.currentTime
    })
  }, [])

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
        <YStack
          flex={1}
          position="relative"
          onPress={handleVideoTap}
          testID="video-player-container"
        >
          {recordedVideoUri && (
            <VideoPlayer
              videoUri={recordedVideoUri}
              isPlaying={isPlaying}
              onPause={handlePause}
              onLoad={handleVideoLoad}
              onProgress={handleVideoProgress}
              seekToTime={pendingSeek}
              onSeekComplete={() => {
                // After native seek completes, align UI state and clear request
                if (pendingSeek !== null) {
                  setCurrentTime(pendingSeek)
                }
                setPendingSeek(null)
              }}
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
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            showControls={isProcessing || !isPlaying}
            isProcessing={isProcessing}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
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
      </VideoPlayerArea>
    </VideoContainer>
  )
}
