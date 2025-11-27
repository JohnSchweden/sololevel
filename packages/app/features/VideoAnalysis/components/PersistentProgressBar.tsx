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
 * - PERF FIX: Renders visual-only bar immediately when props is null (no gestures)
 *   This eliminates the 500ms delay - bar track shows on first frame, gestures added later
 */
export function PersistentProgressBar() {
  const props = usePersistentProgressStore((state) => state.props)

  // CRITICAL: Hooks must be called unconditionally (Rules of Hooks)
  // This runs even when props is null to maintain stable hook order
  const fallbackAnimatedStyle = useAnimatedStyle(() => {
    if (!props?.visibility) return { opacity: 1 }
    return { opacity: props.visibility.value }
  })

  // PERF FIX: Render visual-only bar immediately when props is null
  // This shows the progress track on first frame (no gestures yet)
  // When VideoControls mounts and sets props, gestures become active
  if (!props) {
    return (
      <ProgressBar
        variant="persistent"
        progress={0}
        isScrubbing={false}
        controlsVisible={false}
        animatedStyle={fallbackAnimatedStyle}
        pointerEvents="none"
        testID="persistent-progress-bar-visual-only"
      />
    )
  }

  // CRITICAL: Do NOT compute progress from props.currentTime/duration in React render.
  // That would defeat the entire purpose of using progressShared for UI-thread updates.
  // ProgressBar reads progressShared.value directly in useAnimatedStyle (UI thread).
  // The progress prop is only used as a fallback when progressShared is absent.
  const fallbackProgress = props.duration > 0 ? (props.currentTime / props.duration) * 100 : 0

  return (
    <ProgressBar
      variant="persistent"
      progress={fallbackProgress}
      isScrubbing={props.isScrubbing}
      controlsVisible={props.controlsVisible}
      animatedStyle={props.animatedStyle ?? fallbackAnimatedStyle}
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
