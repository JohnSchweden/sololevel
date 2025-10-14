/**
 * Manual Mock for @tamagui/lucide-icons
 * Jest automatically uses this instead of the real module
 * Battle-tested pattern for mocking third-party icon libraries
 */

import React from 'react'

export interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  testID?: string
  [key: string]: unknown
}

/**
 * Creates a mock icon component with consistent test attributes
 * Converts PascalCase to kebab-case for test IDs (e.g., ChevronRight -> chevron-right)
 */
const toKebabCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

const createMockIcon = (name: string) =>
  React.forwardRef<SVGElement, IconProps>((props, ref) =>
    React.createElement('svg', {
      ...props,
      ref,
      'data-testid': `${toKebabCase(name)}-icon`,
      'data-icon': name,
      width: props.size || 24,
      height: props.size || 24,
      fill: props.color || 'currentColor',
    })
  )

// Export all icons used in the UI package components
// Alphabetically sorted for maintainability

export const Activity = createMockIcon('Activity')
export const AlertCircle = createMockIcon('AlertCircle')
export const AlertTriangle = createMockIcon('AlertTriangle')
export const Battery = createMockIcon('Battery')
export const Bell = createMockIcon('Bell')
export const Bookmark = createMockIcon('Bookmark')
export const Camera = createMockIcon('Camera')
export const Check = createMockIcon('Check')
export const ChevronLeft = createMockIcon('ChevronLeft')
export const ChevronRight = createMockIcon('ChevronRight')
export const Clock = createMockIcon('Clock')
export const Cpu = createMockIcon('Cpu')
export const Download = createMockIcon('Download')
export const Edit3 = createMockIcon('Edit3')
export const Eye = createMockIcon('Eye')
export const EyeOff = createMockIcon('EyeOff')
export const Fingerprint = createMockIcon('Fingerprint')
export const HardDrive = createMockIcon('HardDrive')
export const Heart = createMockIcon('Heart')
export const Loader2 = createMockIcon('Loader2')
export const Maximize2 = createMockIcon('Maximize2')
export const Menu = createMockIcon('Menu')
export const MessageCircle = createMockIcon('MessageCircle')
export const MoreHorizontal = createMockIcon('MoreHorizontal')
export const Pause = createMockIcon('Pause')
export const Play = createMockIcon('Play')
export const PlayCircle = createMockIcon('PlayCircle')
export const RotateCcw = createMockIcon('RotateCcw')
export const Settings = createMockIcon('Settings')
export const Share = createMockIcon('Share')
export const Shield = createMockIcon('Shield')
export const SkipBack = createMockIcon('SkipBack')
export const SkipForward = createMockIcon('SkipForward')
export const Smartphone = createMockIcon('Smartphone')
export const Square = createMockIcon('Square')
export const SwitchCamera = createMockIcon('SwitchCamera')
export const Thermometer = createMockIcon('Thermometer')
export const Upload = createMockIcon('Upload')
export const User = createMockIcon('User')
export const X = createMockIcon('X')
export const XCircle = createMockIcon('XCircle')
export const Zap = createMockIcon('Zap')
