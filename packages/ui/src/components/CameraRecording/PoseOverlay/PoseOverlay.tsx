/**
 * Cross-Platform Pose Overlay Component for Phase 3 AI Integration
 * Renders pose detection results with keypoints and skeleton connections
 * Automatically delegates to native (Skia) or web (Canvas) implementation
 */

import type {
  PoseDetectionResult,
  PoseOverlayConfig,
} from '@app/features/CameraRecording/types/pose'
import { Platform } from 'react-native'
import { PoseOverlayUtils } from '../../../utils/PoseOverlayUtils'

export interface PoseOverlayProps {
  pose: PoseDetectionResult | null
  config?: Partial<PoseOverlayConfig>
  width: number
  height: number
  style?: any
  onPoseUpdate?: (pose: PoseDetectionResult) => void
}

/**
 * Cross-platform pose overlay component
 */
export function PoseOverlay(props: PoseOverlayProps) {
  const isNative = Platform.OS !== 'web'

  if (isNative) {
    // Dynamic import for native Skia implementation
    const { PoseOverlayNative } = require('./PoseOverlay.native')
    return <PoseOverlayNative {...props} />
  }

  // Dynamic import for web Canvas implementation
  const { PoseOverlayWeb } = require('./PoseOverlay.web')
  return <PoseOverlayWeb {...props} />
}

// Re-export utilities for convenience
export { PoseOverlayUtils }

export default PoseOverlay
