import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock React Native APIs
vi.mock('react-native', () => ({
  Platform: { OS: 'web', select: vi.fn((obj) => obj.web) },
  Dimensions: { get: vi.fn(() => ({ width: 375, height: 812 })) },
  StyleSheet: {
    create: vi.fn((styles) => styles),
    hairlineWidth: 1,
  },
  View: 'div',
  Text: 'span',
  TouchableOpacity: 'button',
  ScrollView: 'div',
  SafeAreaView: 'div',
}))

// Mock browser APIs that jsdom doesn't provide
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
// Mock react-native-svg to prevent syntax errors
// Mock react-native-svg to prevent React 19 compatibility issues
vi.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Rect: 'Rect',
  Path: 'Path',
  G: 'G',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Mask: 'Mask',
  Use: 'Use',
  Image: 'Image',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  ForeignObject: 'ForeignObject',
  Line: 'Line',
  Polyline: 'Polyline',
  Polygon: 'Polygon',
  Ellipse: 'Ellipse',
}))
// Prevent react-native-svg from loading at all during tests
vi.doMock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Rect: 'Rect',
  Path: 'Path',
  G: 'G',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Mask: 'Mask',
  Use: 'Use',
  Image: 'Image',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  ForeignObject: 'ForeignObject',
  Line: 'Line',
  Polyline: 'Polyline',
  Polygon: 'Polygon',
  Ellipse: 'Ellipse',
}))
// TEMPORARY: react-native-svg excluded from test processing due to React 19 incompatibility
