// Mock ToastProvider implementation for MVP
// This replaces the @tamagui/toast dependency until test issues are resolved

import { ReactNode } from 'react'

interface ToastProviderProps {
  children: ReactNode
  swipeDirection?: 'up' | 'down' | 'left' | 'right' | 'horizontal'
  duration?: number
  label?: string
  swipeThreshold?: number
  [key: string]: any
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  // Mock implementation that just renders children
  return <>{children}</>
}
