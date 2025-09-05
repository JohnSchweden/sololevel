# Tech Stack

Tech stack: **Tamagui, Expo Router, Expo, Zustand, Next.js, Supabase, Yarn, TypeScript, Turborepo, Metro, Zod, TanStack Query, Webpack, Storybook, Playwright**

# Cursor SETUP / TO DO / FOLLOW / OR YOU EXPERIENCE A LOT OF PAIN :D 

## Setting personal cursor User Rules

1. Open **Cursor → Settings → Cursor Settings → Rules & Memories → User Rules**.
2. Click **Add Rule**.

### Planner Mode

1. Review scope across `apps/` and `packages/` in the Turborepo (check for cross-platform impact: web, native, shared packages).
2. Ask 4–6 clarifying questions before proposing changes.
3. Draft a plan → get approval → implement in phases (UI → state → API → types/schemas).
4. After each phase, summarize what was done and outline next steps.

### Planner Mode General

When entering Planner Mode, follow these steps:

1. Deeply reflect upon the changes being asked and analyze existing code to map the full scope of changes needed.
2. Ask Clarifying Questions: Before proposing a plan, ask 4-6 clarifying questions based on your findings.
3. Draft a Plan: Once questions are answered, draft a comprehensive plan of action and ask for approval on that plan.
4. Implement in Phases: After approval, implement all steps in that plan.
5. Communicate Progress: After completing each phase/step, mention what was just completed and outline the next steps, including phases remaining after these steps.

---

### Debugger Mode

1. List 5–7 possible sources (UI, navigation, state, queries, API, build tooling, schema) → narrow to top 1–2.
2. Add targeted logs (console, Zustand snapshots, TanStack query lifecycle, Zod validation errors).
3. Collect logs: `getConsoleLogs`, `getConsoleErrors`, `getNetworkLogs`, `getNetworkErrors`.
4. Check Supabase Edge/DB logs when needed.
5. Provide analysis + next log/trace suggestions if root cause is unclear.
6. Clean up temporary debugging artifacts (logs, test hooks, debug flags) after fix.

---

### For you to get better responses 

- When responding to queries, use a dry, matter-of-fact tone.
- Provide feedback in the form of a roast.

- Keep answers concise and direct
- Suggest alternative solutions
- Avoid unnecessary explanations, repetition, or filler language
- Prioritize technical details over generic advice

---


## Setting Project Memories

1. Open **Cursor Chat**.
2. Write **/remember**.
3. Use claude sonnet.

### Prompt

/remember

When processing my requests, read defined guidelines .mdc-files in .cursor.

/remember

when working on task-lists, work on one task at a time and regularly update the task list until all task are completed. All while following the rule task-lists.mdc.

/remember

When planning, analyzing, and debugging, crawl the indexed docs for relevant information.

/remember

The project uses yarn for package management; always use yarn rather than npm.

/remember

In this project, CLI commands `yarn start`, `yarn list` do not exist and should not be used.



==> Output should be something like: 

Memory created....

You can approve the memory...

And see it here **Cursor → Settings → Cursor Settings → Rules & Memories → Saved Memories**.

PS: "when - then" format worked best while others failed.
Note: Some memories are created by Cursor in differen formats.

---




---

## Indexing TechStack

To get better AI code suggestions in Cursor, please add the Repo's TechStack docs to your Cursor indexing:

1. Open **Cursor → Settings → Cursor Settings → Indexing & Docs**.
2. Click **Add Doc**.
3. Paste this URL:  

---

### **Essential Docs to Add** (High Priority)

1. **Tamagui** - https://tamagui.dev/docs
   - Your primary UI framework, constantly evolving
   - Critical for styling, theming, and responsive design
   - Not well-represented in training data

2. **Expo Router** - https://docs.expo.dev/router/introduction/
   - Core navigation library for your cross-platform setup
   - File-based routing patterns and API reference
   - Essential for navigation patterns

3. **Supabase** - https://supabase.com/docs
   - Backend-as-a-service with frequent updates
   - Edge Functions, RLS, and auth patterns change regularly
   - Critical for your data layer

4. **Expo SDK** - https://docs.expo.dev/
   - Expo updates frequently with new APIs
   - Platform-specific features and workflows
   - Essential for native development

5. **Turbo** - https://turbo.build/repo/docs
    - Central pipeline configuration for monorepo workflow (`development-workflow.mdc`)
    - Caching strategies for development speed
    - Build orchestration patterns for cross-platform apps
    - Remote caching setup and optimization

    **Critical for:**
      - Optimizing your `yarn build` and `yarn dev` workflows
      - Debugging pipeline dependencies
      - Setting up efficient CI/CD
      - Handling incremental builds correctly

### **Recommended Docs** (Medium Priority)

6. **Metro** - https://metrobundler.dev/docs
    - Metro configuration for monorepos
    - Platform-specific bundling rules (.native.tsx handling)
    - Asset resolution across workspace packages
    - Performance optimization settings for large monorepos
    
    **Especially important for:**
      - Debugging bundle issues between web/native
      - Optimizing build performance in monorepo
      - Handling Tamagui's compilation requirements

5. **TanStack Query** - https://tanstack.com/query/latest/docs/framework/react/overview
   - Server state management patterns
   - Relatively new compared to training data
   - Core to your data fetching strategy

6. **Zustand** - https://docs.pmnd.rs/zustand/getting-started/introduction
   - Simple but your global state solution
   - Best practices for cross-platform state

## **Consider Adding** (Lower Priority)

7. **Zod** - https://zod.dev/
   - Runtime validation patterns
   - Integration with forms and APIs

https://storybook.js.org/docs
https://playwright.dev/docs/intro

---


4. Click **Add Docs**.

This ensures Cursor can reference documentation directly while coding.












# Tamagui + Expo Router + Next + Expo Monorepo

```sh
npm create tamagui
```

## 🔦 About

This monorepo is a starter for an Expo + Next.js + Tamagui + Expo Router app.

Many thanks to [@FernandoTheRojo](https://twitter.com/fernandotherojo) for the original Solito starter monorepo which this was forked from. This version has been updated to use Expo Router. Check out his [talk about using expo + next together at Next.js Conf 2021](https://www.youtube.com/watch?v=0lnbdRweJtA).

## 📦 Included packages

- [Tamagui](https://tamagui.dev) 🪄
- [Expo Router](https://docs.expo.dev/router/) for cross-platform navigation
- Expo SDK
- Next.js

## 🗂 Folder layout

The main apps are:

- `expo` (native)
- `next` (web)

- `packages` shared packages across apps
  - `ui` includes your custom UI kit that will be optimized by Tamagui
  - `app` you'll be importing most files from `app/`
    - `features` (don't use a `screens` folder. organize by feature.)
    - `provider` (all the providers that wrap the app, and some no-ops for Web.)

You can add other folders inside of `packages/` if you know what you're doing and have a good reason to.

> [!TIP]
> Switching from `app` to `pages` router:
>
> - remove `app` folder from `apps/next`
> - move `index.tsx` from `pages-example` to `pages` folder
> - rename `pages-example-user` to `user` and be sure to update `linkTarget` in `screen.tsx` to `user` as well
> - delete `SwitchRouterButton.tsx` component and remove it from `screen.tsx` and `packages/ui/src/index.tsx`
> - search for `pagesMode` keyword and remove it

## 🏁 Start the app

- Install dependencies: `yarn`

- Next.js local dev: `yarn web`

To run with optimizer on in dev mode (just for testing, it's faster to leave it off): `yarn web:extract`. To build for production `yarn web:prod`.

To see debug output to verify the compiler, add `// debug` as a comment to the top of any file.

- Expo local dev: `yarn native`

## UI Kit

Note we're following the [design systems guide](https://tamagui.dev/docs/guides/design-systems) and creating our own package for components.

See `packages/ui` named `@my/ui` for how this works.

## 🆕 Add new dependencies

### Pure JS dependencies

If you're installing a JavaScript-only dependency that will be used across platforms, install it in `packages/app`:

```sh
cd packages/app
yarn add date-fns
cd ../..
yarn
```

### Native dependencies

If you're installing a library with any native code, you must install it in `expo`:

```sh
cd apps/expo
yarn add react-native-reanimated
cd ..
yarn
```

## Update new dependencies

### Pure JS dependencies

```sh
yarn upgrade-interactive
```

You can also install the native library inside of `packages/app` if you want to get autoimport for that package inside of the `app` folder. However, you need to be careful and install the _exact_ same version in both packages. If the versions mismatch at all, you'll potentially get terrible bugs. This is a classic monorepo issue. I use `lerna-update-wizard` to help with this (you don't need to use Lerna to use that lib).

You may potentially want to have the native module transpiled for the next app. If you get error messages with `Cannot use import statement outside a module`, you may need to use `transpilePackages` in your `next.config.js` and add the module to the array there.

### Deploying to Vercel

- Root: `apps/next`
- Install command to be `yarn set version stable && yarn install`
- Build command: leave default setting
- Output dir: leave default setting

## Camera Implementation Switching

This project supports switching between VisionCamera (development builds) and Expo Camera (Expo Go) implementations.

### Quick Switching

Use the yarn scripts to switch implementations:

```bash
# Switch to VisionCamera (full features, dev build)
yarn flag:vision

# Switch to Expo Camera (Expo Go compatible)
yarn flag:expo

# Or use the direct script
./scripts/toggle-camera.sh vision
./scripts/toggle-camera.sh expo
./scripts/toggle-camera.sh  # Check status
```

### Manual Configuration

Set the environment variable:

```bash
# VisionCamera (development)
export EXPO_PUBLIC_USE_VISION_CAMERA=true

# Expo Camera (Expo Go)
export EXPO_PUBLIC_USE_VISION_CAMERA=false
```

### Implementation Details

- **VisionCamera**: Full camera features, better performance, requires native build
- **Expo Camera**: Limited features, Expo Go compatible, faster iteration
- **Automatic Switching**: Based on `useVisionCamera` feature flag
- **Same API**: No code changes needed when switching

### Troubleshooting

1. **Clear Metro Cache**: `npx expo start --clear`
2. **Reset Environment**: Delete `.env.local` and restart
3. **Check Feature Flag**: Verify `useVisionCamera` flag in dev tools
4. **Expo Go**: Always uses Expo Camera implementation
