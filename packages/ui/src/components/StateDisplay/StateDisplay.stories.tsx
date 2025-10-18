import type { Meta, StoryObj } from '@storybook/react'
import { StateDisplay } from './StateDisplay'

const meta: Meta<typeof StateDisplay> = {
  title: 'Components/StateDisplay',
  component: StateDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Reusable component for displaying loading, empty, and error states with consistent styling and behavior.',
      },
    },
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['loading', 'empty', 'error'],
      description: 'Type of state to display',
    },
    title: {
      control: { type: 'text' },
      description: 'Main message/title to display',
    },
    description: {
      control: { type: 'text' },
      description: 'Optional description text',
    },
    icon: {
      control: { type: 'text' },
      description: 'Optional icon/emoji to display (for empty and error states)',
    },
    onRetry: {
      action: 'retry',
      description: 'Optional retry handler (for error state)',
    },
    testID: {
      control: { type: 'text' },
      description: 'Custom test ID',
    },
  },
}

export default meta
type Story = StoryObj<typeof StateDisplay>

// Loading State Stories
export const Loading: Story = {
  args: {
    type: 'loading',
    title: 'Loading insights...',
  },
}

export const LoadingWithDescription: Story = {
  args: {
    type: 'loading',
    title: 'Loading...',
    description: 'Please wait while we fetch your data',
  },
}

// Empty State Stories
export const Empty: Story = {
  args: {
    type: 'empty',
    title: 'No data available yet',
    description: 'Complete workouts to see insights about your performance and progress.',
    icon: '📊',
  },
}

export const EmptyWithoutIcon: Story = {
  args: {
    type: 'empty',
    title: 'No videos yet',
    description: 'Record your first video to see it here',
  },
}

export const EmptyMinimal: Story = {
  args: {
    type: 'empty',
    title: 'Nothing to show',
  },
}

// Error State Stories
export const ErrorState: Story = {
  args: {
    type: 'error',
    title: 'Failed to load insights',
    description: 'Please try again later or pull to refresh.',
    icon: '⚠️',
  },
}

export const ErrorWithRetry: Story = {
  args: {
    type: 'error',
    title: 'Failed to load insights',
    description: 'Please try again later or pull to refresh.',
    icon: '⚠️',
    onRetry: () => console.log('Retry clicked'),
  },
}

export const ErrorMinimal: Story = {
  args: {
    type: 'error',
    title: 'Something went wrong',
  },
}

// Real-world Examples
export const InsightsLoading: Story = {
  args: {
    type: 'loading',
    title: 'Loading insights...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example loading state for insights screen',
      },
    },
  },
}

export const InsightsEmpty: Story = {
  args: {
    type: 'empty',
    title: 'No data available yet',
    description: 'Complete workouts to see insights about your performance and progress.',
    icon: '📊',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example empty state for insights screen',
      },
    },
  },
}

export const InsightsError: Story = {
  args: {
    type: 'error',
    title: 'Failed to load insights',
    description: 'Please try again later or pull to refresh.',
    onRetry: () => console.log('Retry insights'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Example error state for insights screen with retry',
      },
    },
  },
}

export const VideosEmpty: Story = {
  args: {
    type: 'empty',
    title: 'No videos yet',
    description: 'Record your first video to see it here',
    icon: '🎥',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example empty state for videos section',
      },
    },
  },
}

export const VideosError: Story = {
  args: {
    type: 'error',
    title: 'Failed to load videos',
    description: 'Unable to fetch your video history. Please check your connection.',
    icon: '📹',
    onRetry: () => console.log('Retry videos'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Example error state for videos section with retry',
      },
    },
  },
}
