// Mock for @my/ui package
import React from 'react'

export const GlassBackground = ({ children, testID }: any) =>
  React.createElement('div', { 'data-testid': testID }, children)

// Re-export HistoryProgress components from manual mock
export * from './ui/src/components/HistoryProgress'
