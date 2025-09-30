import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import React from 'react'
import PipelineTestScreen from '../app/dev/pipeline-test'

// Mock all React Native and Expo modules that the component uses
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}))

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(),
      localUri: 'test://mini_speech.mp4',
      uri: 'test://mini_speech.mp4',
    })),
  },
}))

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
}))

jest.mock('@my/app/services/videoUploadAndAnalysis', () => ({
  startUploadAndAnalysis: jest.fn(),
}))

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('tamagui', () => ({
  Button: ({ children, testID, onPress, disabled, variant }: any) => (
    <button
      data-testid={testID}
      onClick={onPress}
      disabled={disabled}
      data-variant={variant}
    >
      {children}
    </button>
  ),
  ScrollView: ({ children, backgroundColor, ...props }: any) => (
    <div
      data-testid="scroll-view"
      style={{ backgroundColor }}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({
    children,
    fontSize,
    fontWeight,
    testID,
    color,
    fontFamily,
    textAlign,
    lineHeight,
  }: any) => (
    <span
      data-testid={testID}
      style={{
        fontSize,
        fontWeight,
        color,
        fontFamily,
        textAlign,
        lineHeight,
      }}
    >
      {children}
    </span>
  ),
  YStack: ({ children, padding, gap, testID }: any) => (
    <div
      data-testid={testID}
      style={{ padding, gap }}
    >
      {children}
    </div>
  ),
}))

describe('PipelineTestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the pipeline test screen with initial UI', () => {
    render(<PipelineTestScreen />)

    // Should show the title
    expect(screen.getByTestId('pipeline-test-title')).toBeTruthy()

    // Should show idle status initially
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('idle')

    // Should have a run button
    expect(screen.getByTestId('pipeline-run')).toBeTruthy()

    // Should have a reset button
    expect(screen.getByTestId('pipeline-reset')).toBeTruthy()
  })

  it('displays asset loading status when run button is pressed', async () => {
    render(<PipelineTestScreen />)

    const runButton = screen.getByTestId('pipeline-run')
    fireEvent.press(runButton)

    // Should show loading-asset status
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-status')).toHaveTextContent('loading-asset')
    })
  })

  it('navigates to video-analysis screen after triggering pipeline', async () => {
    const mockRouter = router as jest.Mocked<typeof router>
    render(<PipelineTestScreen />)

    const runButton = screen.getByTestId('pipeline-run')
    fireEvent.press(runButton)

    // Should navigate to video-analysis screen
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('/video-analysis'))
    })
  })
})
