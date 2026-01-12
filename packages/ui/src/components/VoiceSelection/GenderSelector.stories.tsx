import type { Meta, StoryObj } from '@storybook/react'
import { GenderSelector } from './GenderSelector'

const meta: Meta<typeof GenderSelector> = {
  title: 'VoiceSelection/GenderSelector',
  component: GenderSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Two-card radio group for selecting coach gender (Male/Female). Mobile-first with 44px touch targets and glass morphism styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'select',
      options: ['male', 'female'],
      description: 'Current selected gender value',
    },
    onValueChange: {
      description: 'Callback when gender value changes',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const FemaleSelected: Story = {
  args: {
    value: 'female',
    onValueChange: () => console.log('Gender changed to female'),
  },
}

export const MaleSelected: Story = {
  args: {
    value: 'male',
    onValueChange: () => console.log('Gender changed to male'),
  },
}

export const Interactive: Story = {
  args: {
    value: 'female',
    onValueChange: () => console.log('Gender changed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Click either option to see the selection change and action logged.',
      },
    },
  },
}
