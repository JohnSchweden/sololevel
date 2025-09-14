import { YStack } from 'tamagui'
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
}

export function MotionCaptureOverlay({ poseData, isVisible }: MotionCaptureOverlayProps) {
  if (!isVisible || poseData.length === 0) {
    return null
  }

  return (
    <YStack
      position="absolute"
      inset={0}
      pointerEvents="none"
      testID="motion-capture-overlay"
    >
      {poseData.map((pose) => (
        <YStack
          key={pose.id}
          testID={`pose-${pose.id}`}
        >
          {/* Render skeleton nodes */}
          {pose.joints.map((joint) => (
            <Circle
              key={joint.id}
              position="absolute"
              left={joint.x - 4} // Center the 8px circle
              top={joint.y - 4}
              size={8}
              backgroundColor="white"
              opacity={joint.confidence}
              testID={`joint-${joint.id}`}
            />
          ))}

          {/* Render skeleton connections */}
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

              return (
                <YStack
                  key={`${joint.id}-${connectionId}`}
                  position="absolute"
                  left={x1}
                  top={y1}
                  width={length}
                  height={2}
                  backgroundColor="gray"
                  opacity={Math.min(joint.confidence, connectedJoint.confidence)}
                  transform={[
                    { translateX: 0 },
                    { translateY: -1 }, // Center the 2px line
                    { rotate: `${angle}deg` },
                  ]}
                  testID={`connection-${joint.id}-${connectionId}`}
                />
              )
            })
          )}
        </YStack>
      ))}
    </YStack>
  )
}
