import { CameraRecordingScreen } from '@app/features/CameraRecording'
import type { HeaderState } from '@app/features/CameraRecording/types'
import { RecordingState } from '@app/features/CameraRecording/types'
import { useIsFocused } from '@react-navigation/native'
import { Image } from 'expo-image'
// eslint-disable-next-line deprecation/deprecation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { YStack } from 'tamagui'

/**
 * Unique tag for record tab keep-awake activation.
 * Using tags allows proper reference counting separate from other keep-awake activations.
 */
const KEEP_AWAKE_TAG = 'record-tab'

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
  // Uses tag-based activation for proper reference counting
  useEffect(() => {
    if (isFocused) {
      // Tab is focused - activate keep-awake with unique tag
      // eslint-disable-next-line deprecation/deprecation
      activateKeepAwakeAsync(KEEP_AWAKE_TAG)

      return () => {
        // Cleanup: deactivate only our tag when tab loses focus
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake(KEEP_AWAKE_TAG)
      }
    }
    // Tab is NOT focused - return cleanup that deactivates (in case it was previously active)
    // This ensures deactivation only happens during cleanup, not on every render
    // This is crucial because Expo Router keeps tabs mounted
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      deactivateKeepAwake(KEEP_AWAKE_TAG)
    }
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

  // Logo image for header (only shown when not recording)
  // Used for dynamic updates when recording state changes
  // Initial logo is set statically in _layout.tsx for immediate visibility
  const headerLogo = useMemo(
    () => (
      <YStack
        paddingBottom={4}
        alignItems="center"
        justifyContent="center"
      >
        <Image
          source={require('../../assets/icon_sololevel_header.png')}
          contentFit="contain"
          style={{
            height: 44,
            width: 220,
          }}
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel="Solo:Level"
          testID="header-logo"
        />
      </YStack>
    ),
    []
  )

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
