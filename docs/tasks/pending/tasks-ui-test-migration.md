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







# Tasks

---


### Task 54: UI Test Migration — Phase 0 Inventory & Baseline
**Effort:** 1 day | **Priority:** P1 | **Depends on:** VideoControls native suite migration

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Build a full inventory of `@my/ui` component tests, document current runners/mocks, and capture baseline runtime/heap/coverage numbers before refactors begin.

**TASKS:**
- [ ] List every component + associated test file, runner (`jest`, `jest.native`, etc.), and global mock dependencies.
- [ ] Execute baseline commands with `--logHeapUsage --coverage` and store results under `reports/*-baseline.md`.
- [ ] Record flake rate by running each suite 5× sequentially (`--runInBand --silent`).
- [ ] Summarize findings + migration priorities in the shared inventory.

**QUALITY GATES:**
- Inventory reviewed/approved by UI maintainers.
- Baseline metric reports checked into `reports/` with command references.

**DONE WHEN:** Every suite has documented baseline metrics and stakeholders approve migration order.

---

### Task 55: UI Test Migration — Phase 1 Tooling Foundations
**Effort:** 1 day | **Priority:** P1 | **Depends on:** Task 54

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Lock down the shared battle-tested testing stack (configs, setup files, templates, documentation) for `@my/ui`.

**TASKS:**
- [ ] Finalize `jest.native.core.config.js` and any lean web config required for pure Tamagui suites.
- [ ] Harden `setup.native.core.ts` (Reanimated, gesture handler, Expo, Tamagui mocks) and provide matching web setup if needed.
- [ ] Publish AAA test templates/helpers (native + web) in `src/test-utils/`.
- [ ] Update `@testing-philosophy.mdc`, AGENTS, and migration docs with the new playbook.

**QUALITY GATES:**
- `yarn workspace @my/ui test:native:core` passes locally and on CI using the new setup.
- Documentation updates reviewed by code owners.

**DONE WHEN:** Tooling + documentation enable any suite to migrate without additional infra changes.

---

### Task 56: UI Test Migration — Phase 2 Critical Native Components
**Effort:** 3 days | **Priority:** P0 | **Depends on:** Task 55

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Migrate high-impact native components (VideoAnalysis ecosystem, HistoryProgress native surfaces, Camera/Recording flows) to the new testing stack with behavior-first assertions.

**TASKS:**
- [ ] Port suites to `@testing-library/react-native`, enforcing AAA (`// Arrange // Act // Assert`).
- [ ] Replace legacy mega-mocks with scoped stubs per suite (Reanimated gestures, Expo modules, sensors, Zustand stores).
- [ ] Assert user-facing behavior (press/seek, visibility toggles, accessibility labels) instead of DOM styles.
- [ ] Capture post-migration metrics (`reports/*-migration.md`) and compare vs baselines.

**QUALITY GATES:**
- Runtime and heap improvements ≥20% vs baseline (or documented rationale if not possible).
- Coverage meets/exceeds baseline numbers.
- Manual Expo sanity check confirms no regressions.

**DONE WHEN:** All critical native suites run via `test:native:core`, metrics documented, legacy tests removed.

---

### Task 57: UI Test Migration — Phase 3 Shared UI & Utilities
**Effort:** 3 days | **Priority:** P1 | **Depends on:** Task 56

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Migrate cross-platform Tamagui components and utility widgets to consistent AAA, behavior-driven tests.

**TASKS:**
- [ ] Determine runner (native vs web) per component based on RN primitive usage; update configs where required.
- [ ] Rewrite suites to assert user-visible behavior + accessibility (roles, labels, `testID`s).
- [ ] Localize mocks; delete unused exports from `src/test-utils/setup.ts`.
- [ ] Update docs/templates if new patterns emerge.

**QUALITY GATES:**
- No remaining references to global mega-mocks.
- Coverage maintained or improved.
- Lint checks confirm AAA comment structure where applicable.

**DONE WHEN:** Every shared UI/utility test adheres to the new conventions and legacy scaffolding is removed.

---

### Task 58: UI Test Migration — Phase 4 Cleanup & CI Hardening
**Effort:** 2 days | **Priority:** P1 | **Depends on:** Task 57

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Remove obsolete configs/mocks and enforce runtime/heap/coverage safeguards in CI.

**TASKS:**
- [ ] Delete legacy `jest.native.config.js`, mega-setup utilities, and redundant helpers.
- [ ] Wire `test:native:core` into CI workflows with failure thresholds (>20% runtime/heap regression, coverage drops).
- [ ] Automate metric diff reporting (e.g., compare against baselines per suite).
- [ ] Final audit + documentation summary of migration completion.

**QUALITY GATES:**
- CI runs succeed with guards active; intentional regressions require documented waivers.
- Docs/STATUS updated to reflect completion and protections in place.

**DONE WHEN:** Legacy infrastructure is gone, CI enforces the battle-tested stack, and migration documentation is complete.
