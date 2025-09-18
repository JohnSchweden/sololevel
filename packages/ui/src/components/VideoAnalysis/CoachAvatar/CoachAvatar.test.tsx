import { render } from '@testing-library/react-native'
import { CoachAvatar } from './CoachAvatar'

// Mock the require call for the coach avatar image
jest.mock('../../../../../../apps/expo/assets/coach_avatar.png', () => 'mocked-coach-avatar')

// Mock React Native's Image component
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Image: ({ children, testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('img', { 'data-testid': testID || 'image', ...props }, children)
  },
}))

describe('CoachAvatar', () => {
  describe('Rendering', () => {
    it('should render the coach avatar with default props', () => {
      const { toJSON } = render(<CoachAvatar />)

      // Check that the component renders
      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'aria-label': 'AI Coach Avatar',
          role: 'image',
          'data-original-accessibility-label': 'AI Coach Avatar',
          'data-original-accessibility-role': 'image',
        },
      })
    })

    it('should render with custom size', () => {
      const customSize = 48
      const { toJSON } = render(<CoachAvatar size={customSize} />)

      expect(toJSON()).toBeTruthy()
    })

    it('should render with speaking state', () => {
      const { toJSON } = render(<CoachAvatar isSpeaking={true} />)

      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'coach-avatar-speaking',
        },
      })
    })

    it('should render with idle state by default', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toBeTruthy()
      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'coach-avatar-idle',
        },
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'aria-label': 'AI Coach Avatar',
          'data-original-accessibility-label': 'AI Coach Avatar',
        },
      })
    })

    it('should have proper accessibility role', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          role: 'image',
          'data-original-accessibility-role': 'image',
        },
      })
    })

    it('should be accessible', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'aria-label': 'AI Coach Avatar',
          role: 'image',
          'data-original-accessibility-label': 'AI Coach Avatar',
          'data-original-accessibility-role': 'image',
        },
      })
    })
  })

  describe('States', () => {
    it('should have speaking state data attribute when speaking', () => {
      const { toJSON } = render(<CoachAvatar isSpeaking={true} />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'coach-avatar-speaking',
        },
      })
    })

    it('should have idle state data attribute when not speaking', () => {
      const { toJSON } = render(<CoachAvatar />)

      expect(toJSON()).toMatchObject({
        type: 'div',
        props: {
          'data-testid': 'coach-avatar-idle',
        },
      })
    })
  })
})
