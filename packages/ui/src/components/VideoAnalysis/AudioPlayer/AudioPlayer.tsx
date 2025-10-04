import { Platform } from 'react-native'
import type { AudioPlayerProps } from '../types'

// Re-export types for external usage
export type { AudioPlayerProps }

export function AudioPlayer(props: AudioPlayerProps) {
  if (Platform.OS !== 'web') {
    const { AudioPlayer: AudioPlayerNative } = require('./AudioPlayer.native')
    return <AudioPlayerNative {...props} />
  }

  // Web stub - no audio support
  const { AudioPlayerWeb } = require('./AudioPlayer.web')
  return <AudioPlayerWeb {...props} />
}
