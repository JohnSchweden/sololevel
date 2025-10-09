# Storybook Stories

## Purpose
Component documentation and visual testing with Storybook.

## Rules
- Create stories for all UI components in `packages/ui`
- Use CSF3 (Component Story Format 3)
- Include multiple variants and states
- Document prop types and usage examples

## Story Structure
```tsx
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Component> = {
  title: 'Category/Component',
  component: Component,
}

export default meta
type Story = StoryObj<typeof Component>

export const Default: Story = {
  args: {},
}
```


