import { useState, useCallback } from 'react'
import { log } from '@my/ui/src/utils/logger'

export interface VideoPlayerProps {
  videoUri?: string
  duration?: number
  onRestart?: () => void
  onShare?: () => void
  onContinue?: () => void
  onLoad?: (data: { duration: number }) => void
  onProgress?: (data: { currentTime: number }) => void
  isProcessing?: boolean
  processingProgress?: number
  disabled?: boolean
  showControls?: boolean
  autoPlay?: boolean
}

export interface VideoPlayerState {
  isPlaying: boolean
  isBuffering: boolean
  hasError: boolean
  videoDuration: number
}

export interface VideoPlayerHandlers {
  handleLoad: (data: { duration: number }) => void
  handleProgress: (data: { currentTime: number }) => void
  handleBuffer: (data: { isBuffering: boolean }) => void
  handleError: (error: any) => void
  togglePlayPause: () => void
  handleVideoClick: () => void
  getAccessibilityLabel: () => string
  formatDuration: (ms: number) => string
  setError: (hasError: boolean) => void
  setPlaying: (isPlaying: boolean) => void
}

/**
 * Shared Video Player Hook
 * Contains all business logic and state management for video playback
 * Used by both native and web implementations
 */
export function useVideoPlayer({
  videoUri,
  duration = 0,
  onRestart,
  onShare,
  onContinue,
  onLoad,
  onProgress,
  isProcessing = false,
  processingProgress = 0,
  disabled = false,
  showControls = true,
  autoPlay = false,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isBuffering, setIsBuffering] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)

  // Format duration in MM:SS format
  const formatDuration = useCallback((ms: number) => {
    if (ms <= 0) return '0:00'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  // Handle video load
  const handleLoad = useCallback((data: { duration: number }) => {
    log.info('VideoPlayer', 'Video loaded successfully', { duration: data.duration })
    setHasError(false)
    setVideoDuration(data.duration)
    onLoad?.(data)
  }, [onLoad])

  // Handle video progress
  const handleProgress = useCallback((data: { currentTime: number }) => {
    onProgress?.(data)
  }, [onProgress])

  // Handle buffering state
  const handleBuffer = useCallback((data: { isBuffering: boolean }) => {
    setIsBuffering(data.isBuffering)
    log.info('VideoPlayer', 'Buffering state changed', { isBuffering: data.isBuffering })
  }, [])

  // Handle video errors
  const handleError = useCallback((error: any) => {
    log.error('VideoPlayer', 'Video playback error', error)
    setHasError(true)
    setIsPlaying(false)
  }, [])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (disabled || isProcessing) return
    
    setIsPlaying(prev => !prev)
    log.info('VideoPlayer', 'Playback toggled', { isPlaying: !isPlaying })
  }, [disabled, isProcessing, isPlaying])

  // Handle video click
  const handleVideoClick = useCallback(() => {
    if (showControls) {
      togglePlayPause()
    }
  }, [showControls, togglePlayPause])

  // Get accessibility label
  const getAccessibilityLabel = useCallback(() => {
    const baseLabel = 'Video player'
    if (hasError) return `${baseLabel} - Error`
    if (isBuffering) return `${baseLabel} - Loading`
    if (isPlaying) return `${baseLabel} - Playing`
    return `${baseLabel} - Paused`
  }, [hasError, isBuffering, isPlaying])

  const state: VideoPlayerState = {
    isPlaying,
    isBuffering,
    hasError,
    videoDuration,
  }

  const handlers: VideoPlayerHandlers = {
    handleLoad,
    handleProgress,
    handleBuffer,
    handleError,
    togglePlayPause,
    handleVideoClick,
    getAccessibilityLabel,
    formatDuration,
    setError: setHasError,
    setPlaying: setIsPlaying,
  }

  return {
    state,
    handlers,
    props: {
      videoUri,
      duration,
      onRestart,
      onShare,
      onContinue,
      isProcessing,
      processingProgress,
      disabled,
      showControls,
      autoPlay,
    },
  }
}
