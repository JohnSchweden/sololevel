import { useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus, Platform } from 'react-native'

/**
 * Returns true when app is in foreground (active state).
 * On iOS, always returns true since iOS handles camera session interruption gracefully.
 * On Android, tracks AppState to release camera resources when app goes to background.
 *
 * @returns {boolean} True when app is in foreground, false when in background
 */
export function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(true)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    // iOS handles camera session interruption gracefully via AVCaptureSession
    // No need to track AppState on iOS
    if (Platform.OS !== 'android') {
      return
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      const goingToBackground = nextState.match(/inactive|background/)
      const comingToForeground = wasBackground && nextState === 'active'

      if (goingToBackground) {
        setIsActive(false)
      } else if (comingToForeground) {
        setIsActive(true)
      }

      appStateRef.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return isActive
}
