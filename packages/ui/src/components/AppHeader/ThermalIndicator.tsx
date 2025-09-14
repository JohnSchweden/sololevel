import { shadows } from '@my/config'
import { AlertTriangle, Thermometer, Zap } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { Animated, Platform } from 'react-native'
import { AnimatePresence, Button, Circle, H6, Paragraph, XStack, YStack, styled } from 'tamagui'

/**
 * Thermal State Indicator Component for Phase 2b
 * Visual indicator for device thermal state with animations and warnings
 * Cross-platform component with adaptive styling
 */

export interface ThermalIndicatorProps {
  thermalState: 'normal' | 'fair' | 'serious' | 'critical'
  temperature?: number
  batteryLevel?: number
  showTemperature?: boolean
  showBattery?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'minimal' | 'detailed' | 'warning'
  onPress?: () => void
  disabled?: boolean
}

const ThermalContainer = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$4',
  padding: '$2',

  variants: {
    size: {
      small: {
        padding: '$1',
        gap: '$1',
      },
      medium: {
        padding: '$2',
        gap: '$2',
      },
      large: {
        padding: '$3',
        gap: '$3',
      },
    },

    variant: {
      minimal: {
        backgroundColor: 'transparent',
      },
      detailed: {
        backgroundColor: '$background',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      warning: {
        backgroundColor: '$red2',
        borderWidth: 1,
        borderColor: '$red6',
      },
    },

    thermalState: {
      normal: {
        // No special styling for normal state
      },
      fair: {
        backgroundColor: '$yellow2',
        borderColor: '$yellow6',
      },
      serious: {
        backgroundColor: '$orange2',
        borderColor: '$orange6',
      },
      critical: {
        backgroundColor: '$red2',
        borderColor: '$red6',
      },
    },
  } as const,
})

const ThermalIcon = styled(Circle, {
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    size: {
      small: {
        size: 20,
      },
      medium: {
        size: 24,
      },
      large: {
        size: 32,
      },
    },

    thermalState: {
      normal: {
        backgroundColor: '$green6',
      },
      fair: {
        backgroundColor: '$yellow6',
      },
      serious: {
        backgroundColor: '$orange6',
      },
      critical: {
        backgroundColor: '$red6',
      },
    },
  } as const,
})

const PulseAnimation = styled(Animated.View, {
  position: 'absolute',
  borderRadius: 1000,

  variants: {
    size: {
      small: {
        width: 20,
        height: 20,
      },
      medium: {
        width: 24,
        height: 24,
      },
      large: {
        width: 32,
        height: 32,
      },
    },
  } as const,
})

/**
 * Get thermal state configuration
 */
const getThermalConfig = (state: ThermalIndicatorProps['thermalState']) => {
  switch (state) {
    case 'normal':
      return {
        color: '$green10',
        backgroundColor: '$green6',
        icon: Thermometer,
        label: 'Normal',
        description: 'Device temperature is optimal',
        shouldPulse: false,
        priority: 'low' as const,
      }
    case 'fair':
      return {
        color: '$yellow10',
        backgroundColor: '$yellow6',
        icon: Thermometer,
        label: 'Fair',
        description: 'Device is warming up',
        shouldPulse: false,
        priority: 'medium' as const,
      }
    case 'serious':
      return {
        color: '$orange10',
        backgroundColor: '$orange6',
        icon: AlertTriangle,
        label: 'Serious',
        description: 'Device is hot - performance may be reduced',
        shouldPulse: true,
        priority: 'high' as const,
      }
    case 'critical':
      return {
        color: '$red10',
        backgroundColor: '$red6',
        icon: Zap,
        label: 'Critical',
        description: 'Device overheating - recording may stop',
        shouldPulse: true,
        priority: 'critical' as const,
      }
  }
}

/**
 * Thermal Indicator Component
 */
export const ThermalIndicator = ({
  thermalState,
  temperature,
  batteryLevel,
  showTemperature = false,
  showBattery = false,
  size = 'medium',
  variant = 'minimal',
  onPress,
  disabled = false,
}: ThermalIndicatorProps) => {
  const [pulseAnim] = useState(new Animated.Value(1))
  const [showDetails, setShowDetails] = useState(false)

  const config = getThermalConfig(thermalState)
  const IconComponent = config.icon

  // Pulse animation for warning states
  useEffect(() => {
    if (config.shouldPulse && !disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      )
      pulse.start()

      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
      return undefined
    }
  }, [config.shouldPulse, disabled, pulseAnim])

  const handlePress = () => {
    if (disabled) return

    if (onPress) {
      onPress()
    } else {
      setShowDetails(!showDetails)
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12
      case 'medium':
        return 16
      case 'large':
        return 20
    }
  }

  const shouldShowWarning =
    variant === 'warning' || config.priority === 'high' || config.priority === 'critical'

  return (
    <YStack>
      <Button
        unstyled
        onPress={handlePress}
        disabled={disabled}
        opacity={disabled ? 0.5 : 1}
      >
        <ThermalContainer
          size={size}
          variant={shouldShowWarning ? 'warning' : variant}
          thermalState={thermalState}
        >
          {/* Pulse animation background */}
          {config.shouldPulse && (
            <PulseAnimation
              size={size}
              style={{
                backgroundColor: config.backgroundColor,
                opacity: 0.3,
                transform: [{ scale: pulseAnim }],
              }}
            />
          )}

          {/* Main thermal icon */}
          <ThermalIcon
            size={size}
            thermalState={thermalState}
          >
            <IconComponent
              size={getIconSize()}
              color="white"
            />
          </ThermalIcon>

          {/* Temperature display */}
          {showTemperature && temperature && variant !== 'minimal' && (
            <YStack alignItems="center">
              <Paragraph
                fontSize={size === 'small' ? '$1' : '$2'}
                color={config.color}
                fontWeight="600"
              >
                {Math.round(temperature)}°C
              </Paragraph>
            </YStack>
          )}

          {/* Battery level display */}
          {showBattery && batteryLevel !== undefined && variant !== 'minimal' && (
            <YStack alignItems="center">
              <Paragraph
                fontSize={size === 'small' ? '$1' : '$2'}
                color={batteryLevel < 20 ? '$red10' : '$color'}
                fontWeight="500"
              >
                {Math.round(batteryLevel)}%
              </Paragraph>
            </YStack>
          )}

          {/* State label for detailed variant */}
          {variant === 'detailed' && size !== 'small' && (
            <YStack>
              <H6
                fontSize={size === 'large' ? '$3' : '$2'}
                color={config.color}
                fontWeight="600"
              >
                {config.label}
              </H6>
            </YStack>
          )}
        </ThermalContainer>
      </Button>

      {/* Expandable details */}
      <AnimatePresence>
        {showDetails && (
          <YStack
            animation="quick"
            enterStyle={{ opacity: 0, y: -10 }}
            exitStyle={{ opacity: 0, y: -10 }}
            backgroundColor="$background"
            borderRadius="$4"
            padding="$3"
            marginTop="$2"
            borderWidth={1}
            borderColor="$borderColor"
            {...shadows.small}
          >
            <YStack gap="$2">
              <XStack
                alignItems="center"
                gap="$2"
              >
                <IconComponent
                  size={16}
                  color={config.color}
                />
                <H6
                  color={config.color}
                  fontWeight="600"
                >
                  {config.label} Temperature
                </H6>
              </XStack>

              <Paragraph
                fontSize="$2"
                color="$color"
              >
                {config.description}
              </Paragraph>

              {temperature && (
                <XStack justifyContent="space-between">
                  <Paragraph
                    fontSize="$2"
                    color="$gray10"
                  >
                    Current Temperature:
                  </Paragraph>
                  <Paragraph
                    fontSize="$2"
                    fontWeight="600"
                  >
                    {Math.round(temperature)}°C
                  </Paragraph>
                </XStack>
              )}

              {batteryLevel !== undefined && (
                <XStack justifyContent="space-between">
                  <Paragraph
                    fontSize="$2"
                    color="$gray10"
                  >
                    Battery Level:
                  </Paragraph>
                  <Paragraph
                    fontSize="$2"
                    fontWeight="600"
                    color={batteryLevel < 20 ? '$red10' : '$color'}
                  >
                    {Math.round(batteryLevel)}%
                  </Paragraph>
                </XStack>
              )}

              {/* Recommendations for high thermal states */}
              {(thermalState === 'serious' || thermalState === 'critical') && (
                <YStack
                  gap="$1"
                  marginTop="$2"
                >
                  <Paragraph
                    fontSize="$1"
                    color="$gray10"
                    fontWeight="600"
                  >
                    Recommendations:
                  </Paragraph>
                  <Paragraph
                    fontSize="$1"
                    color="$gray10"
                  >
                    • Reduce recording quality
                  </Paragraph>
                  <Paragraph
                    fontSize="$1"
                    color="$gray10"
                  >
                    • Lower zoom level
                  </Paragraph>
                  <Paragraph
                    fontSize="$1"
                    color="$gray10"
                  >
                    • Take a break to cool down
                  </Paragraph>
                  {thermalState === 'critical' && (
                    <Paragraph
                      fontSize="$1"
                      color="$red10"
                      fontWeight="600"
                    >
                      • Recording may auto-stop
                    </Paragraph>
                  )}
                </YStack>
              )}
            </YStack>
          </YStack>
        )}
      </AnimatePresence>
    </YStack>
  )
}

/**
 * Compact thermal indicator for minimal UI space
 */
export const CompactThermalIndicator = ({
  thermalState,
  temperature,
  size = 'small',
  onPress,
}: Pick<ThermalIndicatorProps, 'thermalState' | 'temperature' | 'size' | 'onPress'>) => {
  // Only show for non-normal states
  if (thermalState === 'normal') {
    return null
  }

  return (
    <ThermalIndicator
      thermalState={thermalState}
      temperature={temperature}
      size={size}
      variant="minimal"
      onPress={onPress}
    />
  )
}

/**
 * Thermal warning banner for critical states
 */
export const ThermalWarningBanner = ({
  thermalState,
  temperature,
  onDismiss,
}: {
  thermalState: ThermalIndicatorProps['thermalState']
  temperature?: number
  onDismiss?: () => void
}) => {
  const config = getThermalConfig(thermalState)

  // Only show for serious/critical states
  if (thermalState !== 'serious' && thermalState !== 'critical') {
    return null
  }

  return (
    <XStack
      backgroundColor={config.backgroundColor}
      borderColor={config.color}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
      alignItems="center"
      gap="$3"
      marginBottom="$2"
    >
      <ThermalIcon
        size="medium"
        thermalState={thermalState}
      >
        <config.icon
          size={16}
          color="white"
        />
      </ThermalIcon>

      <YStack flex={1}>
        <H6
          color={config.color}
          fontWeight="600"
        >
          {config.label} Temperature Warning
        </H6>
        <Paragraph
          fontSize="$2"
          color="$color"
        >
          {config.description}
          {temperature && ` (${Math.round(temperature)}°C)`}
        </Paragraph>
      </YStack>

      {onDismiss && (
        <Button
          size="$2"
          variant="outlined"
          onPress={onDismiss}
        >
          Dismiss
        </Button>
      )}
    </XStack>
  )
}
