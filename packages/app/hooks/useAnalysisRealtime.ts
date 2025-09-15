import { supabase } from '@api/src/supabase'
import type { AnalysisJob, PoseData } from '@api/src/validation/cameraRecordingSchemas'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
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

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleConnectionChange = useCallback((status: string, error?: any) => {
    setConnectionStatus((prev) => ({
      ...prev,
      isConnected: status === 'SUBSCRIBED',
      lastError: error ? error.message : null,
    }))

    // Implement exponential backoff for reconnection
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      setConnectionStatus((prev) => {
        const newAttempts = prev.reconnectAttempts + 1
        const delay = Math.min(1000 * 2 ** newAttempts, 30000) // Max 30s

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          // Trigger reconnection attempt
          setConnectionStatus((current) => ({
            ...current,
            reconnectAttempts: newAttempts,
          }))
        }, delay)

        return {
          ...prev,
          reconnectAttempts: newAttempts,
          lastError: error?.message || 'Connection failed',
        }
      })
    } else if (status === 'SUBSCRIBED') {
      // Reset reconnection attempts on successful connection
      setConnectionStatus((prev) => ({
        ...prev,
        reconnectAttempts: 0,
        lastError: null,
      }))
    }
  }, [])

  useEffect(() => {
    // Monitor global Supabase connection status
    // Note: Supabase v2 doesn't expose onConnStateChange directly
    // We'll monitor connection status through channel state changes
    let isMonitoring = true

    const checkConnection = () => {
      if (!isMonitoring) return

      // Simple connection check by creating a test channel
      const testChannel = supabase.channel('connection-test')

      testChannel.subscribe((status) => {
        if (isMonitoring) {
          handleConnectionChange(status)
        }
      })

      // Cleanup test channel after a short delay
      setTimeout(() => {
        testChannel.unsubscribe()
      }, 1000)
    }

    // Initial check
    checkConnection()

    // Periodic connection checks
    const interval = setInterval(checkConnection, 10000) // Check every 10 seconds

    return () => {
      isMonitoring = false
      clearInterval(interval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [handleConnectionChange])

  return connectionStatus
}

/**
 * Combined real-time integration hook for VideoAnalysisScreen
 * Provides all real-time functionality in a single hook
 */
export function useVideoAnalysisRealtime(analysisId: number | null) {
  const analysisRealtime = useAnalysisRealtime(analysisId)
  const poseDataStream = usePoseDataStream(analysisId)
  const connectionStatus = useConnectionStatus()

  // Get current analysis job status
  const analysisJob = useAnalysisStatusStore((state) =>
    analysisId ? state.jobs.get(analysisId) : null
  )

  return {
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
  }
}
