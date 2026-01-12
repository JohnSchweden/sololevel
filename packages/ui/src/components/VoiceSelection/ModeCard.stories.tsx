import type { Meta, StoryObj } from '@storybook/react'
import { RadioGroup } from 'tamagui'
import { ModeCard } from './ModeCard'

const meta: Meta<typeof ModeCard> = {
  title: 'VoiceSelection/ModeCard',
  component: ModeCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single card for mode selection with title, description, and optional badge. Mobile-first with 44px touch targets and glass morphism styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Mode value',
    },
    label: {
      control: 'text',
      description: 'Display label',
    },
    description: {
      control: 'text',
      description: 'Description text',
    },
    isSelected: {
      control: 'boolean',
      description: 'Whether this card is currently selected',
    },
    isHumoristic: {
      control: 'boolean',
      description: 'Whether to show the humoristic badge',
    },
  },
  decorators: [
    (Story) => (
      <RadioGroup
        value="roast"
        onValueChange={() => {}}
      >
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <Story />
        </div>
      </RadioGroup>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const RoastSelected: Story = {
  args: {
    id: 'mode-roast',
    value: 'roast',
    label: 'Roast:Me',
    description: 'Brutal honesty with a side of humor',
    isSelected: true,
    isHumoristic: true,
  },
}

export const RoastUnselected: Story = {
  args: {
    id: 'mode-roast',
    value: 'roast',
    label: 'Roast:Me',
    description: 'Brutal honesty with a side of humor',
    isSelected: false,
    isHumoristic: true,
  },
}

export const ZenSelected: Story = {
  args: {
    id: 'mode-zen',
    value: 'zen',
    label: 'Zen:Me',
    description: 'Calm, encouraging guidance',
    isSelected: true,
    isHumoristic: false,
  },
}

export const ZenUnselected: Story = {
  args: {
    id: 'mode-zen',
    value: 'zen',
    label: 'Zen:Me',
    description: 'Calm, encouraging guidance',
    isSelected: false,
    isHumoristic: false,
  },
}

export const LovebombSelected: Story = {
  args: {
    id: 'mode-lovebomb',
    value: 'lovebomb',
    label: 'Lovebomb:Me',
    description: 'Lovable positivity',
    isSelected: true,
    isHumoristic: false,
  },
}

export const LovebombUnselected: Story = {
  args: {
    id: 'mode-lovebomb',
    value: 'lovebomb',
    label: 'Lovebomb:Me',
    description: 'Lovable positivity',
    isSelected: false,
    isHumoristic: false,
  },
}
