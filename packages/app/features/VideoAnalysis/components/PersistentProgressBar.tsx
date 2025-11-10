import { log } from '@my/logging'
import { ProgressBar } from '@ui/components/VideoAnalysis'
import { useAnimatedStyle } from 'react-native-reanimated'
import { usePersistentProgressStore } from '../stores'

/**
 * PersistentProgressBar - Store-connected wrapper for persistent variant
 *
 * Reads all props directly from usePersistentProgressStore to prevent
 * parent component re-renders on every currentTime update (60fps).
 *
 * Architecture:
 * - UI component (`ProgressBar`) stays pure and reusable
 * - This wrapper handles store subscription
 * - Parent only needs to know if bar should render
 *
 * Performance:
 * - Subscribes to entire props object (includes currentTime at 60fps)
 * - BUT: Only THIS component re-renders, not parent
 * - Result: Parent renders only on visibility changes, not every frame
 */
export function PersistentProgressBar() {
  // Subscribe to ALL props - this component re-renders at 60fps, parent doesn't
  const props = usePersistentProgressStore((state) => state.props)

  if (!props) return null

  // Calculate progress from currentTime/duration
  const progress = props.duration > 0 ? (props.currentTime / props.duration) * 100 : 0

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: props.visibility.value,
  }))

  log.debug('PersistentProgressBar', 'Rendering with precise values', {
    currentTime: props.currentTime,
    duration: props.duration,
    progress,
    progressRounded: Math.floor(progress),
  })

  return (
    <ProgressBar
      variant="persistent"
      progress={progress}
      isScrubbing={props.isScrubbing}
      controlsVisible={props.controlsVisible}
      animatedStyle={props.animatedStyle ?? animatedStyle}
      pointerEvents={props.pointerEvents}
      combinedGesture={props.combinedGesture}
      mainGesture={props.mainGesture}
      onLayout={props.onLayout}
      onFallbackPress={props.onFallbackPress}
      testID="persistent-progress-bar"
    />
  )
}
