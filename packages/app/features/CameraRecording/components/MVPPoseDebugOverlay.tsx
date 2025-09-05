/**
 * MVP Pose Detection Debug Overlay
 * Development-only component to visualize pose detection state and data
 */

import { Text, View } from 'react-native'
import type { MVPPoseDetectionResult } from '../types/MVPpose'

interface MVPPoseDebugOverlayProps {
  pose: MVPPoseDetectionResult | null
  isDetecting: boolean
  isEnabled: boolean
  style?: any
}

export function MVPPoseDebugOverlay({
  pose,
  isDetecting,
  isEnabled,
  style,
}: MVPPoseDebugOverlayProps) {
  // Only show in development mode
  if (!__DEV__) {
    return null
  }

  const debugInfo = {
    enabled: isEnabled,
    detecting: isDetecting,
    hasPose: !!pose,
    keypointCount: pose?.keypoints?.length || 0,
    confidence: pose?.confidence?.toFixed(2) || '0.00',
    timestamp: pose?.timestamp ? new Date(pose.timestamp).toLocaleTimeString() : 'N/A',
  }

  return (
    <View
      style={[
        {
          position: 'absolute',
          top: 100,
          right: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 8,
          borderRadius: 4,
          minWidth: 150,
          zIndex: 10,
        },
        style,
      ]}
    >
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>MVP Pose Debug</Text>
      <Text style={{ color: isEnabled ? 'lime' : 'red', fontSize: 10 }}>
        Enabled: {debugInfo.enabled ? 'YES' : 'NO'}
      </Text>
      <Text style={{ color: isDetecting ? 'lime' : 'orange', fontSize: 10 }}>
        Detecting: {debugInfo.detecting ? 'YES' : 'NO'}
      </Text>
      <Text style={{ color: debugInfo.hasPose ? 'lime' : 'gray', fontSize: 10 }}>
        Has Pose: {debugInfo.hasPose ? 'YES' : 'NO'}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>Keypoints: {debugInfo.keypointCount}</Text>
      <Text style={{ color: 'white', fontSize: 10 }}>Confidence: {debugInfo.confidence}</Text>
      <Text style={{ color: 'white', fontSize: 9 }}>Last: {debugInfo.timestamp}</Text>

      {/* Show individual keypoint info if pose exists */}
      {pose && pose.keypoints.length > 0 && (
        <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: 'gray', paddingTop: 4 }}>
          <Text style={{ color: 'yellow', fontSize: 9, fontWeight: 'bold' }}>Top Keypoints:</Text>
          {pose.keypoints.slice(0, 3).map((kp, index) => (
            <Text
              key={index}
              style={{ color: 'white', fontSize: 8 }}
            >
              {kp.name}: ({kp.x.toFixed(2)}, {kp.y.toFixed(2)}) {(kp.confidence * 100).toFixed(0)}%
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}
