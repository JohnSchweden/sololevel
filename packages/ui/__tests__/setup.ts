// Jest setup for UI package
import 'react-native-gesture-handler/jestSetup'

// Mock Expo modules
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraMode: {
    video: 'video',
    picture: 'picture',
  },
  CameraRatio: {
    '16:9': '16:9',
    '4:3': '4:3',
  },
}))

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}))

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: jest.fn(),
  }),
}))

// Mock React Native modules - not needed for our tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
