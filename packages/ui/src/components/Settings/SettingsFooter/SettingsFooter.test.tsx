import { fireEvent, render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { SettingsFooter } from './SettingsFooter'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{ui}</TamaguiProvider>)
}

describe('SettingsFooter', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders all three footer links', () => {
      // Arrange: Footer with link handler
      const onLinkPress = jest.fn()

      // Act: Render footer
      renderWithProvider(<SettingsFooter onLinkPress={onLinkPress} />)

      // Assert: All links visible
      expect(screen.getByText('Privacy')).toBeInTheDocument()
      expect(screen.getByText('Terms of use')).toBeInTheDocument()
      expect(screen.getByText('FAQ')).toBeInTheDocument()
    })

    it('renders links as buttons for accessibility', () => {
      // Arrange: Footer component
      const onLinkPress = jest.fn()

      // Act: Render footer
      renderWithProvider(<SettingsFooter onLinkPress={onLinkPress} />)

      // Assert: Links have button role
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })
  })

  describe('User Interactions', () => {
    it('calls onLinkPress with "privacy" when Privacy clicked', () => {
      // Arrange: Spy on link handler
      const onLinkPress = jest.fn()

      // Act: Render and click Privacy
      renderWithProvider(<SettingsFooter onLinkPress={onLinkPress} />)
      const privacyLink = screen.getByText('Privacy')
      fireEvent.click(privacyLink)

      // Assert: Handler called with correct link type
      expect(onLinkPress).toHaveBeenCalledTimes(1)
      expect(onLinkPress).toHaveBeenCalledWith('privacy')
    })

    it('calls onLinkPress with "terms" when Terms clicked', () => {
      // Arrange: Spy on link handler
      const onLinkPress = jest.fn()

      // Act: Render and click Terms
      renderWithProvider(<SettingsFooter onLinkPress={onLinkPress} />)
      const termsLink = screen.getByText('Terms of use')
      fireEvent.click(termsLink)

      // Assert: Handler called with correct link type
      expect(onLinkPress).toHaveBeenCalledTimes(1)
      expect(onLinkPress).toHaveBeenCalledWith('terms')
    })

    it('calls onLinkPress with "faq" when FAQ clicked', () => {
      // Arrange: Spy on link handler
      const onLinkPress = jest.fn()

      // Act: Render and click FAQ
      renderWithProvider(<SettingsFooter onLinkPress={onLinkPress} />)
      const faqLink = screen.getByText('FAQ')
      fireEvent.click(faqLink)

      // Assert: Handler called with correct link type
      expect(onLinkPress).toHaveBeenCalledTimes(1)
      expect(onLinkPress).toHaveBeenCalledWith('faq')
    })
  })
})
