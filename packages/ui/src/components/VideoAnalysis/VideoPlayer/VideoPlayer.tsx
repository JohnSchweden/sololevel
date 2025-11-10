import { forwardRef } from 'react'
import { Platform } from 'react-native'
import type { VideoPlayerProps } from '../types'

// Re-export types for external usage
export type { VideoPlayerProps }

export const VideoPlayer = forwardRef<import('../types').VideoPlayerRef, VideoPlayerProps>(
  (props, ref) => {
    if (Platform.OS !== 'web') {
      // Use default export for require() compatibility with forwardRef
      const VideoPlayerNative = require('./VideoPlayer.native').default
      if (!VideoPlayerNative || typeof VideoPlayerNative !== 'function') {
        throw new Error('VideoPlayerNative must be a function component')
      }
      return (
        <VideoPlayerNative
          {...props}
          ref={ref}
        />
      )
    }

    // Web stub - no video support (doesn't support ref yet)
    const { VideoPlayerWeb } = require('./VideoPlayer.web')
    return <VideoPlayerWeb {...props} />
  }
)

VideoPlayer.displayName = 'VideoPlayer'

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(VideoPlayer as any).whyDidYouRender = false
}
