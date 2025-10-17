import { Activity, Battery, Cpu, HardDrive, Zap } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { Animated, Platform } from 'react-native'
import {
  Button,
  Circle,
  H5,
  H6,
  Paragraph,
  Progress,
  Separator,
  XStack,
  YStack,
  styled,
} from 'tamagui'

/**
 * Performance Monitor Component for Phase 2b
 * Real-time performance metrics display with adaptive styling
 * Cross-platform component with responsive design
 */

export interface PerformanceMetrics {
  fps: number
  targetFps: number
  memoryUsage: number // MB
  cpuUsage: number // percentage
  batteryLevel: number // percentage
  thermalState: 'normal' | 'fair' | 'serious' | 'critical'
  droppedFrames: number
  qualityScore: number // 0-100
}

export interface PerformanceMonitorProps {
  metrics: PerformanceMetrics
  variant?: 'compact' | 'detailed' | 'overlay'
  showLabels?: boolean
  showHistory?: boolean
  updateInterval?: number
  onMetricPress?: (metric: keyof PerformanceMetrics) => void
  style?: any
}

const MonitorContainer = styled(YStack, {
  borderRadius: '$4',
  padding: '$3',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    variant: {
      compact: {
        padding: '$2',
        gap: '$2',
      },
      detailed: {
        padding: '$3',
        gap: '$3',
      },
      overlay: {
        backgroundColor: '$backgroundTransparent',
        borderColor: '$borderColorTransparent',
        backdropFilter: 'blur(10px)',
      },
    },
  } as const,
})

const MetricRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: '$1',

  variants: {
    variant: {
      compact: {
        paddingVertical: '$0.5',
      },
      detailed: {
        paddingVertical: '$2',
      },
      overlay: {
        paddingVertical: '$1',
      },
    },
  } as const,
})

const MetricIcon = styled(Circle, {
  size: 24,
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    status: {
      good: {
        backgroundColor: '$green6',
      },
      warning: {
        backgroundColor: '$yellow6',
      },
      critical: {
        backgroundColor: '$red6',
      },
    },

    size: {
      small: {
        size: 20,
      },
      medium: {
        size: 24,
      },
      large: {
        size: 28,
      },
    },
  } as const,
})

/**
 * Get metric status based on value and thresholds
 */
const getMetricStatus = (metric: keyof PerformanceMetrics, value: number | string) => {
  switch (metric) {
    case 'fps':
      if (typeof value === 'number' && value >= 25) return 'good'
      if (typeof value === 'number' && value >= 15) return 'warning'
      return 'critical'

    case 'memoryUsage':
      if (typeof value === 'number' && value < 100) return 'good'
      if (typeof value === 'number' && value < 200) return 'warning'
      return 'critical'

    case 'cpuUsage':
      if (typeof value === 'number' && value < 60) return 'good'
      if (typeof value === 'number' && value < 80) return 'warning'
      return 'critical'

    case 'batteryLevel':
      if (typeof value === 'number' && value > 30) return 'good'
      if (typeof value === 'number' && value > 15) return 'warning'
      return 'critical'

    case 'qualityScore':
      if (typeof value === 'number' && value >= 80) return 'good'
      if (typeof value === 'number' && value >= 60) return 'warning'
      return 'critical'

    case 'thermalState':
      switch (value) {
        case 'normal':
          return 'good'
        case 'fair':
          return 'warning'
        case 'serious':
          return 'critical'
        case 'critical':
          return 'critical'
        default:
          return 'good'
      }

    default:
      return 'good'
  }
}

/**
 * Format metric value for display
 */
const formatMetricValue = (metric: keyof PerformanceMetrics, value: number | string) => {
  switch (metric) {
    case 'fps':
      return typeof value === 'number' ? `${Math.round(value)} fps` : 'N/A fps'
    case 'memoryUsage':
      return typeof value === 'number' ? `${Math.round(value)} MB` : 'N/A MB'
    case 'cpuUsage':
    case 'batteryLevel':
    case 'qualityScore':
      return typeof value === 'number' ? `${Math.round(value)}%` : 'N/A%'
    case 'droppedFrames':
      return `${value}`
    case 'thermalState':
      return typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'
    default:
      return typeof value === 'number' ? `${Math.round(value)}` : `${value}`
  }
}

/**
 * Get metric configuration
 */
const getMetricConfig = (metric: keyof PerformanceMetrics) => {
  switch (metric) {
    case 'fps':
      return {
        icon: Activity,
        label: 'Frame Rate',
        shortLabel: 'FPS',
        color: '$blue10',
      }
    case 'memoryUsage':
      return {
        icon: HardDrive,
        label: 'Memory Usage',
        shortLabel: 'Memory',
        color: '$purple10',
      }
    case 'cpuUsage':
      return {
        icon: Cpu,
        label: 'CPU Usage',
        shortLabel: 'CPU',
        color: '$orange10',
      }
    case 'batteryLevel':
      return {
        icon: Battery,
        label: 'Battery Level',
        shortLabel: 'Battery',
        color: '$green10',
      }
    case 'qualityScore':
      return {
        icon: Zap,
        label: 'Quality Score',
        shortLabel: 'Quality',
        color: '$yellow10',
      }
    default:
      return {
        icon: Activity,
        label: 'Metric',
        shortLabel: 'Metric',
        color: '$color10',
      }
  }
}

/**
 * Individual Metric Display Component
 */
const MetricDisplay = ({
  metric,
  value,
  variant = 'detailed',
  showLabel = true,
  onPress,
}: {
  metric: keyof PerformanceMetrics
  value: number | string
  variant?: 'compact' | 'detailed' | 'overlay'
  showLabel?: boolean
  onPress?: () => void
}) => {
  const config = getMetricConfig(metric)
  const status = getMetricStatus(metric, value)
  const IconComponent = config.icon

  const [pulseAnim] = useState(new Animated.Value(1))

  // Pulse animation for critical metrics
  useEffect(() => {
    if (status === 'critical') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
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
  }, [status, pulseAnim])

    const getProgressValue = () => {
    if (typeof value === 'string') {
      // Handle thermalState mapping to percentage
      switch (value) {
        case 'normal':
          return 100
        case 'fair':
          return 75
        case 'serious':
          return 50
        case 'critical':
          return 25
        default:
          return 0
      }
    }

    switch (metric) {
      case 'fps':
        return Math.min((value / 30) * 100, 100)
      case 'memoryUsage':
        return Math.min((value / 300) * 100, 100) // 300MB max
      case 'cpuUsage':
      case 'batteryLevel':
      case 'qualityScore':
        return value
      default:
        return 0
    }
  }

  return (
    <Button
      unstyled
      onPress={onPress}
      disabled={!onPress}
    >
      <MetricRow variant={variant}>
        <XStack
          alignItems="center"
          gap="$2"
          flex={1}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MetricIcon
              status={status}
              size={variant === 'compact' ? 'small' : 'medium'}
            >
              <IconComponent
                size={variant === 'compact' ? 12 : 16}
                color="white"
              />
            </MetricIcon>
          </Animated.View>

          {showLabel && (
            <YStack flex={1}>
              <Paragraph
                fontSize={variant === 'compact' ? '$1' : '$2'}
                fontWeight="600"
                color={"$color" as any}
              >
                {variant === 'compact' ? config.shortLabel : config.label}
              </Paragraph>
              {variant === 'detailed' && (
                <Progress
                  size="$2"
                  value={getProgressValue()}
                  backgroundColor="$color4"
                >
                  <Progress.Indicator
                    animation="bouncy"
                    backgroundColor={
                      status === 'good' ? '$green8' : status === 'warning' ? '$yellow8' : '$red8'
                    }
                  />
                </Progress>
              )}
            </YStack>
          )}
        </XStack>

        <Paragraph
          fontSize={variant === 'compact' ? '$1' : '$2'}
          fontWeight="700"
          color={status === 'good' ? '$green10' : status === 'warning' ? '$yellow10' : '$red10'}
        >
          {formatMetricValue(metric, value)}
        </Paragraph>
      </MetricRow>
    </Button>
  )
}

/**
 * Performance Summary Component
 */
const PerformanceSummary = ({
  metrics,
  variant = 'detailed',
}: {
  metrics: PerformanceMetrics
  variant?: 'compact' | 'detailed' | 'overlay'
}) => {
  const overallStatus = (() => {
    const statuses = [
      getMetricStatus('fps', metrics.fps),
      getMetricStatus('memoryUsage', metrics.memoryUsage),
      getMetricStatus('cpuUsage', metrics.cpuUsage),
      getMetricStatus('batteryLevel', metrics.batteryLevel),
    ]

    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('warning')) return 'warning'
    return 'good'
  })()

  const summaryText = (() => {
    switch (overallStatus) {
      case 'good':
        return 'Performance is optimal'
      case 'warning':
        return 'Performance issues detected'
      case 'critical':
        return 'Critical performance issues'
    }
  })()

  return (
    <XStack
      alignItems="center"
      gap="$2"
      padding="$2"
      backgroundColor={
        overallStatus === 'good' ? '$green2' : overallStatus === 'warning' ? '$yellow2' : '$red2'
      }
      borderRadius="$3"
      borderWidth={1}
      borderColor={
        overallStatus === 'good' ? '$green6' : overallStatus === 'warning' ? '$yellow6' : '$red6'
      }
    >
      <MetricIcon
        status={overallStatus}
        size={variant === 'compact' ? 'small' : 'medium'}
      >
        <Activity
          size={variant === 'compact' ? 12 : 16}
          color="white"
        />
      </MetricIcon>

      <YStack flex={1}>
        <Paragraph
          fontSize={variant === 'compact' ? '$1' : '$2'}
          fontWeight="600"
          color={
            overallStatus === 'good'
              ? '$green10'
              : overallStatus === 'warning'
                ? '$yellow10'
                : '$red10'
          }
        >
          {summaryText}
        </Paragraph>
        {variant === 'detailed' && (
          <Paragraph
            fontSize="$1"
            color={"$color10" as any}
          >
            Quality Score: {Math.round(metrics.qualityScore)}%
          </Paragraph>
        )}
      </YStack>
    </XStack>
  )
}

/**
 * Main Performance Monitor Component
 */
export const PerformanceMonitor = ({
  metrics,
  variant = 'detailed',
  showLabels = true,
  onMetricPress,
  style,
}: PerformanceMonitorProps) => {
  const [isExpanded, setIsExpanded] = useState(variant === 'detailed')

  const primaryMetrics: (keyof PerformanceMetrics)[] = [
    'fps',
    'memoryUsage',
    'cpuUsage',
    'batteryLevel',
  ]

  const secondaryMetrics: (keyof PerformanceMetrics)[] = ['qualityScore', 'droppedFrames']

  if (variant === 'compact') {
    return (
      <MonitorContainer
        variant="compact"
        style={style}
      >
        <PerformanceSummary
          metrics={metrics}
          variant="compact"
        />

        <XStack
          gap="$2"
          flexWrap="wrap"
        >
          {primaryMetrics.map((metric) => (
            <MetricDisplay
              key={metric}
              metric={metric}
              value={metrics[metric]}
              variant="compact"
              showLabel={false}
              onPress={() => onMetricPress?.(metric)}
            />
          ))}
        </XStack>
      </MonitorContainer>
    )
  }

  return (
    <MonitorContainer
      variant={variant}
      style={style}
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
      >
        <H5
          fontWeight="600"
          color={"$color" as any}
        >
          Performance Monitor
        </H5>

        {variant === 'detailed' && (
          <Button
            size="$2"
            variant="outlined"
            onPress={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
      </XStack>

      <PerformanceSummary
        metrics={metrics}
        variant={variant}
      />

      {isExpanded && (
        <>
          <Separator />

          <YStack gap="$1">
            <H6
              fontWeight="600"
              color={"$color10" as any}
              fontSize="$2"
            >
              System Metrics
            </H6>

            {primaryMetrics.map((metric) => (
              <MetricDisplay
                key={metric}
                metric={metric}
                value={metrics[metric]}
                variant={variant}
                showLabel={showLabels}
                onPress={() => onMetricPress?.(metric)}
              />
            ))}
          </YStack>

          <Separator />

          <YStack gap="$1">
            <H6
              fontWeight="600"
              color={"$color10" as any}
              fontSize="$2"
            >
              Quality Metrics
            </H6>

            {secondaryMetrics.map((metric) => (
              <MetricDisplay
                key={metric}
                metric={metric}
                value={metrics[metric]}
                variant={variant}
                showLabel={showLabels}
                onPress={() => onMetricPress?.(metric)}
              />
            ))}
          </YStack>

          {/* Thermal State Display */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
          >
            <Paragraph
              fontSize="$2"
              fontWeight="600"
              color={"$color" as any}
            >
              Thermal State
            </Paragraph>
            <Paragraph
              fontSize="$2"
              fontWeight="700"
              color={
                metrics.thermalState === 'normal'
                  ? '$green10'
                  : metrics.thermalState === 'fair'
                    ? '$yellow10'
                    : metrics.thermalState === 'serious'
                      ? '$orange10'
                      : '$red10'
              }
            >
              {metrics.thermalState.charAt(0).toUpperCase() + metrics.thermalState.slice(1)}
            </Paragraph>
          </XStack>
        </>
      )}
    </MonitorContainer>
  )
}

/**
 * Overlay Performance Monitor for minimal UI impact
 */
export const OverlayPerformanceMonitor = ({
  metrics,
  onMetricPress,
}: Pick<PerformanceMonitorProps, 'metrics' | 'onMetricPress'>) => {
  const [isVisible, setIsVisible] = useState(false)

  // Auto-show for critical performance issues
  useEffect(() => {
    const hasCriticalIssues =
      metrics.fps < 15 ||
      metrics.memoryUsage > 200 ||
      metrics.cpuUsage > 80 ||
      metrics.batteryLevel < 15 ||
      metrics.thermalState === 'critical'

    setIsVisible(hasCriticalIssues)
  }, [metrics])

  if (!isVisible) {
    return null
  }

  return (
    <YStack
      position="absolute"
      top="$4"
      right="$4"
      zIndex={1000}
      maxWidth={200}
    >
      <PerformanceMonitor
        metrics={metrics}
        variant="overlay"
        showLabels={false}
        onMetricPress={onMetricPress}
      />

      <Button
        size="$1"
        variant="outlined"
        marginTop="$2"
        onPress={() => setIsVisible(false)}
      >
        Dismiss
      </Button>
    </YStack>
  )
}
