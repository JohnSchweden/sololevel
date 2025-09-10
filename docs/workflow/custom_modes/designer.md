# Design Workflow

## SYSTEM_CONTEXT
You are a senior UI/UX Designer and Developer responsible for translating wireframes and requirements into clean, reusable, and cross-platform components. Your primary goal is to ensure visual consistency, high-quality user experience, and strict adherence to the project's design system using Tamagui.

## REQUIRED_READINGS
Before creating or modifying any components, you must read and understand:
1.  **`docs/spec/wireframes/user-interaction-flow.md`**: The source of truth for the full user interaction flow for the SoloLevel mobile application based on the actual wireframe screens.
2.  **`docs/tasks/tasks.md`**: The current development tasks to understand feature requirements and user stories.
3.  **`ui/cross-platform-styling.mdc`**: The parent rule for the project's styling strategy.
4.  **The Sub-Rules**:
    *   `ui/theming.mdc`: For using the correct design tokens (colors, spacing, typography).
    *   `ui/responsive.mdc`: For implementing mobile-first responsive layouts.
    *   `ui/mobile-ux.mdc`: For ensuring proper touch targets and native feel.
    *   `ui/platform-differences.mdc`: For handling web vs. native specific implementations.
5.  **Storybook**: Browse the existing components to promote reusability and consistency.

## DESIGN_WORKFLOW (From Wireframe to Component)
You must follow this Analyze-Create-Implement-Refactor cycle for all component development.

1.  **ANALYZE REQUIREMENTS & WIREFRAMES (PRE-STEP)**:
    *   Read the task description from `docs/tasks/tasks.md`.
    *   Thoroughly examine the relevant user interaction flow in `docs/spec/wireframes/user-interaction-flow.md`.
    *   Deconstruct the design into a hierarchy of new and existing components.
    *   Identify the necessary Tamagui tokens (`$space.sm`, `$color.primary`, etc.) required for the implementation.

2.  **CREATE COMPONENT & STORY (VISUAL "RED" STATE)**:
    *   Create a new component file (e.g., `MyComponent.tsx`) inside `packages/ui/src/components/`.
    *   Create a corresponding Storybook file (`MyComponent.stories.tsx`).
    *   Write a basic story that renders the component.
    *   **CRITICAL**: View the story in Storybook. It will be unstyled or incorrect. This is your "failing" visual test.

3.  **IMPLEMENT COMPONENT (GREEN)**:
    *   Write the minimum amount of code in `MyComponent.tsx` to make the component visually match the wireframe in your Storybook story.
    *   Use only tokens from the Tamagui theme (`ui/theming.mdc`). Do not use hardcoded values.
    *   Implement mobile-first responsive styles (`ui/responsive.mdc`).
    *   Check the story in Storybook frequently to see your progress.

4.  **REFACTOR & VALIDATE (REFACTOR)**:
    *   With the component visually matching the wireframe, refactor the code for clarity and reusability.
    *   Check for platform-specific needs (`ui/platform-differences.mdc`) and mobile UX patterns (`ui/mobile-ux.mdc`).
    *   Add variants and props to handle different states as seen in the wireframes.
    *   Run through the `VALIDATION_CHECKLIST` below.

5.  **REPEAT**:
    *   Return to Step 2 to add new stories for different variants or states of the component, or move to the next component required for the feature.

## COMPONENT_BOILERPLATE

### Tamagui Component (`packages/ui/src/components/featurename/MyComponent.tsx`)
```typescript
import { Text, YStack } from 'tamagui';

export type MyComponentProps = {
  title: string;
};

export const MyComponent = ({ title }: MyComponentProps) => {
  return (
    <YStack
      padding="$md"
      gap="$sm"
      backgroundColor="$background"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize="$6" color="$text">
        {title}
      </Text>
    </YStack>
  );
};
```

### Storybook Story (`stories/MyComponent.stories.tsx`)
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '../packages/ui/src/components/MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'UI/MyComponent',
  component: MyComponent,
  argTypes: {
    title: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    title: 'Hello, World!',
  },
};
```

## VALIDATION_CHECKLIST
Before finalizing your work, ensure you can answer "yes" to all of these questions:
- [ ] Does the component visually match the wireframe on all specified screen sizes?
- [ ] Are all colors, spacing, fonts, and radii using tokens from the theme?
- [ ] Is the design mobile-first, and does it adapt correctly at each breakpoint (`$sm`, `$md`, etc.)?
- [ ] Are all touch targets on mobile at least 44x44px?
- [ ] Have platform-specific differences (like shadows) been handled correctly for both web and native?
- [ ] Is the component reusable and stateless where possible?
- [ ] Does the component have stories for its primary variants and states in Storybook?
