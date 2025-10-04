import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutAnimation, Platform } from 'react-native'
import { Button, Circle, Text, YStack } from 'tamagui'

// Logger for debugging
import { log } from '@my/logging'

// UI Components from @my/ui
import { AppHeader } from '@my/ui'
import {
  AudioFeedback,
  AudioPlayer,
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
  getAnalysisIdForJobId,
  subscribeToAnalysisJob,
  subscribeToLatestAnalysisJobByRecordingId,
  supabase,
  useUploadProgress,
} from '@my/api'

// Types from VideoAnalysis components
import type { FeedbackMessage } from '@ui/components/VideoAnalysis/types'

import { useAudioController } from './hooks/useAudioController'
import { useFeedbackAudioSource } from './hooks/useFeedbackAudioSource'
// Real-time integration hooks
import { useFeedbackStatusIntegration } from './hooks/useFeedbackStatusIntegration'
import { useVideoAudioSync } from './hooks/useVideoAudioSync'
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
  // STEP 1: Track processing state based on upload and analysis progress
  const [isProcessing, setIsProcessing] = useState(initialStatus === 'processing')
  const videoControlsRef = useRef<VideoControlsRef>(null)

  // Diagnostic logging: Log auth state and component initialization
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { supabase } = await import('@my/api')
        const { data: authData, error: authError } = await supabase.auth.getUser()
        const networkOnline =
          typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
            ? navigator.onLine
            : true

        log.info('VideoAnalysisScreen', 'Component initialization - Auth state', {
          analysisJobId,
          videoRecordingId,
          recordingId: videoRecordingId,
          hasVideoUri: !!videoUri,
          initialStatus,
          authenticated: !!authData.user,
          userId: authData.user?.id,
          authError: authError?.message,
          networkOnline,
        })

        if (authError) {
          log.warn('VideoAnalysisScreen', 'Auth error detected', {
            error: authError.message,
            code: authError.status,
          })
        }
      } catch (error) {
        log.error('VideoAnalysisScreen', 'Failed to check auth state', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    checkAuthState()
  }, [analysisJobId, videoRecordingId, videoUri, initialStatus])

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

  // Derive effective analysis job ID from props or state
  const effectiveAnalysisJobId = useMemo(() => {
    return analysisJobId ?? analysisJob?.id ?? null
  }, [analysisJobId, analysisJob?.id])

  // Track the analysis UUID (from analyses table) for feedback queries
  const [analysisUuid, setAnalysisUuid] = useState<string | null>(null)
  const [channelExhausted, setChannelExhausted] = useState(false)
  const lastChannelErrorTimeRef = useRef<number>(0)
  const channelErrorStreakRef = useRef<number>(0)

  // Get analysis UUID when we have a job ID, or look up by video recording ID
  useEffect(() => {
    const lookupAnalysis = async () => {
      // First try direct job ID lookup
      if (effectiveAnalysisJobId) {
        try {
          const uuid = await getAnalysisIdForJobId(effectiveAnalysisJobId)
          if (uuid) {
            setAnalysisUuid(uuid)
            log.info('VideoAnalysisScreen', 'Analysis UUID resolved from job ID', {
              jobId: effectiveAnalysisJobId,
              analysisId: uuid,
              analysisUuid: uuid,
              recordingId: videoRecordingId,
              jobStatus: analysisJob?.status,
            })
            return
          }
        } catch (error) {
          log.error('VideoAnalysisScreen', 'Failed to get analysis UUID from job ID', {
            jobId: effectiveAnalysisJobId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // If no job ID or job ID lookup failed, try video recording ID lookup
      if (videoRecordingId) {
        try {
          if (__DEV__) {
            log.debug('VideoAnalysisScreen', 'Attempting to find analysis by video recording ID', {
              videoRecordingId,
            })
          }

          // Query for analysis job by video recording ID
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user?.id) {
            log.warn('VideoAnalysisScreen', 'No authenticated user found')
            return
          }

          const { data: jobData, error: jobError } = await supabase
            .from('analysis_jobs')
            .select('id, status')
            .eq('video_recording_id', videoRecordingId)
            .eq('user_id', userData.user.id)
            .single()

          if (jobError || !jobData) {
            log.warn('VideoAnalysisScreen', 'No analysis job found for video recording', {
              videoRecordingId,
              error: jobError?.message,
            })
            return
          }

          // Now get analysis UUID from the job
          const uuid = await getAnalysisIdForJobId(jobData.id)
          if (uuid) {
            setAnalysisUuid(uuid)
            log.info('VideoAnalysisScreen', 'Analysis UUID resolved from video recording ID', {
              videoRecordingId,
              recordingId: videoRecordingId,
              jobId: jobData.id,
              analysisId: uuid,
              analysisUuid: uuid,
              jobStatus: jobData.status,
            })
            return
          }
        } catch (error) {
          log.error('VideoAnalysisScreen', 'Failed to get analysis UUID from video recording ID', {
            videoRecordingId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      log.warn('VideoAnalysisScreen', 'No analysis UUID found by any method', {
        effectiveAnalysisJobId,
        videoRecordingId,
        jobStatus: analysisJob?.status,
      })
      setAnalysisUuid(null)
    }

    void lookupAnalysis()
  }, [effectiveAnalysisJobId, videoRecordingId, analysisJob?.status])

  // Track active subscription to prevent duplicates
  const activeSubscriptionRef = useRef<{ key: string; unsubscribe: () => void } | null>(null)

  // Track pending subscription to prevent StrictMode double-effect race
  const pendingKeyRef = useRef<string | null>(null)

  // Track retry state for channel errors
  const retryStateRef = useRef<{
    attempts: number
    timeoutId: ReturnType<typeof setTimeout> | null
    currentKey: string | null
  }>({ attempts: 0, timeoutId: null, currentKey: null })

  // Track backfill re-check
  const backfillCheckRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout> | null
    currentKey: string | null
  }>({ timeoutId: null, currentKey: null })

  // Helper: Handle channel error with bounded retry
  const handleChannelError = useCallback(
    (error: string, _details: any, subscriptionKey: string) => {
      // Throttling is now handled at callback level above
      const maxRetries = 3
      const baseDelay = 300

      if (retryStateRef.current.timeoutId) {
        clearTimeout(retryStateRef.current.timeoutId)
        retryStateRef.current.timeoutId = null
      }

      if (retryStateRef.current.currentKey !== subscriptionKey) {
        retryStateRef.current.attempts = 0
        return
      }

      if (retryStateRef.current.attempts >= maxRetries) {
        log.warn('VideoAnalysisScreen', 'Channel error retry exhausted', {
          error,
          attempts: retryStateRef.current.attempts,
          maxRetries,
          subscriptionKey,
        })
        retryStateRef.current.attempts = 0
        setChannelExhausted(true) // Signal UI
        return
      }

      const attempt = retryStateRef.current.attempts + 1
      const delay = baseDelay * 2 ** (attempt - 1)

      log.info('VideoAnalysisScreen', 'Scheduling channel retry', {
        attempt,
        delay,
        error,
        subscriptionKey,
      })

      retryStateRef.current.timeoutId = setTimeout(() => {
        // Check if key still matches (component might have unmounted or key changed)
        if (retryStateRef.current.currentKey === subscriptionKey) {
          log.info('VideoAnalysisScreen', 'Retrying subscription after channel error', {
            attempt,
            subscriptionKey,
          })

          // Clear pending key to allow retry
          pendingKeyRef.current = null

          // Force re-run of subscription effect by updating a dummy state
          // This will trigger the effect to re-establish the subscription
          setIsProcessing((prev) => prev)
        }
      }, delay)

      retryStateRef.current.attempts = attempt
    },
    []
  )

  // Helper: Schedule backfill re-check for timing gaps
  const scheduleBackfillRecheck = useCallback((subscriptionKey: string) => {
    // Clear any existing backfill check
    if (backfillCheckRef.current.timeoutId) {
      clearTimeout(backfillCheckRef.current.timeoutId)
      backfillCheckRef.current.timeoutId = null
    }

    // If key changed, abort
    if (backfillCheckRef.current.currentKey !== subscriptionKey) {
      return
    }

    const delay = 500 // 500ms delay to bridge upload→job timing gap

    log.info('VideoAnalysisScreen', 'Scheduling backfill re-check', {
      delay,
      subscriptionKey,
    })

    backfillCheckRef.current.timeoutId = setTimeout(async () => {
      // Check if key still matches
      if (backfillCheckRef.current.currentKey === subscriptionKey) {
        try {
          // Extract recording ID from subscription key
          const recordingIdMatch = subscriptionKey.match(/^recording:(\d+)$/)
          if (recordingIdMatch) {
            const recordingId = Number.parseInt(recordingIdMatch[1], 10)
            const { getLatestAnalysisJobForRecordingId } = await import('@my/api')

            const job = await getLatestAnalysisJobForRecordingId(recordingId)
            if (job) {
              log.info('VideoAnalysisScreen', 'Backfill re-check found job', {
                jobId: job.id,
                status: job.status,
                subscriptionKey,
              })
              setAnalysisJob(job)
            } else {
              if (__DEV__) {
                log.debug('VideoAnalysisScreen', 'Backfill re-check still empty', {
                  subscriptionKey,
                })
              }
            }
          }
        } catch (error) {
          log.error('VideoAnalysisScreen', 'Backfill re-check failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            subscriptionKey,
          })
        }
      }
    }, delay)
  }, [])

  // DEBUG: Track component re-renders with logger (throttled to reduce performance impact)
  const renderCountRef = useRef(0)
  renderCountRef.current++

  // Render logging removed - too noisy for production

  const feedbackStatus = useFeedbackStatusIntegration(analysisUuid || undefined)
  const feedbackAudio = useFeedbackAudioSource(feedbackStatus.feedbackItems)

  // Determine if we should show processing based on upload and analysis state
  const firstPlayableReady = useMemo(() => {
    const items = feedbackStatus.feedbackItems
    if (!items || items.length === 0) return false
    const earliest = items.reduce((prev, curr) => (curr.timestamp < prev.timestamp ? curr : prev))
    return !!feedbackAudio.audioUrls[earliest.id]
  }, [feedbackStatus.feedbackItems, feedbackAudio.audioUrls])

  const shouldShowProcessing = useMemo(() => {
    // PRIORITY 0: Hide as soon as the earliest feedback has a playable audio URL
    if (firstPlayableReady) {
      if (__DEV__) {
        log.debug(
          'VideoAnalysisScreen',
          'shouldShowProcessing: first playable feedback ready - hiding overlay',
          {
            firstPlayableReady,
            earliestFeedbackId: feedbackStatus.feedbackItems[0]?.id ?? null,
            analysisJobStatus: analysisJob?.status,
            uploadProgressStatus: uploadProgress?.status,
            decision: false,
          }
        )
      }
      return false
    }

    // PRIORITY 0b: If feedback is fully completed (SSML + audio for all items), hide overlay
    if (feedbackStatus.isFullyCompleted) {
      if (__DEV__) {
        log.debug(
          'VideoAnalysisScreen',
          'shouldShowProcessing: feedback fully completed - hiding overlay',
          {
            analysisJobStatus: analysisJob?.status,
            uploadProgressStatus: uploadProgress?.status,
            decision: false,
          }
        )
      }
      return false
    }

    // PRIORITY 1: If analysis job is completed or failed, always hide overlay
    // This overrides upload status to prevent stuck overlay
    if (analysisJob && (analysisJob.status === 'completed' || analysisJob.status === 'failed')) {
      if (__DEV__) {
        log.debug(
          'VideoAnalysisScreen',
          'shouldShowProcessing: analysis completed/failed - hiding overlay',
          {
            analysisJobStatus: analysisJob.status,
            uploadProgressStatus: uploadProgress?.status,
            decision: false,
          }
        )
      }
      return false
    }

    // PRIORITY 2: If analysis is queued or processing, show overlay
    if (analysisJob && (analysisJob.status === 'queued' || analysisJob.status === 'processing')) {
      if (__DEV__) {
        log.debug(
          'VideoAnalysisScreen',
          'shouldShowProcessing: analysis in progress - showing overlay',
          {
            analysisJobStatus: analysisJob.status,
            uploadProgressStatus: uploadProgress?.status,
            decision: true,
          }
        )
      }
      return true
    }

    // PRIORITY 3: Check upload status only if no analysis job or analysis is still pending
    if (
      uploadProgress &&
      (uploadProgress.status === 'pending' || uploadProgress.status === 'uploading')
    ) {
      if (__DEV__) {
        log.debug(
          'VideoAnalysisScreen',
          'shouldShowProcessing: upload in progress - showing overlay',
          {
            analysisJobStatus: analysisJob?.status,
            uploadProgressStatus: uploadProgress.status,
            decision: true,
          }
        )
      }
      return true
    }

    // PRIORITY 4: If we have no upload/analysis data yet, use initialStatus
    if (!uploadProgress && !analysisJob) {
      return initialStatus === 'processing'
    }

    // DEFAULT: Hide processing overlay
    return false
  }, [
    uploadProgress,
    analysisJob,
    initialStatus,
    feedbackStatus.isFullyCompleted,
    firstPlayableReady,
    feedbackStatus.feedbackItems,
  ])

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

  // Update processing state when shouldShowProcessing changes (guarded to reduce renders)
  useEffect(() => {
    if (isProcessing !== shouldShowProcessing) {
      setIsProcessing(shouldShowProcessing)
    }
  }, [shouldShowProcessing, isProcessing])

  // Set up realtime subscription for analysis job updates (single subscription with cleanup)
  useEffect(() => {
    // Determine subscription key and type
    const subscriptionKey = analysisJobId
      ? `job:${analysisJobId}`
      : derivedRecordingId
        ? `recording:${derivedRecordingId}`
        : null

    // Clean up previous subscription if key changed
    if (activeSubscriptionRef.current && activeSubscriptionRef.current.key !== subscriptionKey) {
      activeSubscriptionRef.current.unsubscribe()
      activeSubscriptionRef.current = null
    }

    // If no key, no subscription needed
    if (!subscriptionKey) {
      return
    }

    // If we already have an active subscription with the same key, skip
    if (activeSubscriptionRef.current?.key === subscriptionKey) {
      return
    }

    // If we're already setting up a subscription with the same key (StrictMode double-effect), skip
    if (pendingKeyRef.current === subscriptionKey) {
      return
    }

    // Mark this key as pending to block duplicate setup
    pendingKeyRef.current = subscriptionKey

    // Update retry and backfill state for this subscription
    retryStateRef.current.currentKey = subscriptionKey
    retryStateRef.current.attempts = 0
    backfillCheckRef.current.currentKey = subscriptionKey

    // Set up new subscription
    if (analysisJobId) {
      const unsubscribe = subscribeToAnalysisJob(
        analysisJobId,
        (job) => {
          log.info('VideoAnalysisScreen', 'Analysis job update received', {
            jobId: job.id,
            recordingId: job.video_recording_id,
            status: job.status,
            progress: job.progress_percentage,
            effectiveAnalysisJobId,
          })
          setAnalysisJob(job)
        },
        {
          onStatus: (status, details) => {
            log.info('VideoAnalysisScreen', 'Subscription status', { status, ...details })
            if (status === 'SUBSCRIBED') {
              pendingKeyRef.current = null // Clear pending flag only when subscription is confirmed
            }
          },
          onError: (error, details) => {
            // Enhanced error logging with diagnostic information
            if (error === 'CHANNEL_ERROR') {
              const now = Date.now()
              if (lastChannelErrorTimeRef.current && now - lastChannelErrorTimeRef.current < 500) {
                channelErrorStreakRef.current += 1
              } else {
                channelErrorStreakRef.current = 1
              }
              lastChannelErrorTimeRef.current = now

              if (channelErrorStreakRef.current <= 2) {
                log.error(
                  'VideoAnalysisScreen',
                  'Channel subscription failed - enhanced diagnostics',
                  {
                    error,
                    subscriptionKey,
                    channelName: details?.channel,
                    userId: details?.userId,
                    networkOnline: details?.networkOnline,
                    health: details?.health,
                    status: details?.status,
                    recordingId: analysisJobId ? undefined : derivedRecordingId,
                    analysisJobId,
                  }
                )
              } else {
                log.warn('VideoAnalysisScreen', 'Repeated channel errors suppressed', {
                  error,
                  subscriptionKey,
                  streak: channelErrorStreakRef.current,
                })
              }
              handleChannelError(error, details, subscriptionKey)
            } else if (error === 'HEALTH_CHECK_FAILED') {
              log.error('VideoAnalysisScreen', 'Health check failed before subscription', {
                error,
                health: details?.health,
                subscriptionKey,
                recordingId: analysisJobId ? undefined : derivedRecordingId,
                analysisJobId,
              })
            } else if (error === 'HEALTH_CHECK_ERROR') {
              log.error('VideoAnalysisScreen', 'Health check error before subscription', {
                error,
                healthError: details?.error,
                subscriptionKey,
                recordingId: analysisJobId ? undefined : derivedRecordingId,
                analysisJobId,
              })
            } else if (error === 'CHANNEL_TIMEOUT' || error === 'CHANNEL_CLOSED') {
              log.warn('VideoAnalysisScreen', 'Channel connection issue', {
                error,
                channel: details?.channel,
                userId: details?.userId,
                subscriptionKey,
              })
            } else {
              log.error('VideoAnalysisScreen', 'Subscription error', { error, ...details })
            }
          },
        }
      )

      activeSubscriptionRef.current = { key: subscriptionKey, unsubscribe }

      // Log after guards pass
      log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by job ID', {
        analysisJobId,
        subscriptionKey,
      })

      return unsubscribe
    }

    // Subscribe to jobs for recording ID
    if (derivedRecordingId) {
      const unsubscribe = subscribeToLatestAnalysisJobByRecordingId(
        derivedRecordingId,
        (job) => {
          log.info('VideoAnalysisScreen', 'Analysis job update received by recording ID', {
            jobId: job.id,
            recordingId: job.video_recording_id,
            videoRecordingId: job.video_recording_id,
            status: job.status,
            progress: job.progress_percentage,
            effectiveAnalysisJobId,
          })
          setAnalysisJob(job)
        },
        {
          onStatus: (status, details) => {
            log.info('VideoAnalysisScreen', 'Subscription status', { status, ...details })
            if (status === 'SUBSCRIBED') {
              pendingKeyRef.current = null // Clear pending flag only when subscription is confirmed
            }
            if (status === 'BACKFILL_EMPTY') {
              scheduleBackfillRecheck(subscriptionKey)
            }
          },
          onError: (error, details) => {
            // Enhanced error logging with diagnostic information for recording subscriptions
            if (error === 'CHANNEL_ERROR') {
              log.error(
                'VideoAnalysisScreen',
                'Channel subscription failed - enhanced diagnostics (recording)',
                {
                  error,
                  subscriptionKey,
                  channelName: details?.channel,
                  userId: details?.userId,
                  networkOnline: details?.networkOnline,
                  health: details?.health,
                  status: details?.status,
                  recordingId: derivedRecordingId,
                  analysisJobId: undefined,
                }
              )
              handleChannelError(error, details, subscriptionKey)
            } else if (error === 'HEALTH_CHECK_FAILED') {
              log.error(
                'VideoAnalysisScreen',
                'Health check failed before recording subscription',
                {
                  error,
                  health: details?.health,
                  subscriptionKey,
                  recordingId: derivedRecordingId,
                }
              )
            } else if (error === 'HEALTH_CHECK_ERROR') {
              log.error('VideoAnalysisScreen', 'Health check error before recording subscription', {
                error,
                healthError: details?.error,
                subscriptionKey,
                recordingId: derivedRecordingId,
              })
            } else if (error === 'CHANNEL_TIMEOUT' || error === 'CHANNEL_CLOSED') {
              log.warn('VideoAnalysisScreen', 'Recording channel connection issue', {
                error,
                channel: details?.channel,
                userId: details?.userId,
                subscriptionKey,
                recordingId: derivedRecordingId,
              })
            } else {
              log.error('VideoAnalysisScreen', 'Subscription error', { error, ...details })
            }
          },
        }
      )

      activeSubscriptionRef.current = { key: subscriptionKey, unsubscribe }

      // Log after guards pass
      log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by recording ID', {
        recordingId: derivedRecordingId,
        subscriptionKey,
      })

      return unsubscribe
    }

    // No subscription needed
    return undefined
  }, [
    analysisJobId,
    derivedRecordingId,
    effectiveAnalysisJobId,
    handleChannelError,
    scheduleBackfillRecheck,
  ])

  // Cleanup active subscription on unmount
  useEffect(() => {
    return () => {
      if (activeSubscriptionRef.current) {
        log.info('VideoAnalysisScreen', 'Cleaning up active subscription on unmount', {
          key: activeSubscriptionRef.current.key,
        })
        activeSubscriptionRef.current.unsubscribe()
        activeSubscriptionRef.current = null
      }
    }
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear retry timeout
      if (retryStateRef.current.timeoutId) {
        clearTimeout(retryStateRef.current.timeoutId)
        retryStateRef.current.timeoutId = null
      }

      // Clear backfill check timeout
      if (backfillCheckRef.current.timeoutId) {
        clearTimeout(backfillCheckRef.current.timeoutId)
        backfillCheckRef.current.timeoutId = null
      }
    }
  }, [])

  // Log when effectiveAnalysisJobId changes
  useEffect(() => {
    if (effectiveAnalysisJobId) {
      log.info('VideoAnalysisScreen', 'Effective analysis job ID resolved', {
        effectiveAnalysisJobId,
        fromProp: !!analysisJobId,
        fromState: !!analysisJob?.id,
      })
    }
  }, [effectiveAnalysisJobId, analysisJobId, analysisJob?.id])

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false)

  // Set up feedback status integration for real-time SSML/audio status updates
  // Use analysisUuid (from analyses table) for feedback queries, not job ID
  const audioController = useAudioController(feedbackAudio.activeAudio?.url || null)

  // Video-audio synchronization
  const videoAudioSync = useVideoAudioSync({
    isVideoPlaying: isPlaying,
    isAudioActive: audioController.isPlaying,
  })

  // Debug logging for audio state changes
  useEffect(() => {
    log.debug('VideoAnalysisScreen', 'Audio state updated', {
      hasActiveAudio: !!feedbackAudio.activeAudio,
      activeAudioId: feedbackAudio.activeAudio?.id,
      activeAudioUrl: feedbackAudio.activeAudio?.url
        ? `${feedbackAudio.activeAudio.url.substring(0, 50)}...`
        : null,
      isAudioPlaying: audioController.isPlaying,
      isVideoPlaying: isPlaying,
      shouldPlayVideo: videoAudioSync.shouldPlayVideo,
      shouldPlayAudio: videoAudioSync.shouldPlayAudio,
      isVideoPausedForAudio: videoAudioSync.isVideoPausedForAudio,
      audioCurrentTime: audioController.currentTime,
      audioDuration: audioController.duration,
      audioIsLoaded: audioController.isLoaded,
    })
  }, [
    feedbackAudio.activeAudio,
    audioController.isPlaying,
    audioController.currentTime,
    audioController.duration,
    audioController.isLoaded,
    isPlaying,
    videoAudioSync.shouldPlayVideo,
    videoAudioSync.shouldPlayAudio,
    videoAudioSync.isVideoPausedForAudio,
  ])

  // NOTE: No manual cleanup needed - useFeedbackStatusIntegration handles its own cleanup via useEffect
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

  // Audio control visibility - show when audio is actively playing (regardless of processing state)
  const shouldShowAudioControls = useMemo(() => {
    const shouldShow = !!(
      (feedbackAudio.activeAudio && audioController.isPlaying) // Only show when audio is actually playing
    )

    log.debug('VideoAnalysisScreen', 'Audio controls visibility calculated', {
      shouldShow,
      hasActiveAudio: !!feedbackAudio.activeAudio,
      isAudioPlaying: audioController.isPlaying,
      isProcessing,
      activeAudioId: feedbackAudio.activeAudio?.id,
    })

    return shouldShow
  }, [feedbackAudio.activeAudio, audioController.isPlaying, isProcessing])

  // Animate layout changes when panelFraction changes
  useEffect(() => {
    if (__DEV__) {
      log.debug('VideoAnalysisScreen', 'Panel fraction changed', {
        panelFraction,
        platform: Platform.OS,
      })
    }
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
      if (__DEV__) {
        log.debug('VideoAnalysisScreen', 'LayoutAnimation configured')
      }
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
      recordingId: derivedRecordingId,
      analysisId: analysisUuid,
      feedbackItemsCount: feedbackItems.length,
      feedbackItemsSample: feedbackItems.slice(0, 2).map((item, idx) => ({
        index: idx,
        id: item.id,
        timestamp: item.timestamp,
        type: item.type,
        category: item.category,
      })),
    })
  }, [analysisJobId, videoUri, feedbackItems, derivedRecordingId, analysisUuid])

  // STEP 1: Use provided videoUri or fallback
  const recordedVideoUri =
    videoUri || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  // Auto-start video playback when processing is complete (guarded to reduce renders)
  useEffect(() => {
    if (!isProcessing && !isPlaying) {
      log.info('VideoAnalysisScreen', 'Auto-start trigger activated: processing completed', {
        trigger: 'processing_completed',
        isProcessing,
        isPlaying,
        hasActiveAudio: !!feedbackAudio.activeAudio,
        videoUri: recordedVideoUri,
        duration: duration,
        platform: Platform.OS,
        recordingId: derivedRecordingId,
        analysisId: analysisUuid,
      })
      setIsPlaying(true)
    }
  }, [
    isProcessing,
    feedbackAudio.activeAudio,
    recordedVideoUri,
    duration,
    derivedRecordingId,
    analysisUuid,
  ]) // Removed isPlaying from deps to avoid re-triggering

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
    setIsPlaying(true)
    setVideoEnded(false) // Reset ended state when user plays
  }, [])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    setVideoEnded(false) // Reset ended state when user pauses
  }, [])

  const handleVideoEnd = useCallback(() => {
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
    setPendingSeek(0) // Seek to beginning
    setVideoEnded(false)
    setIsPlaying(true)
  }, [])

  const handleVideoLoad = useCallback(
    (data: { duration: number }) => {
      log.info('VideoAnalysisScreen', 'handleVideoLoad called', {
        duration: data.duration,
        isPlaying,
        isProcessing,
        hasActiveAudio: !!feedbackAudio.activeAudio,
        videoUri: recordedVideoUri,
        platform: Platform.OS,
        recordingId: derivedRecordingId,
        analysisId: analysisUuid,
      })
      setDuration(data.duration)
    },
    [
      isPlaying,
      isProcessing,
      feedbackAudio.activeAudio,
      recordedVideoUri,
      derivedRecordingId,
      analysisUuid,
    ]
  )

  const handleVideoTap = useCallback(() => {
    // For now, just log - controls will be added later
  }, [])

  // Handler for menu press from AppHeader - triggers fly-out menu in VideoControls
  const handleMenuPress = useCallback(() => {
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
      const feedbackItem = feedbackItems[index]
      if (!feedbackItem) {
        log.warn('VideoAnalysisScreen', 'showBubble called with invalid index', {
          bubbleIndex: index,
          feedbackItemsCount: feedbackItems.length,
        })
        return
      }

      log.info('VideoAnalysisScreen', 'showBubble called', {
        bubbleIndex: index,
        itemId: feedbackItem.id,
        itemTimestamp: feedbackItem.timestamp,
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

      // Calculate display duration based on audio duration
      // Use audio duration if available, otherwise fall back to 3 seconds
      const audioUrl = feedbackAudio.audioUrls[feedbackItem.id]
      const displayDuration =
        audioUrl && audioController.duration > 0
          ? Math.max(3000, audioController.duration * 1000) // At least 3 seconds, or audio duration
          : 3000 // Default 3 seconds fallback

      log.info('VideoAnalysisScreen', 'Setting bubble display duration', {
        itemId: feedbackItem.id,
        audioDuration: audioController.duration,
        displayDurationMs: displayDuration,
        hasAudioUrl: !!audioUrl,
        fallbackReason: !audioUrl
          ? 'no_audio_url'
          : audioController.duration <= 0
            ? 'no_duration'
            : 'using_audio_duration',
      })

      // Hide bubble after calculated duration
      bubbleTimerRef.current = setTimeout(() => {
        hideBubble()
      }, displayDuration)
    },
    [
      currentBubbleIndex,
      bubbleVisible,
      isPlaying,
      feedbackItems,
      feedbackAudio.audioUrls,
      audioController.duration,
    ]
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
        currentTime: currentTimeMs / 1000,
        currentBubbleIndex,
        bubbleVisible,
        feedbackItemsCount: feedbackItems.length,
      })

      // Check if we should show any feedback bubbles at this timestamp
      feedbackItems.forEach((item, index) => {
        const timeDiff = Math.abs(currentTimeMs - item.timestamp)
        const isNearTimestamp = timeDiff < 500 // Within 0.5 seconds

        // Allow showing the same bubble again if it's been hidden (for seek operations)
        const canShowBubble = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

        log.info('VideoAnalysisScreen', 'Checking bubble', {
          bubbleIndex: index,
          itemId: item.id,
          itemTimestamp: item.timestamp / 1000,
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
          // Show this bubble and auto-play audio if available
          log.info('VideoAnalysisScreen', 'Showing bubble', {
            bubbleIndex: index,
            itemId: item.id,
          })
          showBubble(index)

          // Auto-play audio for this feedback item if available
          if (feedbackAudio.audioUrls[item.id]) {
            feedbackAudio.selectAudio(item.id)
            audioController.setIsPlaying(true)
            log.info('VideoAnalysisScreen', 'Auto-playing audio for feedback bubble', {
              itemId: item.id,
            })
          }
        }
      })
    },
    [feedbackItems, currentBubbleIndex, bubbleVisible, showBubble, feedbackAudio, audioController]
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
        feedbackItems.forEach((item, index) => {
          const timeDiff = Math.abs(currentTimeMs - item.timestamp)
          const isNearTimestamp = timeDiff < 500 // Within 0.5 seconds

          // Allow showing the same bubble again if it's been hidden (for seek operations)
          const canShowBubble = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

          if (canShowBubble) {
            log.info('VideoAnalysisScreen', 'Bubble trigger during playback', {
              bubbleIndex: index,
              itemId: item.id,
              currentTimeMs,
              itemTimestamp: item.timestamp,
              timeDiff,
              isPlaying,
              reason: !bubbleVisible ? 'bubble not visible' : 'different bubble',
            })
            // Show this bubble and auto-play audio if available
            showBubble(index)

            // Auto-play audio for this feedback item if available
            if (feedbackAudio.audioUrls[item.id]) {
              feedbackAudio.selectAudio(item.id)
              audioController.setIsPlaying(true)
              log.info(
                'VideoAnalysisScreen',
                'Auto-playing audio for feedback bubble during playback',
                {
                  itemId: item.id,
                }
              )
            }
          }
        })

        return newTime
      })
    },
    [
      feedbackItems,
      currentBubbleIndex,
      bubbleVisible,
      showBubble,
      isPlaying,
      feedbackAudio,
      audioController,
    ]
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

  const handleFeedbackItemPress = useCallback(
    (item: any) => {
      log.info('VideoAnalysisScreen', 'Feedback item pressed', {
        itemId: item.id,
        timestamp: item.timestamp,
      })

      // Seek to the feedback item's timestamp
      const seekTime = item.timestamp / 1000 // Convert from milliseconds to seconds
      setPendingSeek(seekTime)

      // Highlight the pressed feedback item
      setSelectedFeedbackId(item.id)

      // Start audio playback for this feedback item if available
      if (feedbackAudio.audioUrls[item.id]) {
        feedbackAudio.selectAudio(item.id)
        audioController.setIsPlaying(true)
        log.info('VideoAnalysisScreen', 'Started audio playback for feedback', {
          feedbackId: item.id,
        })
      }

      // Make coach speak when feedback item is pressed
      setIsCoachSpeaking(true)
      setTimeout(() => setIsCoachSpeaking(false), 3000)
    },
    [feedbackAudio, audioController]
  )

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
                  isPlaying={videoAudioSync.shouldPlayVideo}
                  onPause={handlePause}
                  onEnd={handleVideoEnd}
                  onLoad={handleVideoLoad}
                  onProgress={handleVideoProgress}
                  seekToTime={pendingSeek}
                  onSeekComplete={() => {
                    log.info('VideoAnalysisScreen', 'onSeekComplete called', {
                      pendingSeek,
                      currentTime,
                      isPlaying: videoAudioSync.shouldPlayVideo,
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
                        seekedTime: seekedTimeMs / 1000,
                      })
                      checkAndShowBubbleAtTime(seekedTimeMs)
                    }

                    log.info('VideoAnalysisScreen', 'Clearing pending seek')
                    setPendingSeek(null)
                  }}
                />
              )}

              {/* Audio Player - renders audio-only video for feedback */}
              {feedbackAudio.activeAudio && (
                <AudioPlayer
                  audioUrl={feedbackAudio.activeAudio.url}
                  controller={audioController}
                  testID="feedback-audio-player"
                />
              )}

              {/* Overlay Components */}
              <MotionCaptureOverlay
                poseData={[]} // TODO: Connect to pose detection data
                isVisible={true}
              />

              <FeedbackBubbles
                messages={
                  currentBubbleIndex !== null && bubbleVisible && feedbackItems[currentBubbleIndex]
                    ? [
                        {
                          id: feedbackItems[currentBubbleIndex].id,
                          timestamp: feedbackItems[currentBubbleIndex].timestamp,
                          text: feedbackItems[currentBubbleIndex].text,
                          type: feedbackItems[currentBubbleIndex].type,
                          category: feedbackItems[currentBubbleIndex].category,
                          position: { x: 0.5, y: 0.3 }, // Default position for real feedback
                          isHighlighted: false,
                          isActive: true,
                        },
                      ]
                    : []
                }
                // onBubbleTap={handleFeedbackBubbleTap}
              />

              {shouldShowAudioControls && feedbackAudio.activeAudio && (
                <AudioFeedback
                  audioUrl={feedbackAudio.activeAudio.url}
                  controller={audioController}
                  onClose={() => {
                    audioController.setIsPlaying(false)
                    feedbackAudio.clearActiveAudio()
                    log.info('VideoAnalysisScreen', 'Audio overlay closed')
                  }}
                  isVisible={shouldShowAudioControls}
                  testID="audio-feedback-controls"
                />
              )}

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
        feedbackItems={feedbackItems.map((item) => ({
          ...item,
          audioUrl: feedbackAudio.audioUrls[item.id],
          audioStatus: item.audioStatus,
          audioError: feedbackAudio.errors[item.id],
        }))}
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
          feedbackAudio.clearError(feedbackId)
          log.info('VideoAnalysisScreen', 'Dismissing error for feedback', { feedbackId })
        }}
        onSelectAudio={(feedbackId) => {
          feedbackAudio.selectAudio(feedbackId)
          audioController.setIsPlaying(true) // Start playing when selected from panel
          log.info('VideoAnalysisScreen', 'Feedback audio selected from panel', { feedbackId })
        }}
      />

      {/* Connection warning overlay */}
      {channelExhausted && (
        <YStack
          position="absolute"
          top="$4"
          right="$4"
          padding="$2"
          backgroundColor="$orange9"
          borderRadius="$2"
          zIndex={1000}
        >
          <Text
            color="$white"
            fontSize="$2"
          >
            Connection unstable
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
