import { vi } from "vitest";
import "@testing-library/jest-dom";

// React Native is aliased to react-native-web via vitest.config.mts

// Mock browser APIs that jsdom doesn't provide
Object.defineProperty(window, "matchMedia", {
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
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
// react-native-svg is aliased to mock via vitest.config.mts

// Mock Expo Router for testing
vi.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({ id: "mock-id" }),
  Stack: {
    Screen: ({ children }: any) => children,
  },
}));

// Mock Expo modules core
vi.mock("expo-modules-core", () => ({
  NativeModule: vi.fn(),
  requireNativeModule: vi.fn(),
  requireOptionalNativeModule: vi.fn(),
}));

// Mock Expo Camera
vi.mock("expo-camera", () => ({
  CameraView: ({ children }: any) => children,
  Camera: ({ children }: any) => children,
  useCameraPermissions: () => [
    { granted: true, canAskAgain: true, status: "granted" },
    vi.fn(),
  ],
  useMicrophonePermissions: () => [
    { granted: true, canAskAgain: true, status: "granted" },
    vi.fn(),
  ],
}));

// Mock global expo object
Object.defineProperty(globalThis, "expo", {
  value: {
    NativeModule: vi.fn(),
    modules: {},
  },
  writable: true,
});

// Mock Tamagui Lucide Icons to prevent react-native-svg issues
vi.mock("@tamagui/lucide-icons", () => ({
  RefreshCw: () => "RefreshCw",
  ChevronLeft: () => "ChevronLeft",
  AlertCircle: () => "AlertCircle",
  AlertTriangle: () => "AlertTriangle",
  CheckCircle: () => "CheckCircle",
  X: () => "X",
  // Add other icons as needed
}));
