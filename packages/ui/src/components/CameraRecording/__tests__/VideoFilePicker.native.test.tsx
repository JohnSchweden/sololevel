import { render, waitFor } from '@testing-library/react-native'
import { VideoValidationResult, validateVideoFile } from '@ui/utils/videoValidation'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { VideoFilePicker } from '../VideoFilePicker.native'

// Mock expo modules
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}))

jest.mock('@ui/utils/videoValidation', () => ({
  validateVideoFile: jest.fn(),
}))

// Create a mock function that will be returned by the hook
const mockShowActionSheet = jest.fn()

// Mock the module at the top level
jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: mockShowActionSheet,
  }),
}))

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>
const mockValidateVideoFile = validateVideoFile as jest.MockedFunction<typeof validateVideoFile>

describe('VideoFilePicker', () => {
  const mockOnVideoSelected = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock action sheet
    mockShowActionSheet.mockReset()

    // Clear the video validation mock but keep the implementation
    mockValidateVideoFile.mockClear()

    // Set up default mock implementation for video validation
    mockValidateVideoFile.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        duration: 30,
        size: 1024000,
        format: 'mp4',
      },
    })

    // Mock fetch for file processing
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['mock video data'], { type: 'video/mp4' })),
      } as any)
    )
  })

  describe('Gallery Selection', () => {
    it('selects video from gallery successfully', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      const mockAsset = {
        uri: 'file:///gallery/video.mp4',
        type: 'video',
        duration: 30000, // 30 seconds
        fileName: 'gallery-video.mp4',
        width: 1920,
        height: 1080,
      }

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          duration: 30,
          size: 1024000,
          format: 'mp4',
        },
      })

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        // Simulate user selecting gallery option
        if (callback) callback(1)
      })

      // Act - render component
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).toHaveBeenCalledWith(
            expect.any(File),
            expect.objectContaining({
              duration: 30,
              localUri: 'file:///gallery/video.mp4',
              originalFilename: 'gallery-video.mp4',
            })
          )
        },
        { timeout: 8000 }
      )
    })

    it('handles permission denied for gallery', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: false,
        status: 'denied' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        // Simulate user selecting gallery option
        if (callback) callback(1)
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Camera Recording', () => {
    it('records video from camera successfully', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      const mockAsset = {
        uri: 'file:///camera/video.mp4',
        type: 'video',
        duration: 45000, // 45 seconds
        width: 1920,
        height: 1080,
      }

      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          duration: 45,
          size: 2048000,
          format: 'mp4',
        },
      })

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        // Simulate user selecting camera option
        if (callback) callback(0)
      })

      // Act - render component
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).toHaveBeenCalledWith(
            expect.any(File),
            expect.objectContaining({
              duration: 45,
              localUri: 'file:///camera/video.mp4',
              originalFilename: expect.stringMatching(/^video_\d+\.mp4$/),
            })
          )
        },
        { timeout: 8000 }
      )
    })
  })

  describe('File Browser', () => {
    it('selects video from file browser successfully', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      const mockAsset = {
        uri: 'file:///documents/video.mov',
        fileName: 'document-video.mov',
        mimeType: 'video/quicktime',
        size: 1536000,
        name: 'document-video.mov',
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          duration: 25,
          size: 1536000,
          format: 'mov',
        },
      })

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        // Simulate user selecting file browser option
        if (callback) callback(2)
      })

      // Act - render component
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).toHaveBeenCalledWith(
            expect.any(File),
            expect.objectContaining({
              duration: 25,
              localUri: 'file:///documents/video.mov',
              originalFilename: 'document-video.mov',
            })
          )
        },
        { timeout: 8000 }
      )
    })

    it('rejects invalid video files', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      const mockAsset = {
        uri: 'file:///gallery/image.jpg',
        type: 'image',
        fileName: 'image.jpg',
      }

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValueOnce({
        isValid: false,
        errors: [{ type: 'fileType', message: 'Invalid file type' }],
        warnings: [],
        metadata: null,
      } as unknown as VideoValidationResult)

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        if (callback) callback(1) // Select gallery option
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })

    it('handles validation errors gracefully', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      const mockAsset = {
        uri: 'file:///gallery/corrupt.mp4',
        type: 'video',
        fileName: 'corrupt.mp4',
      }

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValueOnce({
        isValid: false,
        errors: [{ type: 'corruptFile', message: 'File is corrupt' }],
        warnings: [],
        metadata: null,
      } as unknown as VideoValidationResult)

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        if (callback) callback(1) // Select gallery option
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Cancellation', () => {
    it('calls onCancel when user cancels gallery selection', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      } as any)

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementationOnce((_options, callback) => {
        // Simulate user selecting cancel option (index 3)
        if (callback) callback(3) // Cancel option
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockOnCancel).toHaveBeenCalled()
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Duration Handling', () => {
    it('converts milliseconds to seconds for long durations', async () => {
      jest.setTimeout(10000) // Increase timeout for this test

      // Arrange - Set up isolated mocks for this specific test
      const mockAsset = {
        uri: 'file:///gallery/video.mp4',
        type: 'video',
        duration: 7200000, // 2 hours in milliseconds
        width: 1920,
        height: 1080,
      }

      // Reset and set up fresh mocks for this test
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockReset()
      mockImagePicker.launchImageLibraryAsync.mockReset()
      mockValidateVideoFile.mockReset()
      mockShowActionSheet.mockReset()

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          duration: 7200, // 2 hours in seconds
          size: 1024000,
          format: 'mp4',
        },
      })

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementation((_options, callback) => {
        // Simulate user selecting gallery option
        if (callback) callback(1)
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(() => {
        expect(mockOnVideoSelected).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            duration: 7200, // Should be converted to seconds
          })
        )
      })
    })

    it('uses validation metadata duration when asset duration is not available', async () => {
      jest.setTimeout(10000) // Increase timeout for this test

      // Arrange - Set up isolated mocks for this specific test
      const mockAsset = {
        uri: 'file:///gallery/video.mp4',
        type: 'video',
        width: 1920,
        height: 1080,
        // No duration property
      }

      // Reset and set up fresh mocks for this test
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockReset()
      mockImagePicker.launchImageLibraryAsync.mockReset()
      mockValidateVideoFile.mockReset()
      mockShowActionSheet.mockReset()

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      } as any)

      mockValidateVideoFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          duration: 30,
          size: 1024000,
          format: 'mp4',
        },
      })

      // Mock the action sheet to directly call the callback
      mockShowActionSheet.mockImplementation((_options, callback) => {
        // Simulate user selecting gallery option
        if (callback) callback(1)
      })

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(() => {
        expect(mockOnVideoSelected).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            duration: 30, // Should use validation metadata
          })
        )
      })
    })
  })

  describe('Component State', () => {
    it('does not trigger selection when disabled', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///gallery/video.mp4', type: 'video' }],
      } as any)

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          disabled={true}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockShowActionSheet).not.toHaveBeenCalled()
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })

    it('does not trigger selection when not open', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///gallery/video.mp4', type: 'video' }],
      } as any)

      // Act
      render(
        <VideoFilePicker
          isOpen={false}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockShowActionSheet).not.toHaveBeenCalled()
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })

    it('does not trigger selection when showing upload progress', async () => {
      jest.setTimeout(10000) // Increase timeout for this test
      // Arrange
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted' as any,
        canAskAgain: true,
        expires: 'never',
      } as any)

      mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///gallery/video.mp4', type: 'video' }],
      } as any)

      // Act
      render(
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          showUploadProgress={true}
        />
      )

      // Assert
      await waitFor(
        () => {
          expect(mockShowActionSheet).not.toHaveBeenCalled()
          expect(mockOnVideoSelected).not.toHaveBeenCalled()
          expect(mockOnCancel).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })
})
