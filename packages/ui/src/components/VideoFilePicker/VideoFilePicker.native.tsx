import { MAX_RECORDING_DURATION_SECONDS } from '@app/features/CameraRecording/config/recordingConfig'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { log } from '@my/logging'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { VideoValidationResult } from '../../utils/videoValidation'
import { validateVideoFromMetadata } from '../../utils/videoValidation'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'

export interface VideoFilePickerProps {
  isOpen: boolean
  /**
   * Called when video is selected.
   * Native: file is undefined (use metadata.localUri to avoid 28MB memory spike)
   */
  onVideoSelected: (file: File | undefined, metadata: VideoValidationResult['metadata']) => void
  onCancel: () => void
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  showUploadProgress?: boolean
  uploadProgress?: number
  disabled?: boolean
}

/**
 * Native Video File Picker using Action Sheet
 * Integrates expo-image-picker and expo-document-picker
 * Handles platform-specific iOS/Android presentation
 */
export function VideoFilePicker({
  isOpen,
  onVideoSelected,
  onCancel,
  maxDurationSeconds = MAX_RECORDING_DURATION_SECONDS,
  maxFileSizeBytes = 100 * 1024 * 1024, // 100MB
  showUploadProgress = false,
  disabled = false,
}: VideoFilePickerProps) {
  const { showActionSheetWithOptions } = useActionSheet()
  const hasShownActionSheetRef = useRef(false)
  const [showDurationErrorDialog, setShowDurationErrorDialog] = useState(false)
  const [durationError, setDurationError] = useState<string>('')

  // Handle video selection from different sources
  const handleVideoSelection = useCallback(
    async (source: 'gallery' | 'camera' | 'files') => {
      try {
        let result: ImagePicker.ImagePickerResult | DocumentPicker.DocumentPickerResult

        switch (source) {
          case 'gallery': {
            // Request media library permissions
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!mediaPermission.granted) {
              log.warn('VideoFilePicker', 'Media library permission denied')
              return
            }

            // allowsEditing: true shows iOS native video trim UI, letting users cut long videos
            // videoMaxDuration enforces the limit in the trim UI (user can't select >30s)
            // Tradeoff: iOS transcodes the result (~3-5s delay) instead of returning original file
            result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'videos',
              allowsEditing: true,
              videoMaxDuration: maxDurationSeconds,
            })
            break
          }

          case 'camera': {
            // Request camera permissions
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
            if (!cameraPermission.granted) {
              log.warn('VideoFilePicker', 'Camera permission denied')
              return
            }

            result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'videos',
              allowsEditing: false,
              quality: 1,
              videoMaxDuration: maxDurationSeconds,
            })
            break
          }

          case 'files': {
            result = await DocumentPicker.getDocumentAsync({
              type: ['video/mp4', 'video/quicktime', 'video/mov'],
              multiple: false,
            })
            break
          }

          default:
            return
        }

        // Handle cancellation
        if (result.canceled) {
          onCancel()
          return
        }

        // Process selected video
        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0]

          // Get filename and mime type
          let fileName: string
          let mimeType: string

          if ('fileName' in asset && asset.fileName) {
            // DocumentPicker asset
            fileName = asset.fileName
            mimeType = asset.mimeType || 'video/mp4'
          } else if ('type' in asset) {
            // ImagePicker asset
            fileName = `video_${Date.now()}.mp4`
            // mediaTypes: 'videos' guarantees type='video', but check defensively
            if (asset.type !== 'video') {
              throw new Error('Selected media is not a video')
            }
            mimeType = 'video/mp4'
          } else {
            fileName = `video_${Date.now()}.mp4`
            mimeType = 'video/mp4'
          }

          // PERF: Get file size from FileSystem instead of fetching entire file into memory
          // This avoids a 28MB memory spike for large videos
          const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true })
          const fileSize = (fileInfo as { size?: number }).size || 0

          // Get duration from asset if available
          let assetDuration = 0
          if ('duration' in asset && typeof asset.duration === 'number') {
            assetDuration = asset.duration

            // expo-image-picker on iOS returns duration in MILLISECONDS, not seconds
            // If duration > 60 (well above our 30s max), it's in milliseconds - convert to seconds
            if (assetDuration > 60) {
              assetDuration = assetDuration / 1000
            }
          }

          // Validate using metadata only (no File blob needed on native)
          const validation = validateVideoFromMetadata(
            {
              size: fileSize,
              mimeType,
              duration: assetDuration,
              fileName,
            },
            {
              maxDurationSeconds,
              maxFileSizeBytes,
            }
          )

          if (!validation.isValid) {
            log.error('VideoFilePicker.native', 'Video validation failed', {
              errors: validation.errors,
            })

            // Check if error is due to duration exceeding limit
            const durationErrorMsg = validation.errors.find(
              (error) => error.includes('too long') || error.includes('duration')
            )

            if (durationErrorMsg && validation.metadata?.duration) {
              const errorMessage = `The selected video is ${Math.ceil(validation.metadata.duration)} seconds long. Maximum allowed duration is ${maxDurationSeconds} seconds.`

              setDurationError(errorMessage)
              setShowDurationErrorDialog(true)
            }

            // Reset ref so picker can be opened again after dismissing error dialog
            hasShownActionSheetRef.current = false
            return
          }

          // Construct metadata with guaranteed required fields
          const metadata = {
            duration: validation.metadata?.duration ?? assetDuration,
            size: validation.metadata?.size ?? fileSize,
            format: validation.metadata?.format ?? mimeType,
            width: validation.metadata?.width,
            height: validation.metadata?.height,
            bitrate: validation.metadata?.bitrate,
            localUri: asset.uri, // Use original URI - file stays on disk
            originalFilename: fileName,
          }

          // Call success callback with undefined file (native uses localUri for compression)
          // This avoids reading 28MB into memory just to pass it through
          onVideoSelected(undefined, metadata)

          // Reset ref so picker can be opened again
          hasShownActionSheetRef.current = false
        }
      } catch (error) {
        log.error('VideoFilePicker.native', 'Error selecting video', {
          error: error instanceof Error ? error.message : String(error),
        })
        // Reset ref so picker can be opened again after error
        hasShownActionSheetRef.current = false
      }
    },
    [
      maxDurationSeconds,
      maxFileSizeBytes,
      onVideoSelected,
      setDurationError,
      setShowDurationErrorDialog,
    ]
  )

  // Show action sheet when opened (use effect to avoid state updates during render)
  useEffect(() => {
    if (isOpen && !disabled && !showUploadProgress && !hasShownActionSheetRef.current) {
      hasShownActionSheetRef.current = true
      const options = getActionSheetOptions(Platform.OS)
      const cancelButtonIndex = options.length - 1

      showActionSheetWithOptions(
        {
          options: options.map((option) => option.label),
          cancelButtonIndex,
          destructiveButtonIndex: undefined,
          title: 'Select Video Source',
          message: 'Choose where to get your video from',
        },
        (buttonIndex) => {
          // Only reset ref when user cancels - NOT before video selection completes
          // This prevents action sheet from reopening if validation fails
          if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) {
            hasShownActionSheetRef.current = false
            onCancel()
            return
          }

          const selectedOption = options[buttonIndex]
          if (selectedOption) {
            handleVideoSelection(selectedOption.source)
          }
        }
      )
    } else if (!isOpen) {
      // Reset ref when picker is closed
      hasShownActionSheetRef.current = false
    }
  }, [
    isOpen,
    disabled,
    showUploadProgress,
    showActionSheetWithOptions,
    onCancel,
    handleVideoSelection,
  ])

  // This component doesn't render anything visible except the error dialog
  return (
    <ConfirmDialog
      visible={showDurationErrorDialog}
      title="Video too long"
      message={
        durationError || `The maximum allowed video duration is ${maxDurationSeconds} seconds.`
      }
      confirmLabel="OK"
      variant="success"
      onConfirm={() => {
        setShowDurationErrorDialog(false)
        // Notify parent to reset isPickerOpen so picker can be reopened
        onCancel()
      }}
      onCancel={() => {
        setShowDurationErrorDialog(false)
        // Notify parent to reset isPickerOpen so picker can be reopened
        onCancel()
      }}
    />
  )
}

/**
 * Get platform-specific action sheet options
 * iOS and Android have different conventions for button ordering
 */
function getActionSheetOptions(
  platform: string
): Array<{ label: string; source: 'gallery' | 'camera' | 'files' }> {
  const baseOptions = [
    { label: 'Choose from Gallery', source: 'gallery' as const },
    { label: 'Record New Video', source: 'camera' as const },
    { label: 'Browse Files', source: 'files' as const },
  ]

  if (platform === 'ios') {
    // iOS: Most commonly used options at the top
    return [
      ...baseOptions,
      { label: 'Cancel', source: 'files' as const }, // Cancel will be handled separately
    ]
  }

  // Android: Alphabetical or logical ordering
  return [
    baseOptions[1], // Gallery first (most common)
    baseOptions[0], // Camera second
    baseOptions[2], // Files last
    { label: 'Cancel', source: 'files' as const }, // Cancel will be handled separately
  ]
}
