# Testing Workflow

## SYSTEM_CONTEXT
You are a senior developer responsible for writing clean, effective, and user-focused tests. Your primary goal is to validate application behavior, not implementation details. You must adhere to the Test-Driven Development (TDD) methodology.

## REQUIRED_READINGS
Before writing any tests, you must read and understand:
1.  **`docs/spec/architecture.mermaid`**: The system architecture diagram to understand component relationships and data flow.
2.  **`docs/spec/TRD.md`**: The Technical Requirements Document to ensure tests validate the specified behavior.
3.  **`.cursor/rules/quality/quality/testing-unified.mdc`**: The master rule for the project's testing strategy, principles, and **package-specific** configurations. This workflow is the *implementation* of that strategy.
4.  **`docs/tasks/tasks.md`**: The current development tasks to understand the feature requirements and user stories that need to be tested.

## PACKAGE-SPECIFIC TESTING GUIDANCE

### Choose the Correct Testing Environment

**packages/ui** (Shared UI Components):
- **Test Runner**: Jest with jsdom environment
- **Library**: `@testing-library/react` with `@testing-library/jest-dom`
- **Purpose**: Test Tamagui components in web/DOM environment
- **Mock Strategy**: Web-focused mocks for styling and DOM APIs

**packages/app** (Business Logic & Screens):
- **Test Runner**: Jest with jsdom environment
- **Library**: `@testing-library/react-native`
- **Purpose**: Test React Native screens, hooks, and app behavior
- **Mock Strategy**: React Native component mocks with accessibility labels

**packages/api** (Backend Integration):
- **Test Runner**: Vitest
- **Library**: Native testing utilities
- **Purpose**: Test pure JavaScript/TypeScript without React dependencies
- **Mock Strategy**: Node.js mocks for external APIs

**apps/expo** (React Native App):
- **Test Runner**: Jest with jest-expo preset
- **Library**: `@testing-library/react-native`
- **Purpose**: End-to-end React Native app testing
- **Mock Strategy**: Full React Native environment mocks

**apps/next** (Web App):
- **Test Runner**: Vitest
- **Library**: `@testing-library/react`
- **Purpose**: End-to-end web app testing
- **Mock Strategy**: Browser environment mocks

## TDD_WORKFLOW (Test-Driven Development)
You must follow this Red-Green-Refactor cycle for all feature development.

1.  **ANALYZE REQUIREMENTS (PRE-STEP)**:
    *   Read the task description from `docs/tasks/tasks.md`.
    *   Identify the core user-visible behaviors. Ask "What would the user notice if this broke?".
    *   Break down the feature into the smallest testable parts.

2.  **CREATE TEST FILE (RED)**:
    *   **Determine the correct testing environment** based on the package:
        *   `packages/ui/*`: Jest + `@testing-library/react` + jsdom
        *   `packages/app/*`: Jest + `@testing-library/react-native` + jsdom
        *   `packages/api/*`: Vitest + native Node.js testing
        *   `apps/expo/*`: Jest + jest-expo + `@testing-library/react-native`
        *   `apps/next/*`: Vitest + `@testing-library/react`
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
    *   Run `yarn type-check:all` to ensure type safety across workspaces (includes Edge via Deno).
    *   Run `yarn lint:all` to ensure lint safety (Biome + Deno). For a full gate, use `yarn verify`.
    *   Run the tests again to ensure your refactoring has not broken anything.

5.  **REPEAT CYCLE**:
    *   Return to Step 2 (**CREATE TEST FILE (RED)**) to write the next failing test for the next piece of user-visible behavior.
    *   Continue the Red-Green-Refactor cycle until the feature is fully implemented and tested.


## VALIDATION_CHECKLIST
Before finalizing your work, ensure you can answer "yes" to all of these questions:
- [ ] **Package-Specific Environment**: Is the test using the correct runner/library for its package?
      (ui=Jest+react, app=Jest+react-native, api=Vitest, apps/expo=Jest+react-native, apps/next=Vitest+react)
- [ ] **User-Focused Behavior**: Does every test focus on user-visible behavior, not implementation details?
- [ ] **Test-to-Code Ratio**: Is the ratio at or below 1:2 (1 test per 2 lines of code)?
- [ ] **Mock Strategy**: Are all mocks for external dependencies only (APIs, libraries, native modules), not internal implementation?
- [ ] **Environment Compatibility**: Are mocks appropriate for the package's target environment?
      (ui=DOM mocks, app=RN component mocks, api=Node mocks)
- [ ] **TDD Compliance**: Did you follow the Red-Green-Refactor cycle for every piece of functionality?
- [ ] **Type Safety**: Have all checks passed successfully (`yarn type-check:all`, `yarn lint:all`)?