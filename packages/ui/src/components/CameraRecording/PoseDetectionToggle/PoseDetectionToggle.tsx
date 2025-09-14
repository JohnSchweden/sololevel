/**
 * MVP Pose Detection Toggle Component
 * Simple toggle button for enabling/disabling pose detection in MVP mode
 */

import { Eye, EyeOff } from '@tamagui/lucide-icons'
import { Button, Text, XStack } from 'tamagui'

export interface PoseDetectionToggleProps {
  isEnabled: boolean
  onToggle: () => void
  disabled?: boolean
  size?: '$2' | '$3' | '$4'
  testID?: string
}

export function PoseDetectionToggle({
  isEnabled,
  onToggle,
  disabled = false,
  size = '$3',
  testID = 'pose-detection-toggle',
}: PoseDetectionToggleProps) {
  const iconSize = size === '$2' ? 16 : size === '$4' ? 24 : 20

  return (
    <Button
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      chromeless
      size={size}
      backgroundColor={isEnabled ? '$blue2' : '$gray2'}
      borderColor={isEnabled ? '$blue7' : '$gray7'}
      pressStyle={{
        backgroundColor: isEnabled ? '$blue3' : '$gray3',
      }}
      disabledStyle={{
        opacity: 0.5,
        backgroundColor: '$gray1',
      }}
    >
      <XStack
        alignItems="center"
        gap="$2"
      >
        {isEnabled ? (
          <Eye
            size={iconSize}
            color="$blue10"
            testID={`${testID}-icon-enabled`}
          />
        ) : (
          <EyeOff
            size={iconSize}
            color="$gray10"
            testID={`${testID}-icon-disabled`}
          />
        )}
        <Text
          fontSize={size === '$2' ? '$2' : size === '$4' ? '$4' : '$3'}
          color={isEnabled ? '$blue10' : '$gray10'}
          fontWeight="500"
          testID={`${testID}-text`}
        >
          Pose Detection
        </Text>
      </XStack>
    </Button>
  )
}

/**
 * Compact version for use in control bars
 */
export function PoseDetectionToggleCompact({
  isEnabled,
  onToggle,
  disabled = false,
  testID = 'pose-detection-toggle-compact',
}: Omit<PoseDetectionToggleProps, 'size'>) {
  return (
    <Button
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      circular
      size="$3"
      backgroundColor={isEnabled ? '$blue7' : '$gray5'}
      pressStyle={{
        backgroundColor: isEnabled ? '$blue8' : '$gray6',
      }}
      disabledStyle={{
        opacity: 0.5,
        backgroundColor: '$gray3',
      }}
    >
      {isEnabled ? (
        <Eye
          size={18}
          color="white"
          testID={`${testID}-icon-enabled`}
        />
      ) : (
        <EyeOff
          size={18}
          color="$gray11"
          testID={`${testID}-icon-disabled`}
        />
      )}
    </Button>
  )
}
