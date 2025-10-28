// import { logOnChange } from '@my/logging'

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

  // const syncState = {
  //   isVideoPlaying,
  //   isAudioActive,
  //   shouldPlayVideo,
  //   shouldPlayAudio,
  //   isVideoPausedForAudio,
  // }

  // Only log when sync state actually changes (only in dev mode)
  // if (__DEV__) {
  //   logOnChange('videoAudioSync', syncState, 'useVideoAudioSync', 'Sync state calculated', {
  //     selector: (state) => ({
  //       isVideoPlaying: state.isVideoPlaying,
  //       isAudioActive: state.isAudioActive,
  //       shouldPlayVideo: state.shouldPlayVideo,
  //       shouldPlayAudio: state.shouldPlayAudio,
  //       isVideoPausedForAudio: state.isVideoPausedForAudio,
  //     }),
  //     level: 'debug',
  //   })
  // }

  return {
    shouldPlayVideo,
    shouldPlayAudio,
    isVideoPausedForAudio,
  }
}
