import { TamaguiProvider, config } from '@my/ui'
import type { Meta, StoryObj } from '@storybook/react'
import { HomeScreen } from './screen'

const meta: Meta<typeof HomeScreen> = {
  title: 'Features/Home/HomeScreen',
  component: HomeScreen,
  argTypes: {
    // example of state toggles if HomeScreen accepted props
  },
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],

  decorators: [
    (Story) => (
      <TamaguiProvider config={config}>
        <Story />
      </TamaguiProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const DarkTheme: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
}
