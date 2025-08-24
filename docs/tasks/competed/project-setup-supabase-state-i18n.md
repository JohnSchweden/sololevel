# Supabase + State/Query + i18n + Tooling Tasks

## Completed Tasks
- [x] Enforce TypeScript checks and add yarn type-check; drop ignoreBuildErrors [Both] [S]
- [x] Create `packages/api` with Supabase client setup [Both] [S]
- [x] Install Supabase SDK and generate DB types (`packages/api/types/database.ts`) [Both] [S]
- [x] Set up Supabase CLI and local development [Both] [M]
- [x] Scaffold `supabase/migrations` baseline schema [Both] [M]
- [x] Scaffold `supabase/functions` with sample Hono function [Both] [S]
- [x] Wire Supabase env vars for web and native [Both] [S]
- [x] Add Zustand stores: auth, theme, feature flags [Both] [M]
- [x] Add React Query providers in Expo and Next [Both] [S]
- [x] Add Zod and base validation schemas (API, forms, navigation params) [Both] [S]
- [x] Add i18next with locales en,de,fr [Both] [M]
- [x] Add next-i18next SSR locale detection [Web] [S]

## In Progress Tasks

## Future Tasks
- [x] Upgrade Storybook stories with state variants and argTypes [Both] [M]
- [x] Configure Playwright baseURL to Next serve port 8151 [Web] [S]
- [x] Add Playwright tests for existing Tamagui screens [Web] [M]

## Testing Pipeline
- [x] Unit tests passing (packages/ui & packages/app)
- [x] Component tests with RTL (packages/app/features/home/screen.test.tsx)
- [x] E2E Web (tests/tamagui.screens.spec.ts)
- [x] E2E Native (optional, out of scope for now)

## Relevant Files
- `packages/api/**` — API layer (Supabase client/hooks/types)
- `supabase/migrations/**` — Database schema
- `supabase/functions/**` — Edge Functions (Hono sample)
- `apps/expo/app/**`, `apps/next/pages/**` — Providers wiring
- `packages/app/stores/**` — Zustand stores (auth, theme, feature flags)
- `packages/app/validation/**` — Zod schemas
- `apps/next/next-i18next.config.js` — Web SSR locale detection
- `stories/**/*.stories.tsx`, `packages/app/features/**/screen.stories.tsx` — Storybook
- `playwright/*.spec.ts` — E2E web tests


