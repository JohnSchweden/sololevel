/**
 * Query keys for TanStack Query cache management
 * Extracted to avoid circular dependencies between useAnalysis.ts and analysisSubscription.ts
 */
export const analysisKeys = {
  all: ['analysis'] as const,
  jobs: () => [...analysisKeys.all, 'jobs'] as const,
  job: (id: number) => [...analysisKeys.jobs(), id] as const,
  jobByVideo: (videoId: number) => [...analysisKeys.all, 'by-video', videoId] as const,
  stats: () => [...analysisKeys.all, 'stats'] as const,
  uuid: (jobId: number) => [...analysisKeys.all, 'uuid', jobId] as const,
  historical: (analysisId: number) => [...analysisKeys.all, 'historical', analysisId] as const,
  history: () => ['history'] as const,
  historyCompleted: () => [...analysisKeys.history(), 'completed'] as const,
}
