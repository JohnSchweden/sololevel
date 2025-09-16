export interface VideoFilePickerProps {
  isOpen: boolean
  onVideoSelected: (file: File, metadata: any) => void
  onCancel: () => void
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  showUploadProgress?: boolean
  uploadProgress?: number
  disabled?: boolean
}
