import { ProgressBar } from '@ui/components/VideoAnalysis'
import { useAnimatedStyle } from 'react-native-reanimated'
import { usePersistentProgressStore } from '../stores'

/**
 * PersistentProgressBar - Store-connected wrapper for persistent variant
 *
 * Reads props directly from {@link usePersistentProgressStore} so layout components
 * avoid re-rendering on every progress tick. When a `progressShared` Reanimated shared
 * value is present (the normal case after coordinator wiring), the underlying `ProgressBar`
 * consumes that shared value on the UI thread for instant sync with highlights. If the shared
 * value is absent (e.g., during early bootstrapping or tests), the component falls back to the
 * React-derived progress percentage (`fallbackProgress`).
 *
 * Architecture:
 * - UI component (`ProgressBar`) stays pure and reusable
 * - This wrapper handles the store subscription
 * - Parent only needs to decide whether the bar should render
 *
 * Performance:
 * - Only this component re-renders when store props change
 * - UI-thread worklets read `progressShared` directly (no React lag)
 * - Fallback progress keeps stories/tests functional without shared values
 */
export function PersistentProgressBar() {
  const props = usePersistentProgressStore((state) => state.props)
  if (!props) return null

  // CRITICAL: Do NOT compute progress from props.currentTime/duration in React render.
  // That would defeat the entire purpose of using progressShared for UI-thread updates.
  // ProgressBar reads progressShared.value directly in useAnimatedStyle (UI thread).
  // The progress prop is only used as a fallback when progressShared is absent.
  const fallbackProgress = props.duration > 0 ? (props.currentTime / props.duration) * 100 : 0

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: props.visibility.value,
  }))

  return (
    <ProgressBar
      variant="persistent"
      progress={fallbackProgress}
      isScrubbing={props.isScrubbing}
      controlsVisible={props.controlsVisible}
      animatedStyle={props.animatedStyle ?? animatedStyle}
      pointerEvents={props.pointerEvents}
      progressShared={props.progressShared}
      progressBarWidthShared={props.progressBarWidthShared}
      combinedGesture={props.combinedGesture}
      mainGesture={props.mainGesture}
      onLayout={props.onLayout}
      onFallbackPress={props.onFallbackPress}
      testID="persistent-progress-bar"
    />
  )
}
