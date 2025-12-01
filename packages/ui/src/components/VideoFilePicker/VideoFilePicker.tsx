import { MAX_RECORDING_DURATION_SECONDS } from '@app/features/CameraRecording/config/recordingConfig'
import { log } from '@my/logging'
import { useCallback, useEffect, useState } from 'react'
import { validateVideoFile } from '../../utils/videoValidation'
import { ConfirmationDialog } from '../CameraRecording/CameraControls/NavigationDialog'
import type { VideoFilePickerProps } from './types'

/**
 * Web Video File Picker using native HTML5 File API
 *
 * Ultra-minimal approach using direct browser file picker:
 * - `input[type="file"]` for file selection
 * - No custom UI - uses browser's native dialog
 * - Auto-triggers when component mounts
 * - Direct browser integration with zero dependencies
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
  const [showDurationErrorDialog, setShowDurationErrorDialog] = useState(false)
  const [durationError, setDurationError] = useState<string>('')

  // Native file selection using HTML5 File API
  const triggerFilePicker = useCallback(async () => {
    if (disabled || showUploadProgress) return

    try {
      // Create hidden file input element
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/mp4,video/quicktime,video/mov,video/*'
      input.multiple = false
      input.style.display = 'none'

      return new Promise<void>((resolve) => {
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files
          if (!files || files.length === 0) {
            onCancel()
            resolve()
            return
          }

          const file = files[0]

          // Validate file type
          if (!file.type.startsWith('video/')) {
            log.error('VideoFilePicker', 'Selected file is not a video', { type: file.type })
            resolve()
            return
          }

          // Validate video file
          const validation = await validateVideoFile(file, {
            maxDurationSeconds,
            maxFileSizeBytes,
          })

          if (!validation.isValid) {
            log.error('VideoFilePicker', 'Video validation failed', { errors: validation.errors })

            // Check if error is due to duration exceeding limit
            const durationError = validation.errors.find(
              (error) => error.includes('too long') || error.includes('duration')
            )

            if (durationError && validation.metadata?.duration) {
              const errorMessage = `The selected video is ${Math.ceil(validation.metadata.duration)} seconds long. Maximum allowed duration is ${maxDurationSeconds} seconds.`
              setDurationError(errorMessage)
              setShowDurationErrorDialog(true)
            }

            resolve()
            return
          }

          onVideoSelected(file, validation.metadata)
          resolve()
        }

        input.oncancel = () => {
          onCancel()
          resolve()
        }

        // Trigger native file picker
        document.body.appendChild(input)
        input.click()
        document.body.removeChild(input)
      })
    } catch (error) {
      log.error('VideoFilePicker', 'Error selecting file', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [
    maxDurationSeconds,
    maxFileSizeBytes,
    onVideoSelected,
    onCancel,
    disabled,
    showUploadProgress,
  ])

  // Auto-trigger native file picker when opened
  useEffect(() => {
    if (isOpen && !disabled && !showUploadProgress) {
      triggerFilePicker()
    }
  }, [isOpen, disabled, showUploadProgress, triggerFilePicker])

  // This component renders nothing - just triggers native file picker
  return (
    <>
      <ConfirmationDialog
        open={showDurationErrorDialog}
        onOpenChange={(open) => {
          setShowDurationErrorDialog(open)
        }}
        onConfirm={() => {
          setShowDurationErrorDialog(false)
        }}
        onCancel={() => {
          setShowDurationErrorDialog(false)
        }}
        title="Video Too Long"
        message={
          durationError || `The maximum allowed video duration is ${maxDurationSeconds} seconds.`
        }
        confirmLabel="OK"
        cancelLabel=""
        variant="error"
      />
    </>
  )
}
