import type { Meta, StoryObj } from '@storybook/react'
import { HomeScreen } from './screen'
import { TamaguiProvider, config } from '@my/ui'
import React from 'react'

const meta: Meta<typeof HomeScreen> = {
  title: 'Features/Home/HomeScreen',
  component: HomeScreen,
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
