/**
 * Native Skia-based Pose Overlay Component
 *
 * This component renders pose detection overlays using React Native Skia
 * for high-performance native rendering with smooth animations and
 * advanced visual effects.
 *
 * @platform native
 * @requires @shopify/react-native-skia
 */

import {
  DEFAULT_MVP_OVERLAY_CONFIG,
  type MVPPoseConnection,
  type MVPPoseDetectionResult,
  type MVPPoseKeypoint,
  MVP_POSE_CONNECTIONS,
} from '@app/features/CameraRecording/types/MVPpose'
import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Line,
  Paint,
  Path,
  Skia,
} from '@shopify/react-native-skia'
import React, { useMemo } from 'react'
import { View } from 'react-native'
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { PoseOverlayUtils } from '../../../utils/PoseOverlayUtils'
import type { PoseOverlayProps } from './PoseOverlay'

/**
 * Skia-specific configuration
 */
interface SkiaOverlayConfig {
  enableGlow: boolean
  enableTrails: boolean
  enableParticles: boolean
  animationDuration: number
  glowRadius: number
  trailLength: number
  particleCount: number
}

/**
 * Native Skia pose overlay component
 */
export function PoseOverlayNative({
  pose,
  config = {},
  width,
  height,
  style,
  onPoseUpdate,
}: PoseOverlayProps) {
  const overlayConfig = { ...DEFAULT_MVP_OVERLAY_CONFIG, ...config }

  // Skia-specific configuration
  const skiaConfig: SkiaOverlayConfig = {
    enableGlow: true,
    enableTrails: false,
    enableParticles: false,
    animationDuration: 200,
    glowRadius: 8,
    trailLength: 10,
    particleCount: 20,
    ...config.skia,
  }

  // Animated values for smooth transitions
  const animationProgress = useSharedValue(0)
  const glowIntensity = useSharedValue(0)

  // LAZY INITIALIZATION: Register listeners before any writes occur to prevent
  // "onAnimatedValueUpdate with no listeners" warnings in development.
  useAnimatedReaction(
    () => animationProgress.value,
    () => {
      // Listener intentionally empty - ensures value is observed by UI runtime
    }
  )
  useAnimatedReaction(
    () => glowIntensity.value,
    () => {
      // Listener intentionally empty - ensures value is observed by UI runtime
    }
  )

  // Derived values for render-safe access
  const animationOpacity = useDerivedValue(() => animationProgress.value)
  const glowMatrix = useDerivedValue(() => [
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    glowIntensity.value,
    0,
  ])

  // Update animation when pose changes
  React.useEffect(() => {
    if (pose) {
      animationProgress.value = withTiming(1, {
        duration: skiaConfig.animationDuration,
        easing: Easing.out(Easing.quad),
      })
      glowIntensity.value = withTiming(1, {
        duration: skiaConfig.animationDuration / 2,
        easing: Easing.inOut(Easing.sin),
      })
    } else {
      animationProgress.value = withTiming(0, {
        duration: skiaConfig.animationDuration / 2,
      })
      glowIntensity.value = withTiming(0, {
        duration: skiaConfig.animationDuration / 4,
      })
    }
  }, [pose, animationProgress, glowIntensity, skiaConfig.animationDuration])

  // Normalize pose coordinates to canvas size
  const normalizedPose = useMemo(() => {
    if (!pose) return null
    return PoseOverlayUtils.normalizeCoordinates(pose, width, height)
  }, [pose, width, height])

  // Filter pose by confidence
  const filteredPose = useMemo(() => {
    if (!normalizedPose) return null
    return PoseOverlayUtils.filterByConfidence(
      normalizedPose,
      overlayConfig.confidenceThreshold || 0.3
    )
  }, [normalizedPose, overlayConfig.confidenceThreshold])

  // Get valid connections
  const validConnections = useMemo(() => {
    if (!filteredPose) return []
    return PoseOverlayUtils.getValidConnections(
      filteredPose,
      MVP_POSE_CONNECTIONS,
      overlayConfig.confidenceThreshold || 0.3
    )
  }, [filteredPose, overlayConfig.confidenceThreshold])

  // Create Skia path for pose skeleton
  const skeletonPath = useMemo(() => {
    if (!filteredPose || validConnections.length === 0) return null

    const path = Skia.Path.Make()

    validConnections.forEach((connection: MVPPoseConnection) => {
      const fromKeypoint = filteredPose.keypoints.find(
        (kp: MVPPoseKeypoint) => kp.name === connection.from
      )
      const toKeypoint = filteredPose.keypoints.find(
        (kp: MVPPoseKeypoint) => kp.name === connection.to
      )

      if (fromKeypoint && toKeypoint) {
        path.moveTo(fromKeypoint.x, fromKeypoint.y)
        path.lineTo(toKeypoint.x, toKeypoint.y)
      }
    })

    return path
  }, [filteredPose, validConnections])

  // Create glow paint
  const glowPaint = useMemo(() => {
    const paint = Skia.Paint()
    paint.setStyle(1) // Stroke
    paint.setStrokeWidth(overlayConfig.connectionWidth * 3)
    paint.setColor(Skia.Color(overlayConfig.colors.connection))
    return paint
  }, [overlayConfig.connectionWidth, overlayConfig.colors.connection])

  // Create main paint
  const mainPaint = useMemo(() => {
    const paint = Skia.Paint()
    paint.setStyle(1) // Stroke
    paint.setStrokeWidth(overlayConfig.connectionWidth)
    paint.setColor(Skia.Color(overlayConfig.colors.connection))
    return paint
  }, [overlayConfig.connectionWidth, overlayConfig.colors.connection])

  // Handle pose updates
  React.useEffect(() => {
    if (pose && onPoseUpdate) {
      onPoseUpdate(pose)
    }
  }, [pose, onPoseUpdate])

  if (!filteredPose) {
    return (
      <View
        style={[{ width, height }, style]}
        pointerEvents="none"
      />
    )
  }

  return (
    <View
      style={[{ width, height }, style]}
      pointerEvents="none"
    >
      <Canvas style={{ width, height }}>
        <Group>
          {/* Glow effect for connections */}
          {skiaConfig.enableGlow && skeletonPath && (
            <Group>
              <Paint>
                <Blur blur={skiaConfig.glowRadius} />
                <ColorMatrix matrix={glowMatrix} />
              </Paint>
              <Path
                path={skeletonPath}
                paint={glowPaint}
              />
            </Group>
          )}

          {/* Main skeleton connections */}
          {skeletonPath && (
            <Path
              path={skeletonPath}
              paint={mainPaint}
            />
          )}

          {/* Individual connection lines with animation */}
          {validConnections.map((connection: MVPPoseConnection, index: number) => {
            const fromKeypoint = filteredPose.keypoints.find(
              (kp: MVPPoseKeypoint) => kp.name === connection.from
            )
            const toKeypoint = filteredPose.keypoints.find(
              (kp: MVPPoseKeypoint) => kp.name === connection.to
            )

            if (!fromKeypoint || !toKeypoint) return null

            return (
              <Group key={`connection-${index}`}>
                <Line
                  p1={{ x: fromKeypoint.x, y: fromKeypoint.y }}
                  p2={{ x: toKeypoint.x, y: toKeypoint.y }}
                  color={overlayConfig.colors.connection}
                  strokeWidth={overlayConfig.connectionWidth}
                  opacity={animationOpacity}
                />
              </Group>
            )
          })}

          {/* Keypoints with confidence-based styling */}
          {filteredPose.keypoints.map((keypoint: MVPPoseKeypoint, index: number) => {
            if (keypoint.confidence < (overlayConfig.confidenceThreshold || 0.3)) {
              return null
            }

            const radius = PoseOverlayUtils.getKeypointRadius(keypoint.confidence, overlayConfig)
            const color = PoseOverlayUtils.getConfidenceColor(keypoint.confidence, overlayConfig)

            return (
              <Group key={`keypoint-${index}`}>
                {/* Glow effect for keypoints */}
                {skiaConfig.enableGlow && (
                  <Group>
                    <Paint>
                      <Blur blur={skiaConfig.glowRadius / 2} />
                      <ColorMatrix matrix={glowMatrix} />
                    </Paint>
                    <Circle
                      cx={keypoint.x}
                      cy={keypoint.y}
                      r={radius * 1.5}
                      color={color}
                    />
                  </Group>
                )}

                {/* Main keypoint */}
                <Circle
                  cx={keypoint.x}
                  cy={keypoint.y}
                  r={radius}
                  color={color}
                  opacity={animationOpacity}
                />

                {/* Keypoint border */}
                <Circle
                  cx={keypoint.x}
                  cy={keypoint.y}
                  r={radius}
                  color="#ffffff"
                  style="stroke"
                  strokeWidth={1}
                  opacity={animationOpacity}
                />
              </Group>
            )
          })}

          {/* Confidence indicator */}
          {overlayConfig.showConfidence && (
            <Group>
              {/* Background */}
              <Circle
                cx={width - 80}
                cy={30}
                r={25}
                color="rgba(0, 0, 0, 0.7)"
              />

              {/* Confidence text would be rendered here */}
              {/* Note: Skia text rendering requires additional setup */}
            </Group>
          )}
        </Group>
      </Canvas>
    </View>
  )
}

/**
 * Skia-specific utilities for native pose rendering
 */
export const SkiaPoseUtils = {
  /**
   * Create animated pose path with morphing
   */
  createAnimatedPath: (
    fromPose: MVPPoseDetectionResult,
    toPose: MVPPoseDetectionResult,
    progress: number
  ) => {
    const path = Skia.Path.Make()

    // Interpolate between poses
    const interpolatedPose = PoseOverlayUtils.interpolatePoses(fromPose, toPose, progress)

    // Create path from interpolated pose
    interpolatedPose.keypoints.forEach((keypoint: MVPPoseKeypoint, index: number) => {
      if (index === 0) {
        path.moveTo(keypoint.x, keypoint.y)
      } else {
        path.lineTo(keypoint.x, keypoint.y)
      }
    })

    return path
  },

  /**
   * Create particle system for pose effects
   */
  createParticleSystem: (pose: MVPPoseDetectionResult, particleCount: number) => {
    const particles: Array<{
      x: number
      y: number
      size: number
      opacity: number
      velocity: { x: number; y: number }
    }> = []

    pose.keypoints.forEach((keypoint: MVPPoseKeypoint) => {
      if (keypoint.confidence > 0.5) {
        for (let i = 0; i < particleCount / pose.keypoints.length; i++) {
          particles.push({
            x: keypoint.x + (Math.random() - 0.5) * 20,
            y: keypoint.y + (Math.random() - 0.5) * 20,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.5,
            velocity: {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2,
            },
          })
        }
      }
    })

    return particles
  },

  /**
   * Create trail effect for pose movement
   */
  createTrailEffect: (
    currentPose: MVPPoseDetectionResult,
    previousPoses: MVPPoseDetectionResult[],
    trailLength: number
  ) => {
    const trails: MVPPoseKeypoint[][] = []

    currentPose.keypoints.forEach((keypoint: MVPPoseKeypoint, keypointIndex: number) => {
      const trail = [keypoint]

      // Add previous positions
      for (let i = 0; i < Math.min(trailLength, previousPoses.length); i++) {
        const prevPose = previousPoses[previousPoses.length - 1 - i]
        if (prevPose && prevPose.keypoints[keypointIndex]) {
          trail.push(prevPose.keypoints[keypointIndex])
        }
      }

      trails.push(trail)
    })

    return trails
  },

  /**
   * Optimize Skia rendering for performance
   */
  optimizeForPerformance: (pose: MVPPoseDetectionResult) => {
    // Reduce keypoint count for low-end devices
    const highConfidenceKeypoints = pose.keypoints.filter(
      (kp: MVPPoseKeypoint) => kp.confidence > 0.7
    )

    return {
      ...pose,
      keypoints: highConfidenceKeypoints.length > 5 ? highConfidenceKeypoints : pose.keypoints,
    }
  },
}

// Export both the specific implementation and the generic name for compatibility
export { PoseOverlayNative as PoseOverlay }
export default PoseOverlayNative
