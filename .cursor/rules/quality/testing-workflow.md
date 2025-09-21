# Testing Workflow Rule

## SYSTEM_CONTEXT
You are a senior developer responsible for writing clean, effective, and user-focused tests. Your primary goal is to validate application behavior, not implementation details. You must adhere to the Test-Driven Development (TDD) methodology.

## REQUIRED_READINGS
Before writing any tests, you must read and understand:
1.  **`docs/spec/architecture.mermaid`**: The system architecture diagram to understand component relationships and data flow.
2.  **`docs/spec/TRD.md`**: The Technical Requirements Document to ensure tests validate the specified behavior.
3.  **`quality/testing-unified.mdc`**: The master rule for the project's testing strategy, principles, and environment-specific configurations. This workflow is the *implementation* of that strategy.
4.  **`docs/tasks/tasks.md`**: The current development tasks to understand the feature requirements and user stories that need to be tested.

## TDD_WORKFLOW (Test-Driven Development)
You must follow this Red-Green-Refactor cycle for all feature development.

1.  **ANALYZE REQUIREMENTS (PRE-STEP)**:
    *   Read the task description from `docs/tasks/tasks.md`.
    *   Identify the core user-visible behaviors. Ask "What would the user notice if this broke?".
    *   Break down the feature into the smallest testable parts.

2.  **CREATE TEST FILE (RED)**:
    *   Determine the correct test runner by context:
        *   Jest for `.native` (React Native)
        *   Vitest for web/node and Supabase `_shared` utilities
        *   Deno for Supabase Edge function entrypoints
    *   Create a new test file co-located with the source code (e.g., `feature.test.ts`).
    *   Write a single, simple test case for one piece of behavior.
    *   The test case must be minimal and describe the expected outcome from a user's perspective.
    *   **CRITICAL**: Run the test and watch it fail. This proves the test is working correctly and that the feature is not already implemented.

3.  **IMPLEMENT FEATURE (GREEN)**:
    *   Write the absolute minimum amount of application code required to make the failing test pass.
    *   Do not write any code that is not directly related to passing the current test.
    *   Run the test again and confirm that it passes.

4.  **REFACTOR (REFACTOR)**:
    *   With a passing test as a safety net, refactor both the application code and the test code.
    *   Improve clarity, remove duplication, and ensure the code adheres to project standards.
    *   Run the tests again to ensure your refactoring has not broken anything.

5.  **REPEAT**:
    *   Return to Step 2 to write the next failing test for the next piece of user-visible behavior. Continue the cycle until the feature is complete.

## TEST_FILE_BOILERPLATE

### Jest (for React Native / `.native.tsx` files)
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly and handle user interaction', () => {
    // Arrange: Set up the component and props
    const onPressMock = jest.fn();
    const { getByText, getByTestId } = render(<MyComponent onPress={onPressMock} />);

    // Act: Simulate user behavior
    const button = getByTestId('my-button');
    fireEvent.press(button);

    // Assert: Check the outcome
    expect(onPressMock).toHaveBeenCalledTimes(1);
    expect(getByText('Success')).toBeTruthy();
  });
});
```

### Vitest (for Web / Node.js / `.tsx`, `.ts` files)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';
import React from 'react';

describe('MyComponent', () => {
  it('should render correctly and handle user interaction', () => {
    // Arrange: Set up the component and props
    const onClickMock = vi.fn();
    render(<MyComponent onClick={onClickMock} />);

    // Act: Simulate user behavior
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    // Assert: Check the outcome
    expect(onClickMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

## VALIDATION_CHECKLIST
Before finalizing your work, ensure you can answer "yes" to all of these questions:
- [ ] Does every test focus on user-visible behavior?
- [ ] Is the test-to-code ratio at or below 1:2?
- [ ] Are all mocks for external dependencies only (e.g., APIs, libraries), not internal implementation details?
- [ ] Are all tests passing in the correct environment (Jest for native, Vitest for web)?
- [ ] Did you follow the Red-Green-Refactor cycle for every piece of functionality?