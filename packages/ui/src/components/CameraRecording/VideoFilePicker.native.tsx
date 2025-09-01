import { useActionSheet } from '@expo/react-native-action-sheet'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'
import { log } from '../../utils/logger'
import type { VideoValidationResult } from '../../utils/videoValidation'
import { validateVideoFile } from '../../utils/videoValidation'

export interface VideoFilePickerProps {
  isOpen: boolean
  onVideoSelected: (file: File, metadata: VideoValidationResult['metadata']) => void
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
  maxDurationSeconds = 60,
  maxFileSizeBytes = 100 * 1024 * 1024, // 100MB
  showUploadProgress = false,
  disabled = false,
}: VideoFilePickerProps) {
  const { showActionSheetWithOptions } = useActionSheet()

  // Handle video selection from different sources
  const handleVideoSelection = async (source: 'gallery' | 'camera' | 'files') => {
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

          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false,
            quality: 1,
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
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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

        // Create File object for validation
        const response = await fetch(asset.uri)
        const blob = await response.blob()

        // Create File with proper name and type based on source
        let fileName: string
        let mimeType: string

        if ('fileName' in asset && asset.fileName) {
          // DocumentPicker asset
          fileName = asset.fileName
          mimeType = asset.mimeType || 'video/mp4'
        } else if ('type' in asset) {
          // ImagePicker asset
          fileName = `video_${Date.now()}.mp4`
          mimeType = asset.type === 'video' ? 'video/mp4' : 'video/mp4'
        } else {
          fileName = `video_${Date.now()}.mp4`
          mimeType = 'video/mp4'
        }

        const file = new File([blob], fileName, { type: mimeType })

        // Validate video file
        const validation = await validateVideoFile(file, {
          maxDurationSeconds,
          maxFileSizeBytes,
        })

        if (!validation.isValid) {
          log.error('VideoFilePicker', 'Video validation failed', validation.errors)
          // TODO: Show validation error to user
          return
        }

        log.info('VideoFilePicker', 'Video selected and validated', {
          name: file.name,
          size: file.size,
          duration: validation.metadata?.duration,
        })

        // Call success callback
        onVideoSelected(file, validation.metadata)
      }
    } catch (error) {
      log.error('VideoFilePicker', 'Error selecting video', error)
      // TODO: Show error to user
    }
  }

  // Show action sheet when opened
  if (isOpen && !disabled && !showUploadProgress) {
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
        if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) {
          onCancel()
          return
        }

        const selectedOption = options[buttonIndex]
        if (selectedOption) {
          handleVideoSelection(selectedOption.source)
        }
      }
    )
  }

  // This component doesn't render anything visible
  return null
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
