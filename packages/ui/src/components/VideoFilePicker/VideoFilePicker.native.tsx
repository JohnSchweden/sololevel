import { MAX_RECORDING_DURATION_SECONDS } from '@app/features/CameraRecording/config/recordingConfig'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { log, logBreadcrumb } from '@my/logging'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type { VideoValidationResult } from '../../utils/videoValidation'
import { validateVideoFromMetadata } from '../../utils/videoValidation'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'

// Lazy load video trimming module (needed for Android gallery AND file picker on both platforms)
// NOTE: Module is cached after first load - for tests, mock before importing this file
let cachedVideoTrimModule: any = null
let moduleLoadAttempted = false

function getVideoTrimModule() {
  // In test mode, always reload module to get fresh mocks each time
  const isTestMode = process.env.NODE_ENV === 'test'

  // Production: use cache after first load
  if (!isTestMode && cachedVideoTrimModule && moduleLoadAttempted) {
    return cachedVideoTrimModule
  }

  // NOTE: Do NOT set moduleLoadAttempted = true here.
  // We only set it on SUCCESS.

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-video-trim')

    // Store native module reference for event emitter setup
    const nativeModule = NativeModules.VideoTrim

    log.debug('VideoFilePicker', 'react-native-video-trim loaded', {
      hasShowEditor: !!module?.showEditor,
      hasIsValidFile: !!module?.isValidFile,
    })

    cachedVideoTrimModule = { ...module, nativeModule }
    if (!isTestMode) moduleLoadAttempted = true // Only set on success
    return cachedVideoTrimModule
  } catch (error) {
    log.error('VideoFilePicker', 'react-native-video-trim failed to load', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    cachedVideoTrimModule = null
    return null
  }
}
// Export reset function for tests only
;(global as any).__resetVideoTrimModuleCache = () => {
  cachedVideoTrimModule = null
  moduleLoadAttempted = false
}

/**
 * Validate video and optionally launch trimmer
 * Uses event-based API for react-native-video-trim (showEditor returns undefined, results come via events)
 * @param uri - Video URI to validate/trim
 * @param maxDurationSeconds - Maximum duration for trimmed video
 * @returns Object with uri (original or trimmed) and duration in seconds, or null if cancelled/error
 */
async function launchVideoTrimmer(
  uri: string,
  maxDurationSeconds: number
): Promise<{ uri: string; duration: number } | null> {
  const videoTrimModule = getVideoTrimModule()
  if (!videoTrimModule?.showEditor || !videoTrimModule?.isValidFile) {
    log.error('VideoFilePicker.native', 'Video trim module not available', {
      hasModule: !!videoTrimModule,
      hasShowEditor: !!videoTrimModule?.showEditor,
      hasIsValidFile: !!videoTrimModule?.isValidFile,
    })
    return null
  }

  try {
    // isValidFile returns { isValid: boolean, fileType?: string, duration?: number }
    // duration is in milliseconds
    const validationResult = await videoTrimModule.isValidFile(uri)
    if (!validationResult?.isValid) {
      log.error('VideoFilePicker.native', 'Invalid video for trimming', { uri, validationResult })
      return null
    }

    // Duration is in milliseconds, convert to seconds
    const durationSeconds = (validationResult.duration ?? 0) / 1000

    log.info('VideoFilePicker.native', 'Video validation result', {
      uri: uri.substring(0, 60),
      durationSeconds,
      maxDurationSeconds,
    })

    // If video is within limit, skip trimmer and return original
    if (durationSeconds <= maxDurationSeconds) {
      log.info('VideoFilePicker.native', 'Video within limit, skipping trimmer')
      logBreadcrumb('video-picker', 'Video selected (within limit, no trim needed)', {
        durationSeconds,
        maxDurationSeconds,
      })
      return { uri, duration: durationSeconds }
    }

    // Video exceeds limit - launch trimmer
    logBreadcrumb('video-picker', 'Launching video trimmer', {
      durationSeconds,
      maxDurationSeconds,
    })
    // Per library README: Old Arch uses NativeEventEmitter, New Arch (Fabric) uses Spec API
    const isFabric = !!(global as any).nativeFabricUIManager

    return new Promise((resolve) => {
      const listeners: any[] = []

      // FIX: Remove arbitrary timeout for user interaction
      // Users may take minutes to trim a video. Don't auto-cancel.

      const cleanup = () => {
        listeners.forEach((fn) => fn?.())
      }

      if (isFabric) {
        // New Architecture (Fabric): Use Spec API - call functions with callbacks, they return subscription objects
        try {
          const NativeVideoTrim = videoTrimModule.default

          const finishSub = NativeVideoTrim.onFinishTrimming((data: any) => {
            cleanup()
            // Normalize path: Add file:// prefix if missing (Android native trimmer returns raw path)
            const normalizedPath =
              data.outputPath && !data.outputPath.startsWith('file://')
                ? `file://${data.outputPath}`
                : data.outputPath
            logBreadcrumb('video-picker', 'Video trimmed successfully', {
              originalDuration: durationSeconds,
              trimmedDuration: maxDurationSeconds,
            })
            resolve(normalizedPath ? { uri: normalizedPath, duration: maxDurationSeconds } : null)
          })
          listeners.push(() => finishSub?.remove?.())

          const cancelSub = NativeVideoTrim.onCancelTrimming?.(() => {
            cleanup()
            logBreadcrumb('video-picker', 'Video trim cancelled by user', {
              originalDuration: durationSeconds,
            })
            resolve(null)
          })
          if (cancelSub) {
            listeners.push(() => cancelSub.remove?.())
          }

          const onCancelSub = NativeVideoTrim.onCancel?.(() => {
            cleanup()
            logBreadcrumb('video-picker', 'Video trim cancelled', {
              originalDuration: durationSeconds,
            })
            resolve(null)
          })
          if (onCancelSub) {
            listeners.push(() => onCancelSub.remove?.())
          }

          const errorSub = NativeVideoTrim.onError?.((data: any) => {
            cleanup()
            log.error('VideoFilePicker.native', 'Trimmer error', { error: data.message })
            resolve(null)
          })
          if (errorSub) {
            listeners.push(() => errorSub.remove?.())
          }
        } catch (fabricError) {
          cleanup()
          log.error('VideoFilePicker.native', 'Fabric API setup failed', {
            error: fabricError instanceof Error ? fabricError.message : String(fabricError),
          })
          resolve(null)
          return
        }
      } else {
        // Old Architecture: Use NativeEventEmitter
        try {
          const eventEmitter = new NativeEventEmitter(NativeModules.VideoTrim)
          const sub = eventEmitter.addListener('VideoTrim', (event: any) => {
            if (event.name === 'onFinishTrimming') {
              cleanup()
              // Normalize path: Add file:// prefix if missing (Android native trimmer returns raw path)
              const normalizedPath =
                event.outputPath && !event.outputPath.startsWith('file://')
                  ? `file://${event.outputPath}`
                  : event.outputPath
              logBreadcrumb('video-picker', 'Video trimmed successfully (Old Arch)', {
                originalDuration: durationSeconds,
                trimmedDuration: maxDurationSeconds,
              })
              resolve(normalizedPath ? { uri: normalizedPath, duration: maxDurationSeconds } : null)
            } else if (event.name === 'onCancelTrimming' || event.name === 'onCancel') {
              cleanup()
              logBreadcrumb('video-picker', 'Video trim cancelled by user (Old Arch)', {
                originalDuration: durationSeconds,
              })
              resolve(null)
            } else if (event.name === 'onError') {
              cleanup()
              logBreadcrumb('video-picker', 'Video trim error (Old Arch)', {
                originalDuration: durationSeconds,
              })
              resolve(null)
            }
          })
          listeners.push(() => sub.remove())
        } catch (oldArchError) {
          cleanup()
          log.error('VideoFilePicker.native', 'Old Arch setup failed', {
            error: oldArchError instanceof Error ? oldArchError.message : String(oldArchError),
          })
          resolve(null)
          return
        }
      }

      // Launch editor
      videoTrimModule.showEditor(uri, {
        maxDuration: maxDurationSeconds,
        minDuration: 1,
        saveToPhoto: false,
        enableSaveDialog: false,
        enableCancelDialog: false,
        saveButtonText: 'Choose',
        cancelButtonText: 'Cancel',
      })
    })
  } catch (error) {
    log.error('VideoFilePicker.native', 'Video trimmer error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

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

            if (Platform.OS === 'ios') {
              // iOS: allowsEditing: true shows native video trim UI, letting users cut long videos
              // videoMaxDuration enforces the limit in the trim UI (user can't select >30s)
              // Tradeoff: iOS transcodes the result (~3-5s delay) instead of returning original file
              logBreadcrumb('video-picker', 'Opening iOS gallery picker', { source: 'gallery' })
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'videos',
                allowsEditing: true,
                videoMaxDuration: maxDurationSeconds,
              })
            } else {
              // Android: expo-image-picker doesn't support video trimming
              // Pick video first, then launch native trimmer if duration exceeds limit
              logBreadcrumb('video-picker', 'Opening Android gallery picker', { source: 'gallery' })
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'videos',
                allowsEditing: false, // Android ignores this for videos anyway
              })

              // If video selected and exceeds max duration, launch native trimmer
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0]
                let assetDuration = 0
                if ('duration' in asset && typeof asset.duration === 'number') {
                  // expo-image-picker always returns duration in seconds across all platforms
                  assetDuration = asset.duration
                }

                // If video exceeds max duration, launch native trimmer
                if (assetDuration > maxDurationSeconds) {
                  const trimResult = await launchVideoTrimmer(asset.uri, maxDurationSeconds)
                  if (trimResult) {
                    // Update result with trimmed video URI
                    result = {
                      canceled: false,
                      assets: [
                        {
                          ...asset,
                          uri: trimResult.uri,
                          duration: trimResult.duration * 1000, // Convert back to milliseconds
                        },
                      ],
                    }
                  } else {
                    // User cancelled trimming - reset state so button works again
                    hasShownActionSheetRef.current = false
                    onCancel()
                    return
                  }
                }
              }
            }
            break
          }

          case 'camera': {
            // Request camera permissions
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
            if (!cameraPermission.granted) {
              log.warn('VideoFilePicker', 'Camera permission denied')
              logBreadcrumb('video-picker', 'Camera permission denied', { source: 'camera' })
              return
            }

            logBreadcrumb('video-picker', 'Opening camera', { source: 'camera' })
            result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'videos',
              allowsEditing: false,
              quality: 1,
              videoMaxDuration: maxDurationSeconds,
            })
            break
          }

          case 'files': {
            // Step 1: Pick file via DocumentPicker
            logBreadcrumb('video-picker', 'Opening file picker', { source: 'files' })
            const docResult = await DocumentPicker.getDocumentAsync({
              type: ['video/mp4', 'video/quicktime', 'video/mov'],
              multiple: false,
            })

            if (docResult.canceled || !docResult.assets?.[0]) {
              onCancel()
              return
            }

            const asset = docResult.assets[0]
            // DocumentPicker uses 'name' not 'fileName'
            const fileName = asset.name || `video_${Date.now()}.mp4`
            const mimeType = asset.mimeType || 'video/mp4'

            log.info('VideoFilePicker.native', 'DocumentPicker file selected', {
              uri: asset.uri.substring(0, 60),
              fileName,
              mimeType,
            })

            // Validate and optionally trim (skips trimmer for videos ≤ maxDurationSeconds)
            const trimResult = await launchVideoTrimmer(asset.uri, maxDurationSeconds)
            if (!trimResult) {
              // User cancelled trimmer or error occurred
              // Reset ref and notify parent to reset state so button works again
              hasShownActionSheetRef.current = false
              onCancel()
              return
            }

            // Update result with (possibly trimmed) video URI
            // Cast to DocumentPickerResult since we're working with DocumentPicker assets
            result = {
              canceled: false,
              assets: [
                {
                  ...asset,
                  uri: trimResult.uri,
                  duration: trimResult.duration * 1000, // Convert back to milliseconds
                } as DocumentPicker.DocumentPickerAsset & { duration: number },
              ],
            } as DocumentPicker.DocumentPickerResult
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

            // DocumentPicker assets: duration is stored in milliseconds (we converted it earlier)
            // ImagePicker assets: duration is in seconds
            // Format detection: If duration > 60 (well above MAX_RECORDING_DURATION_SECONDS),
            // it's in milliseconds - convert to seconds
            // NOTE: 60 is a format detection threshold, NOT a max duration limit
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
      onCancel,
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
