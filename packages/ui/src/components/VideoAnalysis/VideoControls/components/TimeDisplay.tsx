import React from 'react'
import { Text, XStack } from 'tamagui'

/**
 * Format seconds into MM:SS or HH:MM:SS format
 */
export function formatTime(seconds: number): string {
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

export interface TimeDisplayProps {
  /** Current playback time in seconds */
  currentTime: number
  /** Total video duration in seconds */
  duration: number
  /** Optional test ID for the container */
  testID?: string
}

/**
 * TimeDisplay component for video playback time
 *
 * Displays current time / total duration in MM:SS or HH:MM:SS format
 */
export const TimeDisplay = React.memo<TimeDisplayProps>(({ currentTime, duration, testID }) => {
  return (
    <XStack
      alignItems="center"
      testID={testID}
      accessibilityLabel={`Current time: ${formatTime(currentTime)}, Total duration: ${formatTime(duration)}`}
    >
      <Text
        fontSize="$3"
        color="$color"
        testID={testID ? `${testID}-current` : 'current-time'}
      >
        {formatTime(currentTime)}
      </Text>
      <Text
        fontSize="$3"
        color="$color11"
        marginHorizontal="$1"
      >
        /
      </Text>
      <Text
        fontSize="$3"
        color="$color11"
        testID={testID ? `${testID}-total` : 'total-time'}
      >
        {formatTime(duration)}
      </Text>
    </XStack>
  )
})

TimeDisplay.displayName = 'TimeDisplay'
