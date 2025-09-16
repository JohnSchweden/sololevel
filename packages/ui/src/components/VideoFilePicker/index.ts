import { Platform } from 'react-native'

// Re-export types
export type { VideoFilePickerProps } from './types'

// Platform-specific component export
export const VideoFilePicker =
  Platform.OS === 'web'
    ? require('./VideoFilePicker').VideoFilePicker
    : require('./VideoFilePicker.native').VideoFilePicker
