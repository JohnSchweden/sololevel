/// <reference types="jest" />
import React from 'react'

// Mock the ActionSheetProvider
export const ActionSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children)
}

// Mock the useActionSheet hook
export const useActionSheet = () => {
  return {
    showActionSheetWithOptions: jest.fn(),
  }
}

// Mock the connectActionSheet HOC
export const connectActionSheet = <P extends object>(Component: React.ComponentType<P>) => {
  return Component
}

// Export default for default import
export default {
  ActionSheetProvider,
  useActionSheet,
  connectActionSheet,
}
