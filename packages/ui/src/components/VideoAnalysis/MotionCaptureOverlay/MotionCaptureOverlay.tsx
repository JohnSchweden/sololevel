import { Button, YStack } from 'tamagui'
import { Circle } from 'tamagui'

// Types are imported from VideoPlayer.tsx
interface PoseData {
  id: string
  timestamp: number
  joints: Joint[]
  confidence: number
}

interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

export interface MotionCaptureOverlayProps {
  poseData: PoseData[]
  isVisible: boolean
  onNodeTap?: (nodeId: string) => void
}

export function MotionCaptureOverlay({
  poseData,
  isVisible,
  onNodeTap,
}: MotionCaptureOverlayProps) {
  if (poseData.length === 0) {
    return null
  }

  const currentPose = poseData[0]
  const confidencePercentage = Math.round(currentPose?.confidence * 100 || 0)
  const visibleJoints = currentPose?.joints.filter((joint) => joint.confidence > 0.3) || []
  const isInteractive = !!onNodeTap

  return (
    <YStack
      position="absolute"
      inset={0}
      pointerEvents={isInteractive ? 'auto' : 'none'}
      testID="motion-capture-overlay"
      accessibilityLabel={`Motion capture overlay ${isVisible ? 'visible' : 'hidden'}: ${visibleJoints.length} joints detected with ${confidencePercentage}% confidence`}
      // accessibilityRole="region"
      accessibilityState={{
        expanded: isVisible,
        disabled: !isInteractive,
      }}
      opacity={isVisible ? 1 : 0}
    >
      {poseData.map((pose) => (
        <YStack
          key={pose.id}
          testID={`pose-${pose.id}`}
          accessibilityLabel={`Pose detection for timestamp ${pose.timestamp}ms`}
        >
          {/* Render skeleton nodes */}
          {pose.joints
            .filter((joint) => joint.confidence > 0.3)
            .map((joint) => (
              <Button
                key={joint.id}
                position="absolute"
                left={joint.x - 4} // Center the 8px circle
                top={joint.y - 4}
                width={8}
                height={8}
                padding={0}
                chromeless
                onPress={onNodeTap ? () => onNodeTap(joint.id) : undefined}
                testID={`skeleton-node-${joint.id}`}
                accessibilityLabel={`${joint.id} joint: ${Math.round(joint.confidence * 100)}% confidence`}
                accessibilityRole="button"
                accessibilityHint={
                  onNodeTap ? `Tap to select ${joint.id} joint for detailed analysis` : undefined
                }
                accessibilityState={{
                  disabled: !onNodeTap,
                  selected: false,
                }}
              >
                <Circle
                  size={8}
                  backgroundColor="white"
                  opacity={joint.confidence}
                />
              </Button>
            ))}

          {/* Render skeleton connections */}
          <YStack
            testID="skeleton-connections"
            accessibilityLabel={`Skeleton connections: ${pose.joints.reduce((count, joint) => count + joint.connections.length, 0)} bone connections detected`}
          >
            {pose.joints.map((joint) =>
              joint.connections.map((connectionId) => {
                const connectedJoint = pose.joints.find((j) => j.id === connectionId)
                if (!connectedJoint) return null

                const x1 = joint.x
                const y1 = joint.y
                const x2 = connectedJoint.x
                const y2 = connectedJoint.y

                // Calculate line properties
                const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
                const connectionConfidence = Math.min(joint.confidence, connectedJoint.confidence)

                return (
                  <YStack
                    key={`${joint.id}-${connectionId}`}
                    position="absolute"
                    left={x1}
                    top={y1}
                    width={length}
                    height={2}
                    backgroundColor="gray"
                    opacity={connectionConfidence}
                    transform={[
                      { translateX: 0 },
                      { translateY: -1 }, // Center the 2px line
                      { rotate: `${angle}deg` },
                    ]}
                    testID={`connection-${joint.id}-${connectionId}`}
                    accessibilityLabel={`Bone connection from ${joint.id} to ${connectionId}: ${Math.round(connectionConfidence * 100)}% confidence`}
                  />
                )
              })
            )}
          </YStack>
        </YStack>
      ))}
    </YStack>
  )
}
