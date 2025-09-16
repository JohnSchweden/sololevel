import { supabase } from '@api/src/supabase'
import type { AnalysisJob, PoseData } from '@api/src/validation/cameraRecordingSchemas'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePoseStore } from '../stores/MVPposeStore'
import { useAnalysisStatusStore } from '../stores/analysisStatus'

/**
 * Real-time analysis progress subscription hook
 * Connects Supabase Realtime to analysis status store and UI components
 */
export function useAnalysisRealtime(analysisId: number | null) {
  const queryClient = useQueryClient()
  const analysisStore = useAnalysisStatusStore()
  const subscriptionRef = useRef<any>(null)

  const handleAnalysisUpdate = useCallback(
    (payload: any) => {
      const updatedJob = payload.new as AnalysisJob

      // Update analysis status store
      analysisStore.updateJob(updatedJob.id, updatedJob)

      // Update TanStack Query cache
      queryClient.setQueryData(['analysis', updatedJob.id], updatedJob)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['analysis-history'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-stats'] })
    },
    [analysisStore, queryClient]
  )

  useEffect(() => {
    if (!analysisId) return

    // Create subscription
    subscriptionRef.current = supabase
      .channel(`analysis-${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${analysisId}`,
        },
        handleAnalysisUpdate
      )
      .subscribe()

    // Register subscription with store for cleanup
    const unsubscribe = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }

    analysisStore.subscribeToJob(analysisId, unsubscribe)

    return () => {
      unsubscribe()
      analysisStore.unsubscribeFromJob(analysisId)
    }
  }, [analysisId, handleAnalysisUpdate, analysisStore])

  return {
    isSubscribed: !!subscriptionRef.current,
    analysisId,
  }
}

/**
 * Real-time pose data streaming hook
 * Streams pose data via Supabase broadcast channels
 */
export function usePoseDataStream(analysisId: number | null) {
  const poseStore = usePoseStore()
  const subscriptionRef = useRef<any>(null)

  const handlePoseFrame = useCallback(
    (payload: any) => {
      try {
        const poseFrame = payload.payload as PoseData

        // Validate pose data before processing
        if (poseFrame.frames && poseFrame.frames.length > 0) {
          // Convert PoseData format to individual pose frame for processing
          const latestFrame = poseFrame.frames[poseFrame.frames.length - 1]
          if (latestFrame.keypoints && latestFrame.keypoints.length > 0) {
            poseStore.processPose({
              id: `pose-${latestFrame.timestamp}`,
              timestamp: latestFrame.timestamp,
              joints: latestFrame.keypoints.map((kp, index) => ({
                id: `joint-${index}`,
                x: kp.x,
                y: kp.y,
                confidence: kp.confidence,
                connections: [], // Empty connections for MVP
              })),
              confidence:
                latestFrame.keypoints.reduce((sum, kp) => sum + kp.confidence, 0) /
                latestFrame.keypoints.length,
            })
          }
        }
      } catch (error) {
        poseStore.addError(`Invalid pose data received: ${error}`)
      }
    },
    [poseStore]
  )

  useEffect(() => {
    if (!analysisId) return

    // Create broadcast subscription for pose data
    subscriptionRef.current = supabase
      .channel(`pose-data-${analysisId}`)
      .on('broadcast', { event: 'pose-frame' }, handlePoseFrame)
      .subscribe()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [analysisId, handlePoseFrame])

  return {
    isStreaming: !!subscriptionRef.current,
    currentPose: poseStore.currentPose,
    poseHistory: poseStore.poseHistory,
    processingQuality: poseStore.processingQuality,
  }
}

/**
 * Connection status monitoring hook
 * Tracks real-time connection health and provides reconnection logic
 */
export function useConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean
    reconnectAttempts: number
    lastError: string | null
  }>({
    isConnected: true,
    reconnectAttempts: 0,
    lastError: null,
  })

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Monitor global Supabase connection status
    // Note: Supabase v2 doesn't expose onConnStateChange directly
    // We'll monitor connection status through channel state changes

    // Create a test channel to monitor connection
    const testChannel = supabase.realtime.channel('connection-test')

    testChannel
      .on('system', {}, (status) => {
        console.log('Supabase connection status:', status)
        if (status === 'SUBSCRIBED') {
          setConnectionStatus((prev) => ({
            ...prev,
            isConnected: true,
            lastError: null,
            reconnectAttempts: 0,
          }))
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus((prev) => ({
            ...prev,
            isConnected: false,
            lastError: 'Channel connection failed',
            reconnectAttempts: prev.reconnectAttempts + 1,
          }))
        }
      })
      .subscribe()

    return () => {
      testChannel.unsubscribe()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return connectionStatus
}

/**
 * Combined real-time integration hook for VideoAnalysisScreen
 * Provides all real-time functionality in a single hook
 */
export function useVideoAnalysisRealtime(analysisId: number | null) {
  // Re-enable real-time functionality with proper error handling
  const analysisRealtime = useAnalysisRealtime(analysisId)
  const poseDataStream = usePoseDataStream(analysisId)
  const connectionStatus = useConnectionStatus()

  // Get current analysis job status - use stable selector with useCallback
  const analysisJob = useAnalysisStatusStore(
    useCallback((state) => (analysisId ? state.jobs.get(analysisId) : null), [analysisId])
  )

  // Memoize the return object to prevent infinite re-renders
  // Use stable dependencies - only track job ID and status, not the entire job object
  const jobId = analysisJob?.id
  const jobStatus = analysisJob?.status
  const jobProgress = analysisJob?.progress_percentage
  const jobError = analysisJob?.error_message

  return useMemo(
    () => ({
      // Analysis progress
      analysisJob,
      isAnalysisSubscribed: analysisRealtime.isSubscribed,

      // Pose data streaming
      currentPose: poseDataStream.currentPose,
      poseHistory: poseDataStream.poseHistory,
      isPoseStreaming: poseDataStream.isStreaming,
      processingQuality: poseDataStream.processingQuality,

      // Connection status
      isConnected: connectionStatus.isConnected,
      reconnectAttempts: connectionStatus.reconnectAttempts,
      connectionError: connectionStatus.lastError,

      // Combined status
      isFullyConnected:
        connectionStatus.isConnected && analysisRealtime.isSubscribed && poseDataStream.isStreaming,
    }),
    [
      // Use stable job properties instead of the entire job object
      jobId,
      jobStatus,
      jobProgress,
      jobError,
      analysisRealtime.isSubscribed,
      poseDataStream.currentPose,
      poseDataStream.poseHistory,
      poseDataStream.isStreaming,
      poseDataStream.processingQuality,
      connectionStatus.isConnected,
      connectionStatus.reconnectAttempts,
      connectionStatus.lastError,
    ]
  )
}
