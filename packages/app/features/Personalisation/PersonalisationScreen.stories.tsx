import type { Meta, StoryObj } from '@storybook/react'
import { PersonalisationScreen } from './PersonalisationScreen'

const meta: Meta<typeof PersonalisationScreen> = {
  title: 'Screens/PersonalisationScreen',
  component: PersonalisationScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Personalisation settings screen with voice preferences, theme, language, accessibility, and interaction settings. Note: Requires auth and voice preferences store context to be properly set up in Storybook decorators.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Note: In a full Storybook setup, you would provide proper context providers here
      // For now, this demonstrates the screen structure
      return <Story />
    },
  ],
}

export default meta
type Story = StoryObj<typeof PersonalisationScreen>

/**
 * Default personalisation screen showing all sections:
 * - Coach Voice (gender and coaching style)
 * - Appearance (theme selector)
 * - Language & Region
 * - Accessibility (large text, reduce animations)
 * - Interaction (sound effects, haptic feedback)
 *
 * Note: This story requires proper auth and voice preferences store setup.
 * The screen will attempt to load user preferences on mount.
 */
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'The complete personalisation screen with all settings sections. The Coach Voice section at the top allows users to customize their coach gender and coaching style preferences.',
      },
    },
  },
}

/**
 * Personalisation screen with custom testID.
 * Useful for testing and automation.
 */
export const CustomTestID: Story = {
  args: {
    testID: 'custom-personalisation-screen',
  },
}
