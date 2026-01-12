import type { Meta, StoryObj } from '@storybook/react'
import { ModeSelector } from './ModeSelector'

const MODE_OPTIONS = [
  {
    value: 'roast' as const,
    label: 'Roast:Me',
    description: 'Brutal honesty with a side of humor',
    isHumoristic: true,
  },
  { value: 'zen' as const, label: 'Zen:Me', description: 'Calm, encouraging guidance' },
  { value: 'lovebomb' as const, label: 'Lovebomb:Me', description: 'Lovable positivity' },
] as const

const meta: Meta<typeof ModeSelector> = {
  title: 'VoiceSelection/ModeSelector',
  component: ModeSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Vertical stack of mode cards for selecting feedback mode. Mobile-first with 44px touch targets and glass morphism styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'select',
      options: ['roast', 'zen', 'lovebomb'],
      description: 'Current selected mode value',
    },
    onValueChange: {
      description: 'Callback when mode value changes',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '600px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const RoastSelected: Story = {
  args: {
    value: 'roast',
    options: MODE_OPTIONS,
    onValueChange: () => console.log('Mode changed to roast'),
  },
}

export const ZenSelected: Story = {
  args: {
    value: 'zen',
    options: MODE_OPTIONS,
    onValueChange: () => console.log('Mode changed to zen'),
  },
}

export const LovebombSelected: Story = {
  args: {
    value: 'lovebomb',
    options: MODE_OPTIONS,
    onValueChange: () => console.log('Mode changed to lovebomb'),
  },
}

export const Interactive: Story = {
  args: {
    value: 'roast',
    options: MODE_OPTIONS,
    onValueChange: () => console.log('Mode changed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Click any mode card to see the selection change and action logged.',
      },
    },
  },
}
