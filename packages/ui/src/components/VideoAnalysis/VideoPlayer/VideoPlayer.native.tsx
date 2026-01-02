import { log } from '@my/logging'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Video from 'react-native-video'

import { Text, YStack } from 'tamagui'
import type { VideoPlayerProps, VideoPlayerRef } from '../types'

export const VideoPlayerNative = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      videoUri,
      isPlaying,
      currentTime: _currentTime, // Deprecated: kept for backward compatibility
      posterUri,
      onEnd,
      onLoad,
      onProgress,
      seekToTime,
      onSeekComplete,
    },
    ref
  ) => {
    const videoRef = useRef<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const lastProgressUpdateRef = useRef<number>(0)
    const lastReportedTimeRef = useRef<number>(0)
    const isPlayingRef = useRef(isPlaying)
    const lastSeekTimeRef = useRef<number | null>(null)

    // CRITICAL: Sync isPlayingRef immediately during render to unblock progress after replay
    // Effect-based sync has latency; progress events can arrive before effect runs
    isPlayingRef.current = isPlaying

    // Expose direct seek method via ref to bypass render cycle
    useImperativeHandle(
      ref,
      () => ({
        seekDirect: (time: number) => {
          if (videoRef.current && Number.isFinite(time) && time >= 0) {
            log.debug('VideoPlayerNative', 'Direct seek (bypassing render cycle)', { time })
            lastSeekTimeRef.current = time
            videoRef.current.seek(time)
            onSeekComplete?.(time)
          }
        },
      }),
      [onSeekComplete]
    )

    // Handle video loading
    const handleLoad = (data: any) => {
      setIsLoading(false)
      setError(null)
      // Notify parent component of video duration
      if (onLoad && data?.duration) {
        onLoad({ duration: data.duration })
      }
    }

    // Handle video errors
    const handleError = (error: any) => {
      log.error('VideoPlayerNative.handleError', 'Video player error occurred', {
        videoUri,
        isPlaying,
        isLoading,
        platform: Platform.OS,
        error: {
          full: error,
          error: error?.error,
          localizedDescription: error?.error?.localizedDescription,
          code: error?.error?.code,
          domain: error?.error?.domain,
        },
      })
      setIsLoading(false)
      setError(error?.error?.localizedDescription || 'Video failed to load')
    }

    // Handle time updates - notify parent component (throttled to prevent excessive re-renders)
    const handleProgress = (data: any) => {
      if (onProgress && data?.currentTime !== undefined) {
        const now = Date.now()
        const currentTime = data.currentTime
        // Always track the latest time, even if we don't notify (for accurate end time)
        lastReportedTimeRef.current = currentTime

        // FIX: Removed aggressive !isPlayingRef.current guard that blocked progress events
        // during the React state sync lag after pressing play. The native player starts
        // immediately but isPlayingRef stays false for several frames, causing all early
        // progress events (0s→5s) to be dropped. This triggered forward-seek detection
        // which marked all feedback as skipped. Parent's handleProgress has proper guards.

        // Throttle updates to 60 FPS (16ms) for smooth progress without excessive re-renders
        // Previously 250ms (4 FPS) caused jerky 1-second-tact updates
        if (now - lastProgressUpdateRef.current >= 16) {
          lastProgressUpdateRef.current = now
          onProgress({ currentTime })
        }
      }
    }

    // Handle video end
    const handleEnd = () => {
      // Immediately stop processing progress updates to prevent re-renders after video ends
      isPlayingRef.current = false

      // Try to get current time from video ref if available
      const currentTimeFromRef = videoRef.current?.getCurrentTime?.() ?? null
      // Use the last reported progress time as fallback (most accurate we have)
      const lastReportedTime = lastReportedTimeRef.current
      const actualEndTime = currentTimeFromRef ?? lastReportedTime

      // Always pass the endTime parameter since the callback signature supports it
      // The parameter is optional, so callbacks that don't use it will ignore it
      onEnd?.(actualEndTime)
    }

    // Perform user-initiated seek only when seekToTime is provided
    // Skip if this seek was already executed via direct seek (prevents duplicate seeks)
    useEffect(() => {
      if (
        videoRef.current &&
        seekToTime !== undefined &&
        seekToTime !== null &&
        seekToTime >= 0 &&
        lastSeekTimeRef.current !== seekToTime
      ) {
        log.debug('VideoPlayerNative', 'Seeking to (via prop)', { seekToTime })
        lastSeekTimeRef.current = seekToTime
        videoRef.current.seek(seekToTime)
        onSeekComplete?.(seekToTime)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seekToTime])

    // Memoize video source to prevent unnecessary re-renders
    // Video component is expensive to re-render, so stable source reference is important
    const videoSource = useMemo(() => ({ uri: videoUri }), [videoUri])

    return (
      <YStack
        flex={1}
        position="relative"
        testID="video-player-native"
      >
        {/* Error State */}
        {error && (
          <YStack
            flex={1}
            backgroundColor="$color2"
            justifyContent="center"
            alignItems="center"
            padding="$4"
            testID="video-error"
          >
            <YStack
              backgroundColor="$color3"
              padding="$4"
              borderRadius="$4"
              maxWidth={300}
              alignItems="center"
              testID="error-message"
            >
              {/* Error icon placeholder */}
              <YStack
                width={48}
                height={48}
                backgroundColor="$color4"
                borderRadius={24}
                marginBottom="$2"
                testID="error-icon"
              />
              {/* User-safe error message */}
              <Text testID="error-text">Unable to load video: {error}</Text>
            </YStack>
          </YStack>
        )}

        {/* Native Video Player */}
        {/* Preload strategy: Video mounts early (paused) to warm buffer before user taps play */}
        {!error && (
          <Video
            ref={videoRef}
            source={videoSource}
            {...(posterUri ? { poster: posterUri, posterResizeMode: 'cover' } : {})}
            style={{ flex: 1 }}
            paused={!isPlaying}
            onLoad={handleLoad}
            onError={handleError}
            onProgress={handleProgress}
            onEnd={handleEnd}
            resizeMode="cover"
            controls={false}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
            testID="native-video-element"
          />
        )}
      </YStack>
    )
  }
)

VideoPlayerNative.displayName = 'VideoPlayerNative'

// Default export for require() compatibility
export default VideoPlayerNative
// Named exports for different patterns
export const VideoPlayer = VideoPlayerNative
export const videoPlayer = VideoPlayerNative // For require() pattern compatibility
