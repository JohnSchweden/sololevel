import '@testing-library/jest-dom'

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native-web')
  return {
    ...RN,
    Platform: { OS: 'web', select: jest.fn((obj) => obj.web) },
  }
})

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}))

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}))
