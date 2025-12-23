export interface VideoFilePickerProps {
  isOpen: boolean
  /**
   * Called when video is selected.
   * - Web: file is always provided (File object)
   * - Native: file is undefined (use metadata.localUri instead to avoid 28MB memory spike)
   */
  onVideoSelected: (file: File | undefined, metadata: any) => void
  onCancel: () => void
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  showUploadProgress?: boolean
  uploadProgress?: number
  disabled?: boolean
}
