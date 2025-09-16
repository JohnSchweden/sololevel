import {
  Download,
  Maximize,
  Pause,
  Play,
  Share,
  SkipBack,
  SkipForward,
} from '@tamagui/lucide-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable } from 'react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { AppHeader } from '../../AppHeader/AppHeader'

export interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  showControls: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onToggleFullscreen?: () => void
  onControlsVisibilityChange?: (visible: boolean) => void
  // Header props
  title?: string
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  showControls,
  onPlay,
  onPause,
  onSeek,
  onToggleFullscreen,
  onControlsVisibilityChange,
  title = 'Video Analysis',
}: VideoControlsProps) {
  const [controlsVisible, setControlsVisible] = useState(showControls)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressBarRef = useRef<any>(null)

  // Auto-hide controls after 3 seconds when playing
  const resetAutoHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    if (isPlaying && !isScrubbing) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false)
        onControlsVisibilityChange?.(false)
      }, 3000)
    }
  }, [isPlaying, isScrubbing, onControlsVisibilityChange])

  // Show controls and reset timer
  const showControlsAndResetTimer = useCallback(() => {
    setControlsVisible(true)
    onControlsVisibilityChange?.(true)
    resetAutoHideTimer()
  }, [resetAutoHideTimer, onControlsVisibilityChange])

  // Handle touch/press to show controls
  const handlePress = useCallback(() => {
    if (!controlsVisible) {
      showControlsAndResetTimer()
    }
  }, [controlsVisible, showControlsAndResetTimer])

  // Update controls visibility when prop changes
  useEffect(() => {
    setControlsVisible(showControls)
    if (showControls) {
      resetAutoHideTimer()
    }
  }, [showControls, resetAutoHideTimer])

  // Reset timer when playing state changes
  useEffect(() => {
    resetAutoHideTimer()
  }, [resetAutoHideTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    // Handle negative values by treating them as 0
    const safeSeconds = Math.max(0, seconds)

    if (safeSeconds >= 3600) {
      const hours = Math.floor(safeSeconds / 3600)
      const minutes = Math.floor((safeSeconds % 3600) / 60)
      const remainingSeconds = Math.floor(safeSeconds % 60)
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const progressPercentage = Math.round(progress)

  const handleMenuPress = useCallback(() => {
    setShowMenu(true)
    // Reset auto-hide timer when menu is opened
    showControlsAndResetTimer()
  }, [showControlsAndResetTimer])

  const handleMenuItemPress = useCallback((action: string) => {
    console.log(`Menu action: ${action}`)
    setShowMenu(false)
    // Could add specific handlers for different menu actions here
  }, [])

  return (
    <Pressable
      onPress={handlePress}
      style={{ flex: 1 }}
      testID="video-controls-pressable"
    >
      <YStack
        position="absolute"
        inset={0}
        backgroundColor="rgba(0,0,0,0.3)"
        justifyContent="space-between"
        padding="$4"
        opacity={controlsVisible ? 1 : 0}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
        animation="quick"
        testID="video-controls-overlay"
        accessibilityLabel={`Video controls overlay ${controlsVisible ? 'visible' : 'hidden'}`}
        accessibilityRole="toolbar"
        accessibilityState={{ expanded: controlsVisible }}
      >
        {/* Header */}
        <XStack paddingBottom="$2">
          <AppHeader
            mode="analysis"
            title={title}
            onMenuPress={handleMenuPress}
          />
        </XStack>
        {/* Center Controls */}
        <XStack
          justifyContent="center"
          alignItems="center"
          gap="$4"
          marginBottom="$4"
          accessibilityLabel="Video playback controls"
        >
          <Button
            chromeless
            icon={<SkipBack />}
            size={60}
            backgroundColor="rgba(0,0,0,0.6)"
            borderRadius={30}
            onPress={() => {
              showControlsAndResetTimer()
              onSeek(Math.max(0, currentTime - 10))
            }}
            testID="rewind-button"
            accessibilityLabel="Rewind 10 seconds"
            accessibilityRole="button"
            accessibilityHint={`Skip backward 10 seconds from ${formatTime(currentTime)}`}
          />
          <Button
            chromeless
            icon={isPlaying ? <Pause /> : <Play />}
            size={80}
            backgroundColor="rgba(0,0,0,0.6)"
            borderRadius={40}
            onPress={() => {
              showControlsAndResetTimer()
              isPlaying ? onPause() : onPlay()
            }}
            testID={isPlaying ? 'pause-button' : 'play-button'}
            accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
            accessibilityRole="button"
            accessibilityHint={isPlaying ? 'Pause video playback' : 'Start video playback'}
            accessibilityState={{ selected: isPlaying }}
          />
          <Button
            chromeless
            icon={<SkipForward />}
            size={60}
            backgroundColor="rgba(0,0,0,0.6)"
            borderRadius={30}
            onPress={() => {
              showControlsAndResetTimer()
              onSeek(Math.min(duration, currentTime + 10))
            }}
            testID="fast-forward-button"
            accessibilityLabel="Fast forward 10 seconds"
            accessibilityRole="button"
            accessibilityHint={`Skip forward 10 seconds from ${formatTime(currentTime)}`}
          />
        </XStack>

        {/* Bottom Controls */}
        <YStack
          gap="$2"
          accessibilityLabel="Video timeline and controls"
        >
          {/* Time Display */}
          <XStack
            justifyContent="space-between"
            accessibilityLabel="Video time information"
          >
            <Text
              fontSize="$3"
              color="$color12"
              testID="current-time"
              accessibilityLabel={`Current time: ${formatTime(currentTime)}`}
            >
              {formatTime(currentTime)}
            </Text>
            <Text
              fontSize="$3"
              color="$color12"
              testID="total-time"
              accessibilityLabel={`Total duration: ${formatTime(duration)}`}
            >
              {formatTime(duration)}
            </Text>
          </XStack>

          {/* Progress Bar */}
          <YStack
            height={40}
            justifyContent="center"
            testID="progress-bar-container"
          >
            <Button
              ref={progressBarRef}
              height={4}
              backgroundColor="$color3"
              borderRadius={2}
              testID="progress-bar"
              onPress={() => {
                // Seek to middle of video when progress bar is tapped
                const middleTime = duration / 2
                onSeek(middleTime)
                showControlsAndResetTimer()
              }}
              onPressIn={() => {
                setIsScrubbing(true)
                showControlsAndResetTimer()
              }}
              onPressOut={() => setIsScrubbing(false)}
              accessibilityLabel={`Video progress: ${progressPercentage}% complete`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: progressPercentage }}
              accessibilityHint="Tap and drag to scrub through video"
              chromeless
              padding={0}
            >
              <YStack
                height="100%"
                width={`${progress}%`}
                backgroundColor="$yellow9"
                borderRadius={2}
                testID="progress-fill"
              />
            </Button>

            {/* Invisible scrubber handle for better touch interaction */}
            <YStack
              position="absolute"
              left={`${progress}%`}
              top={0}
              width={20}
              height={20}
              marginLeft={-10}
              marginTop={-8}
              backgroundColor="$yellow9"
              borderRadius={10}
              opacity={isScrubbing ? 1 : 0}
              animation="quick"
              testID="scrubber-handle"
            />
          </YStack>

          {/* Fullscreen Button */}
          <XStack
            justifyContent="flex-end"
            accessibilityLabel="Additional video controls"
          >
            <Button
              chromeless
              icon={<Maximize />}
              size={44}
              color="$color12"
              onPress={() => {
                showControlsAndResetTimer()
                onToggleFullscreen?.()
              }}
              testID="fullscreen-button"
              accessibilityLabel="Toggle fullscreen mode"
              accessibilityRole="button"
              accessibilityHint="Tap to enter or exit fullscreen mode"
            />
          </XStack>
        </YStack>

        {/* Fly-out Menu - Temporarily disabled for testing */}
        {/* TODO: Re-enable Sheet component after fixing mock */}
        {showMenu && (
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            padding="$4"
            gap="$3"
            testID="menu-overlay"
          >
            <Text
              fontSize="$6"
              fontWeight="600"
              textAlign="center"
            >
              Video Options
            </Text>

            <YStack gap="$2">
              <Button
                onPress={() => handleMenuItemPress('share')}
                icon={<Share />}
                justifyContent="flex-start"
                backgroundColor="transparent"
                pressStyle={{ backgroundColor: '$color3' }}
                size="$4"
                borderRadius="$3"
              >
                Share Video
              </Button>

              <Button
                onPress={() => handleMenuItemPress('download')}
                icon={<Download />}
                justifyContent="flex-start"
                backgroundColor="transparent"
                pressStyle={{ backgroundColor: '$color3' }}
                size="$4"
                borderRadius="$3"
              >
                Download Video
              </Button>

              <Button
                onPress={() => handleMenuItemPress('export')}
                justifyContent="flex-start"
                backgroundColor="transparent"
                pressStyle={{ backgroundColor: '$color3' }}
                size="$4"
                borderRadius="$3"
              >
                Export Analysis
              </Button>
            </YStack>
          </YStack>
        )}
      </YStack>
    </Pressable>
  )
}
