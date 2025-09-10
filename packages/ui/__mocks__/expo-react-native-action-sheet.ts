import React from 'react'

/// <reference types="jest" />

// Mock ActionSheetProvider
export const ActionSheetProvider = ({ children }: { children: React.ReactNode }) => children

// Mock useActionSheet
export const useActionSheet = () => ({
  showActionSheetWithOptions: (_options: any, callback: (i: number) => void) => {
    // This is a mock implementation, so we just return a function that
    // calls the callback with a dummy index.
    return callback(0)
  },
})

// Export default
export default {
  ActionSheetProvider,
  useActionSheet,
}
