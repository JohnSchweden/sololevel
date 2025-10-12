// Core Tamagui exports
export * from 'tamagui'
// Temporarily disabled due to createStyledContext issues in tests
// export * from '@tamagui/toast'

// Configuration
export { config } from '@my/config'

// Lightweight, high-traffic components (curated public API)
export { Button } from './components/Button'
export { ToastProvider } from './components/ToastProvider'
export { ToastViewport } from './components/ToastViewport'
export { AppHeader } from './components/AppHeader'
export { BottomNavigation } from './components/BottomNavigation/BottomNavigation'

// Hooks
export { useToastController } from './hooks/useToastController'

// Native-specific exports
export * from './NativeToast'

// Utilities (keep these as they're lightweight)

// Video utilities (keep these as they're lightweight)
export * from './utils/videoValidation'

// NOTE: Heavy components like VideoAnalysis and CameraRecording are NOT exported from root.
// Import them via subpaths: `@my/ui/components/VideoAnalysis/VideoPlayer`
// This prevents dev/build performance issues and improves treeshaking.

// Test utilities are NOT exported from main package to avoid production bundling
// Import them directly in test files: import { render, screen } from '@my/ui/test-utils'
