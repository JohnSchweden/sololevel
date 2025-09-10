/// <reference types="jest" />

// Mock MediaTypeOptions
export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
}

// Mock ImagePickerResult
export interface ImagePickerResult {
  canceled: boolean
  assets?: Array<{
    uri: string
    width: number
    height: number
    type: string
    fileName?: string
    fileSize?: number
  }>
}

// Mock launchImageLibraryAsync
export const launchImageLibraryAsync = jest.fn(async (): Promise<ImagePickerResult> => {
  return {
    canceled: true,
  }
})

// Mock launchCameraAsync
export const launchCameraAsync = jest.fn(async (): Promise<ImagePickerResult> => {
  return {
    canceled: true,
  }
})

// Mock requestMediaLibraryPermissionsAsync
export const requestMediaLibraryPermissionsAsync = jest.fn(async () => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }
})

// Mock requestCameraPermissionsAsync
export const requestCameraPermissionsAsync = jest.fn(async () => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }
})

// Mock getMediaLibraryPermissionsAsync
export const getMediaLibraryPermissionsAsync = jest.fn(async () => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }
})

// Mock getCameraPermissionsAsync
export const getCameraPermissionsAsync = jest.fn(async () => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }
})

// Export default
export default {
  MediaTypeOptions,
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  getCameraPermissionsAsync,
}
