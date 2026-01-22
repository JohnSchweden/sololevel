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
  mode: 'normal' | 'persistent' | 'transition' = 'normal'
): UseProgressBarVisibilityReturn => {
  const normalVisible = mode === 'normal' ? 1 : 0
  const persistentVisible = mode === 'persistent' ? 1 : 0
  return {
    shouldRenderNormal: true, // Always rendered (absolute positioning)
    shouldRenderPersistent: true, // Always rendered (absolute positioning)
    modeShared: { value: mode } as any,
    normalVisibility: { value: normalVisible } as any,
    persistentVisibility: { value: persistentVisible } as any,
    normalVisibilityAnimatedStyle: { opacity: normalVisible } as any,
    persistentVisibilityAnimatedStyle: { opacity: persistentVisible } as any,
    __applyProgressForTests: jest.fn(),
  }
}

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
    visibilityState = createVisibilityState('normal')
    mockUseProgressBarVisibility.mockImplementation(() => visibilityState)
  })

  it('toggles controls visibility when user taps video area', () => {
    const onControlsVisibilityChange = jest.fn()
    renderWithProviderNative(<VideoControls {...createProps({ onControlsVisibilityChange })} />)

    fireEvent.press(screen.getByTestId('video-controls-container'))

    expect(onControlsVisibilityChange).toHaveBeenCalledWith(false, true)
  })

  it('renders video controls with play/pause functionality', () => {
    const onPlay = jest.fn()
    renderWithProviderNative(<VideoControls {...createProps({ onPlay, isPlaying: false })} />)

    const playButton = screen.getByLabelText('Play video')
    fireEvent.press(playButton)

    expect(onPlay).toHaveBeenCalled()
  })
})
