import type { Meta, StoryObj } from '@storybook/react'
import { VoiceSelectionScreen } from './VoiceSelectionScreen'

const meta: Meta<typeof VoiceSelectionScreen> = {
  title: 'Onboarding/VoiceSelectionScreen',
  component: VoiceSelectionScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'First-login onboarding screen that allows users to select their preferred coach gender and feedback mode before accessing the main app. Features gender selection (Male/Female, Female preselected) and mode selection (Roast:Me/Zen:Me/Lovebomb:Me, Roast:Me preselected).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onContinue: {
      description: 'Callback when user completes selection and saves preferences',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onContinue: () => console.log('Continue clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state with Female and Roast:Me preselected.',
      },
    },
  },
}

export const Interactive: Story = {
  args: {
    onContinue: () => alert('Continue clicked! Preferences saved.'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Click gender or mode options to change selection, then click Continue to save.',
      },
    },
  },
}

export const Loading: Story = {
  args: {
    onContinue: () =>
      new Promise((resolve) => {
        setTimeout(resolve, 3000)
      }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the saving state when Continue is clicked (simulates 3s delay).',
      },
    },
  },
}

export const MobilePortrait: Story = {
  args: {
    onContinue: () => console.log('Continue clicked'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '375px',
          height: '667px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'iPhone SE dimensions (375x667) to test mobile portrait layout.',
      },
    },
  },
}

export const TabletPortrait: Story = {
  args: {
    onContinue: () => console.log('Continue clicked'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '768px',
          height: '1024px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'iPad dimensions (768x1024) to test tablet portrait layout.',
      },
    },
  },
}
