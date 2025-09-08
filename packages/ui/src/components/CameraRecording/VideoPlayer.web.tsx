import { VideoPlayerProps, useVideoPlayer } from '@my/app/hooks/useVideoPlayer'
import { Loader, Play, RotateCcw, Share } from '@tamagui/lucide-icons'
import { useCallback, useEffect, useRef } from 'react'
import { Button, Progress, Spinner, Text, XStack, YStack } from 'tamagui'

/**
 * Web Video Player Implementation
 * Full video playback with custom overlays and processing status
 * Implements US-RU-13: Video playback with live processing
 *
 * Features:
 * - Real video playback with HTML5 video element
 * - Custom loading overlay during buffering
 * - Tap-to-play/pause functionality
 * - Processing status overlay
 * - Action buttons (restart, share, continue)
 * - Accessibility support
 * - Error handling with user feedback
 *
 * Web-specific features:
 * - HTML5 video element
 * - Custom overlay controls
 * - Keyboard shortcuts support
 * - Browser-optimized playback
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const { state, handlers, props: sharedProps } = useVideoPlayer(props)
  const { isPlaying, isBuffering, hasError, videoDuration } = state
  const {
    handleLoad,
    handleProgress,
    handleBuffer,
    handleError,
    togglePlayPause,
    getAccessibilityLabel,
    formatDuration,
    setError,
    setPlaying,
  } = handlers
  const {
    videoUri,
    duration,
    onRestart,
    onShare,
    onContinue,
    isProcessing,
    processingProgress,
    disabled,
    showControls,
  } = sharedProps

  const videoRef = useRef<HTMLVideoElement>(null)

  // Web-specific video load handler
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration * 1000 // Convert to milliseconds
      handleLoad({ duration })
    }
  }, [handleLoad])

  // Web-specific video progress handler
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime * 1000 // Convert to milliseconds
      handleProgress({ currentTime })
    }
  }, [handleProgress])

  // Web-specific buffering handlers
  const handleWaiting = useCallback(() => {
    handleBuffer({ isBuffering: true })
  }, [handleBuffer])

  const handleCanPlay = useCallback(() => {
    handleBuffer({ isBuffering: false })
  }, [handleBuffer])

  // Web-specific error handler
  const handleVideoError = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const error = event.currentTarget.error
      handleError({ error })
    },
    [handleError]
  )

  // Web-specific play/pause toggle
  const handleWebTogglePlayPause = useCallback(() => {
    if (disabled || isProcessing || !videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    togglePlayPause()
  }, [disabled, isProcessing, isPlaying, togglePlayPause])

  // Handle video click
  const handleVideoClick = useCallback(() => {
    if (showControls) {
      handleWebTogglePlayPause()
    }
  }, [showControls, handleWebTogglePlayPause])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !disabled && !isProcessing) {
        event.preventDefault()
        handleWebTogglePlayPause()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [disabled, isProcessing, handleWebTogglePlayPause])

  // Render loading overlay
  const renderLoadingOverlay = () => {
    if (!isBuffering) return null

    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0, 0, 0, 0.5)"
        alignItems="center"
        justifyContent="center"
        testID="loading-overlay"
      >
        <YStack
          alignItems="center"
          gap="$3"
        >
          <Spinner
            size="large"
            color="white"
          />
          <Text
            color="white"
            fontSize="$4"
          >
            Loading...
          </Text>
        </YStack>
      </YStack>
    )
  }

  // Render play button overlay
  const renderPlayButtonOverlay = () => {
    if (isPlaying || isBuffering || hasError || !showControls) return null

    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        alignItems="center"
        justifyContent="center"
        testID="play-button-overlay"
      >
        <Button
          size="$6"
          circular
          backgroundColor="rgba(0, 0, 0, 0.6)"
          borderColor="white"
          borderWidth={2}
          onPress={handleWebTogglePlayPause}
          icon={Play}
          pressStyle={{
            scale: 0.95,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
          accessibilityLabel="Play video"
          accessibilityRole="button"
        />
      </YStack>
    )
  }

  // Render error overlay
  const renderErrorOverlay = () => {
    if (!hasError) return null

    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0, 0, 0, 0.8)"
        alignItems="center"
        justifyContent="center"
        padding="$4"
      >
        <YStack
          alignItems="center"
          gap="$3"
        >
          <Text
            color="white"
            fontSize="$5"
            textAlign="center"
          >
            Failed to load video
          </Text>
          <Button
            variant="outlined"
            borderColor="white"
            onPress={() => {
              setError(false)
              setPlaying(false)
            }}
          >
            <Text color="white">Try Again</Text>
          </Button>
        </YStack>
      </YStack>
    )
  }

  // Render processing overlay
  const renderProcessingOverlay = () => {
    if (!isProcessing) return null

    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0, 0, 0, 0.8)"
        alignItems="center"
        justifyContent="center"
        padding="$4"
      >
        <YStack
          alignItems="center"
          gap="$3"
          maxWidth={300}
        >
          <Loader
            size={32}
            color="white"
          />
          <Text
            color="white"
            fontSize="$5"
            textAlign="center"
          >
            Processing Video...
          </Text>
          <Progress
            value={processingProgress}
            max={100}
            width="100%"
            height={8}
            backgroundColor="rgba(255, 255, 255, 0.3)"
          >
            <Progress.Indicator
              animation="bouncy"
              backgroundColor="white"
            />
          </Progress>
          <Text
            color="white"
            fontSize="$3"
            textAlign="center"
          >
            {processingProgress.toFixed(0)}% Complete
          </Text>
        </YStack>
      </YStack>
    )
  }

  // Render action buttons
  const renderActionButtons = () => {
    if (!showControls) return null

    return (
      <XStack
        gap="$3"
        width="100%"
        maxWidth={320}
        marginTop="$4"
      >
        <Button
          flex={1}
          variant="outlined"
          onPress={onRestart}
          icon={RotateCcw}
          disabled={isProcessing || disabled}
          accessibilityLabel="Restart recording"
        >
          Restart
        </Button>

        <Button
          flex={1}
          variant="outlined"
          onPress={onShare}
          icon={Share}
          disabled={isProcessing || disabled}
          accessibilityLabel="Share video"
        >
          Share
        </Button>
      </XStack>
    )
  }

  // Render continue button
  const renderContinueButton = () => {
    if (!showControls) return null

    return (
      <Button
        width="100%"
        maxWidth={320}
        onPress={onContinue}
        disabled={isProcessing || disabled}
        marginTop="$3"
        accessibilityLabel="Continue to analysis"
      >
        Continue to Analysis
      </Button>
    )
  }

  // If no video URI, show placeholder
  if (!videoUri) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        padding="$4"
        gap="$4"
        alignItems="center"
        justifyContent="center"
      >
        <YStack
          width="100%"
          maxWidth={320}
          height={240}
          backgroundColor="$backgroundHover"
          borderRadius="$4"
          alignItems="center"
          justifyContent="center"
          borderWidth={2}
          borderColor="$borderColor"
          borderStyle="dashed"
        >
          <YStack
            alignItems="center"
            gap="$2"
          >
            <Play
              size={48}
              color="$color"
            />
            <Text
              fontSize="$4"
              color="$color"
            >
              No Video Available
            </Text>
          </YStack>
        </YStack>
        {renderActionButtons()}
        {renderContinueButton()}
      </YStack>
    )
  }

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      padding="$4"
      gap="$4"
      alignItems="center"
      justifyContent="center"
    >
      {/* Video Container */}
      <YStack
        width="100%"
        maxWidth={320}
        height={240}
        borderRadius="$4"
        overflow="hidden"
        backgroundColor="black"
        position="relative"
      >
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          src={videoUri}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            cursor: showControls ? 'pointer' : 'default',
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onError={handleVideoError}
          onClick={handleVideoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleVideoClick()
            }
          }}
          data-testid="video-player"
          aria-label={getAccessibilityLabel()}
          role="button"
          tabIndex={0}
          preload="metadata"
          playsInline
        />

        {/* Overlays */}
        {renderLoadingOverlay()}
        {renderPlayButtonOverlay()}
        {renderErrorOverlay()}
        {renderProcessingOverlay()}
      </YStack>

      {/* Video Info */}
      {(duration > 0 || videoDuration > 0) && (
        <Text
          fontSize="$3"
          color="$color"
          textAlign="center"
        >
          Duration: {formatDuration(duration || videoDuration)}
        </Text>
      )}

      {/* Action Buttons */}
      {renderActionButtons()}
      {renderContinueButton()}
    </YStack>
  )
}
