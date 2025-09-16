// Mock ToastViewport implementation for MVP
// This replaces the @tamagui/toast dependency until test issues are resolved

interface ToastViewportProps {
  top?: string | number
  left?: number
  right?: number
  bottom?: string | number
  [key: string]: any
}

export const ToastViewport = (_props: ToastViewportProps) => {
  // Mock implementation that renders nothing (invisible viewport)
  return null
}
