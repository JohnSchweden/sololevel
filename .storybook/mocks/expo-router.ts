// Mock Expo Router hooks for Storybook
import React from 'react'

export const Link = ({ href, children, asChild, ...props }: any) => {
  if (asChild) {
    return children
  }
  return React.createElement('a', { href, ...props }, children)
}

export const useRouter = () => ({
  push: (_href: string) => {},
  replace: (_href: string) => {},
  back: () => {},
  canGoBack: () => false,
})

export const useLocalSearchParams = () => ({ id: 'mock-id' })

export const Stack = {
  Screen: ({ options, children }: any) => children || null,
}
