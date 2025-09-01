import { Play, RotateCcw, Share } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, Progress, Text, XStack, YStack } from 'tamagui'

export interface PostRecordingPlaybackProps {
  videoUri?: string
  duration?: number
  onRestart?: () => void
  onShare?: () => void
  onContinue?: () => void
  isProcessing?: boolean
  processingProgress?: number
}

/**
 * Post-Recording Playback Component - Placeholder Implementation
 * Basic video playback UI with processing status
 * Implements US-RU-13: Video playback with live processing
 */
export function PostRecordingPlayback({
  videoUri,
  duration = 0,
  onRestart,
  onShare,
  onContinue,
  isProcessing = false,
  processingProgress = 0,
}: PostRecordingPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
      {/* Video Preview Placeholder */}
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
            {videoUri ? 'Video Preview' : 'No Video Available'}
          </Text>
          {duration > 0 && (
            <Text
              fontSize="$3"
              color="$color"
            >
              Duration: {formatDuration(duration)}
            </Text>
          )}
        </YStack>
      </YStack>

      {/* Processing Status */}
      {isProcessing && (
        <YStack
          width="100%"
          maxWidth={320}
          gap="$2"
        >
          <Text
            fontSize="$4"
            textAlign="center"
          >
            Processing Video...
          </Text>
          <Progress
            value={processingProgress}
            max={100}
          >
            <Progress.Indicator animation="bouncy" />
          </Progress>
          <Text
            fontSize="$3"
            textAlign="center"
            color="$color"
          >
            {processingProgress.toFixed(0)}% Complete
          </Text>
        </YStack>
      )}

      {/* Action Buttons */}
      <XStack
        gap="$3"
        width="100%"
        maxWidth={320}
      >
        <Button
          flex={1}
          variant="outlined"
          onPress={onRestart}
          icon={RotateCcw}
          disabled={isProcessing}
        >
          Restart
        </Button>

        <Button
          flex={1}
          variant="outlined"
          onPress={() => setIsPlaying(!isPlaying)}
          icon={Play}
          disabled={isProcessing}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>

        <Button
          flex={1}
          variant="outlined"
          onPress={onShare}
          icon={Share}
          disabled={isProcessing}
        >
          Share
        </Button>
      </XStack>

      {/* Continue Button */}
      <Button
        width="100%"
        maxWidth={320}
        onPress={onContinue}
        disabled={isProcessing}
      >
        Continue to Analysis
      </Button>

      {/* Placeholder Note */}
      <Text
        fontSize="$3"
        color="$color"
        textAlign="center"
        marginTop="$4"
      >
        This is a placeholder implementation. Full video playback will be implemented in Phase 5.
      </Text>
    </YStack>
  )
}
