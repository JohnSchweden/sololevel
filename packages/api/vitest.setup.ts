// Mock React Native components that might be imported (hoisted)
import { vi } from 'vitest'

// Mock react-native-svg before any imports
vi.mock('react-native-svg', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: {
      Svg: React.forwardRef((props: any, ref: any) =>
        React.createElement('svg', { ...props, ref })
      ),
      Circle: React.forwardRef((props: any, ref: any) =>
        React.createElement('circle', { ...props, ref })
      ),
      Path: React.forwardRef((props: any, ref: any) =>
        React.createElement('path', { ...props, ref })
      ),
      G: React.forwardRef((props: any, ref: any) => React.createElement('g', { ...props, ref })),
      Rect: React.forwardRef((props: any, ref: any) =>
        React.createElement('rect', { ...props, ref })
      ),
      Text: React.forwardRef((props: any, ref: any) =>
        React.createElement('text', { ...props, ref })
      ),
      TSpan: React.forwardRef((props: any, ref: any) =>
        React.createElement('tspan', { ...props, ref })
      ),
      TextPath: React.forwardRef((props: any, ref: any) =>
        React.createElement('textPath', { ...props, ref })
      ),
      Defs: React.forwardRef((props: any, ref: any) =>
        React.createElement('defs', { ...props, ref })
      ),
      LinearGradient: React.forwardRef((props: any, ref: any) =>
        React.createElement('linearGradient', { ...props, ref })
      ),
      Stop: React.forwardRef((props: any, ref: any) =>
        React.createElement('stop', { ...props, ref })
      ),
      RadialGradient: React.forwardRef((props: any, ref: any) =>
        React.createElement('radialGradient', { ...props, ref })
      ),
      Pattern: React.forwardRef((props: any, ref: any) =>
        React.createElement('pattern', { ...props, ref })
      ),
      Mask: React.forwardRef((props: any, ref: any) =>
        React.createElement('mask', { ...props, ref })
      ),
      ClipPath: React.forwardRef((props: any, ref: any) =>
        React.createElement('clipPath', { ...props, ref })
      ),
      Use: React.forwardRef((props: any, ref: any) =>
        React.createElement('use', { ...props, ref })
      ),
      Image: React.forwardRef((props: any, ref: any) =>
        React.createElement('image', { ...props, ref })
      ),
      Symbol: React.forwardRef((props: any, ref: any) =>
        React.createElement('symbol', { ...props, ref })
      ),
      Marker: React.forwardRef((props: any, ref: any) =>
        React.createElement('marker', { ...props, ref })
      ),
      View: React.forwardRef((props: any, ref: any) =>
        React.createElement('div', { ...props, ref })
      ),
    },
    Svg: React.forwardRef((props: any, ref: any) => React.createElement('svg', { ...props, ref })),
    Circle: React.forwardRef((props: any, ref: any) =>
      React.createElement('circle', { ...props, ref })
    ),
    Path: React.forwardRef((props: any, ref: any) =>
      React.createElement('path', { ...props, ref })
    ),
    G: React.forwardRef((props: any, ref: any) => React.createElement('g', { ...props, ref })),
    Rect: React.forwardRef((props: any, ref: any) =>
      React.createElement('rect', { ...props, ref })
    ),
    Text: React.forwardRef((props: any, ref: any) =>
      React.createElement('text', { ...props, ref })
    ),
    TSpan: React.forwardRef((props: any, ref: any) =>
      React.createElement('tspan', { ...props, ref })
    ),
    TextPath: React.forwardRef((props: any, ref: any) =>
      React.createElement('textPath', { ...props, ref })
    ),
    Defs: React.forwardRef((props: any, ref: any) =>
      React.createElement('defs', { ...props, ref })
    ),
    LinearGradient: React.forwardRef((props: any, ref: any) =>
      React.createElement('linearGradient', { ...props, ref })
    ),
    Stop: React.forwardRef((props: any, ref: any) =>
      React.createElement('stop', { ...props, ref })
    ),
    RadialGradient: React.forwardRef((props: any, ref: any) =>
      React.createElement('radialGradient', { ...props, ref })
    ),
    Pattern: React.forwardRef((props: any, ref: any) =>
      React.createElement('pattern', { ...props, ref })
    ),
    Mask: React.forwardRef((props: any, ref: any) =>
      React.createElement('mask', { ...props, ref })
    ),
    ClipPath: React.forwardRef((props: any, ref: any) =>
      React.createElement('clipPath', { ...props, ref })
    ),
    Use: React.forwardRef((props: any, ref: any) => React.createElement('use', { ...props, ref })),
    Image: React.forwardRef((props: any, ref: any) =>
      React.createElement('image', { ...props, ref })
    ),
    Symbol: React.forwardRef((props: any, ref: any) =>
      React.createElement('symbol', { ...props, ref })
    ),
    Marker: React.forwardRef((props: any, ref: any) =>
      React.createElement('marker', { ...props, ref })
    ),
    View: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
  }
})

import '@testing-library/jest-dom'

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
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

// Suppress console warnings for tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('useLayoutEffect') || args[0].includes('Warning: ReactDOM.render'))
  ) {
    return
  }
  originalWarn(...args)
}
