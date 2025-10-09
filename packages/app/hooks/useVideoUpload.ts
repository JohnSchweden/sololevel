import type { Tables } from '@my/api'
import type { VideoUploadOptions } from '@my/api'
import {
  cancelUpload,
  createSignedUploadUrl,
  createVideoRecording,
  deleteVideoRecording,
  getUploadProgress,
  getUserVideoRecordings,
  updateVideoRecording,
  uploadVideo,
} from '@my/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type VideoRecording = Tables<'video_recordings'>

// Query keys for cache management
export const videoUploadKeys = {
  all: ['video-uploads'] as const,
  recordings: () => [...videoUploadKeys.all, 'recordings'] as const,
  recording: (id: number) => [...videoUploadKeys.recordings(), id] as const,
  progress: (id: number) => [...videoUploadKeys.all, 'progress', id] as const,
}

/**
 * Hook for uploading videos with progress tracking
 */
export function useVideoUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: VideoUploadOptions) => {
      return uploadVideo(options)
    },
    onSuccess: (recording) => {
      // Invalidate and refetch recordings list
      queryClient.invalidateQueries({ queryKey: videoUploadKeys.recordings() })

      // Set the new recording in cache
      queryClient.setQueryData(videoUploadKeys.recording(recording.id), recording)
    },
    onError: () => {},
  })
}

/**
 * Hook for getting user's video recordings
 */
export function useVideoRecordings() {
  return useQuery({
    queryKey: videoUploadKeys.recordings(),
    queryFn: () => getUserVideoRecordings(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for getting a specific video recording
 */
export function useVideoRecording(id: number) {
  return useQuery({
    queryKey: videoUploadKeys.recording(id),
    queryFn: async () => {
      const recordings = await getUserVideoRecordings()
      return recordings.find((r) => r.id === id) || null
    },
    enabled: !!id,
  })
}

/**
 * Hook for tracking upload progress
 */
export function useUploadProgress(recordingId: number) {
  return useQuery({
    queryKey: videoUploadKeys.progress(recordingId),
    queryFn: () => getUploadProgress(recordingId),
    enabled: !!recordingId,
    refetchInterval: (data: any) => {
      // Stop polling when upload is completed or failed
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false
      }
      return 500 // Poll every 500ms during upload
    },
  })
}

/**
 * Hook for updating video recording
 */
export function useUpdateVideoRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number
      updates: Parameters<typeof updateVideoRecording>[1]
    }) => {
      return updateVideoRecording(id, updates)
    },
    onSuccess: (recording) => {
      // Update the recording in cache
      queryClient.setQueryData(videoUploadKeys.recording(recording.id), recording)

      // Invalidate recordings list to ensure consistency
      queryClient.invalidateQueries({ queryKey: videoUploadKeys.recordings() })
    },
  })
}

/**
 * Hook for canceling video upload
 */
export function useCancelUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recordingId: number) => {
      return cancelUpload(recordingId)
    },
    onSuccess: (_, recordingId) => {
      // Invalidate progress and recordings queries
      queryClient.invalidateQueries({
        queryKey: videoUploadKeys.progress(recordingId),
      })
      queryClient.invalidateQueries({ queryKey: videoUploadKeys.recordings() })
    },
  })
}

/**
 * Hook for deleting video recording
 */
export function useDeleteVideoRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return deleteVideoRecording(id)
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: videoUploadKeys.recording(id) })
      queryClient.removeQueries({ queryKey: videoUploadKeys.progress(id) })

      // Invalidate recordings list
      queryClient.invalidateQueries({ queryKey: videoUploadKeys.recordings() })
    },
  })
}

/**
 * Hook for creating signed upload URL
 */
export function useCreateSignedUploadUrl() {
  return useMutation({
    mutationFn: async ({ filename, fileSize }: { filename: string; fileSize: number }) => {
      return createSignedUploadUrl(filename, fileSize)
    },
  })
}

/**
 * Hook for creating video recording record
 */
export function useCreateVideoRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Parameters<typeof createVideoRecording>[0]) => {
      return createVideoRecording(data)
    },
    onSuccess: (recording) => {
      // Add to cache
      queryClient.setQueryData(videoUploadKeys.recording(recording.id), recording)

      // Invalidate recordings list
      queryClient.invalidateQueries({ queryKey: videoUploadKeys.recordings() })
    },
  })
}
