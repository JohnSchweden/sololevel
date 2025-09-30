import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutAnimation, Platform } from 'react-native'
import { Button, Circle, Text, YStack } from 'tamagui'

// Logger for debugging
import { log } from '@my/logging'

// UI Components from @my/ui
import { AppHeader } from '@my/ui'
import {
  AudioFeedback,
  CoachAvatar,
  FeedbackBubbles,
  FeedbackPanel,
  MotionCaptureOverlay,
  SocialIcons,
  VideoContainer,
  VideoControls,
  VideoControlsRef,
  VideoPlayer,
  VideoPlayerArea,
} from '@ui/components/VideoAnalysis'

import { useUploadProgressStore } from '@app/stores/uploadProgress'
// Import hooks for tracking upload and analysis progress
import {
  type AnalysisJob,
  subscribeToAnalysisJob,
  subscribeToLatestAnalysisJobByRecordingId,
  useUploadProgress,
} from '@my/api'

// Types from VideoAnalysis components
import type { FeedbackMessage } from '@ui/components/VideoAnalysis/types'

// Real-time integration hooks
import { useFeedbackStatusIntegration } from './hooks/useFeedbackStatusIntegration'
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
  analysisJobId?: number
  videoRecordingId?: number
  videoUri?: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onMenuPress?: () => void
}

export function VideoAnalysisScreen({
  analysisJobId,
  videoRecordingId,
  videoUri,
  initialStatus = 'processing', // Default to processing when coming from recording
  onBack,
  onMenuPress,
}: VideoAnalysisScreenProps) {
  // DEBUG: Track component re-renders with logger (reduced logging for performance)
  const renderCountRef = useRef(0)
  renderCountRef.current++

  // Only log every 10th render to reduce performance impact
  if (renderCountRef.current % 10 === 1 && log && log.info) {
    log.info('VideoAnalysisScreen', 'Component rendered', {
      renderCount: renderCountRef.current,
      analysisJobId,
      videoUri: videoUri ? 'provided' : 'fallback',
    })
  }

  // STEP 1: Track processing state based on upload and analysis progress
  const [isProcessing, setIsProcessing] = useState(initialStatus === 'processing')
  const videoControlsRef = useRef<VideoControlsRef>(null)

  const latestUploadTask = useUploadProgressStore((state) => state.getLatestActiveTask())

  // Derive videoRecordingId from prop or store (for upload-initiated flows)
  const derivedRecordingId = useMemo(() => {
    if (videoRecordingId) return videoRecordingId

    if (latestUploadTask?.videoRecordingId) {
      log.info('VideoAnalysisScreen', 'Derived recordingId from latest active upload task', {
        taskId: latestUploadTask.id,
        recordingId: latestUploadTask.videoRecordingId,
      })
      return latestUploadTask.videoRecordingId
    }

    return null
  }, [videoRecordingId, latestUploadTask])

  // Track upload progress if we have a video recording ID
  const uploadProgressRecordId = derivedRecordingId ?? latestUploadTask?.videoRecordingId
  const { data: uploadProgress } = useUploadProgress(uploadProgressRecordId || 0)

  // Track analysis job progress via realtime subscription
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null)

  // Determine if we should show processing based on upload and analysis state
  const shouldShowProcessing = useMemo(() => {
    // Show processing if upload is in progress
    if (
      uploadProgress &&
      (uploadProgress.status === 'pending' || uploadProgress.status === 'uploading')
    ) {
      return true
    }

    // Show processing if analysis is queued or processing
    if (analysisJob && (analysisJob.status === 'queued' || analysisJob.status === 'processing')) {
      return true
    }

    // If we have no upload/analysis data yet, use initialStatus
    if (!uploadProgress && !analysisJob) {
      return initialStatus === 'processing'
    }

    // Hide processing if both upload and analysis are complete or failed
    return false
  }, [uploadProgress, analysisJob, initialStatus])

  // Check for upload failure to show error UI
  const { uploadFailed, uploadError } = useMemo(() => {
    if (!uploadProgress) return { uploadFailed: false, uploadError: null }

    if (uploadProgress.status === 'failed') {
      // Get error from the store task
      const task = useUploadProgressStore
        .getState()
        .getTaskByRecordingId(uploadProgressRecordId || 0)
      return { uploadFailed: true, uploadError: task?.error || 'Upload failed' }
    }

    return { uploadFailed: false, uploadError: null }
  }, [uploadProgress, derivedRecordingId])

  // Update processing state when shouldShowProcessing changes
  useEffect(() => {
    setIsProcessing(shouldShowProcessing)
  }, [shouldShowProcessing])

  // Set up realtime subscription for analysis job updates
  useEffect(() => {
    // If we have an explicit analysisJobId, subscribe to it directly
    if (analysisJobId) {
      log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by job ID', {
        analysisJobId,
      })

      const unsubscribe = subscribeToAnalysisJob(analysisJobId, (job) => {
        log.info('VideoAnalysisScreen', 'Analysis job update received', {
          jobId: job.id,
          status: job.status,
          progress: job.progress_percentage,
        })
        setAnalysisJob(job)
      })

      return unsubscribe
    }

    // If we don't have an explicit analysisJobId but have a recordingId,
    // subscribe to jobs for that recording
    if (derivedRecordingId) {
      log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by recording ID', {
        recordingId: derivedRecordingId,
      })

      const unsubscribe = subscribeToLatestAnalysisJobByRecordingId(derivedRecordingId, (job) => {
        log.info('VideoAnalysisScreen', 'Analysis job update received by recording ID', {
          jobId: job.id,
          recordingId: job.video_recording_id,
          status: job.status,
          progress: job.progress_percentage,
        })
        setAnalysisJob(job)
      })

      return unsubscribe
    }

    // No subscription needed
    return undefined
  }, [analysisJobId, derivedRecordingId])

  // Set up feedback status integration for real-time SSML/audio status updates
  // For now, we'll use the analysisJobId as a string for the analysisId
  // In a real implementation, you'd get the actual analysisId from the job
  const feedbackStatus = useFeedbackStatusIntegration(analysisJobId?.toString())

  // Cleanup feedback subscriptions on unmount
  useEffect(() => {
    return () => {
      feedbackStatus.cleanup()
    }
  }, [feedbackStatus])

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pendingSeek, setPendingSeek] = useState<number | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)

  // Coach avatar state
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false)

  // Feedback Panel state for US-VF-08 - using panelFraction for dynamic sizing
  const [panelFraction, setPanelFraction] = useState(0.05) // 5% collapsed, 50% expanded

  // Calculate scale factor for video controls based on panel expansion
  // When collapsed (panelFraction=0.05), video area is 95% → scale = 1.0
  // When expanded (panelFraction=0.4), video area is 60% → scale = 0.6/0.95 ≈ 0.63
  const videoAreaScale = useMemo(() => {
    const collapsedVideoArea = 1 - 0.05 // 0.95
    const currentVideoArea = 1 - panelFraction
    return Math.max(0.6, currentVideoArea / collapsedVideoArea) // Min scale of 0.6 to prevent too small controls
  }, [panelFraction])
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'feedback' | 'insights' | 'comments'>(
    'feedback'
  )
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)

  // Animate layout changes when panelFraction changes
  useEffect(() => {
    log.debug('VideoAnalysisScreen', 'Panel fraction changed', {
      panelFraction,
      platform: Platform.OS,
    })
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext({
        duration: 500,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.7,
          initialVelocity: 0,
        },
      })
      log.debug('VideoAnalysisScreen', 'LayoutAnimation configured')
    }
  }, [panelFraction])

  // Feedback messages state
  const [feedbackMessages] = useState<FeedbackMessage[]>([
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

  // Transform feedback messages for FeedbackPanel format (US-VF-08)
  // Use real-time feedback data if available, otherwise fall back to mock data
  const feedbackItems = useMemo(() => {
    // If we have real-time feedback data, use it
    if (feedbackStatus.feedbackItems.length > 0) {
      return feedbackStatus.feedbackItems
    }

    // Otherwise, fall back to mock data for demo purposes
    return feedbackMessages.map((message) => ({
      id: message.id,
      timestamp: message.timestamp,
      text: message.text,
      type: message.type as 'positive' | 'suggestion' | 'correction',
      category: message.category as 'voice' | 'posture' | 'grip' | 'movement',
      // Add mock status for demo
      ssmlStatus: 'completed' as const,
      audioStatus: 'completed' as const,
    }))
  }, [feedbackMessages, feedbackStatus.feedbackItems])

  // Sequential bubble display state
  const [currentBubbleIndex, setCurrentBubbleIndex] = useState<number | null>(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBubbleShowTimeRef = useRef<number>(0)

  // Initial logging
  useEffect(() => {
    log.info('VideoAnalysisScreen', 'Component mounted', {
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

  // Auto-start video playback when processing is complete
  useEffect(() => {
    if (!isProcessing && !isPlaying) {
      log.info('VideoAnalysisScreen', 'Processing completed, auto-starting video playback')
      setIsPlaying(true)
    }
  }, [isProcessing, isPlaying])

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
    log.info('VideoAnalysisScreen', 'handlePlay called')
    setIsPlaying(true)
    setVideoEnded(false) // Reset ended state when user plays
  }, [])

  const handlePause = useCallback(() => {
    log.info('VideoAnalysisScreen', 'handlePause called')
    setIsPlaying(false)
    setVideoEnded(false) // Reset ended state when user pauses
  }, [])

  const handleVideoEnd = useCallback(() => {
    log.info('VideoAnalysisScreen', 'handleVideoEnd called')
    setIsPlaying(false)
    setVideoEnded(true)
  }, [])

  const handleSeek = useCallback(
    (time: number) => {
      log.info('VideoAnalysisScreen', 'handleSeek called', {
        seekTime: time,
        currentTime,
        isPlaying,
        pendingSeek,
      })
      setPendingSeek(time)
      setVideoEnded(false) // Reset ended state when seeking
    },
    [currentTime, isPlaying, pendingSeek]
  )

  const handleReplay = useCallback(() => {
    log.info('VideoAnalysisScreen', 'handleReplay called')
    setPendingSeek(0) // Seek to beginning
    setVideoEnded(false)
    setIsPlaying(true)
  }, [])

  const handleVideoLoad = useCallback((data: { duration: number }) => {
    log.info('VideoAnalysisScreen', 'handleVideoLoad called', { duration: data.duration })
    setDuration(data.duration)
  }, [])

  const handleVideoTap = useCallback(() => {
    log.info('VideoAnalysisScreen', 'handleVideoTap called')
    // For now, just log - controls will be added later
  }, [])

  // Handler for menu press from AppHeader - triggers fly-out menu in VideoControls
  const handleMenuPress = useCallback(() => {
    log.info('VideoAnalysisScreen', 'handleMenuPress called')
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
      log.info('VideoAnalysisScreen', 'showBubble called', {
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
        log.info('VideoAnalysisScreen', 'Auto-hiding bubble after 2 seconds', {
          bubbleIndex: index,
        })
        hideBubble()
      }, 2000)

      log.info('VideoAnalysisScreen', 'Bubble shown successfully', {
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
    log.info('VideoAnalysisScreen', 'hideBubble called', {
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

    log.info('VideoAnalysisScreen', 'Bubble hidden successfully')
  }, [currentBubbleIndex, bubbleVisible, isPlaying])

  // Hide bubble when video is paused or stopped (but allow showing when seeking)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    if (!isPlaying && bubbleVisible) {
      // Check if bubble was recently shown (within last 2.5 seconds)
      const timeSinceLastShow = Date.now() - lastBubbleShowTimeRef.current
      const recentlyShown = timeSinceLastShow < 2500 // 2.5 seconds

      log.info('VideoAnalysisScreen', 'Pause detection triggered', {
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
            log.info('VideoAnalysisScreen', 'Hiding bubble due to pause (not recently shown)')
            hideBubble()
          }
        }, 100)
      } else {
        log.info('VideoAnalysisScreen', 'Not hiding bubble - was shown recently')
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
      log.info('VideoAnalysisScreen', 'checkAndShowBubbleAtTime called', {
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

        log.info('VideoAnalysisScreen', 'Checking bubble', {
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
          log.info('VideoAnalysisScreen', 'Showing bubble', {
            bubbleIndex: index,
            messageId: message.id,
          })
          showBubble(index)
        }
      })
    },
    [feedbackMessages, currentBubbleIndex, bubbleVisible, showBubble]
  )

  // // Handler for feedback bubble taps
  // const handleFeedbackBubbleTap = useCallback((message: FeedbackMessage) => {
  //   log.info('[VideoAnalysisScreen] Feedback bubble tapped', { message })

  //   // Seek to the timestamp of the tapped feedback message
  //   const seekTime = message.timestamp / 1000 // Convert from milliseconds to seconds
  //   setPendingSeek(seekTime)

  //   // Highlight the tapped message
  //   setFeedbackMessages((prevMessages) =>
  //     prevMessages.map((msg) => ({
  //       ...msg,
  //       isHighlighted: msg.id === message.id,
  //     }))
  //   )

  //   // Make coach speak when feedback bubble is tapped
  //   setIsCoachSpeaking(true)
  //   // Stop speaking after 3 seconds
  //   setTimeout(() => setIsCoachSpeaking(false), 3000)
  // }, [])

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
          log.info('VideoAnalysisScreen', 'Video progress', {
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
            log.info('VideoAnalysisScreen', 'Bubble trigger during playback', {
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

  // Feedback Panel handlers for US-VF-08
  const handleFeedbackPanelExpand = useCallback(() => {
    log.info('VideoAnalysisScreen', 'Feedback panel expanding')
    setPanelFraction(0.4) // 50% expanded
  }, [])

  const handleFeedbackPanelCollapse = useCallback(() => {
    log.info('VideoAnalysisScreen', 'Feedback panel collapsing')
    setPanelFraction(0.05) // 5% collapsed
  }, [])

  const handleFeedbackTabChange = useCallback((tab: 'feedback' | 'insights' | 'comments') => {
    log.info('VideoAnalysisScreen', 'Feedback tab changed', { tab })
    setActiveFeedbackTab(tab)
  }, [])

  const handleFeedbackItemPress = useCallback((item: any) => {
    log.info('VideoAnalysisScreen', 'Feedback item pressed', {
      itemId: item.id,
      timestamp: item.timestamp,
    })

    // Seek to the feedback item's timestamp
    const seekTime = item.timestamp / 1000 // Convert from milliseconds to seconds
    setPendingSeek(seekTime)

    // Highlight the pressed feedback item
    setSelectedFeedbackId(item.id)

    // Make coach speak when feedback item is pressed
    setIsCoachSpeaking(true)
    setTimeout(() => setIsCoachSpeaking(false), 3000)
  }, [])

  return (
    <YStack
      flex={1}
      animation="slow"
      style={{ transition: 'all 0.5s ease-in-out' }}
    >
      {/* Upload Error State */}
      {uploadFailed && uploadProgress && (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$4"
          backgroundColor="$background"
        >
          <YStack
            alignItems="center"
            gap="$4"
            maxWidth={400}
          >
            {/* Error Icon */}
            <YStack
              width={80}
              height={80}
              borderRadius="$4"
              backgroundColor="$red2"
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="$red5"
            >
              <Circle
                size={32}
                backgroundColor="$red9"
              />
            </YStack>

            {/* Error Title */}
            <Text
              fontSize="$6"
              fontWeight="600"
              color="$color11"
              textAlign="center"
            >
              Upload Failed
            </Text>

            {/* Error Message */}
            <Text
              fontSize="$4"
              color="$color9"
              textAlign="center"
              lineHeight="$4"
            >
              {uploadError || 'The video upload failed. Please try again.'}
            </Text>

            {/* Action Buttons */}
            <YStack
              gap="$3"
              width="100%"
            >
              <Button
                size="$5"
                backgroundColor="$color9"
                color="white"
                fontWeight="600"
                onPress={() => {
                  // TODO: Implement retry logic - would need to re-run upload with original file/uri
                  // For now, just navigate back
                  onBack?.()
                }}
                testID="upload-error-retry-button"
              >
                Try Again
              </Button>

              <Button
                size="$5"
                variant="outlined"
                onPress={onBack}
                testID="upload-error-back-button"
              >
                Back to Camera
              </Button>
            </YStack>
          </YStack>
        </YStack>
      )}

      {/* Main Analysis UI - only show when not in error state */}
      {!uploadFailed && (
        <VideoContainer
          useFlexLayout={true}
          flex={1 - panelFraction}
        >
          <VideoPlayerArea>
            <YStack
              flex={1}
              position="relative"
              onPress={handleVideoTap}
              marginBottom={-34}
              testID="video-player-container"
            >
              {recordedVideoUri && (
                <VideoPlayer
                  videoUri={recordedVideoUri}
                  isPlaying={isPlaying}
                  onPause={handlePause}
                  onEnd={handleVideoEnd}
                  onLoad={handleVideoLoad}
                  onProgress={handleVideoProgress}
                  seekToTime={pendingSeek}
                  onSeekComplete={() => {
                    log.info('VideoAnalysisScreen', 'onSeekComplete called', {
                      pendingSeek,
                      currentTime,
                      isPlaying,
                    })

                    // After native seek completes, align UI state and clear request
                    if (pendingSeek !== null) {
                      setCurrentTime(pendingSeek)
                      log.info('VideoAnalysisScreen', 'Setting current time after seek', {
                        newCurrentTime: pendingSeek,
                        previousCurrentTime: currentTime,
                      })

                      // Check for feedback bubbles at the seeked timestamp
                      const seekedTimeMs = pendingSeek * 1000 // Convert to milliseconds
                      log.info('VideoAnalysisScreen', 'Checking for bubbles at seeked time', {
                        seekedTimeMs,
                        seekedTimeSeconds: seekedTimeMs / 1000,
                      })
                      checkAndShowBubbleAtTime(seekedTimeMs)
                    }

                    log.info('VideoAnalysisScreen', 'Clearing pending seek')
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
                // onBubbleTap={handleFeedbackBubbleTap}
              />

              <AudioFeedback
                audioUrl={null} // TODO: Connect to audio feedback
                isPlaying={false}
                currentTime={0}
                duration={0}
                onPlayPause={() => {
                  log.info('VideoAnalysisScreen', 'Audio play/pause')
                }}
                onSeek={(time) => {
                  log.info('VideoAnalysisScreen', 'Audio seek', { time })
                }}
                onClose={() => {
                  log.info('VideoAnalysisScreen', 'Audio close')
                }}
                isVisible={false}
              />

              {/* Coach Avatar - positioned in bottom-right corner below video controls */}
              {/* Comment out CoachAvatar when FeedbackPanel is expanded */}
              {panelFraction <= 0.1 && (
                <CoachAvatar
                  isSpeaking={isCoachSpeaking}
                  size={90 * (1 - panelFraction)} // Scale avatar size proportionally with video area
                  testID="video-analysis-coach-avatar"
                  animation="quick"
                  enterStyle={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  exitStyle={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                />
              )}

              {/* Video Controls Overlay */}
              <VideoControls
                ref={videoControlsRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                showControls={isProcessing || !isPlaying || videoEnded}
                isProcessing={isProcessing}
                videoEnded={videoEnded}
                scaleFactor={videoAreaScale}
                onPlay={handlePlay}
                onPause={handlePause}
                onReplay={handleReplay}
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
      )}

      {/* Social Icons - Only visible when feedback panel is expanded */}
      <SocialIcons
        likes={1200}
        comments={89}
        bookmarks={234}
        shares={1500}
        onLike={() => log.info('VideoAnalysisScreen', 'Like button pressed')}
        onComment={() => log.info('VideoAnalysisScreen', 'Comment button pressed')}
        onBookmark={() => log.info('VideoAnalysisScreen', 'Bookmark button pressed')}
        onShare={() => log.info('VideoAnalysisScreen', 'Share button pressed')}
        isVisible={panelFraction > 0.1}
      />

      {/* Feedback Panel for US-VF-08 - now a flex sibling */}
      <FeedbackPanel
        flex={panelFraction}
        isExpanded={panelFraction > 0.1} // Expanded when > 10%
        activeTab={activeFeedbackTab}
        feedbackItems={feedbackItems}
        currentVideoTime={currentTime}
        videoDuration={duration}
        selectedFeedbackId={selectedFeedbackId}
        onTabChange={handleFeedbackTabChange}
        onSheetExpand={handleFeedbackPanelExpand}
        onSheetCollapse={handleFeedbackPanelCollapse}
        onFeedbackItemPress={handleFeedbackItemPress}
        onVideoSeek={handleSeek}
        onRetryFeedback={feedbackStatus.retryFailedFeedback}
        onDismissError={(feedbackId) => {
          log.info('VideoAnalysisScreen', 'Dismissing error for feedback', { feedbackId })
          // For now, just log the dismissal. In a full implementation,
          // you might want to hide the error or mark it as acknowledged
        }}
      />
    </YStack>
  )
}
