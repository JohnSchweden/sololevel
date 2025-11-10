import { log } from '@my/logging'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import Video from 'react-native-video'

import type { AudioPlayerProps } from '../types'

// Defensive URL normalizer for dev environment
const normalizeAudioUrl = (url: string): string => {
  // iOS Simulator cannot access 127.0.0.1 directly - must use actual machine IP or localhost
  // In dev environment, replace kong:8000 or 127.0.0.1:54321 with localhost which resolves correctly in simulator
  if (url.includes('kong:8000')) {
    // Kong is the internal Docker network name - replace with localhost for simulator access
    return url.replace('kong:8000', 'localhost:54321')
  }
  if (url.includes('127.0.0.1:54321')) {
    // Localhost loopback - replace with localhost for simulator
    return url.replace('127.0.0.1:54321', 'localhost:54321')
  }
  return url
}

export const AudioPlayer = function AudioPlayer({
  audioUrl,
  controller,
  testID = 'AudioPlayer',
}: AudioPlayerProps) {
  // Track if we've done initial seek for this audio URL
  const hasInitializedRef = useRef(false)
  // Ref to video component for cleanup
  const videoRef = useRef<Video>(null)

  // Reset initialization flag when audio URL changes
  useEffect(() => {
    hasInitializedRef.current = false
  }, [audioUrl])

  // Cleanup video resources on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        // Note: react-native-video doesn't have an explicit unload method
        // but we can reset the ref to help with garbage collection
        videoRef.current = null
      }
    }
  }, [])

  // Debug logging for AudioPlayer component mount only
  const hasLoggedMountRef = useRef(false)
  if (!hasLoggedMountRef.current) {
    hasLoggedMountRef.current = true
    log.debug('AudioPlayer', 'Component mounted', {
      hasAudioUrl: !!audioUrl,
      audioUrlPreview: audioUrl ? `${audioUrl.substring(0, 50)}...` : null,
      testID,
      controllerExists: !!controller,
      controllerHasSetIsPlaying: !!controller?.setIsPlaying,
    })
  }

  if (!audioUrl) {
    log.debug('AudioPlayer', 'No audio URL provided, not rendering', {
      activeAudioId: controller?.isPlaying ? 'unknown' : null,
    })
    return null
  }

  // Memoize normalized URL to reduce log spam and re-normalization
  const normalizedAudioUrl = useMemo(() => {
    const normalized = normalizeAudioUrl(audioUrl)

    // Log normalization only once per unique URL
    // if (audioUrl.includes('kong:8000')) {
    //   log.debug('AudioPlayer', 'Normalized kong:8000 URL for dev environment', {
    //     originalUrl: audioUrl.substring(0, 50) + '...',
    //     normalizedUrl: normalized.substring(0, 50) + '...',
    //   })
    // }

    return normalized
  }, [audioUrl])

  // Memoize audio source to prevent unnecessary re-renders
  // Video component is expensive to re-render, so stable source reference is important
  const audioSource = useMemo(() => ({ uri: normalizedAudioUrl }), [normalizedAudioUrl])

  // Subscribe to isPlaying using useSyncExternalStore
  // This causes re-renders when controller.isPlaying changes (via getter)
  // Without recreating the controller object
  const isPlaying = useSyncExternalStore(
    // subscribe: called on mount/dependency change
    (callback) => {
      // Poll controller.isPlaying every 50ms and trigger callback when it changes
      let lastValue = controller.isPlaying
      const interval = setInterval(() => {
        const currentValue = controller.isPlaying
        if (currentValue !== lastValue) {
          lastValue = currentValue
          callback() // Trigger re-render
        }
      }, 50)
      return () => clearInterval(interval)
    },
    // getSnapshot: current value
    () => controller.isPlaying,
    // getServerSnapshot (not used on native)
    () => false
  )

  // Log pause/resume state changes
  const prevIsPlayingRef = useRef<boolean>(isPlaying)
  useEffect(() => {
    if (isPlaying !== prevIsPlayingRef.current) {
      log.debug('AudioPlayer', 'Pause state changed', {
        from: prevIsPlayingRef.current ? 'playing' : 'paused',
        to: isPlaying ? 'playing' : 'paused',
        timestamp: Date.now(),
      })
      prevIsPlayingRef.current = isPlaying
    }
  }, [isPlaying])

  return (
    <Video
      ref={videoRef}
      testID={testID}
      source={audioSource}
      paused={!isPlaying}
      seek={controller.seekTime ?? undefined}
      onLoad={(data) => {
        log.debug('AudioPlayer', 'Video component onLoad', {
          duration: data.duration,
          controllerState: {
            isPlaying: controller.isPlaying,
            currentTime: controller.currentTime,
            seekTime: controller.seekTime,
            isLoaded: controller.isLoaded,
          },
        })
        controller.handleLoad(data)

        // Only do initial seek once per audio URL to prevent redundant seeks
        // Skip if player is already at start (selection effect may have set seekTime=0)
        if (
          !hasInitializedRef.current &&
          controller.seekTime === null &&
          (typeof data?.currentTime !== 'number' || Math.abs(data.currentTime) > 0.05)
        ) {
          // log.debug('AudioPlayer', 'Initial seek to start after load')
          controller.seekTo(0)
          hasInitializedRef.current = true
        }
      }}
      onProgress={(data) => {
        // Throttle progress logging to avoid spam (log every 2 seconds)
        // if (
        //   Math.floor(data.currentTime) % 2 === 0 &&
        //   Math.floor(data.currentTime) !== Math.floor(controller.currentTime)
        // ) {
        //   log.debug('AudioPlayer', 'Video component onProgress', {
        //     currentTime: data.currentTime,
        //     playableDuration: data.playableDuration,
        //     seekableDuration: data.seekableDuration,
        //   })
        // }
        controller.handleProgress(data)

        // Detect seek completion when player time reaches target seek time
        if (
          typeof controller.seekTime === 'number' &&
          Math.abs(data.currentTime - controller.seekTime) < 0.05
        ) {
          // log.debug('AudioPlayer', 'Detected seek completion via progress callback', {
          //   currentTime: data.currentTime,
          //   targetSeekTime: controller.seekTime,
          // })
          controller.handleSeekComplete()
        }
      }}
      onEnd={() => {
        // log.info('AudioPlayer', 'Video component onEnd', {
        //   controllerState: {
        //     isPlaying: controller.isPlaying,
        //     currentTime: controller.currentTime,
        //     duration: controller.duration,
        //     seekTime: controller.seekTime,
        //     isLoaded: controller.isLoaded,
        //   },
        // })
        controller.handleEnd()
      }}
      onError={(error) => {
        log.error('AudioPlayer', 'Video component onError', { error })
        controller.handleError(error)
      }}
      ignoreSilentSwitch="ignore" // Play in silent mode on iOS
      style={{
        width: 0,
        height: 0,
        position: 'absolute',
      }}
    />
  )
}
