import { useCallback, useEffect, useRef, useState } from 'react'
import { YStack } from 'tamagui'

// Logger for debugging
import { log } from '@my/ui'

// UI Components from @my/ui
import { AppHeader } from '@my/ui'
import {
  AudioFeedback,
  CoachAvatar,
  FeedbackBubbles,
  MotionCaptureOverlay,
  VideoContainer,
  VideoControls,
  VideoControlsRef,
  VideoPlayer,
  VideoPlayerArea,
} from '@ui/components/VideoAnalysis'

// Types from VideoAnalysis components
import type { FeedbackMessage } from '@ui/components/VideoAnalysis/types'

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

  // Coach avatar state
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false)

  // Feedback messages state
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([
    {
      id: '1',
      timestamp: 2000, // 2 seconds into video
      text: 'Great posture! Keep your shoulders relaxed.',
      type: 'positive',
      category: 'posture',
      position: { x: 0.2, y: 0.3 },
      isHighlighted: false,
      isActive: true,
    },
    {
      id: '2',
      timestamp: 5000, // 5 seconds into video
      text: 'Try speaking with more confidence.',
      type: 'suggestion',
      category: 'voice',
      position: { x: 0.7, y: 0.4 },
      isHighlighted: false,
      isActive: true,
    },
    {
      id: '3',
      timestamp: 8000, // 8 seconds into video
      text: 'Your hand gestures are too stiff.',
      type: 'correction',
      category: 'movement',
      position: { x: 0.5, y: 0.6 },
      isHighlighted: false,
      isActive: true,
    },
  ])

  // Sequential bubble display state
  const [currentBubbleIndex, setCurrentBubbleIndex] = useState<number | null>(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBubbleShowTimeRef = useRef<number>(0)

  // Initial logging
  useEffect(() => {
    log.info('[VideoAnalysisScreen] Component mounted', {
      analysisJobId,
      videoUri,
      feedbackMessagesCount: feedbackMessages.length,
      feedbackMessages: feedbackMessages.map((msg, idx) => ({
        index: idx,
        id: msg.id,
        timestamp: msg.timestamp,
        timestampSeconds: msg.timestamp / 1000,
        text: msg.text.substring(0, 30) + '...',
        type: msg.type,
        category: msg.category,
      })),
    })
  }, [analysisJobId, videoUri, feedbackMessages])

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

  // Cleanup bubble timer when component unmounts
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
      }
    }
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

  const handleSeek = useCallback(
    (time: number) => {
      log.info('[VideoAnalysisScreen] handleSeek called', {
        seekTime: time,
        currentTime,
        isPlaying,
        pendingSeek,
      })
      setPendingSeek(time)
    },
    [currentTime, isPlaying, pendingSeek]
  )

  const handleVideoLoad = useCallback((data: { duration: number }) => {
    log.info('[VideoAnalysisScreen] handleVideoLoad called', { duration: data.duration })
    setDuration(data.duration)
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

  // Sequential bubble display functions
  const showBubble = useCallback(
    (index: number) => {
      log.info('[VideoAnalysisScreen] showBubble called', {
        bubbleIndex: index,
        currentBubbleIndex,
        bubbleVisible,
        isPlaying,
      })

      // Clear any existing timer
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
      }

      setCurrentBubbleIndex(index)
      setBubbleVisible(true)
      lastBubbleShowTimeRef.current = Date.now() // Track when bubble was shown

      // Make coach speak when bubble appears
      setIsCoachSpeaking(true)

      // Hide bubble after 2 seconds
      bubbleTimerRef.current = setTimeout(() => {
        log.info('[VideoAnalysisScreen] Auto-hiding bubble after 2 seconds', { bubbleIndex: index })
        hideBubble()
      }, 2000)

      log.info('[VideoAnalysisScreen] Bubble shown successfully', {
        bubbleIndex: index,
        messageId: feedbackMessages[index]?.id,
        messageText: feedbackMessages[index]?.text.substring(0, 30) + '...',
        timestamp: Date.now(),
        autoHideIn: 2000,
      })
    },
    [currentBubbleIndex, bubbleVisible, isPlaying, feedbackMessages]
  )

  const hideBubble = useCallback(() => {
    log.info('[VideoAnalysisScreen] hideBubble called', {
      currentBubbleIndex,
      bubbleVisible,
      isPlaying,
    })

    setBubbleVisible(false)
    setIsCoachSpeaking(false)

    // Clear the timer
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = null
    }

    log.info('[VideoAnalysisScreen] Bubble hidden successfully')
  }, [currentBubbleIndex, bubbleVisible, isPlaying])

  // Hide bubble when video is paused or stopped (but allow showing when seeking)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    if (!isPlaying && bubbleVisible) {
      // Check if bubble was recently shown (within last 2.5 seconds)
      const timeSinceLastShow = Date.now() - lastBubbleShowTimeRef.current
      const recentlyShown = timeSinceLastShow < 2500 // 2.5 seconds

      log.info('[VideoAnalysisScreen] Pause detection triggered', {
        isPlaying,
        bubbleVisible,
        timeSinceLastShow,
        recentlyShown,
        willHideBubble: !recentlyShown,
      })

      if (!recentlyShown) {
        // Only hide if bubble wasn't shown recently (allow time for auto-hide timer)
        timer = setTimeout(() => {
          if (!isPlaying && bubbleVisible) {
            log.info('[VideoAnalysisScreen] Hiding bubble due to pause (not recently shown)')
            hideBubble()
          }
        }, 100)
      } else {
        log.info('[VideoAnalysisScreen] Not hiding bubble - was shown recently')
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [isPlaying, bubbleVisible, hideBubble])

  // Check and show feedback bubble at a specific timestamp
  const checkAndShowBubbleAtTime = useCallback(
    (currentTimeMs: number) => {
      log.info('[VideoAnalysisScreen] checkAndShowBubbleAtTime called', {
        currentTimeMs,
        currentTimeSeconds: currentTimeMs / 1000,
        currentBubbleIndex,
        bubbleVisible,
        feedbackMessagesCount: feedbackMessages.length,
      })

      // Check if we should show any feedback bubbles at this timestamp
      feedbackMessages.forEach((message, index) => {
        const timeDiff = Math.abs(currentTimeMs - message.timestamp)
        const isNearTimestamp = timeDiff < 500 // Within 0.5 seconds

        // Allow showing the same bubble again if it's been hidden (for seek operations)
        const canShowBubble = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

        log.info('[VideoAnalysisScreen] Checking bubble', {
          bubbleIndex: index,
          messageId: message.id,
          messageTimestamp: message.timestamp,
          messageTimestampSeconds: message.timestamp / 1000,
          timeDiff,
          isNearTimestamp,
          currentBubbleIndex,
          bubbleVisible,
          canShowBubble,
          reason: !bubbleVisible
            ? 'bubble not visible'
            : currentBubbleIndex !== index
              ? 'different bubble'
              : 'same bubble visible',
        })

        if (canShowBubble) {
          // Show this bubble
          log.info('[VideoAnalysisScreen] Showing bubble', {
            bubbleIndex: index,
            messageId: message.id,
          })
          showBubble(index)
        }
      })
    },
    [feedbackMessages, currentBubbleIndex, bubbleVisible, showBubble]
  )

  // Handler for feedback bubble taps
  const handleFeedbackBubbleTap = useCallback((message: FeedbackMessage) => {
    log.info('[VideoAnalysisScreen] Feedback bubble tapped', { message })

    // Seek to the timestamp of the tapped feedback message
    const seekTime = message.timestamp / 1000 // Convert from milliseconds to seconds
    setPendingSeek(seekTime)

    // Highlight the tapped message
    setFeedbackMessages((prevMessages) =>
      prevMessages.map((msg) => ({
        ...msg,
        isHighlighted: msg.id === message.id,
      }))
    )

    // Make coach speak when feedback bubble is tapped
    setIsCoachSpeaking(true)
    // Stop speaking after 3 seconds
    setTimeout(() => setIsCoachSpeaking(false), 3000)
  }, [])

  // Handle video progress and bubble timing
  const handleVideoProgress = useCallback(
    (data: { currentTime: number }) => {
      // Only update if not seeking to avoid conflicts
      setCurrentTime((prevTime) => {
        // Avoid unnecessary state updates if time hasn't changed significantly
        if (Math.abs(data.currentTime - prevTime) < 0.1) {
          return prevTime
        }

        const newTime = data.currentTime
        const currentTimeMs = newTime * 1000 // Convert to milliseconds

        // Log progress updates (throttled to avoid spam)
        if (Math.floor(newTime) % 5 === 0 && Math.floor(newTime) !== Math.floor(prevTime)) {
          log.info('[VideoAnalysisScreen] Video progress', {
            currentTime: newTime,
            currentTimeMs,
            isPlaying,
            bubbleVisible,
            currentBubbleIndex,
          })
        }

        // Check if we should show any feedback bubbles
        feedbackMessages.forEach((message, index) => {
          const timeDiff = Math.abs(currentTimeMs - message.timestamp)
          const isNearTimestamp = timeDiff < 500 // Within 0.5 seconds

          // Allow showing the same bubble again if it's been hidden (for seek operations)
          const canShowBubble = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

          if (canShowBubble) {
            log.info('[VideoAnalysisScreen] Bubble trigger during playback', {
              bubbleIndex: index,
              messageId: message.id,
              currentTimeMs,
              messageTimestamp: message.timestamp,
              timeDiff,
              isPlaying,
              reason: !bubbleVisible ? 'bubble not visible' : 'different bubble',
            })
            // Show this bubble
            showBubble(index)
          }
        })

        return newTime
      })
    },
    [feedbackMessages, currentBubbleIndex, bubbleVisible, showBubble, isPlaying]
  )

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
                log.info('[VideoAnalysisScreen] onSeekComplete called', {
                  pendingSeek,
                  currentTime,
                  isPlaying,
                })

                // After native seek completes, align UI state and clear request
                if (pendingSeek !== null) {
                  setCurrentTime(pendingSeek)
                  log.info('[VideoAnalysisScreen] Setting current time after seek', {
                    newCurrentTime: pendingSeek,
                    previousCurrentTime: currentTime,
                  })

                  // Check for feedback bubbles at the seeked timestamp
                  const seekedTimeMs = pendingSeek * 1000 // Convert to milliseconds
                  log.info('[VideoAnalysisScreen] Checking for bubbles at seeked time', {
                    seekedTimeMs,
                    seekedTimeSeconds: seekedTimeMs / 1000,
                  })
                  checkAndShowBubbleAtTime(seekedTimeMs)
                }

                log.info('[VideoAnalysisScreen] Clearing pending seek')
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
            messages={
              currentBubbleIndex !== null && bubbleVisible
                ? [feedbackMessages[currentBubbleIndex]]
                : []
            }
            onBubbleTap={handleFeedbackBubbleTap}
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

          {/* Coach Avatar - positioned in bottom-right corner below video controls */}
          <CoachAvatar
            isSpeaking={isCoachSpeaking}
            testID="video-analysis-coach-avatar"
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
