import type {
  AnalysisJob,
  AnalysisResults,
  AnalysisStatus,
  PoseData,
} from '@api/src/validation/cameraRecordingSchemas'
import { log, logBreadcrumb } from '@my/logging'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useVideoHistoryStore } from '../../HistoryProgress/stores/videoHistory'
import { resolveThumbnailUri } from '../../HistoryProgress/utils/thumbnailCache'

export interface AnalysisJobState extends AnalysisJob {
  // Additional UI state
  isSubscribed: boolean
  lastUpdated: number
}

export interface AnalysisQueue {
  queued: AnalysisJobState[]
  processing: AnalysisJobState[]
  completed: AnalysisJobState[]
  failed: AnalysisJobState[]
}

export interface AnalysisStatusStore {
  // Job tracking
  // DEPRECATED: Job data is no longer written to this store (migrated to TanStack Query)
  // These fields remain for backward compatibility but are not actively used
  // TODO: Remove in future cleanup - nothing writes to jobs Map anymore
  jobs: Map<number, AnalysisJobState>
  jobsByVideoId: Map<number, number> // videoRecordingId -> jobId
  queue: AnalysisQueue

  // Active subscriptions
  subscriptions: Map<number, () => void>

  // Global state
  isProcessingAny: boolean
  totalJobs: number
  completedJobs: number
  failedJobs: number

  // Real-time updates
  lastGlobalUpdate: number

  // Actions
  addJob: (job: AnalysisJob) => void
  updateJob: (jobId: number, updates: Partial<AnalysisJob>) => void
  removeJob: (jobId: number) => void

  // Status management
  setJobStatus: (jobId: number, status: AnalysisStatus, error?: string) => void
  updateJobProgress: (jobId: number, progress: number) => void
  setJobResults: (jobId: number, results: AnalysisResults, poseData?: PoseData) => void

  // Queue management
  getJobsByStatus: (status: AnalysisStatus) => AnalysisJobState[]
  getJobByVideoId: (videoRecordingId: number) => AnalysisJobState | null
  getActiveJobs: () => AnalysisJobState[]

  // Subscription management
  subscribeToJob: (jobId: number, unsubscribe: () => void) => void
  unsubscribeFromJob: (jobId: number) => void
  unsubscribeAll: () => void

  // Statistics
  getStats: () => {
    total: number
    queued: number
    processing: number
    completed: number
    failed: number
    successRate: number
  }

  // Cleanup
  clearCompleted: () => void
  clearFailed: () => void
  reset: () => void
}

const createEmptyQueue = (): AnalysisQueue => ({
  queued: [],
  processing: [],
  completed: [],
  failed: [],
})

const createJobState = (job: AnalysisJob): AnalysisJobState => ({
  ...job,
  isSubscribed: false,
  lastUpdated: Date.now(),
})

export const useAnalysisStatusStore = create<AnalysisStatusStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      jobs: new Map(),
      jobsByVideoId: new Map(),
      queue: createEmptyQueue(),
      subscriptions: new Map(),
      isProcessingAny: false,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      lastGlobalUpdate: Date.now(),

      // Add job
      addJob: (job) =>
        set((draft) => {
          const jobState = createJobState(job)
          draft.jobs.set(job.id, jobState)
          draft.jobsByVideoId.set(job.video_recording_id, job.id)

          // Add to appropriate queue
          switch (job.status) {
            case 'queued':
              draft.queue.queued.push(jobState)
              break
            case 'processing':
              draft.queue.processing.push(jobState)
              draft.isProcessingAny = true
              break
            case 'completed':
              draft.queue.completed.push(jobState)
              draft.completedJobs++
              break
            case 'failed':
              draft.queue.failed.push(jobState)
              draft.failedJobs++
              break
          }

          draft.totalJobs++
          draft.lastGlobalUpdate = Date.now()
        }),

      // Update job
      updateJob: (jobId, updates) =>
        set((draft) => {
          const job = draft.jobs.get(jobId)
          if (!job) return

          const oldStatus = job.status
          Object.assign(job, updates)
          job.lastUpdated = Date.now()

          // Move between queues if status changed
          if (updates.status && updates.status !== oldStatus) {
            // Remove from old queue
            const removeFromQueue = (queue: AnalysisJobState[]) => {
              const index = queue.findIndex((j) => j.id === jobId)
              if (index !== -1) queue.splice(index, 1)
            }

            switch (oldStatus) {
              case 'queued':
                removeFromQueue(draft.queue.queued)
                break
              case 'processing':
                removeFromQueue(draft.queue.processing)
                break
              case 'completed':
                removeFromQueue(draft.queue.completed)
                draft.completedJobs--
                break
              case 'failed':
                removeFromQueue(draft.queue.failed)
                draft.failedJobs--
                break
            }

            // Add to new queue
            switch (updates.status) {
              case 'queued':
                draft.queue.queued.push(job)
                break
              case 'processing':
                draft.queue.processing.push(job)
                break
              case 'completed':
                draft.queue.completed.push(job)
                draft.completedJobs++
                break
              case 'failed':
                draft.queue.failed.push(job)
                draft.failedJobs++
                break
            }
          }

          // Update global processing state
          draft.isProcessingAny = draft.queue.processing.length > 0
          draft.lastGlobalUpdate = Date.now()
        }),

      // Remove job
      removeJob: (jobId) =>
        set((draft) => {
          const job = draft.jobs.get(jobId)
          if (!job) return

          // Remove from maps
          draft.jobs.delete(jobId)
          draft.jobsByVideoId.delete(job.video_recording_id)

          // Remove from queue
          const removeFromQueue = (queue: AnalysisJobState[]) => {
            const index = queue.findIndex((j) => j.id === jobId)
            if (index !== -1) queue.splice(index, 1)
          }

          switch (job.status) {
            case 'queued':
              removeFromQueue(draft.queue.queued)
              break
            case 'processing':
              removeFromQueue(draft.queue.processing)
              break
            case 'completed':
              removeFromQueue(draft.queue.completed)
              draft.completedJobs--
              break
            case 'failed':
              removeFromQueue(draft.queue.failed)
              draft.failedJobs--
              break
          }

          // Unsubscribe if subscribed
          const unsubscribe = draft.subscriptions.get(jobId)
          if (unsubscribe) {
            unsubscribe()
            draft.subscriptions.delete(jobId)
          }

          draft.totalJobs--
          draft.isProcessingAny = draft.queue.processing.length > 0
          draft.lastGlobalUpdate = Date.now()
        }),

      // Set job status
      setJobStatus: (jobId, status, error) => {
        const job = get().jobs.get(jobId)
        const updates: Partial<AnalysisJob> = { status }

        if (error) {
          updates.error_message = error
        }

        if (status === 'processing' && !job?.processing_started_at) {
          updates.processing_started_at = new Date().toISOString()
          logBreadcrumb('video-analysis', 'Analysis started processing', {
            jobId,
            videoRecordingId: job?.video_recording_id,
          })
        }

        if (status === 'completed' || status === 'failed') {
          updates.processing_completed_at = new Date().toISOString()
          if (status === 'failed') {
            logBreadcrumb('video-analysis', 'Analysis failed', {
              jobId,
              videoRecordingId: job?.video_recording_id,
              error: error || 'Unknown error',
            })
          }
        }

        get().updateJob(jobId, updates)
      },

      // Update job progress
      updateJobProgress: (jobId, progress) => {
        get().updateJob(jobId, {
          progress_percentage: Math.min(100, Math.max(0, progress)),
        })
      },

      // Set job results
      setJobResults: (jobId, results, poseData) => {
        const job = get().jobs.get(jobId)
        get().updateJob(jobId, {
          status: 'completed',
          progress_percentage: 100,
          processing_completed_at: new Date().toISOString(),
          results,
          pose_data: poseData,
        })

        // Track analysis completion with breadcrumb
        logBreadcrumb('video-analysis', 'Analysis completed', {
          jobId,
          videoRecordingId: job?.video_recording_id,
          hasPoseAnalysis: !!results?.pose_analysis,
          hasMovementAnalysis: !!results?.movement_analysis,
          recommendationsCount: results?.recommendations?.length || 0,
        })

        // Write to video history cache (non-blocking)
        // Schedule for after render cycle using queueMicrotask
        queueMicrotask(() => {
          try {
            const job = get().jobs.get(jobId)
            if (job) {
              const historyStore = useVideoHistoryStore.getState()

              let thumbnailUri: string | undefined
              let storagePath: string | undefined
              let analysisTitle: string | undefined
              let fullFeedbackText: string | undefined

              // Use dynamic import to avoid circular dependencies
              // Fetch both video recording, analysis title, and fullFeedbackText in parallel
              // Try to fetch title and fullFeedbackText once (non-blocking), but don't wait if not available
              // Title subscription will update it later if needed
              Promise.all([
                import('@my/api').then(({ supabase }) =>
                  supabase
                    .from('video_recordings')
                    .select('thumbnail_url, metadata, storage_path')
                    .eq('id', job.video_recording_id)
                    .single()
                ),
                import('@my/api').then(async ({ supabase }) => {
                  // Try to fetch title once (non-blocking)
                  // If not available, title subscription will update it later
                  try {
                    const result = (await supabase
                      .from('analyses')
                      .select('title')
                      .eq('job_id', jobId)
                      .single()) as { data: { title: string | null } | null; error: any }

                    if (result.data?.title) {
                      return result.data.title
                    }
                    return null
                  } catch (error) {
                    log.debug(
                      'analysisStatus',
                      'Title fetch failed (will be updated by subscription)',
                      {
                        jobId,
                        error: error instanceof Error ? error.message : String(error),
                      }
                    )
                    return null
                  }
                }),
                import('@my/api').then(async ({ supabase }) => {
                  // Try to fetch fullFeedbackText once (non-blocking)
                  // If not available, background fetch will update it later
                  try {
                    const result = (await supabase
                      .from('analyses')
                      .select('full_feedback_text')
                      .eq('job_id', jobId)
                      .single()) as {
                      data: { full_feedback_text: string | null } | null
                      error: any
                    }

                    return result.data?.full_feedback_text ?? null
                  } catch (error) {
                    log.debug(
                      'analysisStatus',
                      'fullFeedbackText fetch failed (will be updated by background fetch)',
                      {
                        jobId,
                        error: error instanceof Error ? error.message : String(error),
                      }
                    )
                    return null
                  }
                }),
              ])
                .then(async ([videoResult, fetchedTitle, fetchedFullFeedbackText]) => {
                  // Extract analysis title and fullFeedbackText (may be null if not available yet)
                  analysisTitle = fetchedTitle ?? undefined
                  fullFeedbackText = fetchedFullFeedbackText ?? undefined

                  // Only use real title from database - don't cache dummy titles
                  // Title subscription will update it later if it becomes available
                  if (!analysisTitle) {
                    log.debug(
                      'analysisStatus',
                      'Title not available yet, will be updated by subscription',
                      {
                        jobId,
                      }
                    )
                  } else {
                    log.debug('analysisStatus', 'Title fetched successfully', {
                      jobId,
                      title: analysisTitle,
                    })
                  }

                  const { data: videoRecording } = videoResult
                  storagePath = videoRecording?.storage_path ?? undefined
                  const videoId = job.video_recording_id

                  // Resolve thumbnail using 3-tier caching strategy (shared utility)
                  thumbnailUri = await resolveThumbnailUri(
                    videoId,
                    {
                      thumbnail_url: videoRecording?.thumbnail_url,
                      metadata: videoRecording?.metadata as Record<string, unknown> | null,
                    },
                    {
                      onCacheUpdate: (uri) => {
                        historyStore.updateCache(job.id, { thumbnail: uri })
                      },
                      onPersistedUpdate: (uri) => {
                        historyStore.updateCache(job.id, { thumbnail: uri })
                      },
                      logContext: 'analysisStatus',
                    }
                  )

                  // Look up persisted videoUri from localUriIndex if available
                  // After migration to remote storage, metadata.localUri is no longer in DB
                  // Fast access: uploadVideo sets localUriIndex during upload
                  const persistedVideoUri = storagePath
                    ? historyStore.getLocalUri(storagePath)
                    : undefined

                  historyStore.addToCache({
                    id: job.id,
                    videoId: job.video_recording_id,
                    userId: job.user_id,
                    title: analysisTitle ?? '', // Use empty string as placeholder - subscription will update it
                    fullFeedbackText, // Store fullFeedbackText in cache
                    createdAt: job.created_at,
                    thumbnail: thumbnailUri, // Retrieved from video_recordings.metadata
                    videoUri: persistedVideoUri ?? undefined, // Use persisted path if available, convert null to undefined
                    results,
                    poseData,
                    storagePath,
                    avatarAssetKeyUsed: (job as any).avatar_asset_key_used ?? undefined,
                  })
                })
                .catch((error: unknown) => {
                  log.warn('analysisStatus', 'Failed to fetch video metadata or analysis title', {
                    error: error instanceof Error ? error.message : String(error),
                    videoId: job.video_recording_id,
                    jobId,
                  })
                  // Non-blocking - continue without thumbnail/title
                  // Don't cache dummy title - subscription will update it later
                  const persistedVideoUri = storagePath
                    ? historyStore.getLocalUri(storagePath)
                    : undefined

                  historyStore.addToCache({
                    id: job.id,
                    videoId: job.video_recording_id,
                    userId: job.user_id,
                    title: '', // Use empty string as placeholder - subscription will update it
                    createdAt: job.created_at,
                    thumbnail: thumbnailUri,
                    videoUri: persistedVideoUri ?? undefined,
                    results,
                    poseData,
                    storagePath,
                    avatarAssetKeyUsed: (job as any).avatar_asset_key_used ?? undefined,
                  })
                })

              // Update last sync timestamp
              historyStore.updateLastSync()
            }
          } catch (error) {
            // Cache write failures should not block analysis completion
            // Graceful degradation: cache miss will trigger DB fetch later
            log.error('analysisStatus', 'Failed to write to video history cache', { error })
          }
        })
      },

      // Get jobs by status
      getJobsByStatus: (status) => {
        const state = get()
        switch (status) {
          case 'queued':
            return state.queue.queued
          case 'processing':
            return state.queue.processing
          case 'completed':
            return state.queue.completed
          case 'failed':
            return state.queue.failed
          default:
            return []
        }
      },

      // Get job by video ID
      getJobByVideoId: (videoRecordingId) => {
        const state = get()
        const jobId = state.jobsByVideoId.get(videoRecordingId)
        return jobId ? state.jobs.get(jobId) || null : null
      },

      // Get active jobs
      getActiveJobs: () => {
        const state = get()
        return [...state.queue.queued, ...state.queue.processing]
      },

      // Subscribe to job
      subscribeToJob: (jobId, unsubscribe) =>
        set((draft) => {
          draft.subscriptions.set(jobId, unsubscribe)
          const job = draft.jobs.get(jobId)
          if (job) {
            job.isSubscribed = true
          }
        }),

      // Unsubscribe from job
      unsubscribeFromJob: (jobId) =>
        set((draft) => {
          const unsubscribe = draft.subscriptions.get(jobId)
          if (unsubscribe) {
            unsubscribe()
            draft.subscriptions.delete(jobId)
          }

          const job = draft.jobs.get(jobId)
          if (job) {
            job.isSubscribed = false
          }
        }),

      // Unsubscribe all
      unsubscribeAll: () =>
        set((draft) => {
          draft.subscriptions.forEach((unsubscribe: () => void) => unsubscribe())
          draft.subscriptions.clear()

          draft.jobs.forEach((job: AnalysisJobState) => {
            job.isSubscribed = false
          })
        }),

      // Get statistics
      getStats: () => {
        const state = get()
        const total = state.totalJobs
        const successRate = total > 0 ? (state.completedJobs / total) * 100 : 0

        return {
          total,
          queued: state.queue.queued.length,
          processing: state.queue.processing.length,
          completed: state.completedJobs,
          failed: state.failedJobs,
          successRate,
        }
      },

      // Clear completed jobs
      clearCompleted: () =>
        set((draft) => {
          draft.queue.completed.forEach((job: AnalysisJobState) => {
            draft.jobs.delete(job.id)
            draft.jobsByVideoId.delete(job.video_recording_id)

            const unsubscribe = draft.subscriptions.get(job.id)
            if (unsubscribe) {
              unsubscribe()
              draft.subscriptions.delete(job.id)
            }
          })

          draft.totalJobs -= draft.queue.completed.length
          draft.completedJobs = 0
          draft.queue.completed = []
          draft.lastGlobalUpdate = Date.now()
        }),

      // Clear failed jobs
      clearFailed: () =>
        set((draft) => {
          draft.queue.failed.forEach((job: AnalysisJobState) => {
            draft.jobs.delete(job.id)
            draft.jobsByVideoId.delete(job.video_recording_id)

            const unsubscribe = draft.subscriptions.get(job.id)
            if (unsubscribe) {
              unsubscribe()
              draft.subscriptions.delete(job.id)
            }
          })

          draft.totalJobs -= draft.queue.failed.length
          draft.failedJobs = 0
          draft.queue.failed = []
          draft.lastGlobalUpdate = Date.now()
        }),

      // Reset store
      reset: () =>
        set((draft) => {
          // Unsubscribe all
          draft.subscriptions.forEach((unsubscribe: () => void) => unsubscribe())

          // Reset state
          draft.jobs.clear()
          draft.jobsByVideoId.clear()
          draft.queue = createEmptyQueue()
          draft.subscriptions.clear()
          draft.isProcessingAny = false
          draft.totalJobs = 0
          draft.completedJobs = 0
          draft.failedJobs = 0
          draft.lastGlobalUpdate = Date.now()
        }),
    }))
  )
)

// Selectors for common state combinations
export const useAnalysisStatusSelectors = () => {
  const store = useAnalysisStatusStore()

  return {
    // Processing state
    isProcessingAny: store.isProcessingAny,
    hasQueuedJobs: store.queue.queued.length > 0,
    hasProcessingJobs: store.queue.processing.length > 0,
    hasCompletedJobs: store.queue.completed.length > 0,
    hasFailedJobs: store.queue.failed.length > 0,

    // Counts
    totalJobs: store.totalJobs,
    queuedCount: store.queue.queued.length,
    processingCount: store.queue.processing.length,
    completedCount: store.completedJobs,
    failedCount: store.failedJobs,

    // Statistics
    stats: store.getStats(),

    // Active subscriptions
    activeSubscriptions: store.subscriptions.size,
  }
}

// DEPRECATED: This hook reads from Zustand store which is no longer updated
// Use useAnalysisJob() from @app/hooks/useAnalysis instead (reads from TanStack Query)
// TODO: Remove in future cleanup - only used in tests
export const useAnalysisJobStatus = (jobId: number) => {
  const job = useAnalysisStatusStore((state) => state.jobs.get(jobId))

  return {
    job,
    exists: !!job,
    isQueued: job?.status === 'queued',
    isProcessing: job?.status === 'processing',
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    progress: job?.progress_percentage || 0,
    error: job?.error_message,
    results: job?.results,
    poseData: job?.pose_data,
    isSubscribed: job?.isSubscribed || false,
    lastUpdated: job?.lastUpdated,
  }
}

// DEPRECATED: This hook reads from Zustand store which is no longer updated
// Use useAnalysisJobByVideoId() from @app/hooks/useAnalysis instead (reads from TanStack Query)
// TODO: Remove in future cleanup - only used in tests
export const useAnalysisJobByVideo = (videoRecordingId: number) => {
  const getJobByVideoId = useAnalysisStatusStore((state) => state.getJobByVideoId)
  const job = getJobByVideoId(videoRecordingId)

  return useAnalysisJobStatus(job?.id || 0)
}
