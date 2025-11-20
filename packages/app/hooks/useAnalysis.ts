import { safeUpdateJobCache } from '@app/utils/safeCacheUpdate'
import type { Tables } from '@my/api'
import { type AnalysisResults, type PoseData } from '@my/api'
import {
  completeAnalysisJob,
  createAnalysisJob,
  deleteAnalysisJob,
  failAnalysisJob,
  getAnalysisJob,
  getAnalysisJobByVideoId,
  getAnalysisResults,
  getAnalysisStats,
  getPoseData,
  getUserAnalysisJobs,
  startAnalysisProcessing,
  subscribeToAnalysisJob,
  subscribeToUserAnalysisJobs,
  updateAnalysisJob,
  updateAnalysisProgress,
} from '@my/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAnalysisSubscriptionStore } from '../features/VideoAnalysis/stores/analysisSubscription'
import { analysisKeys } from './analysisKeys'

export type AnalysisJob = Tables<'analysis_jobs'>

// Re-export for backward compatibility
export { analysisKeys }

/**
 * Hook for creating analysis job
 */
export function useCreateAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (videoRecordingId: number) => {
      return createAnalysisJob(videoRecordingId)
    },
    onSuccess: (job) => {
      // Add to cache
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useCreateAnalysisJob')

      // Invalidate jobs list and stats
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    },
  })
}

/**
 * Hook for getting analysis job by ID
 */
export function useAnalysisJob(id: number) {
  return useQuery({
    queryKey: analysisKeys.job(id),
    queryFn: () => getAnalysisJob(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Hook for getting analysis job by video recording ID
 */
export function useAnalysisJobByVideoId(videoRecordingId: number) {
  return useQuery({
    queryKey: analysisKeys.jobByVideo(videoRecordingId),
    queryFn: () => getAnalysisJobByVideoId(videoRecordingId),
    enabled: !!videoRecordingId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Hook for getting user's analysis jobs
 */
export function useAnalysisJobs() {
  return useQuery({
    queryKey: analysisKeys.jobs(),
    queryFn: () => getUserAnalysisJobs(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook for updating analysis job
 */
export function useUpdateAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number
      updates: Parameters<typeof updateAnalysisJob>[1]
    }) => {
      return updateAnalysisJob(id, updates)
    },
    onSuccess: (job) => {
      // Update in cache
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useUpdateAnalysisJob')

      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
    },
  })
}

/**
 * Hook for starting analysis processing
 */
export function useStartAnalysisProcessing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return startAnalysisProcessing(id)
    },
    onSuccess: (job) => {
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useStartAnalysisProcessing')
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    },
  })
}

/**
 * Hook for updating analysis progress
 */
export function useUpdateAnalysisProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, progressPercentage }: { id: number; progressPercentage: number }) => {
      return updateAnalysisProgress(id, progressPercentage)
    },
    onSuccess: (job) => {
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useUpdateAnalysisProgress')
    },
  })
}

/**
 * Hook for completing analysis job
 */
export function useCompleteAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      results,
      poseData,
    }: {
      id: number
      results: AnalysisResults
      poseData?: PoseData
    }) => {
      return completeAnalysisJob(id, results, poseData)
    },
    onSuccess: (job) => {
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useStartAnalysisProcessing')
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    },
  })
}

/**
 * Hook for failing analysis job
 */
export function useFailAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, errorMessage }: { id: number; errorMessage: string }) => {
      return failAnalysisJob(id, errorMessage)
    },
    onSuccess: (job) => {
      safeUpdateJobCache(queryClient, job, analysisKeys, 'useStartAnalysisProcessing')
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    },
  })
}

/**
 * Hook for deleting analysis job
 */
export function useDeleteAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return deleteAnalysisJob(id)
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: analysisKeys.job(id) })

      // Invalidate jobs list and stats
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    },
  })
}

/**
 * Hook for getting analysis statistics
 */
export function useAnalysisStats() {
  return useQuery({
    queryKey: analysisKeys.stats(),
    queryFn: () => getAnalysisStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for extracting analysis results from job
 */
export function useAnalysisResults(job: AnalysisJob | null | undefined): AnalysisResults | null {
  if (!job) return null
  return getAnalysisResults(job)
}

/**
 * Hook for extracting pose data from job
 */
export function usePoseData(job: AnalysisJob | null | undefined): PoseData | null {
  if (!job) return null
  return getPoseData(job)
}

/**
 * Hook for real-time analysis job updates
 */
export function useAnalysisJobSubscription(id: number) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!id) return

    const unsubscribe = subscribeToAnalysisJob(id, (updatedJob) => {
      // Update cache with real-time data
      safeUpdateJobCache(queryClient, updatedJob, analysisKeys, 'useAnalysisJobSubscription')

      // Invalidate jobs list if status changed (defer to avoid triggering refetches during render)
      const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))
      if (currentJob?.status !== updatedJob.status) {
        queueMicrotask(() => {
          queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
          queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
        })
      }
    })

    return unsubscribe
  }, [id, queryClient])
}

/**
 * Hook for subscribing to all user's analysis jobs
 */
export function useAnalysisJobsSubscription() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = subscribeToUserAnalysisJobs((job, event) => {
      switch (event) {
        case 'INSERT':
          // Add new job to cache
          safeUpdateJobCache(queryClient, job, analysisKeys, 'useAnalysisJobsSubscription.INSERT')
          // New jobs always affect lists
          queueMicrotask(() => {
            queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
          })
          break

        case 'UPDATE': {
          // Update existing job in cache
          const prevJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(job.id))
          safeUpdateJobCache(queryClient, job, analysisKeys, 'useAnalysisJobsSubscription.UPDATE')

          // Only invalidate if status changed or structural change (results, etc.)
          const statusChanged = prevJob?.status !== job.status
          const progressOnly =
            prevJob?.status === job.status &&
            prevJob?.progress_percentage !== job.progress_percentage &&
            !job.results

          if (statusChanged) {
            // Status change - invalidate lists
            queueMicrotask(() => {
              queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
              queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
            })
          } else if (!progressOnly) {
            // Structural change (results, etc.) - use optimistic update for lists
            queueMicrotask(() => {
              queryClient.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] | undefined) => {
                if (!old) return old
                return old.map((j) => (j.id === job.id ? job : j))
              })
            })
          }
          // Progress-only updates don't need invalidation
          break
        }

        case 'DELETE':
          // Remove job from cache
          queryClient.removeQueries({ queryKey: analysisKeys.job(job.id) })
          // Deletions always affect lists
          queueMicrotask(() => {
            queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
          })
          break
      }
    })

    return unsubscribe
  }, [queryClient])
}

/**
 * Hook for polling analysis job status until completion
 * Disables polling when an active subscription exists (Realtime handles updates)
 */
export function useAnalysisJobPolling(id: number, enabled = true) {
  const queryClient = useQueryClient()

  const { data: job } = useQuery({
    queryKey: analysisKeys.job(id),
    queryFn: async () => {
      // Check if subscription already updated more recently
      const cached = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))
      const cachedUpdatedAt = cached?.updated_at

      const fetchedJob = await getAnalysisJob(id)

      // Only use poll result if it's newer than cache
      if (cachedUpdatedAt && fetchedJob?.updated_at) {
        const cachedTime = new Date(cachedUpdatedAt).getTime()
        const pollTime = new Date(fetchedJob.updated_at).getTime()
        if (pollTime <= cachedTime) {
          // Subscription already has newer data, return cache
          return cached
        }
      }

      return fetchedJob
    },
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      // Check if subscription is active - if so, disable polling
      const subscriptionKey = `job:${id}`
      const hasActiveSubscription =
        useAnalysisSubscriptionStore.getState().subscriptions.get(subscriptionKey)?.status ===
        'active'

      if (hasActiveSubscription) {
        // Let Realtime handle updates
        return false
      }

      const data = query.state.data
      // Stop polling when job is completed or failed
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false
      }
      // Poll every 2 seconds for processing jobs
      if (data.status === 'processing') {
        return 2000
      }
      // Poll every 5 seconds for queued jobs
      return 5000
    },
  })

  return job
}
