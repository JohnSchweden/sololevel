# Task Series: my/ui Battle-Tested Test Migration

## Objective

Migrate every `@my/ui` component test to the hardened Jest + React Native Testing Library stack, eliminating mega-mocks, enforcing AAA, and delivering measurable runtime/heap/coverage wins.

## Scope

- `packages/ui/src/**/*`
- Native + cross-platform Tamagui components
- Related test utilities, mocks, and scripts

## Tasks Overview

### Phase 0 — Inventory & Baseline (1 day)
- Enumerate all existing test suites, current runner, and mock dependencies.
- Capture baseline metrics per suite (runtime, heap, coverage) using legacy config.
- Output: inventory spreadsheet + `reports/native-video-controls-baseline.md` template replicated per suite.

### Phase 1 — Foundation & Tooling (1 day)
- Finalize shared setup: `jest.native.core.config.js`, `setup.native.core.ts`, scoped Tamagui/Expo/Reanimated mocks.
- Provide AAA test template + utilities for native/web targets.
- Update contributor docs (`@testing-philosophy.mdc`, AGENTS) with new playbook.

### Phase 2 — Critical Native Components (3 days)
- Targets: VideoAnalysis sub-tree, HistoryProgress native surfaces, Recording/Camera primitives.
- Actions: Port tests to `@testing-library/react-native`, mock JS/native seams, assert behavior (press/seek/visibility) rather than DOM styles.
- Record before/after metrics + document wins.

### Phase 3 — Shared UI & Utility Components (3 days)
- Targets: Cross-platform Tamagui components (GlassButton, Buttons, Sheets, Toasts, etc.).
- Use web/native runner as appropriate; enforce AAA pattern + accessibility assertions.
- Refactor mocks to local scope; delete unused globals from `src/test-utils/setup.ts`.

### Phase 4 — Cleanup & CI Hardening (2 days)
- Remove legacy `jest.native.config.js` usage and mega-mock dependencies.
- Wire `test:native:core` + metrics gate into CI; fail PRs on >20% runtime/heap regression.
- Final audit to ensure all new suites exercise behavior with deterministic mocks.

## Deliverables
- Updated tests for every `@my/ui` component following AAA, behavior-first principles.
- Documentation: migration guide, updated testing philosophy, status log entries per phase.
- Metric reports (baseline vs post-migration) for each major suite.

## Dependencies
- Existing VideoControls migration (complete).
- Biome lint command fixed (package scripts updated to absolute path).

## Definition of Done
- 100% of `@my/ui` test suites run on battle-tested configs (native-core/web core).
- No reliance on global mega-mocks; all mocks scoped per suite/setup.
- CI captures runtime/heap metrics; regressions blocked automatically.
- Documentation updated and cross-referenced in AGENTS/testing rules.

