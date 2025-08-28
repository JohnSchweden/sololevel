import type { ReactNode } from "react";

// Mock SafeAreaProvider
export const SafeAreaProvider = ({ children }: { children: ReactNode }) => children;

// Mock SafeAreaView
export const SafeAreaView = ({ children }: { children: ReactNode }) => children;

// Mock useSafeAreaInsets hook
export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

// Mock useSafeAreaFrame hook
export const useSafeAreaFrame = () => ({
  x: 0,
  y: 0,
  width: 375,
  height: 812,
});

// Mock SafeAreaInsetsContext
export const SafeAreaInsetsContext = {
  Provider: ({ children }: { children: ReactNode }) => children,
  Consumer: ({ children }: { children: (insets: any) => ReactNode }) =>
    children({ top: 0, bottom: 0, left: 0, right: 0 }),
};

// Mock SafeAreaFrameContext
export const SafeAreaFrameContext = {
  Provider: ({ children }: { children: ReactNode }) => children,
  Consumer: ({ children }: { children: (frame: any) => ReactNode }) =>
    children({ x: 0, y: 0, width: 375, height: 812 }),
};

// Mock initialWindowMetrics
export const initialWindowMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

// Default export
export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  initialWindowMetrics,
};
