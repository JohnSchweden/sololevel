import { Play, RotateCcw, Share } from '@tamagui/lucide-icons'
import { Button, Text, XStack, YStack } from 'tamagui'
import { VideoPlayerProps } from '@my/app/hooks/useVideoPlayer'

/**
 * Web Stub Video Player Component
 * Minimal implementation for web fallback
 * Implements US-RU-13: Video playback with live processing (fallback)
 * 
 * This is a fallback implementation that shows a placeholder
 * when the full web implementation is not available.
 * The actual web implementation is in VideoPlayer.web.tsx
 * 
 * Features:
 * - Placeholder UI for video playback
 * - Action buttons (restart, share, continue)
 * - Basic accessibility support
 * - Error handling with user feedback
 */
export function VideoPlayer({
  videoUri,
  duration = 0,
  onRestart,
  onShare,
  onContinue,
  isProcessing = false,
  disabled = false,
  showControls = true,
}: VideoPlayerProps) {
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
        <YStack alignItems="center" gap="$2">
          <Play size={48} color="$color" />
          <Text fontSize="$4" color="$color" textAlign="center">
            {videoUri ? 'Video Player Not Available' : 'No Video Available'}
          </Text>
          <Text fontSize="$2" color="$color" textAlign="center" opacity={0.7}>
            {videoUri ? 'Use native or web-specific implementation' : 'Select a video to play'}
          </Text>
        </YStack>
      </YStack>

      {/* Video Info */}
      {duration > 0 && (
        <Text fontSize="$3" color="$color" textAlign="center">
          Duration: {Math.floor(duration / 1000 / 60)}:{(Math.floor(duration / 1000) % 60).toString().padStart(2, '0')}
        </Text>
      )}

      {/* Action Buttons */}
      {renderActionButtons()}
      {renderContinueButton()}
    </YStack>
  )
}

export type { VideoPlayerProps }
