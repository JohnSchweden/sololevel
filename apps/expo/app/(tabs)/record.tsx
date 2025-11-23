import { CameraRecordingScreen } from '@app/features/CameraRecording'
import type { HeaderState } from '@app/features/CameraRecording/types'
import { RecordingState } from '@app/features/CameraRecording/types'
import { useIsFocused } from '@react-navigation/native'
// eslint-disable-next-line deprecation/deprecation
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Record Tab - Camera recording and video upload
 *
 * Route: /(tabs)/record
 * Auth: Protected (requires authentication)
 *
 * **Navigation Pattern (Expo Router Native - Option C):**
 * - Route file owns ALL navigation logic
 * - Dynamic headers configured via navigation.setOptions() in response to screen callbacks
 * - Screen is framework-agnostic and communicates state via onHeaderStateChange
 */
export default function RecordTab() {
  const router = useRouter()
  const navigation = useNavigation()
  const { resetToIdle } = useLocalSearchParams<{ resetToIdle?: string }>()
  const backPressHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const isFocused = useIsFocused()

  // Keep screen awake only when this tab is focused
  useEffect(() => {
    if (isFocused) {
      // eslint-disable-next-line deprecation/deprecation
      activateKeepAwake()
      return () => {
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake()
      }
    }
    return undefined
  }, [isFocused])

  const handleVideoProcessed = (videoUri: string) => {
    router.push({
      pathname: '/video-analysis',
      params: { videoUri },
    })
  }

  const handleNavigateToHistory = () => {
    router.push('/history-progress')
  }

  // Handle dynamic header updates from screen
  const handleHeaderStateChange = useCallback(
    (state: HeaderState) => {
      const isInRecordingState =
        state.mode === RecordingState.RECORDING || state.mode === RecordingState.PAUSED

      const getHeaderMode = () => {
        if (isInRecordingState) return 'recording'
        if (state.mode === RecordingState.IDLE) return 'camera-idle'
        return 'camera'
      }

      navigation.setOptions({
        // @ts-ignore: custom appHeaderProps not in base type
        appHeaderProps: {
          title: 'Record',
          mode: getHeaderMode(),
          showTimer: isInRecordingState,
          timerValue: state.time,
          leftAction: isInRecordingState ? 'back' : 'sidesheet',
          onBackPress: () => backPressHandlerRef.current?.(),
          onMenuPress: handleNavigateToHistory,
          cameraProps: { isRecording: state.isRecording },
        },
      })
    },
    [navigation, handleNavigateToHistory]
  )

  // Reset to idle state when navigating back from video analysis
  useEffect(() => {
    if (resetToIdle === 'true') {
      router.setParams({ resetToIdle: undefined })
    }
  }, [resetToIdle, router])

  return (
    <CameraRecordingScreen
      onVideoProcessed={handleVideoProcessed}
      onHeaderStateChange={handleHeaderStateChange}
      onBackPress={backPressHandlerRef}
      onDevNavigate={(route) => router.push(route as any)}
      resetToIdle={resetToIdle === 'true'}
    />
  )
}
