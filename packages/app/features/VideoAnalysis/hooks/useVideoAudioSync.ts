import { log } from '@my/logging'

export interface VideoAudioSyncState {
  shouldPlayVideo: boolean
  shouldPlayAudio: boolean
  isVideoPausedForAudio: boolean
}

export interface VideoAudioSyncProps {
  isVideoPlaying: boolean
  isAudioActive: boolean
}

export function useVideoAudioSync({
  isVideoPlaying,
  isAudioActive,
}: VideoAudioSyncProps): VideoAudioSyncState {
  // Video should play only if user wants it to AND audio is not active
  const shouldPlayVideo = isVideoPlaying && !isAudioActive

  // Video is considered "paused for audio" only when audio is active
  // (We can't distinguish user pauses vs audio pauses without more complex state tracking)
  const isVideoPausedForAudio = isAudioActive

  // Audio should play when active
  const shouldPlayAudio = isAudioActive

  // Debug logging for sync state changes (only in dev mode)
  if (__DEV__) {
    log.debug('useVideoAudioSync', 'Sync state calculated', {
      isVideoPlaying,
      isAudioActive,
      shouldPlayVideo,
      shouldPlayAudio,
      isVideoPausedForAudio,
    })
  }

  return {
    shouldPlayVideo,
    shouldPlayAudio,
    isVideoPausedForAudio,
  }
}
