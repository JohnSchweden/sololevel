import { useHeaderLogo } from '@app/components/navigation'
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useKeepAwake } from '@app/features/CameraRecording/hooks/useKeepAwake'
import type { HeaderState } from '@app/features/CameraRecording/types'
import { RecordingState } from '@app/features/CameraRecording/types'
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

  // Keep screen awake only when this tab is focused
  // Uses hook for centralized keep-awake management
  useKeepAwake()

  const handleVideoProcessed = (videoUri: string) => {
    router.push({
      pathname: '/video-analysis',
      params: { videoUri },
    })
  }

  const handleNavigateToHistory = () => {
    router.push('/history-progress')
  }

  // Logo image for header (only shown when not recording)
  // Used for dynamic updates when recording state changes
  // Initial logo is set statically in _layout.tsx for immediate visibility (prevents gap)
  const headerLogo = useHeaderLogo()

  // Handle dynamic header updates from screen
  const handleHeaderStateChange = useCallback(
    (state: HeaderState) => {
      // STOPPED state: Don't update header - keep whatever was showing during recording
      // Navigation will happen shortly (~1-2s) when file save completes
      if (state.mode === RecordingState.STOPPED) {
        return // Skip header update for STOPPED state
      }

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
          // Show logo when not recording, otherwise show timer
          titleSlot: isInRecordingState ? undefined : headerLogo,
          leftAction: isInRecordingState ? 'back' : 'sidesheet',
          onBackPress: () => backPressHandlerRef.current?.(),
          onMenuPress: handleNavigateToHistory,
          cameraProps: { isRecording: state.isRecording },
          disableBlur: true,
        },
      })
    },
    [navigation, handleNavigateToHistory, headerLogo]
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
