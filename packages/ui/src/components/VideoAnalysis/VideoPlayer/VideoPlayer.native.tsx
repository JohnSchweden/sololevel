import { log } from '@my/logging'
import React, { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Video from 'react-native-video'
import { Text, YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export const VideoPlayerNative = React.memo(function VideoPlayerNative({
  videoUri,
  isPlaying,
  currentTime: _currentTime, // Deprecated: kept for backward compatibility
  posterUri,
  onEnd,
  onLoad,
  onProgress,
  seekToTime,
  onSeekComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastProgressUpdateRef = useRef<number>(0)
  const lastReportedTimeRef = useRef<number>(0)

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
      // Only update progress every 250ms to prevent excessive re-renders
      if (now - lastProgressUpdateRef.current >= 250) {
        lastProgressUpdateRef.current = now
        onProgress({ currentTime })
      }
    }
  }

  // Handle video end
  const handleEnd = () => {
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
  useEffect(() => {
    if (videoRef.current && seekToTime !== undefined && seekToTime !== null && seekToTime >= 0) {
      videoRef.current.seek(seekToTime)
      log.debug('VideoPlayerNative', 'Seeking to', { seekToTime })
      onSeekComplete?.(seekToTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToTime])

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
          source={{ uri: videoUri }}
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
})

export const VideoPlayer = VideoPlayerNative
