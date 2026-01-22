/**
 * VideoFilePicker Native Component Tests
 * Simple behavior-focused tests for critical user flows
 */

import { MAX_RECORDING_DURATION_SECONDS } from '@app/features/CameraRecording/config/recordingConfig'
import '../../test-utils/setup'
import { render, waitFor } from '@testing-library/react'
import * as ImagePicker from 'expo-image-picker'
import { TestProvider } from '../../test-utils'
import { VideoFilePicker } from './VideoFilePicker.native'

// Mock action sheet - capture callback and options for test control
let mockActionSheetCallback: ((buttonIndex?: number) => void) | undefined
let lastActionSheetOptions: string[] = []

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: jest.fn((config, callback) => {
      mockActionSheetCallback = callback
      lastActionSheetOptions = config?.options ?? []
    }),
  }),
}))

describe('VideoFilePicker.native', () => {
  const mockOnVideoSelected = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockActionSheetCallback = undefined
    lastActionSheetOptions = []
  })

  it('should show action sheet when opened', async () => {
    const { rerender } = render(
      <TestProvider>
        <VideoFilePicker
          isOpen={false}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    // Open picker
    rerender(
      <TestProvider>
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    // Action sheet callback should be set
    await waitFor(() => {
      expect(mockActionSheetCallback).toBeDefined()
    })
  })

  it('should show options in order: Gallery, Files, Camera, Cancel', async () => {
    const { rerender } = render(
      <TestProvider>
        <VideoFilePicker
          isOpen={false}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    rerender(
      <TestProvider>
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    await waitFor(() => {
      expect(lastActionSheetOptions.length).toBeGreaterThan(0)
    })

    const expectedOrder = ['Choose from Gallery', 'Browse Files', 'Record New Video', 'Cancel']
    expect(lastActionSheetOptions).toEqual(expectedOrder)
  })

  it('should call onCancel when user cancels action sheet', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    })

    const { rerender } = render(
      <TestProvider>
        <VideoFilePicker
          isOpen={false}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    rerender(
      <TestProvider>
        <VideoFilePicker
          isOpen={true}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    await waitFor(() => {
      expect(mockActionSheetCallback).toBeDefined()
    })

    // Simulate cancel (last button index or undefined)
    mockActionSheetCallback?.(undefined)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should not be visible when closed', () => {
    const { container } = render(
      <TestProvider>
        <VideoFilePicker
          isOpen={false}
          onVideoSelected={mockOnVideoSelected}
          onCancel={mockOnCancel}
          maxDurationSeconds={MAX_RECORDING_DURATION_SECONDS}
        />
      </TestProvider>
    )

    // Component doesn't render visible UI, just manages action sheet
    expect(container).toBeTruthy()
    expect(mockActionSheetCallback).toBeUndefined()
  })
})
