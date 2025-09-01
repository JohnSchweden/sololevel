import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Tables } from '../../types/database'
import { type AnalysisResults, type PoseData } from '../services/analysisService'
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
} from '../services/analysisService'

export type AnalysisJob = Tables<'analysis_jobs'>

// Query keys for cache management
export const analysisKeys = {
  all: ['analysis'] as const,
  jobs: () => [...analysisKeys.all, 'jobs'] as const,
  job: (id: number) => [...analysisKeys.jobs(), id] as const,
  jobByVideo: (videoId: number) => [...analysisKeys.all, 'by-video', videoId] as const,
  stats: () => [...analysisKeys.all, 'stats'] as const,
}

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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)

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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)

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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
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
      queryClient.setQueryData(analysisKeys.job(job.id), job)
      queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
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
      queryClient.setQueryData(analysisKeys.job(id), updatedJob)
      queryClient.setQueryData(analysisKeys.jobByVideo(updatedJob.video_recording_id), updatedJob)

      // Invalidate jobs list if status changed
      const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))
      if (currentJob?.status !== updatedJob.status) {
        queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
        queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
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
          queryClient.setQueryData(analysisKeys.job(job.id), job)
          queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
          break

        case 'UPDATE':
          // Update existing job in cache
          queryClient.setQueryData(analysisKeys.job(job.id), job)
          queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
          break

        case 'DELETE':
          // Remove job from cache
          queryClient.removeQueries({ queryKey: analysisKeys.job(job.id) })
          break
      }

      // Invalidate lists for all events
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    })

    return unsubscribe
  }, [queryClient])
}

/**
 * Hook for polling analysis job status until completion
 */
export function useAnalysisJobPolling(id: number, enabled = true) {
  const { data: job } = useQuery({
    queryKey: analysisKeys.job(id),
    queryFn: () => getAnalysisJob(id),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
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
