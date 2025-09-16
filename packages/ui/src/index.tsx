export * from 'tamagui'
// Temporarily disabled due to createStyledContext issues in tests
// export * from '@tamagui/toast'

export { config } from '@my/config'
export { useToastController } from './hooks/useToastController'
export { ToastProvider } from './components/ToastProvider'
export { ToastViewport } from './components/ToastViewport'

export * from './NativeToast'
// Temporarily disabled CameraRecording export due to react-native-skia import issues in tests
// export * from './components/CameraRecording'
export * from './components/AppHeader'
// Override Button with our custom implementation
export { Button } from './components/Button'

// Video Analysis components (with specific exports to avoid naming conflicts)
export { ProcessingOverlay } from './components/VideoAnalysis/ProcessingOverlay/ProcessingOverlay'
export { VideoControlsOverlay } from './components/VideoAnalysis/VideoControlsOverlay/VideoControlsOverlay'
export { MotionCaptureOverlay } from './components/VideoAnalysis/MotionCaptureOverlay/MotionCaptureOverlay'
export { FeedbackBubbles } from './components/VideoAnalysis/FeedbackBubbles/FeedbackBubbles'
export { AudioFeedbackOverlay } from './components/VideoAnalysis/AudioFeedbackOverlay/AudioFeedbackOverlay'
export { VideoPlayer } from './components/VideoAnalysis/VideoPlayer/VideoPlayer'
export { BottomSheet } from './components/VideoAnalysis/BottomSheet/BottomSheet'
export { SocialIcons } from './components/VideoAnalysis/SocialIcons/SocialIcons'
export { VideoTitle } from './components/VideoAnalysis/VideoTitle/VideoTitle'

// Video utilities
export * from './utils/videoValidation'
export * from './utils/logger'

// Test utilities are NOT exported from main package to avoid production bundling
// Import them directly in test files: import { render, screen } from '@my/ui/test-utils'
