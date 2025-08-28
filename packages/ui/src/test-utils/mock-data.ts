/**
 * Centralized Mock Data for Testing
 * Provides consistent test data across all test files
 */

// Device configurations for responsive testing
export interface DeviceConfig {
  width: number
  height: number
  name: string
  type: 'mobile' | 'tablet' | 'desktop'
}

export const MOBILE_DEVICES: DeviceConfig[] = [
  { width: 320, height: 568, name: 'iPhone SE', type: 'mobile' },
  { width: 375, height: 667, name: 'iPhone SE', type: 'mobile' },
  { width: 390, height: 844, name: 'iPhone 12', type: 'mobile' },
  { width: 414, height: 896, name: 'iPhone 8 Plus', type: 'mobile' },
  { width: 428, height: 926, name: 'iPhone 12 Pro Max', type: 'mobile' },
]

export const TABLET_DEVICES: DeviceConfig[] = [
  { width: 768, height: 1024, name: 'iPad', type: 'tablet' },
  { width: 810, height: 1080, name: 'iPad Pro 10.5"', type: 'tablet' },
  { width: 834, height: 1194, name: 'iPad Pro 11"', type: 'tablet' },
]

// Touch target specifications
export interface TouchTargetSpec {
  width: number
  height: number
  description: string
  meetsMinimum: boolean
}

export const TOUCH_TARGET_SPECS: TouchTargetSpec[] = [
  {
    width: 32,
    height: 32,
    description: 'Too small (fails WCAG)',
    meetsMinimum: false,
  },
  {
    width: 40,
    height: 40,
    description: 'Borderline (may fail)',
    meetsMinimum: false,
  },
  {
    width: 44,
    height: 44,
    description: 'Minimum WCAG compliant',
    meetsMinimum: true,
  },
  {
    width: 48,
    height: 48,
    description: 'Recommended size',
    meetsMinimum: true,
  },
  {
    width: 56,
    height: 56,
    description: 'Large touch target',
    meetsMinimum: true,
  },
]

// Recording state configurations
export interface RecordingStateConfig {
  state: string
  duration: number
  canRecord: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
  formattedDuration: string
}

export const RECORDING_STATE_CONFIGS: RecordingStateConfig[] = [
  {
    state: 'idle',
    duration: 0,
    canRecord: true,
    canPause: false,
    canResume: false,
    canStop: false,
    formattedDuration: '00:00',
  },
  {
    state: 'recording',
    duration: 15000,
    canRecord: false,
    canPause: true,
    canResume: false,
    canStop: true,
    formattedDuration: '00:15',
  },
  {
    state: 'paused',
    duration: 30000,
    canRecord: false,
    canPause: false,
    canResume: true,
    canStop: true,
    formattedDuration: '00:30',
  },
  {
    state: 'stopped',
    duration: 60000,
    canRecord: true, // After reset, stopped state should allow recording
    canPause: false,
    canResume: false,
    canStop: false,
    formattedDuration: '01:00',
  },
]

// Camera control configurations
export interface CameraControlConfig {
  cameraType: 'front' | 'back'
  zoomLevel: number
  flashEnabled: boolean
  gridEnabled: boolean
  isSwapping: boolean
}

export const CAMERA_CONTROL_CONFIGS: CameraControlConfig[] = [
  {
    cameraType: 'back',
    zoomLevel: 1,
    flashEnabled: false,
    gridEnabled: false,
    isSwapping: false,
  },
  {
    cameraType: 'front',
    zoomLevel: 2,
    flashEnabled: true,
    gridEnabled: true,
    isSwapping: false,
  },
  {
    cameraType: 'back',
    zoomLevel: 3,
    flashEnabled: false,
    gridEnabled: false,
    isSwapping: true,
  },
]

// Navigation dialog configurations
export interface NavigationDialogConfig {
  open: boolean
  recordingDuration: number
  title: string
  message?: string
  expectedDurationText: string
}

export const NAVIGATION_DIALOG_CONFIGS: NavigationDialogConfig[] = [
  {
    open: true,
    recordingDuration: 0,
    title: 'Discard Recording?',
    expectedDurationText: '',
  },
  {
    open: true,
    recordingDuration: 25000,
    title: 'Discard Recording?',
    expectedDurationText: '25s',
  },
  {
    open: true,
    recordingDuration: 125000,
    title: 'Discard Recording?',
    expectedDurationText: '2m 5s',
  },
  {
    open: false,
    recordingDuration: 30000,
    title: 'Discard Recording?',
    expectedDurationText: '30s',
  },
]

// Form validation test data
export interface FormValidationTestCase {
  input: string
  expectedError?: string
  shouldPass: boolean
  description: string
}

export const FORM_VALIDATION_CASES: FormValidationTestCase[] = [
  {
    input: '',
    expectedError: 'Required field',
    shouldPass: false,
    description: 'Empty input',
  },
  { input: 'test@example.com', shouldPass: true, description: 'Valid email' },
  {
    input: 'invalid-email',
    expectedError: 'Invalid email format',
    shouldPass: false,
    description: 'Invalid email',
  },
  {
    input: 'a'.repeat(1000),
    expectedError: 'Too long',
    shouldPass: false,
    description: 'Too long input',
  },
]

// Accessibility test data
export interface AccessibilityTestCase {
  elementType: string
  attributes: Record<string, string>
  shouldPass: boolean
  description: string
}

export const ACCESSIBILITY_TEST_CASES: AccessibilityTestCase[] = [
  {
    elementType: 'button',
    attributes: { 'aria-label': 'Save changes' },
    shouldPass: true,
    description: 'Button with proper aria-label',
  },
  {
    elementType: 'button',
    attributes: {},
    shouldPass: false,
    description: 'Button without accessible name',
  },
  {
    elementType: 'input',
    attributes: { 'aria-label': 'Search', 'aria-describedby': 'search-help' },
    shouldPass: true,
    description: 'Input with aria-label and describedby',
  },
]

// Performance test configurations
export interface PerformanceTestConfig {
  component: string
  renderCount: number
  maxRenderTime: number // milliseconds
  description: string
}

export const PERFORMANCE_TEST_CONFIGS: PerformanceTestConfig[] = [
  {
    component: 'BottomNavigation',
    renderCount: 10,
    maxRenderTime: 100,
    description: 'Bottom navigation renders quickly',
  },
  {
    component: 'CameraHeader',
    renderCount: 5,
    maxRenderTime: 50,
    description: 'Camera header renders very quickly',
  },
  {
    component: 'RecordingControls',
    renderCount: 15,
    maxRenderTime: 150,
    description: 'Recording controls handle frequent updates',
  },
]

// Orientation test configurations
export interface OrientationTestConfig {
  orientation: 'portrait' | 'landscape'
  width: number
  height: number
  deviceName: string
  expectedLayout: 'narrow' | 'wide'
}

export const ORIENTATION_TEST_CONFIGS: OrientationTestConfig[] = [
  {
    orientation: 'portrait',
    width: 375,
    height: 667,
    deviceName: 'iPhone SE Portrait',
    expectedLayout: 'narrow',
  },
  {
    orientation: 'landscape',
    width: 667,
    height: 375,
    deviceName: 'iPhone SE Landscape',
    expectedLayout: 'wide',
  },
  {
    orientation: 'portrait',
    width: 390,
    height: 844,
    deviceName: 'iPhone 12 Portrait',
    expectedLayout: 'narrow',
  },
  {
    orientation: 'landscape',
    width: 844,
    height: 390,
    deviceName: 'iPhone 12 Landscape',
    expectedLayout: 'wide',
  },
]

// Utility functions for generating test data
export function generateViewportTestData(devices: DeviceConfig[]) {
  return devices.map((device) => [device.width, device.name] as const)
}

export function generateTouchTargetTestData(specs: TouchTargetSpec[]) {
  return specs.map((spec) => [spec.width, spec.height, spec.description] as const)
}

// Test data for component props
export const COMPONENT_TEST_PROPS = {
  button: {
    default: { children: 'Click me' },
    disabled: { children: 'Disabled', disabled: true },
    loading: { children: 'Loading...', loading: true },
    withIcon: { children: 'Save', icon: '💾' },
  },
  input: {
    default: { placeholder: 'Enter text' },
    email: { type: 'email', placeholder: 'Enter email' },
    password: { type: 'password', placeholder: 'Enter password' },
    withError: { error: 'Invalid input' },
  },
  dialog: {
    default: { open: true, title: 'Confirm Action' },
    withCustomContent: {
      open: true,
      title: 'Custom Dialog',
      children: 'Custom content',
    },
    closed: { open: false, title: 'Closed Dialog' },
  },
} as const
