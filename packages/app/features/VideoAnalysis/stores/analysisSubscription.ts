import { analysisKeys } from '@app/hooks/analysisKeys'
import { safeUpdateJobCache } from '@app/utils/safeCacheUpdate'
import {
  getLatestAnalysisJobForRecordingId,
  subscribeToAnalysisJob,
  subscribeToAnalysisTitle,
  subscribeToLatestAnalysisJobByRecordingId,
  supabase,
} from '@my/api'
import { log } from '@my/logging'
import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useVideoHistoryStore } from '../../HistoryProgress/stores/videoHistory'
import { resolveThumbnailUri } from '../../HistoryProgress/utils/thumbnailCache'
import { useFeedbackStatusStore } from './feedbackStatus'

export type SubscriptionStatus = 'idle' | 'pending' | 'active' | 'failed'

export interface SubscriptionState {
  // Job data removed - read from TanStack Query instead via getJob()
  jobId?: number | null // Track job ID for subscription metadata (not full job object)
  status: SubscriptionStatus
  retryAttempts: number
  retryTimeoutId: ReturnType<typeof setTimeout> | null
  backfillTimeoutId: ReturnType<typeof setTimeout> | null
  lastError?: string | null
  lastStatus?: string | null
  health?: unknown
  subscription?: () => void
  titleSubscription?: () => void
  subscriptionPromise?: Promise<void>
  // FIX: Track abort controllers for async operations to prevent writes after unmount
  // Use Set for O(1) deletion instead of array O(n) splice
  pendingOperations: Set<AbortController>
  // FIX: Track title receipt to delay cache invalidation until title is ready
  hasTitleReceived?: boolean
  pendingInvalidationTimeoutId?: ReturnType<typeof setTimeout> | null
}

export interface AnalysisJob {
  id: number
  video_recording_id: number | null
  status: string
  progress_percentage: number | null
  updated_at?: string
  [key: string]: unknown
}

export interface SubscriptionOptions {
  analysisJobId?: number
  recordingId?: number
}

interface AnalysisSubscriptionStoreState {
  subscriptions: Map<string, SubscriptionState>
  queryClient: QueryClient | null
  setQueryClient: (client: QueryClient) => void
  subscribe: (key: string, options: SubscriptionOptions) => Promise<void>
  unsubscribe: (key: string) => void
  getJob: (key: string) => AnalysisJob | null
  getStatus: (key: string) => SubscriptionStatus
  retry: (key: string) => Promise<void>
  reset: () => void
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 300
const BACKFILL_DELAY_MS = 500

const buildSubscriptionKey = (options: SubscriptionOptions) => {
  if (options.analysisJobId) {
    return `job:${options.analysisJobId}`
  }

  if (options.recordingId) {
    return `recording:${options.recordingId}`
  }

  return null
}

const createInitialState = (): Map<string, SubscriptionState> => new Map()

export const useAnalysisSubscriptionStore = create<AnalysisSubscriptionStoreState>()(
  immer((set, get) => ({
    subscriptions: createInitialState(),
    queryClient: null,

    setQueryClient: (client) => {
      set((draft) => {
        draft.queryClient = client
      })
    },

    subscribe: async (_key, options) => {
      const subscriptionKey = buildSubscriptionKey(options)
      if (!subscriptionKey) {
        log.warn('AnalysisSubscriptionStore', 'subscribe called without valid key', {
          options,
        })
        return
      }

      const state = get()
      const existing = state.subscriptions.get(subscriptionKey)

      // Guard: if already active/pending, return existing promise
      if (existing && (existing.status === 'pending' || existing.status === 'active')) {
        // Compile-time stripping: DEBUG logs removed in production builds
        if (__DEV__) {
          log.debug('AnalysisSubscriptionStore', 'Subscription already in progress/active', {
            subscriptionKey,
            status: existing.status,
          })
        }
        // Return existing promise if available to deduplicate concurrent calls
        return existing.subscriptionPromise
      }

      if (existing?.status === 'failed') {
        log.warn('AnalysisSubscriptionStore', 'Subscription previously failed - retry manually', {
          subscriptionKey,
        })
        return
      }

      // Create subscription promise and store it immediately to prevent concurrent calls
      const subscriptionPromise = (async () => {
        try {
          const unsubscribe = await createSubscription(subscriptionKey, options, get, set)

          set((draft) => {
            const current = draft.subscriptions.get(subscriptionKey)
            if (!current) return

            current.status = 'active'
            current.retryAttempts = 0
            current.subscription = unsubscribe
            // Clear promise after successful subscription
            current.subscriptionPromise = undefined
          })
        } catch (error) {
          log.error('AnalysisSubscriptionStore', 'Failed to create subscription', {
            error,
            subscriptionKey,
          })

          set((draft) => {
            const current = draft.subscriptions.get(subscriptionKey)
            if (current) {
              current.status = 'failed'
              current.lastError = error instanceof Error ? error.message : String(error)
              // Clear promise on failure
              current.subscriptionPromise = undefined
            }
          })
          throw error
        }
      })()

      // Store promise immediately to deduplicate concurrent calls
      // This must happen synchronously before the promise resolves to prevent race conditions
      set((draft) => {
        const current = draft.subscriptions.get(subscriptionKey)
        draft.subscriptions.set(subscriptionKey, {
          jobId: current?.jobId ?? null, // Track job ID only, not full job object
          status: 'pending',
          retryAttempts: current?.retryAttempts ?? 0,
          retryTimeoutId: current?.retryTimeoutId ?? null,
          backfillTimeoutId: current?.backfillTimeoutId ?? null,
          lastError: current?.lastError ?? null,
          lastStatus: current?.lastStatus ?? null,
          health: current?.health ?? null,
          subscription: current?.subscription,
          titleSubscription: current?.titleSubscription,
          subscriptionPromise,
          pendingOperations: current?.pendingOperations ?? new Set(), // FIX: Initialize abort controllers Set
          hasTitleReceived: current?.hasTitleReceived ?? false, // FIX: Initialize title tracking
          pendingInvalidationTimeoutId: current?.pendingInvalidationTimeoutId ?? null, // FIX: Initialize invalidation timeout
        })
      })

      return subscriptionPromise
    },

    unsubscribe: (key) => {
      set((draft) => {
        const current = draft.subscriptions.get(key)
        if (!current) {
          return
        }

        if (current.retryTimeoutId) {
          clearTimeout(current.retryTimeoutId)
        }

        if (current.backfillTimeoutId) {
          clearTimeout(current.backfillTimeoutId)
        }

        // FIX: Clear pending invalidation timeout on unsubscribe
        if (current.pendingInvalidationTimeoutId) {
          clearTimeout(current.pendingInvalidationTimeoutId)
        }

        // FIX: Abort all pending async operations to prevent writes after unmount
        if (current.pendingOperations) {
          current.pendingOperations.forEach((controller) => {
            try {
              controller.abort()
            } catch (error) {
              if (__DEV__) {
                log.debug('AnalysisSubscriptionStore', 'Error aborting operation', {
                  error,
                  key,
                })
              }
            }
          })
        }

        if (current.subscription) {
          try {
            current.subscription()
          } catch (error) {
            log.error('AnalysisSubscriptionStore', 'Error during unsubscribe', {
              error,
              key,
            })
          }
        }

        if (current.titleSubscription) {
          try {
            current.titleSubscription()
          } catch (error) {
            log.error('AnalysisSubscriptionStore', 'Error during title unsubscribe', {
              error,
              key,
            })
          }
        }

        draft.subscriptions.delete(key)
      })
    },

    getJob: (key) => {
      // Read job data from TanStack Query (single source of truth)
      const subscription = get().subscriptions.get(key)
      if (!subscription?.jobId) {
        return null
      }

      const queryClient = get().queryClient
      if (!queryClient) {
        return null
      }

      // Try to get job by ID first, then by video ID if available
      const options = parseSubscriptionKey(key)
      if (options?.analysisJobId) {
        return (
          queryClient.getQueryData<AnalysisJob>(analysisKeys.job(options.analysisJobId)) ?? null
        )
      }
      if (options?.recordingId) {
        return (
          queryClient.getQueryData<AnalysisJob>(analysisKeys.jobByVideo(options.recordingId)) ??
          null
        )
      }

      // Fallback: try to get by stored jobId
      return queryClient.getQueryData<AnalysisJob>(analysisKeys.job(subscription.jobId)) ?? null
    },

    getStatus: (key) => {
      return get().subscriptions.get(key)?.status ?? 'idle'
    },

    retry: async (key) => {
      const state = get()
      const current = state.subscriptions.get(key)
      if (!current) {
        log.warn('AnalysisSubscriptionStore', 'retry called for missing key', { key })
        return
      }

      if (current.retryAttempts >= MAX_RETRIES) {
        log.warn('AnalysisSubscriptionStore', 'Max retries reached', {
          key,
          attempts: current.retryAttempts,
        })

        set((draft) => {
          const subscription = draft.subscriptions.get(key)
          if (!subscription) return
          subscription.status = 'failed'
        })
        return
      }

      set((draft) => {
        const subscription = draft.subscriptions.get(key)
        if (!subscription) return
        subscription.retryAttempts += 1
        subscription.status = 'pending'
      })

      const options = parseSubscriptionKey(key)
      if (!options) {
        log.error('AnalysisSubscriptionStore', 'Failed to parse key during retry', { key })
        set((draft) => {
          const subscription = draft.subscriptions.get(key)
          if (!subscription) return
          subscription.status = 'failed'
          subscription.lastError = 'Invalid subscription key'
        })
        return
      }

      try {
        const unsubscribe = await createSubscription(key, options, get, set)

        set((draft) => {
          const subscription = draft.subscriptions.get(key)
          if (!subscription) return
          subscription.retryTimeoutId = null
          subscription.subscription = unsubscribe
        })
      } catch (error) {
        log.error('AnalysisSubscriptionStore', 'Retry subscription failed', {
          key,
          error,
        })

        void scheduleRetry(key, get, set)
      }
    },

    reset: () => {
      set((draft) => {
        draft.subscriptions.forEach((subscription, key) => {
          if (subscription.retryTimeoutId) {
            clearTimeout(subscription.retryTimeoutId)
          }
          if (subscription.backfillTimeoutId) {
            clearTimeout(subscription.backfillTimeoutId)
          }
          // FIX: Abort all pending async operations
          if (subscription.pendingOperations) {
            subscription.pendingOperations.forEach((controller) => {
              try {
                controller.abort()
              } catch (error) {
                if (__DEV__) {
                  log.debug('AnalysisSubscriptionStore', 'Error aborting operation during reset', {
                    error,
                    key,
                  })
                }
              }
            })
          }
          if (subscription.subscription) {
            try {
              subscription.subscription()
            } catch (error) {
              log.error('AnalysisSubscriptionStore', 'Error during reset unsubscribe', {
                error,
                key,
              })
            }
          }
          if (subscription.titleSubscription) {
            try {
              subscription.titleSubscription()
            } catch (error) {
              log.error('AnalysisSubscriptionStore', 'Error during reset title unsubscribe', {
                error,
                key,
              })
            }
          }
        })

        draft.subscriptions.clear()
      })
    },
  }))
)

type StoreGetter = () => AnalysisSubscriptionStoreState
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreSetter = any

function parseSubscriptionKey(key: string): SubscriptionOptions | null {
  if (key.startsWith('job:')) {
    return { analysisJobId: Number.parseInt(key.slice(4), 10) }
  }

  if (key.startsWith('recording:')) {
    return { recordingId: Number.parseInt(key.slice(10), 10) }
  }

  return null
}

function createSubscription(
  key: string,
  options: SubscriptionOptions,
  get: StoreGetter,
  set: StoreSetter
): Promise<() => void> {
  if (options.analysisJobId) {
    return new Promise((resolve, reject) => {
      const unsubscribeJob = subscribeToAnalysisJob(
        options.analysisJobId!,
        (job) => handleJobUpdate(key, job, set, get),
        {
          onStatus: (status, details) => handleStatusUpdate(key, status, details, set, get),
          onError: (error, details) => handleSubscriptionError(key, error, details, get, set),
        }
      )

      if (!unsubscribeJob) {
        reject(new Error('subscribeToAnalysisJob returned undefined unsubscribe'))
        return
      }

      // Subscribe to analyses table to get title, fullFeedbackText, and UUID as soon as they're available
      // This happens right after LLM analysis completes, before job status = 'completed'
      // The UUID is critical for subscribing to feedback items
      const unsubscribeTitle = subscribeToAnalysisTitle(
        options.analysisJobId!,
        (title: string | null, fullFeedbackText: string | null, analysisUuid?: string | null) =>
          handleTitleUpdate(
            key,
            options.analysisJobId!,
            title,
            fullFeedbackText,
            set,
            get,
            analysisUuid
          )
      )

      resolve(() => {
        try {
          unsubscribeJob()
          if (unsubscribeTitle) {
            unsubscribeTitle()
          }
        } catch (error) {
          log.error('AnalysisSubscriptionStore', 'Error during unsubscribe', {
            key,
            error,
          })
        }
      })
    })
  }

  if (options.recordingId) {
    log.info('AnalysisSubscriptionStore', 'Creating recording subscription', {
      key,
      recordingId: options.recordingId,
    })

    return new Promise((resolve, reject) => {
      const unsubscribe = subscribeToLatestAnalysisJobByRecordingId(
        options.recordingId!,
        (job) => handleJobUpdate(key, job, set, get),
        {
          onStatus: (status, details) => handleStatusUpdate(key, status, details, set, get),
          onError: (error, details) => handleSubscriptionError(key, error, details, get, set),
        }
      )

      if (!unsubscribe) {
        reject(new Error('subscribeToLatestAnalysisJobByRecordingId returned undefined'))
        return
      }

      resolve(() => {
        try {
          unsubscribe()
          // Also unsubscribe from title if it was set up
          const subscription = get().subscriptions.get(key)
          if (subscription?.titleSubscription) {
            subscription.titleSubscription()
          }
        } catch (error) {
          log.error('AnalysisSubscriptionStore', 'Error during unsubscribe', {
            key,
            error,
          })
        }
      })
    })
  }

  return Promise.reject(new Error('Missing subscription parameters'))
}

function handleTitleUpdate(
  key: string,
  jobId: number,
  title: string | null,
  fullFeedbackText: string | null,
  set: StoreSetter,
  get: StoreGetter,
  analysisUuid?: string | null
): void {
  // PERF: Skip duplicate title processing - title subscription can fire multiple times
  // (e.g., after job completion). Only process once per subscription.
  const existingSubscription = get().subscriptions.get(key)
  if (existingSubscription?.hasTitleReceived) {
    // Compile-time stripping: DEBUG logs removed in production builds
    if (__DEV__) {
      log.debug('AnalysisSubscriptionStore', 'Skipping duplicate title update', {
        key,
        jobId,
        hasTitle: !!title,
      })
    }
    return
  }

  log.info('AnalysisSubscriptionStore', 'Analysis content update received', {
    key,
    jobId,
    title,
    hasTitle: !!title,
    hasFullFeedbackText: !!fullFeedbackText,
    analysisUuid,
  })

  // Mark title as received to prevent duplicate processing
  set((draft: AnalysisSubscriptionStoreState) => {
    const sub = draft.subscriptions.get(key)
    if (sub) {
      sub.hasTitleReceived = true
    }
  })

  // FIX: Store the UUID in Zustand cache immediately when received
  // This is the earliest point we get the UUID (right after LLM analysis, before SSML/audio)
  // The UUID is needed for feedback subscription
  if (analysisUuid) {
    const historyStore = useVideoHistoryStore.getState()
    const existingUuid = historyStore.getUuid(jobId)
    if (!existingUuid) {
      log.info('AnalysisSubscriptionStore', 'Storing analysis UUID from title subscription', {
        jobId,
        analysisUuid,
      })
      historyStore.setUuid(jobId, analysisUuid)
    }

    // FIX: Start feedback subscription IMMEDIATELY when UUID is received
    // Don't wait for React render cycles - the feedback rows are inserted
    // milliseconds after the analyses row is created on the server
    const feedbackStore = useFeedbackStatusStore.getState()
    const isAlreadySubscribed = feedbackStore.subscriptions.has(analysisUuid)
    const subscriptionStatus = feedbackStore.subscriptionStatus.get(analysisUuid)
    const isActiveOrPending = subscriptionStatus === 'active' || subscriptionStatus === 'pending'

    if (!isAlreadySubscribed && !isActiveOrPending) {
      log.info(
        'AnalysisSubscriptionStore',
        'Starting feedback subscription immediately from title callback',
        {
          jobId,
          analysisUuid,
        }
      )
      feedbackStore.subscribeToAnalysisFeedbacks(analysisUuid).catch((error) => {
        log.error(
          'AnalysisSubscriptionStore',
          'Failed to start feedback subscription from title callback',
          {
            jobId,
            analysisUuid,
            error: error instanceof Error ? error.message : String(error),
          }
        )
      })
    }
  }

  // Update cache if we have either title or fullFeedbackText
  const hasContent = title || fullFeedbackText
  if (!hasContent) {
    // Compile-time stripping: DEBUG logs removed in production builds
    if (__DEV__) {
      log.debug(
        'AnalysisSubscriptionStore',
        'Skipping update - both title and fullFeedbackText are null/empty',
        {
          key,
          jobId,
        }
      )
    }
    return
  }

  // FIX: Mark title as received and trigger pending invalidation if needed
  set((draft: AnalysisSubscriptionStoreState) => {
    const subscription = draft.subscriptions.get(key)
    if (subscription) {
      subscription.hasTitleReceived = true

      // Clear any pending invalidation timeout since title is now ready
      if (subscription.pendingInvalidationTimeoutId) {
        clearTimeout(subscription.pendingInvalidationTimeoutId)
        subscription.pendingInvalidationTimeoutId = null
      }
    }
  })

  // NOTE: Removed invalidateQueries here - we now update TanStack Query cache directly
  // in the async block below after addToCache, avoiding unnecessary server refetch

  // FIX: Create abort controller for this async operation
  const abortController = new AbortController()
  const subscription = get().subscriptions.get(key)
  if (subscription) {
    // Store abort controller in subscription state for cleanup on unmount
    set((draft: AnalysisSubscriptionStoreState) => {
      const sub = draft.subscriptions.get(key)
      if (sub) {
        if (!sub.pendingOperations) {
          sub.pendingOperations = new Set()
        }
        sub.pendingOperations.add(abortController)
      }
    })
  }

  // Update cache with title immediately when it becomes available
  // Schedule for after render cycle using Promise.resolve().then() for true async deferral
  Promise.resolve().then(async () => {
    // FIX: Check abort signal before proceeding
    if (abortController.signal.aborted) {
      return
    }

    try {
      const historyStore = useVideoHistoryStore.getState()
      const queryClient = get().queryClient

      // FIX: Check abort signal before writing to stores
      if (abortController.signal.aborted) {
        return
      }

      // Update Zustand cache with title and/or fullFeedbackText
      const cached = historyStore.getCached(jobId)
      if (cached) {
        if (abortController.signal.aborted) {
          return
        }
        const updates: { title?: string; fullFeedbackText?: string } = {}
        if (title) {
          updates.title = title
        }
        if (fullFeedbackText) {
          updates.fullFeedbackText = fullFeedbackText
        }
        historyStore.updateCache(jobId, updates)
        log.info(
          'AnalysisSubscriptionStore',
          'Updated cache with analysis content from analyses subscription',
          {
            jobId,
            hasTitle: !!title,
            hasFullFeedbackText: !!fullFeedbackText,
          }
        )
      }

      // Also update TanStack Query cache if job exists
      if (queryClient && !abortController.signal.aborted) {
        const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId))
        if (currentJob && currentJob.video_recording_id !== null) {
          if (abortController.signal.aborted) {
            return
          }
          const updatedJob = {
            ...currentJob,
            ...(title ? { title } : {}),
          } as AnalysisJob & {
            video_recording_id: number
          }
          safeUpdateJobCache(queryClient, updatedJob, analysisKeys, 'handleTitleUpdate')
          if (__DEV__) {
            log.debug(
              'AnalysisSubscriptionStore',
              'Updated TanStack Query cache with analysis content',
              {
                jobId,
                hasTitle: !!title,
                hasFullFeedbackText: !!fullFeedbackText,
              }
            )
          }
        }
      }

      if (!cached && !abortController.signal.aborted) {
        // Cache doesn't exist yet - try to get job data from TanStack Query to create minimal entry
        // FIX: Use jobId parameter directly instead of subscription.jobId (which may not be set yet)
        const job = queryClient
          ? (queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId)) ?? null)
          : null

        if (job && !abortController.signal.aborted) {
          // Fetch thumbnail from video_recordings to include in minimal cache entry
          // This ensures thumbnails are available even if setJobResults runs later
          // FIX: Check abort signal before async operation
          if (abortController.signal.aborted) {
            return
          }

          const { data: videoRecording } = await supabase
            .from('video_recordings')
            .select('thumbnail_url, storage_path, metadata')
            .eq('id', job.video_recording_id ?? 0)
            .single()

          // FIX: Check abort signal after async operation
          if (abortController.signal.aborted) {
            return
          }

          // Resolve thumbnail using 3-tier caching strategy (shared utility)
          const videoId = job.video_recording_id ?? 0
          const thumbnailUri = await resolveThumbnailUri(
            videoId,
            {
              thumbnail_url: videoRecording?.thumbnail_url,
              metadata: videoRecording?.metadata as Record<string, unknown> | null,
            },
            {
              onCacheUpdate: (uri) => {
                // FIX: Check abort signal before writing to store
                if (abortController.signal.aborted) {
                  return
                }
                const historyStore = useVideoHistoryStore.getState()
                historyStore.updateCache(job.id, { thumbnail: uri })
              },
              onPersistedUpdate: (uri) => {
                // FIX: Check abort signal before writing to store
                if (abortController.signal.aborted) {
                  return
                }
                const historyStore = useVideoHistoryStore.getState()
                historyStore.updateCache(job.id, { thumbnail: uri })
              },
              logContext: 'AnalysisSubscriptionStore',
            }
          )

          // FIX: Final abort check before creating cache entry
          if (abortController.signal.aborted) {
            return
          }

          // Create minimal cache entry with title, thumbnail, and job data
          // setJobResults will update it with full data later
          const jobCreatedAt =
            typeof job.created_at === 'string' ? job.created_at : new Date().toISOString()
          const jobUserId = typeof (job as any).user_id === 'string' ? (job as any).user_id : ''
          const jobResults = (job as any).results || {
            feedback: [],
            text_feedback: '',
            summary_text: '',
            processing_time: 0,
            video_source: '',
          }

          // Resolve videoUri from localUriIndex (device-local storage)
          // After migration to remote storage, metadata.localUri is no longer written to DB
          // Fast access path: uploadVideo sets localUriIndex immediately during upload
          const storagePath = videoRecording?.storage_path ?? undefined
          const videoUri = storagePath
            ? (historyStore.getLocalUri(storagePath) ?? undefined)
            : undefined

          // Only create cache entry if we have a title (required field)
          // If title is null, use job.title as fallback, or skip if neither exists
          const jobTitle = (job as any).title as string | undefined
          const cacheTitle = (title ?? jobTitle ?? '') as string
          if (!cacheTitle) {
            if (__DEV__) {
              log.debug(
                'AnalysisSubscriptionStore',
                'Skipping cache entry creation - no title available',
                {
                  jobId: job.id,
                }
              )
            }
            return
          }

          historyStore.addToCache({
            id: job.id,
            videoId: job.video_recording_id ?? 0,
            userId: jobUserId,
            title: cacheTitle, // Use title from subscription, fallback to job.title
            fullFeedbackText: fullFeedbackText ?? undefined,
            createdAt: jobCreatedAt,
            thumbnail: thumbnailUri,
            storagePath,
            videoUri,
            results: jobResults,
          })

          // CRITICAL FIX: Also update TanStack Query cache directly
          // This avoids the need for a server refetch - the new video appears immediately
          const queryClient = get().queryClient
          if (queryClient && cacheTitle) {
            // Use the same title as cache entry (already validated above)
            const newVideoItem = {
              id: job.id,
              videoId: job.video_recording_id ?? 0,
              title: cacheTitle,
              createdAt: jobCreatedAt,
              thumbnailUri: thumbnailUri,
              cloudThumbnailUrl: videoRecording?.thumbnail_url ?? undefined,
            }

            // Update TanStack Query cache by prepending the new video
            // Use a reasonable default limit (10) - matches useHistoryQuery default
            const defaultLimit = 10
            queryClient.setQueryData<
              Array<{
                id: number
                videoId: number
                title: string
                createdAt: string
                thumbnailUri?: string
                cloudThumbnailUrl?: string
              }>
            >(['history', 'completed', defaultLimit], (old) => {
              if (!old) return [newVideoItem]
              // Don't add if already exists (prevent duplicates)
              if (old.some((item) => item.id === job.id)) return old
              // Prepend new video and maintain limit
              return [newVideoItem, ...old].slice(0, defaultLimit)
            })

            log.info('AnalysisSubscriptionStore', 'Updated TanStack Query cache with new video', {
              jobId: job.id,
              title,
            })
          }

          log.info(
            'AnalysisSubscriptionStore',
            'Created minimal cache entry with title, thumbnail, and videoUri from analyses subscription',
            {
              jobId,
              title,
              hasThumbnail: !!thumbnailUri,
              hasVideoUri: !!videoUri,
              videoUriSource: videoUri
                ? videoUri.includes('recordings/')
                  ? 'persisted'
                  : 'metadata'
                : 'none',
              thumbnailSource: videoRecording?.thumbnail_url
                ? 'cloud'
                : videoRecording?.metadata
                  ? 'metadata'
                  : 'none',
            }
          )
        } else if (!abortController.signal.aborted) {
          // H10 FIX: Job data not available yet - create minimal cache entry with just title/fullFeedbackText
          // This ensures UI gets the data immediately, even if full job data isn't loaded yet
          if (title || fullFeedbackText) {
            // FIX: Use jobId parameter directly instead of subscription.jobId
            const jobFromQuery = queryClient
              ? (queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId)) ?? null)
              : null
            const recordingId = jobFromQuery?.video_recording_id ?? null

            historyStore.addToCache({
              id: jobId,
              videoId: recordingId ?? 0, // Will be updated when full job data loads
              userId: jobFromQuery ? ((jobFromQuery as any).user_id ?? '') : '', // Will be updated when full job data loads
              title: title ?? 'Analysis', // Use provided title or fallback
              fullFeedbackText: fullFeedbackText ?? undefined,
              createdAt: jobFromQuery?.created_at
                ? typeof jobFromQuery.created_at === 'string'
                  ? jobFromQuery.created_at
                  : new Date().toISOString()
                : new Date().toISOString(),
              results: {
                feedback: [],
                text_feedback: fullFeedbackText ?? '',
                summary_text: '',
                processing_time: 0,
                video_source: '',
              } as any, // Type assertion to match existing pattern in codebase
            })
            log.info(
              'AnalysisSubscriptionStore',
              'Created minimal cache entry with title/fullFeedbackText (job data not yet available)',
              {
                jobId,
                title,
                hasFullFeedbackText: !!fullFeedbackText,
              }
            )
          } else {
            if (__DEV__) {
              log.debug(
                'AnalysisSubscriptionStore',
                'Cache and job data not found, title will be set when cache is created',
                {
                  jobId,
                  title,
                }
              )
            }
          }
        }
      }
    } catch (error) {
      // FIX: Ignore AbortError - it's expected when component unmounts
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      if (abortController.signal.aborted) {
        return
      }
      log.warn('AnalysisSubscriptionStore', 'Error updating cache with title', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      // FIX: Remove abort controller from subscription state when operation completes
      // Use Set.delete() for O(1) removal instead of array indexOf + splice O(n)
      set((draft: AnalysisSubscriptionStoreState) => {
        const sub = draft.subscriptions.get(key)
        if (sub?.pendingOperations) {
          sub.pendingOperations.delete(abortController)
        }
      })
    }
  })
}

/**
 * Prepend a completed analysis to the history cache without full refetch.
 * This is more efficient than invalidateQueries - we add the new item directly.
 */
function prependToHistoryCache(
  jobId: number,
  title: string,
  fullFeedbackText: string,
  get: StoreGetter
): void {
  const queryClient = get().queryClient
  if (!queryClient) {
    log.warn('AnalysisSubscriptionStore', 'QueryClient not set - cannot prepend to history', {
      jobId,
    })
    return
  }

  // Get the job data from TanStack Query cache
  const job = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId))
  if (!job || !job.video_recording_id) {
    log.warn('AnalysisSubscriptionStore', 'Job not in cache - falling back to invalidation', {
      jobId,
    })
    queryClient.invalidateQueries({ queryKey: analysisKeys.historyCompleted() })
    return
  }

  // Get thumbnail from video history store if available
  const historyStore = useVideoHistoryStore.getState()
  const cached = historyStore.getCached(jobId)
  const thumbnailUri = cached?.thumbnail
  const cloudThumbnailUrl = cached?.cloudThumbnailUrl

  // Build the VideoItem to prepend (includes fullFeedbackText for immediate availability)
  const newItem = {
    id: jobId,
    videoId: job.video_recording_id,
    title,
    createdAt: job.updated_at || new Date().toISOString(),
    thumbnailUri,
    cloudThumbnailUrl,
    fullFeedbackText,
  }

  // Prepend to TanStack Query cache (all limit variants)
  const limits = [10, 20, 50] // Common limit values
  for (const limit of limits) {
    const queryKey = ['history', 'completed', limit] as const
    const existing = queryClient.getQueryData<(typeof newItem)[]>(queryKey)
    if (existing) {
      // Check if item already exists (avoid duplicates)
      if (!existing.some((item) => item.id === jobId)) {
        queryClient.setQueryData(queryKey, [newItem, ...existing.slice(0, limit - 1)])
        log.info('AnalysisSubscriptionStore', 'Prepended new item to history cache', {
          jobId,
          title,
          limit,
          newCacheSize: Math.min(existing.length + 1, limit),
        })
      }
    } else {
      // Cache doesn't exist yet (history never opened) - create with new item
      queryClient.setQueryData(queryKey, [newItem])
      log.info('AnalysisSubscriptionStore', 'Created history cache with new item', {
        jobId,
        title,
        limit,
      })
    }
  }

  // Note: Zustand store (full CachedAnalysis with results) gets populated when:
  // 1. User navigates to the video analysis screen (triggers fetch of full details)
  // 2. History query refetches (on pull-to-refresh, etc.)
  // We only need to update TanStack Query cache here for immediate list display.
}

function handleJobUpdate(key: string, job: AnalysisJob, set: StoreSetter, get: StoreGetter) {
  const subscription = get().subscriptions.get(key)
  const previousStatus = subscription?.lastStatus
  const previousJobId = subscription?.jobId

  // Update TanStack Query cache (single source of truth for job data)
  const queryClient = get().queryClient
  if (queryClient && job.video_recording_id !== null) {
    safeUpdateJobCache(
      queryClient,
      job as AnalysisJob & { video_recording_id: number },
      analysisKeys,
      'analysisSubscription.handleJobUpdate'
    )
  }

  set((draft: AnalysisSubscriptionStoreState) => {
    const subscription = draft.subscriptions.get(key)
    if (!subscription) {
      log.warn('AnalysisSubscriptionStore', 'Received job update for unknown key', {
        key,
        jobId: job.id,
      })
      return
    }

    log.info('AnalysisSubscriptionStore', 'Job update received', {
      key,
      jobId: job.id,
      status: job.status,
      progress: job.progress_percentage,
    })

    // Update subscription metadata only (not job data - that's in TanStack Query)
    subscription.jobId = job.id // Track job ID for metadata purposes
    subscription.lastStatus = job.status

    if (subscription.status !== 'active') {
      subscription.status = 'active'
    }
  })

  // Subscribe to title when we first receive a jobId (for recording subscriptions)
  // This happens when subscribing via recordingId - we get the jobId later
  // The title subscription also provides the UUID needed for feedback subscription
  if (previousJobId !== job.id && job.id) {
    const subscription = get().subscriptions.get(key)
    if (subscription && !subscription.titleSubscription) {
      log.info('AnalysisSubscriptionStore', 'Setting up title subscription for job', {
        key,
        jobId: job.id,
      })
      try {
        const unsubscribeTitle = subscribeToAnalysisTitle(
          job.id,
          (title: string | null, fullFeedbackText: string | null, analysisUuid?: string | null) =>
            handleTitleUpdate(key, job.id, title, fullFeedbackText, set, get, analysisUuid)
        )
        if (unsubscribeTitle) {
          set((draft: AnalysisSubscriptionStoreState) => {
            const sub = draft.subscriptions.get(key)
            if (sub) {
              sub.titleSubscription = unsubscribeTitle
            }
          })
          log.info('AnalysisSubscriptionStore', 'Title subscription set up successfully', {
            key,
            jobId: job.id,
          })
          // Note: subscribeToAnalysisTitle already performs an immediate fetch on SUBSCRIBED
          // No need for additional polling - realtime will push updates when title is stored
        } else {
          log.warn('AnalysisSubscriptionStore', 'Title subscription returned undefined', {
            key,
            jobId: job.id,
          })
        }
      } catch (error) {
        log.error('AnalysisSubscriptionStore', 'Failed to set up title subscription', {
          key,
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  // Fallback: If job completes but title never arrives, use fallback title after timeout
  // Normal case: handleTitleUpdate prepends when title is received
  if (previousStatus !== 'completed' && job.status === 'completed') {
    const subscription = get().subscriptions.get(key)
    const hasTitle = subscription?.hasTitleReceived ?? false

    // If title already received, handleTitleUpdate already prepended - nothing to do
    if (hasTitle) {
      if (__DEV__) {
        log.debug('AnalysisSubscriptionStore', 'Job completed - title already handled', {
          jobId: job.id,
        })
      }
      return
    }

    // Title not received yet - set fallback timeout
    log.info(
      'AnalysisSubscriptionStore',
      'Job completed without title - setting fallback timeout',
      {
        jobId: job.id,
      }
    )

    set((draft: AnalysisSubscriptionStoreState) => {
      const sub = draft.subscriptions.get(key)
      if (!sub) return

      if (sub.pendingInvalidationTimeoutId) {
        clearTimeout(sub.pendingInvalidationTimeoutId)
      }

      // Fallback: use generated title if AI title never arrives
      const timeoutId = setTimeout(() => {
        const currentSub = get().subscriptions.get(key)
        if (!currentSub) return

        if (currentSub.hasTitleReceived) {
          if (__DEV__) {
            log.debug('AnalysisSubscriptionStore', 'Title arrived before timeout', {
              jobId: job.id,
            })
          }
          return
        }

        const fallbackTitle = `Analysis ${new Date(job.updated_at || Date.now()).toLocaleDateString()}`
        log.info('AnalysisSubscriptionStore', 'Using fallback title (no feedback)', {
          jobId: job.id,
          fallbackTitle,
        })
        // Empty feedback text for fallback - will be fetched when user opens video
        prependToHistoryCache(job.id, fallbackTitle, '', get)

        set((draft: AnalysisSubscriptionStoreState) => {
          const s = draft.subscriptions.get(key)
          if (s) s.pendingInvalidationTimeoutId = null
        })
      }, 3000)

      sub.pendingInvalidationTimeoutId = timeoutId
    })
  }
}

function handleStatusUpdate(
  key: string,
  status: string,
  details: unknown,
  set: StoreSetter,
  get: StoreGetter
) {
  set((draft: AnalysisSubscriptionStoreState) => {
    const subscription = draft.subscriptions.get(key)
    if (!subscription) return

    log.info('AnalysisSubscriptionStore', 'Subscription status update', {
      key,
      status,
      details,
    })

    subscription.lastStatus = status
    subscription.health = details

    if (status === 'SUBSCRIBED') {
      subscription.status = 'active'
      subscription.retryAttempts = 0

      if (subscription.retryTimeoutId) {
        clearTimeout(subscription.retryTimeoutId)
        subscription.retryTimeoutId = null
      }

      if (subscription.backfillTimeoutId) {
        clearTimeout(subscription.backfillTimeoutId)
        subscription.backfillTimeoutId = null
      }
    } else if (status === 'BACKFILL_EMPTY') {
      scheduleBackfillCheck(key, set, get)
    }
  })
}

function handleSubscriptionError(
  key: string,
  error: string,
  details: unknown,
  get: StoreGetter,
  set: StoreSetter
) {
  // CHANNEL_CLOSED is expected when unsubscribing or navigating away
  // CHANNEL_ERROR can happen during reconnection - only warn, don't spam error logs
  const isExpectedLifecycleEvent = error === 'CHANNEL_CLOSED' || error === 'CHANNEL_ERROR'
  if (isExpectedLifecycleEvent) {
    if (__DEV__) {
      log.debug('AnalysisSubscriptionStore', 'Subscription channel event', {
        key,
        error,
        details,
      })
    }
  } else {
    log.error('AnalysisSubscriptionStore', 'Subscription error reported', {
      key,
      error,
      details,
    })
  }

  set((draft: AnalysisSubscriptionStoreState) => {
    const subscription = draft.subscriptions.get(key)
    if (!subscription) return
    subscription.lastError = error
    subscription.health = details
  })

  void scheduleRetry(key, get, set)
}

function scheduleRetry(key: string, get: StoreGetter, set: StoreSetter) {
  const state = get()
  const subscription = state.subscriptions.get(key)
  // MEMORY LEAK FIX: Early exit if subscription doesn't exist
  // Prevents orphaned timers from firing when subscription is deleted
  if (!subscription) {
    return
  }

  if (subscription.retryAttempts >= MAX_RETRIES) {
    log.warn('AnalysisSubscriptionStore', 'Max retries reached before scheduling retry', {
      key,
      attempts: subscription.retryAttempts,
    })
    set((draft: AnalysisSubscriptionStoreState) => {
      const current = draft.subscriptions.get(key)
      if (!current) return
      current.status = 'failed'
    })
    return
  }

  const delay = BASE_DELAY_MS * 2 ** subscription.retryAttempts

  log.info('AnalysisSubscriptionStore', 'Scheduling retry', {
    key,
    delay,
    attempts: subscription.retryAttempts,
  })

  // FIX: Store timeout ID synchronously inside set() to prevent race condition
  // Problem: setTimeout() followed by set() creates a window where unsubscribe()
  // can be called but timeout ID isn't stored yet, causing orphaned timers
  set((draft: AnalysisSubscriptionStoreState) => {
    const current = draft.subscriptions.get(key)
    if (!current) {
      // Subscription was deleted, don't schedule retry
      if (__DEV__) {
        log.debug('AnalysisSubscriptionStore', 'Subscription deleted, skipping retry schedule', {
          key,
        })
      }
      return
    }

    // Clear any existing timeout first
    if (current.retryTimeoutId) {
      clearTimeout(current.retryTimeoutId)
    }

    // Store timeout ID synchronously BEFORE scheduling to prevent race condition
    // This ensures unsubscribe() can always clear the timeout
    const timeoutId = setTimeout(() => {
      // Re-check existence before retry to prevent calling retry on deleted subscription
      const currentState = get()
      const currentSubscription = currentState.subscriptions.get(key)
      if (!currentSubscription) {
        if (__DEV__) {
          log.debug('AnalysisSubscriptionStore', 'Skipping retry - subscription was deleted', {
            key,
          })
        }
        return
      }
      void get().retry(key)
    }, delay)

    // Store timeout ID synchronously (no async gap)
    current.retryTimeoutId = timeoutId
  })
}

function scheduleBackfillCheck(key: string, set: StoreSetter, get: StoreGetter): void {
  // MEMORY LEAK FIX: Check existence before scheduling timer
  const state = get()
  const subscription = state.subscriptions.get(key)
  if (!subscription) {
    return
  }

  log.info('AnalysisSubscriptionStore', 'Scheduling backfill check', { key })

  const timeoutId = setTimeout(async () => {
    // Re-check existence before backfill to prevent operating on deleted subscription
    const currentState = get()
    const currentSubscription = currentState.subscriptions.get(key)
    if (!currentSubscription) {
      if (__DEV__) {
        log.debug('AnalysisSubscriptionStore', 'Skipping backfill - subscription was deleted', {
          key,
        })
      }
      return
    }

    const options = parseSubscriptionKey(key)
    if (!options?.recordingId) {
      return
    }

    try {
      const job = await getLatestAnalysisJobForRecordingId(options.recordingId)
      if (job) {
        handleJobUpdate(key, job, set, get)
      }
    } catch (error) {
      log.error('AnalysisSubscriptionStore', 'Backfill check failed', {
        key,
        error,
      })
    }
  }, BACKFILL_DELAY_MS)

  set((draft: AnalysisSubscriptionStoreState) => {
    const subscription = draft.subscriptions.get(key)
    if (!subscription) {
      // MEMORY LEAK FIX: Clean up orphaned timer if subscription was deleted
      // This handles race condition where subscription is deleted between setTimeout and set()
      clearTimeout(timeoutId)
      if (__DEV__) {
        log.debug('AnalysisSubscriptionStore', 'Cleaned up orphaned backfill timer', { key })
      }
      return
    }
    if (subscription.backfillTimeoutId) {
      clearTimeout(subscription.backfillTimeoutId)
    }
    subscription.backfillTimeoutId = timeoutId
  })
}
