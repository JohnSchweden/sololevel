# Applications

## Structure
- `expo/` - React Native mobile app
- `next/` - Next.js web app

## Rules
- Consume shared packages via `@my/*` imports
- Don't duplicate business logic (use `@my/app`)
- Don't create custom UI components (use `@my/ui`)
- Keep app-specific code in respective app directories
