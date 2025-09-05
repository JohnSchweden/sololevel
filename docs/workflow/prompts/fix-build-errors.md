# Fix Build Errors Prompt

Use this prompt when you have TypeScript or build errors:

```
I've got some build errors. Run yarn type-check to see the TypeScript errors, then fix them, and then run yarn build until build passes.
```

## Alternative Commands

- `yarn pre-pr` - Runs type-check + build (fast pre-PR validation)
- `yarn type-check` - TypeScript compilation only
- `yarn build` - Full build across all packages
- `yarn lint:fix` - Fix linting issues

## Workflow

1. Code away (ignore errors initially)
2. Run `yarn pre-pr` to see all issues
3. Let Cursor fix them systematically
4. Repeat until clean
5. Commit when ready

