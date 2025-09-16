import { useEffect, useRef, useState } from 'react'
import Video from 'react-native-video'
import { YStack } from 'tamagui'
import type { VideoPlayerProps } from '../types'

export function VideoPlayerNative({ videoUri, isPlaying, currentTime, onPause }: VideoPlayerProps) {
  const videoRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle video loading
  const handleLoad = (_data: any) => {
    setIsLoading(false)
    setError(null)
    // Duration is handled by parent component
  }

  // Handle video errors
  const handleError = (error: any) => {
    setIsLoading(false)
    setError(error?.error?.localizedDescription || 'Video failed to load')
  }

  // Handle time updates - no longer needed since overlays moved to screen level
  const handleProgress = (_data: any) => {
    // Progress updates are now handled at screen level
  }

  // Handle video end
  const handleEnd = () => {
    onPause?.()
  }

  // Seek to specific time when currentTime changes
  useEffect(() => {
    if (videoRef.current && currentTime !== undefined && currentTime >= 0) {
      videoRef.current.seek(currentTime)
    }
  }, [currentTime])

  return (
    <YStack
      flex={1}
      position="relative"
      testID="video-player-native"
    >
      {/* Loading State */}
      {isLoading && (
        <YStack
          flex={1}
          backgroundColor="$color2"
          justifyContent="center"
          alignItems="center"
          testID="video-loading"
        >
          {/* Simple loading indicator */}
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            borderWidth={3}
            borderColor="$color4"
            borderTopColor="$color8"
            testID="loading-spinner"
          />
        </YStack>
      )}

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
            <YStack testID="error-text">Unable to load video</YStack>
          </YStack>
        </YStack>
      )}

      {/* Native Video Player */}
      {!error && (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={{ flex: 1 }}
          paused={!isPlaying}
          onLoad={handleLoad}
          onError={handleError}
          onProgress={handleProgress}
          onEnd={handleEnd}
          resizeMode="contain"
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
