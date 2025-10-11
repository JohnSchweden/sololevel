import { subscribeToAnalysisJob, subscribeToLatestAnalysisJobByRecordingId } from '@my/api'
import { log } from '@my/logging'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type SubscriptionStatus = 'idle' | 'pending' | 'active' | 'failed'

export interface SubscriptionState {
  job?: AnalysisJob | null
  status: SubscriptionStatus
  retryAttempts: number
  retryTimeoutId: ReturnType<typeof setTimeout> | null
  backfillTimeoutId: ReturnType<typeof setTimeout> | null
  lastError?: string | null
  lastStatus?: string | null
  health?: unknown
  subscription?: () => void
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

      if (existing && (existing.status === 'pending' || existing.status === 'active')) {
        log.debug('AnalysisSubscriptionStore', 'Subscription already in progress/active', {
          subscriptionKey,
          status: existing.status,
        })
        return
      }

      if (existing?.status === 'failed') {
        log.warn('AnalysisSubscriptionStore', 'Subscription previously failed - retry manually', {
          subscriptionKey,
        })
        return
      }

      set((draft) => {
        const current = draft.subscriptions.get(subscriptionKey)
        draft.subscriptions.set(subscriptionKey, {
          job: current?.job ?? null,
          status: 'pending',
          retryAttempts: current?.retryAttempts ?? 0,
          retryTimeoutId: current?.retryTimeoutId ?? null,
          backfillTimeoutId: current?.backfillTimeoutId ?? null,
          lastError: current?.lastError ?? null,
          lastStatus: current?.lastStatus ?? null,
          health: current?.health ?? null,
          subscription: current?.subscription,
        })
      })

      try {
        const unsubscribe = await createSubscription(subscriptionKey, options, get, set)

        set((draft) => {
          const current = draft.subscriptions.get(subscriptionKey)
          if (!current) return

          current.status = 'pending'
          current.retryAttempts = 0
          current.subscription = unsubscribe
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
          }
        })
      }
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
      return get().subscriptions.get(key)?.job ?? null
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
type StoreSetter = (fn: (draft: AnalysisSubscriptionStoreState) => void) => void

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
    log.info('AnalysisSubscriptionStore', 'Creating job subscription', {
      key,
      analysisJobId: options.analysisJobId,
    })

    return new Promise((resolve, reject) => {
      const unsubscribe = subscribeToAnalysisJob(
        options.analysisJobId!,
        (job) => handleJobUpdate(key, job, set),
        {
          onStatus: (status, details) => handleStatusUpdate(key, status, details, set),
          onError: (error, details) => handleSubscriptionError(key, error, details, get, set),
        }
      )

      if (!unsubscribe) {
        reject(new Error('subscribeToAnalysisJob returned undefined unsubscribe'))
        return
      }

      resolve(() => {
        try {
          unsubscribe()
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
        (job) => handleJobUpdate(key, job, set),
        {
          onStatus: (status, details) => handleStatusUpdate(key, status, details, set),
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

function handleJobUpdate(key: string, job: AnalysisJob, set: StoreSetter) {
  set((draft) => {
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

    subscription.job = job
    subscription.lastStatus = job.status

    if (subscription.status !== 'active') {
      subscription.status = 'active'
    }
  })
}

function handleStatusUpdate(key: string, status: string, details: unknown, set: StoreSetter) {
  set((draft) => {
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
      scheduleBackfillCheck(key, set)
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

  set((draft) => {
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
    set((draft) => {
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

  set((draft) => {
    const current = draft.subscriptions.get(key)
    if (!current) return
    if (current.retryTimeoutId) {
      clearTimeout(current.retryTimeoutId)
    }
    current.retryTimeoutId = timeoutId
  })
}

function scheduleBackfillCheck(key: string, set: StoreSetter) {
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
        handleJobUpdate(key, job, set)
      }
    } catch (error) {
      log.error('AnalysisSubscriptionStore', 'Backfill check failed', {
        key,
        error,
      })
    }
  }, BACKFILL_DELAY_MS)

  set((draft) => {
    const subscription = draft.subscriptions.get(key)
    if (!subscription) return
    if (subscription.backfillTimeoutId) {
      clearTimeout(subscription.backfillTimeoutId)
    }
    subscription.backfillTimeoutId = timeoutId
  })
}
