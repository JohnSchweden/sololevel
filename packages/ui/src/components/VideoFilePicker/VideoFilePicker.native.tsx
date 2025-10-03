import { useActionSheet } from '@expo/react-native-action-sheet'
import { log } from '@my/logging'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'
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
            mediaTypes: 'videos',
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
          mimeType = asset.type === 'video' ? 'video/mp4' : 'video/mp4'
        } else {
          fileName = `video_${Date.now()}.mp4`
          mimeType = 'video/mp4'
        }

        // For gallery/file selection, the file is already local - no need to copy it
        // Only create File object for validation using the existing local file
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: mimeType })

        // Get duration from asset if available
        let assetDuration = 0
        if ('duration' in asset && typeof asset.duration === 'number') {
          // ImagePicker asset duration might be in milliseconds or some other unit
          // Convert to seconds if needed
          assetDuration = asset.duration

          // Check if duration seems unreasonably long (likely in milliseconds)
          if (assetDuration > 3600) {
            // If longer than 1 hour, likely in milliseconds
            assetDuration = assetDuration / 1000
          }
        }

        // Validate video file
        const validation = await validateVideoFile(file, {
          maxDurationSeconds,
          maxFileSizeBytes,
        })

        if (!validation.isValid) {
          log.error('VideoFilePicker.native', 'Video validation failed', {
            errors: validation.errors,
          })
          // TODO: Show validation error to user
          return
        }

        // Use asset duration if available and valid, otherwise use validation metadata
        const finalDuration = assetDuration > 0 ? assetDuration : validation.metadata?.duration || 0

        log.info('VideoFilePicker', 'Video selected and validated', {
          name: file.name,
          size: file.size,
          rawAssetDuration: 'duration' in asset ? asset.duration : 'N/A',
          assetDuration: assetDuration,
          validationDuration: validation.metadata?.duration,
          finalDuration: finalDuration,
          durationUnit:
            assetDuration > 3600 ? 'converted from ms to seconds' : 'already in seconds',
        })

        // Override the validation metadata with asset duration and original file info
        const metadata = validation.metadata
          ? {
              ...validation.metadata,
              duration: finalDuration,
              localUri: asset.uri, // Use original URI since file is already local
              originalFilename: fileName,
            }
          : {
              duration: finalDuration,
              size: file.size,
              format: mimeType.split('/')[1] || 'mp4',
              localUri: asset.uri, // Use original URI since file is already local
              originalFilename: fileName,
            }

        log.info('VideoFilePicker', 'Video selected from local storage', {
          uri: asset.uri,
          filename: fileName,
          size: file.size,
        })

        // Call success callback
        onVideoSelected(file, metadata)
      }
    } catch (error) {
      log.error('VideoFilePicker.native', 'Error selecting video', {
        error: error instanceof Error ? error.message : String(error),
      })
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
