import { analysisKeys } from '@app/hooks/analysisKeys'
import { safeUpdateJobCache } from '@app/utils/safeCacheUpdate'
import {
  subscribeToAnalysisJob,
  subscribeToAnalysisTitle,
  subscribeToLatestAnalysisJobByRecordingId,
} from '@my/api'
import { log } from '@my/logging'
import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useVideoHistoryStore } from '../../HistoryProgress/stores/videoHistory'
import { resolveThumbnailUri } from '../../HistoryProgress/utils/thumbnailCache'

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
        log.debug('AnalysisSubscriptionStore', 'Subscription already in progress/active', {
          subscriptionKey,
          status: existing.status,
        })
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
          subscriptionPromise,
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

      // Subscribe to analyses table to get title as soon as it's available
      // This happens right after LLM analysis completes, before job status = 'completed'
      const unsubscribeTitle = subscribeToAnalysisTitle(
        options.analysisJobId!,
        (title: string | null) => handleTitleUpdate(key, options.analysisJobId!, title, set, get)
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
  _set: StoreSetter,
  get: StoreGetter
): void {
  log.info('AnalysisSubscriptionStore', 'Title update received', {
    key,
    jobId,
    title,
    hasTitle: !!title,
  })

  if (!title) {
    log.debug('AnalysisSubscriptionStore', 'Skipping title update - title is null/empty', {
      key,
      jobId,
    })
    return
  }

  // Update cache with title immediately when it becomes available
  // Schedule for after render cycle using Promise.resolve().then() for true async deferral
  Promise.resolve().then(async () => {
    try {
      const historyStore = useVideoHistoryStore.getState()
      const queryClient = get().queryClient

      // Update Zustand cache with title
      const cached = historyStore.getCached(jobId)
      if (cached) {
        historyStore.updateCache(jobId, { title })
        log.info(
          'AnalysisSubscriptionStore',
          'Updated cache with title from analyses subscription',
          {
            jobId,
            title,
          }
        )
      }

      // Also update TanStack Query cache if job exists
      if (queryClient) {
        const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId))
        if (currentJob && currentJob.video_recording_id !== null) {
          const updatedJob = { ...currentJob, title } as AnalysisJob & {
            video_recording_id: number
          }
          safeUpdateJobCache(queryClient, updatedJob, analysisKeys, 'handleTitleUpdate')
          log.debug('AnalysisSubscriptionStore', 'Updated TanStack Query cache with title', {
            jobId,
            title,
          })
        }
      }

      if (!cached) {
        // Cache doesn't exist yet - try to get job data from TanStack Query to create minimal entry
        const subscription = get().subscriptions.get(key)
        const subscriptionJobId = subscription?.jobId
        const job =
          subscriptionJobId && queryClient
            ? (queryClient.getQueryData<AnalysisJob>(analysisKeys.job(subscriptionJobId)) ?? null)
            : null

        if (job) {
          // Fetch thumbnail from video_recordings to include in minimal cache entry
          // This ensures thumbnails are available even if setJobResults runs later
          const { supabase } = await import('@my/api')
          const { data: videoRecording } = await supabase
            .from('video_recordings')
            .select('thumbnail_url, storage_path, metadata')
            .eq('id', job.video_recording_id ?? 0)
            .single()

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
                const historyStore = useVideoHistoryStore.getState()
                historyStore.updateCache(job.id, { thumbnail: uri })
              },
              onPersistedUpdate: (uri) => {
                const historyStore = useVideoHistoryStore.getState()
                historyStore.updateCache(job.id, { thumbnail: uri })
              },
              logContext: 'AnalysisSubscriptionStore',
            }
          )

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

          historyStore.addToCache({
            id: job.id,
            videoId: job.video_recording_id ?? 0,
            userId: jobUserId,
            title, // Use the real title from database
            createdAt: jobCreatedAt,
            thumbnail: thumbnailUri,
            storagePath: videoRecording?.storage_path ?? undefined,
            results: jobResults,
          })
          log.info(
            'AnalysisSubscriptionStore',
            'Created minimal cache entry with title and thumbnail from analyses subscription',
            {
              jobId,
              title,
              hasThumbnail: !!thumbnailUri,
              thumbnailSource: videoRecording?.thumbnail_url
                ? 'cloud'
                : videoRecording?.metadata
                  ? 'metadata'
                  : 'none',
            }
          )
        } else {
          // Job data not available yet - title will be set when setJobResults runs
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
    } catch (error) {
      log.warn('AnalysisSubscriptionStore', 'Error updating cache with title', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
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
  if (previousJobId !== job.id && job.id) {
    const subscription = get().subscriptions.get(key)
    if (subscription && !subscription.titleSubscription) {
      log.info('AnalysisSubscriptionStore', 'Setting up title subscription for job', {
        key,
        jobId: job.id,
      })
      try {
        const unsubscribeTitle = subscribeToAnalysisTitle(job.id, (title: string | null) =>
          handleTitleUpdate(key, job.id, title, set, get)
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

          // Also fetch title immediately in case it was already stored
          // This is a fallback in case the subscription's immediate fetch doesn't work
          // Retry with exponential backoff since title might not be stored yet
          let retryCount = 0
          const maxRetries = 5
          const retryDelays = [500, 1000, 2000, 3000, 5000] // ms

          const attemptFetch = async (): Promise<void> => {
            try {
              const { supabase } = await import('@my/api')
              const { useVideoHistoryStore } = await import(
                '../../HistoryProgress/stores/videoHistory'
              )
              const historyStore = useVideoHistoryStore.getState()

              // Check if we already have the title
              const cached = historyStore.getCached(job.id)
              const jobCreatedAt =
                typeof job.created_at === 'string'
                  ? job.created_at
                  : typeof job.created_at === 'object' && job.created_at !== null
                    ? new Date(job.created_at as any).toISOString()
                    : new Date().toISOString()
              if (
                cached?.title &&
                cached.title !== `Analysis ${new Date(jobCreatedAt).toLocaleDateString()}`
              ) {
                log.debug('AnalysisSubscriptionStore', 'Title already in cache, skipping fetch', {
                  key,
                  jobId: job.id,
                  title: cached.title,
                })
                return
              }

              // Use maybeSingle() to handle case where row doesn't exist yet
              const result = (await supabase
                .from('analyses')
                .select('title')
                .eq('job_id', job.id)
                .maybeSingle()) as { data: { title: string | null } | null; error: any }

              if (result.error) {
                log.debug('AnalysisSubscriptionStore', 'Title fetch failed', {
                  key,
                  jobId: job.id,
                  error: result.error.message,
                  retryCount,
                })
                // Retry if we haven't exceeded max retries
                if (retryCount < maxRetries) {
                  const delay = retryDelays[retryCount] || 5000
                  retryCount++
                  setTimeout(() => attemptFetch(), delay)
                }
                return
              }

              if (result.data?.title) {
                log.info(
                  'AnalysisSubscriptionStore',
                  'Fetched title immediately after subscription setup',
                  {
                    key,
                    jobId: job.id,
                    title: result.data.title,
                    retryCount,
                  }
                )
                handleTitleUpdate(key, job.id, result.data.title, set, get)
              } else if (retryCount < maxRetries) {
                // No title yet, retry
                const delay = retryDelays[retryCount] || 5000
                retryCount++
                log.debug('AnalysisSubscriptionStore', 'Title not found yet, retrying', {
                  key,
                  jobId: job.id,
                  retryCount,
                  delay,
                })
                setTimeout(() => attemptFetch(), delay)
              }
            } catch (error) {
              log.warn(
                'AnalysisSubscriptionStore',
                'Error fetching title after subscription setup',
                {
                  key,
                  jobId: job.id,
                  error: error instanceof Error ? error.message : String(error),
                  retryCount,
                }
              )
              // Retry on error if we haven't exceeded max retries
              if (retryCount < maxRetries) {
                const delay = retryDelays[retryCount] || 5000
                retryCount++
                setTimeout(() => attemptFetch(), delay)
              }
            }
          }

          setTimeout(() => attemptFetch(), retryDelays[0])
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

  // Invalidate history cache when analysis completes
  if (previousStatus !== 'completed' && job.status === 'completed') {
    const queryClient = get().queryClient
    if (queryClient) {
      log.info('AnalysisSubscriptionStore', 'Analysis completed - invalidating history cache', {
        jobId: job.id,
      })
      queryClient.invalidateQueries({ queryKey: analysisKeys.historyCompleted() })
    } else {
      log.warn('AnalysisSubscriptionStore', 'QueryClient not set - cannot invalidate cache', {
        jobId: job.id,
      })
    }
    // Note: Title is already fetched via subscribeToAnalysisTitle subscription
    // which fires earlier (right after LLM analysis, before job completion)
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
  log.error('AnalysisSubscriptionStore', 'Subscription error reported', {
    key,
    error,
    details,
  })

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
  if (!subscription) return

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

  const timeoutId = setTimeout(() => {
    void get().retry(key)
  }, delay)

  set((draft: AnalysisSubscriptionStoreState) => {
    const current = draft.subscriptions.get(key)
    if (!current) return
    if (current.retryTimeoutId) {
      clearTimeout(current.retryTimeoutId)
    }
    current.retryTimeoutId = timeoutId
  })
}

function scheduleBackfillCheck(key: string, set: StoreSetter, get: StoreGetter) {
  log.info('AnalysisSubscriptionStore', 'Scheduling backfill check', { key })

  const timeoutId = setTimeout(async () => {
    const options = parseSubscriptionKey(key)
    if (!options?.recordingId) {
      return
    }

    try {
      const { getLatestAnalysisJobForRecordingId } = await import('@my/api')
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
    if (!subscription) return
    if (subscription.backfillTimeoutId) {
      clearTimeout(subscription.backfillTimeoutId)
    }
    subscription.backfillTimeoutId = timeoutId
  })
}
