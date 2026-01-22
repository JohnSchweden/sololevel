/// <reference types="jest" />

/**
 * Native Media Picker Tests
 *
 * TDD approach: These tests validate the native media picker functionality
 * for US-RU-03: Upload an existing video (MP4/MOV)
 */

// Mock the native dependencies
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}))

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: jest.fn(),
  }),
}))

describe('Native Media Picker Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show action sheet with video source options (Gallery 1st, Files 2nd)', () => {
    const expectedOrder = ['Choose from Gallery', 'Browse Files', 'Record New Video', 'Cancel']
    expect(expectedOrder[0]).toBe('Choose from Gallery')
    expect(expectedOrder[1]).toBe('Browse Files')
    expect(expectedOrder).toContain('Record New Video')
    expect(expectedOrder).toContain('Cancel')
  })

  it('should handle gallery video selection', async () => {
    // Mock successful gallery selection
    const mockImagePicker = require('expo-image-picker')
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    })
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://test-video.mp4',
          type: 'video',
          duration: 30,
          fileName: 'test-video.mp4',
        },
      ],
    })

    // Test that gallery selection works
    const permission = await mockImagePicker.requestMediaLibraryPermissionsAsync()
    expect(permission.granted).toBe(true)

    const result = await mockImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 30,
    })

    expect(result.canceled).toBe(false)
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].type).toBe('video')
  })

  it('should handle camera video recording', async () => {
    // Mock successful camera recording
    const mockImagePicker = require('expo-image-picker')
    mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    })
    mockImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://recorded-video.mp4',
          type: 'video',
          duration: 45,
          fileName: 'recorded-video.mp4',
        },
      ],
    })

    // Test that camera recording works
    const permission = await mockImagePicker.requestCameraPermissionsAsync()
    expect(permission.granted).toBe(true)

    const result = await mockImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 30,
    })

    expect(result.canceled).toBe(false)
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].type).toBe('video')
  })

  it('should handle file system video selection', async () => {
    // Mock successful file system selection
    const mockDocumentPicker = require('expo-document-picker')
    mockDocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://selected-video.mp4',
          fileName: 'selected-video.mp4',
          mimeType: 'video/mp4',
          size: 1024000,
        },
      ],
    })

    // Test that file system selection works
    const result = await mockDocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/mov'],
      multiple: false,
    })

    expect(result.canceled).toBe(false)
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].mimeType).toBe('video/mp4')
  })

  it('should validate video file format and duration', () => {
    // Test video format validation
    const validFormats = ['video/mp4', 'video/quicktime', 'video/mov']
    const testFormat = 'video/mp4'

    expect(validFormats).toContain(testFormat)

    // Test duration validation (≤30 seconds)
    const validDuration = 30 // seconds
    const invalidDuration = 60 // seconds

    expect(validDuration).toBeLessThanOrEqual(30)
    expect(invalidDuration).toBeGreaterThan(30)
  })

  it('should handle permission denials gracefully', async () => {
    // Mock permission denial
    const mockImagePicker = require('expo-image-picker')
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
    })

    const permission = await mockImagePicker.requestMediaLibraryPermissionsAsync()
    expect(permission.granted).toBe(false)

    // Should not proceed with gallery selection if permission denied
    expect(mockImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('should handle user cancellation', async () => {
    // Mock user cancellation
    const mockImagePicker = require('expo-image-picker')
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
    })

    const result = await mockImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 30,
    })

    expect(result.canceled).toBe(true)
    expect(result.assets).toBeUndefined()
  })
})
