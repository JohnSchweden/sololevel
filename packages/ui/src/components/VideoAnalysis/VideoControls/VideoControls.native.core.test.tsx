import { act, fireEvent, screen } from '@testing-library/react-native'
import React from 'react'

import { renderWithProviderNative } from '../../../test-utils/TestProvider'
import { VideoControls, type VideoControlsProps } from './VideoControls'
import {
  type UseProgressBarVisibilityReturn,
  useProgressBarVisibility,
} from './hooks/useProgressBarVisibility'

jest.mock('./hooks/useProgressBarVisibility', () => ({
  useProgressBarVisibility: jest.fn(),
}))

const mockUseProgressBarVisibility = useProgressBarVisibility as jest.MockedFunction<
  typeof useProgressBarVisibility
>

const createVisibilityState = (
  shouldRenderNormal: boolean,
  shouldRenderPersistent: boolean
): UseProgressBarVisibilityReturn => ({
  shouldRenderNormal,
  shouldRenderPersistent,
  mode: shouldRenderNormal ? 'normal' : shouldRenderPersistent ? 'persistent' : 'transition',
  normalVisibility: { value: shouldRenderNormal ? 1 : 0 } as any,
  persistentVisibility: { value: shouldRenderPersistent ? 1 : 0 } as any,
  __applyProgressForTests: jest.fn(),
})

let visibilityState: UseProgressBarVisibilityReturn

const createProps = (overrides: Partial<VideoControlsProps> = {}): VideoControlsProps => ({
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  showControls: true,
  isProcessing: false,
  videoEnded: false,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onSeek: jest.fn(),
  onControlsVisibilityChange: jest.fn(),
  onMenuPress: jest.fn(),
  ...overrides,
})

describe('VideoControls.native.core', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProgressBarVisibility.mockReset()
    visibilityState = createVisibilityState(true, false)
    mockUseProgressBarVisibility.mockImplementation(() => visibilityState)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders native progress bar and scrubber handle', () => {
    // Arrange
    renderWithProviderNative(<VideoControls {...createProps()} />)

    // Assert
    expect(screen.getByTestId('progress-bar-container')).toBeTruthy()
    expect(screen.getByTestId('scrubber-handle')).toBeTruthy()
  })

  it('toggles controls visibility via native press', () => {
    // Arrange
    const onControlsVisibilityChange = jest.fn()
    renderWithProviderNative(<VideoControls {...createProps({ onControlsVisibilityChange })} />)

    // Act
    fireEvent.press(screen.getByTestId('video-controls-container'))

    // Assert
    expect(onControlsVisibilityChange).toHaveBeenCalledWith(false, true)
  })

  it('calls onSeek when fallback press occurs after layout measurement', () => {
    // Arrange
    const onSeek = jest.fn()
    renderWithProviderNative(<VideoControls {...createProps({ onSeek })} />)

    const progressTrack = screen.getByTestId('progress-track')

    // Act
    act(() => {
      fireEvent(progressTrack, 'layout', {
        nativeEvent: { layout: { width: 200, height: 4 } },
      })
    })

    act(() => {
      fireEvent.press(screen.getByTestId('progress-bar-pressable'), {
        nativeEvent: { locationX: 100 },
      })
    })

    // Assert
    expect(onSeek).toHaveBeenCalledWith(60)
  })

  it('shows normal bar below collapse threshold and hides above threshold', () => {
    // Arrange
    const { rerender } = renderWithProviderNative(
      <VideoControls {...createProps({ collapseProgress: 0 })} />
    )

    // Assert
    expect(screen.getByTestId('progress-bar-container')).toBeTruthy()

    // Act
    visibilityState = createVisibilityState(false, true)
    rerender(<VideoControls {...createProps({ collapseProgress: 0.6 })} />)

    // Assert
    expect(screen.queryByTestId('progress-bar-container')).toBeNull()
  })
})
