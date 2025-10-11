// Mock Expo modules for testing
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
  useLocalSearchParams: jest.fn(() => ({})),
  Link: 'Link',
}))

// Mock Tamagui components to avoid native module requirements
jest.mock('@my/ui', () => ({
  H3: ({ children }: any) => children,
  Spinner: () => 'Loading spinner',
  YStack: ({ children }: any) => children,
  Button: ({ children }: any) => children,
  NativeToast: () => null,
}))
