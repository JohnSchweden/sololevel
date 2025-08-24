// Mock Expo modules for testing
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}))

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}))
