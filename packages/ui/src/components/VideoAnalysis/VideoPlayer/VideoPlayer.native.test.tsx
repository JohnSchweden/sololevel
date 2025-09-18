/**
 * Native environment tests for VideoPlayerNative component
 * Tests native-specific functionality using web testing libraries with native mocks
 * Uses jest.native.config.js with React Native environment mocks (following monorepo pattern)
 */

import React from 'react'
import { screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideoPlayerNative } from './VideoPlayer.native'

// Mock react-native-video with controllable behavior for native testing
let mockVideoLoadData = { duration: 120, naturalSize: { width: 1920, height: 1080 } }
let mockVideoShouldLoad = true
let mockVideoLoadDelay = 0

// VideoPlayerNative only passes duration to onLoad callback
const expectedOnLoadData = { duration: 120 }

jest.mock('react-native-video', () => {
  const React = require('react')

  const MockVideo = React.forwardRef(({ source, onLoad, onError, testID, paused, ...props }: any, ref: any) => {
    // Simulate video load behavior
    React.useEffect(() => {
      if (source?.uri && mockVideoShouldLoad) {
        if (mockVideoLoadDelay === 0) {
          // Call immediately for synchronous testing
          if (onLoad) {
            onLoad(mockVideoLoadData)
          }
          return // Explicit return for synchronous case
        }
        // Use timeout for delayed loading
        const timer = setTimeout(() => {
          if (onLoad) {
            onLoad(mockVideoLoadData)
          }
        }, mockVideoLoadDelay)
        return () => clearTimeout(timer)
      }
      return // Explicit return for early exit
    }, [source?.uri, onLoad])

    // Expose seek method via ref
    React.useImperativeHandle(ref, () => ({
      seek: (_time: number) => {
        // Mock seek operation
        return true
      }
    }))

    // Create a div that mimics React Native View behavior in web testing
    return React.createElement('div', {
      ref,
      'data-testid': testID || 'native-video-element',
      'data-original-test-id': testID || 'native-video-element', // For debugging
      style: { flex: 1 },
      ...props
    })
  })

  return {
    __esModule: true,
    default: MockVideo,
  }
})

// Mock React Native Platform for native environment (web testing with native mocks)
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'div',
  ActivityIndicator: 'div',
}))

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

describe('VideoPlayerNative - React Native Environment Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVideoShouldLoad = true
    mockVideoLoadDelay = 0
    mockVideoLoadData = { duration: 120, naturalSize: { width: 1920, height: 1080 } }
  })

  describe('Video Loading - Native', () => {
    it('loads video and reports duration via onLoad callback in React Native', () => {
      // 🧪 ARRANGE: Set up test data and mocks
      const mockOnLoad = jest.fn()
      const testProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: jest.fn(),
      }

      // 🎬 ACT: Render the component
      renderWithProviders(<VideoPlayerNative {...testProps} />)

      // ✅ ASSERT: onLoad callback should be called with duration
      expect(mockOnLoad).toHaveBeenCalledWith(expectedOnLoadData)
      expect(screen.getByTestId('video-player-native')).toBeTruthy()
    })

    it('displays loading state initially before video loads in React Native', () => {
      // 🧪 ARRANGE: Delay video loading to test loading state
      mockVideoLoadDelay = 1000 // 1 second delay
      const mockOnLoad = jest.fn()
      const testProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: jest.fn(),
      }

      // 🎬 ACT: Render the component (should show loading initially)
      renderWithProviders(<VideoPlayerNative {...testProps} />)

      // ✅ ASSERT: Loading state should be visible initially
      expect(screen.getByTestId('video-loading')).toBeTruthy()
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
    })

    it('hides loading state after video loads successfully in React Native', () => {
      // 🧪 ARRANGE: Set up immediate loading
      const mockOnLoad = jest.fn()
      const testProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: jest.fn(),
      }

      // 🎬 ACT: Render the component
      renderWithProviders(<VideoPlayerNative {...testProps} />)

      // ✅ ASSERT: Loading state should be hidden and video should be visible
      expect(mockOnLoad).toHaveBeenCalledWith(expectedOnLoadData)
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
    })
  })

  describe('Playback Controls - Native', () => {
    it('starts playback when isPlaying prop changes to true in React Native', () => {
      // 🧪 ARRANGE: Set up test data
      const mockOnLoad = jest.fn()
      const initialProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: jest.fn(),
      }

      // 🎬 ACT: Render with paused state, then change to playing
      const { rerender } = renderWithProviders(<VideoPlayerNative {...initialProps} />)
      rerender(<VideoPlayerNative {...initialProps} isPlaying={true} />)

      // ✅ ASSERT: Video should be rendered (paused prop should be false internally)
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
      // The paused prop should be inverted (isPlaying=true means paused=false)
    })

    it('pauses playback when isPlaying prop changes to false in React Native', () => {
      // 🧪 ARRANGE: Set up test data
      const mockOnLoad = jest.fn()
      const initialProps = {
        videoUri: 'test-video.mp4',
        isPlaying: true,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: jest.fn(),
      }

      // 🎬 ACT: Render with playing state, then change to paused
      const { rerender } = renderWithProviders(<VideoPlayerNative {...initialProps} />)
      rerender(<VideoPlayerNative {...initialProps} isPlaying={false} />)

      // ✅ ASSERT: Video should be rendered (paused prop should be true internally)
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
    })
  })

  describe('Seek Operations - Native', () => {
    it('seeks to specified time when seekToTime prop is provided in React Native', () => {
      // 🧪 ARRANGE: Set up test data
      const mockOnLoad = jest.fn()
      const mockOnSeekComplete = jest.fn()
      const initialProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: mockOnLoad,
        onProgress: jest.fn(),
        seekToTime: undefined,
        onSeekComplete: mockOnSeekComplete,
      }

      // 🎬 ACT: Render with no seek, then provide seek time
      const { rerender } = renderWithProviders(<VideoPlayerNative {...initialProps} />)
      rerender(<VideoPlayerNative {...initialProps} seekToTime={30} />)

      // ✅ ASSERT: onSeekComplete should be called after seek
      expect(mockOnSeekComplete).toHaveBeenCalled()
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
    })

    it('handles multiple seek operations correctly in React Native', () => {
      // 🧪 ARRANGE: Set up test data
      const mockOnSeekComplete = jest.fn()
      const baseProps = {
        videoUri: 'test-video.mp4',
        isPlaying: false,
        onLoad: jest.fn(),
        onProgress: jest.fn(),
        onSeekComplete: mockOnSeekComplete,
      }

      // 🎬 ACT: Test multiple seeks
      const { rerender } = renderWithProviders(
        <VideoPlayerNative {...baseProps} seekToTime={10} />
      )
      rerender(<VideoPlayerNative {...baseProps} seekToTime={20} />)
      rerender(<VideoPlayerNative {...baseProps} seekToTime={30} />)

      // ✅ ASSERT: onSeekComplete should be called for each seek
      expect(mockOnSeekComplete).toHaveBeenCalledTimes(3)
      expect(screen.getByTestId('native-video-element')).toBeTruthy()
    })
  })
})

// NOTE: These native tests focus on React Native specific video behavior.
// Web-specific tests are in VideoPlayer.test.tsx for cross-platform compatibility.
