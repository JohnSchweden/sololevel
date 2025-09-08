import { useFeatureFlagsStore } from '@app/stores/feature-flags'
import { forwardRef, useMemo } from 'react'
import { log } from '../../utils/logger'
import type { CameraPreviewContainerProps, CameraPreviewRef } from './types'

/**
 * Hybrid Camera Preview Component - switches between VisionCamera and Expo Camera implementations
 * Uses VisionCamera for dev builds (full features) and Expo Camera for Expo Go (compatibility)
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  (props, ref) => {
    const { flags } = useFeatureFlagsStore()

    // Dynamic import based on feature flag to avoid loading VisionCamera in Expo Go
    const CameraComponent = useMemo(() => {
      if (flags.useVisionCamera) {
        // Use VisionCamera implementation - dynamic import to avoid module evaluation in Expo Go
        try {
          const { VisionCameraPreview } = require('./CameraPreview.native.vision')
          return VisionCameraPreview
        } catch (error) {
          log.warn('VisionCamera not available, falling back to Expo Camera:', error)
          // Fallback to Expo Camera if VisionCamera fails to load
          const { CameraPreview: ExpoCameraPreview } = require('./CameraPreview.native.expo')
          return ExpoCameraPreview
        }
      }

      // Use Expo Camera implementation
      const { CameraPreview: ExpoCameraPreview } = require('./CameraPreview.native.expo')
      return ExpoCameraPreview
    }, [flags.useVisionCamera])

    return (
      <CameraComponent
        {...props}
        ref={ref}
      />
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
