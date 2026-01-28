# Improve the User's Prompt Following the Patterns Below


> Here is a guide on how to structure these files using only positive, behavior-focused instructions.
1. Structure of a "Positive-Only" AGENTS.md
Instead of a list of "Don'ts," create a "Do" list that acts as a positive behavioral contract. 
- Be Explicit & Direct: Tell the model exactly what to do.
- Give Alternatives: If you want to avoid a behavior, instruct the model to do a better alternative instead of just saying "never". 

Example AGENTS.md Setup:
markdown
# Agent Rules & Behaviors

## Coding Standards
- Use TypeScript with strict mode enabled.
- Prefer functional programming patterns over class-based inheritance.
- Always use Tailwind CSS for styling; prefer utility classes over custom CSS.
- Document functions using JSDoc.

## Workflow
- Write tests *before* writing implementation code (TDD).
- Ensure all tests pass before proposing a commit.
- Keep pull requests small and focused on one feature.

## Output Style
- Provide code snippets within appropriate markdown code blocks.
- Explain the reasoning behind architectural decisions briefly.
- When fixing a bug, explain the root cause and the preventive measure.

2. Best Practices for Positive Instructions
Based on how Claude and similar agents operate, here are the best practices for phrasing your instructions:
- Frame as "Always": Instead of "Don't skip tests," use "Always run tests before finishing a task".
- Use Active Verbs: Start instructions with verbs like Use, Create, Implement, Verify, Prefer, Structure.
- Structure with Headers: Break down instructions by domain (e.g., ## Testing, ## Styling, ## Formatting) to help the model manage its context window.
- Use Positive Alternatives:
    - Negative: "Do not add comments."
    - Positive: "Keep code self-documenting; only add comments to explain complex business logic". 

3. Turning Negatives into Positive Guidelines
If you find the AI struggling with a specific negative, flip it:
Instead of... 	Try... (Positive Formulation)
Never use Tailwind CSS.	Always use vanilla CSS in styles.css.
Do not use divs for layout.	Use semantic HTML elements (<section>, <article>, <nav>).
Never write large functions.	Break functions down into small, single-responsibility modules.
Don't forget to run tests.	Validate every code change by running the test:unit script.

4. Implementation in CLAUDE.md
CLAUDE.md acts as a "rules of the road" doc. If the model is over-eager (creates too many files), instruct it on the preferred workflow: 

Example CLAUDE.md Content:
markdown
# Instructions for Claude

- Focus on modifying existing files before creating new ones.
- When creating a new component, also create its corresponding `.test.tsx` file.
- Prefer using existing design tokens in `theme.ts`.
- If a task requires complex database changes, create a migration file first.

By concentrating only on the desired, positive behaviors, you provide the AI with a clear, unambiguous blueprint to follow, which improves code quality and reduces unauthorized or incorrect changes. 