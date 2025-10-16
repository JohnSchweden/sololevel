### Battle‑Tested Playbook: Use AI to Validate Implementations and Find Gaps

This playbook gives you concrete, repeatable steps to make AI reliably find what’s missing, mis-implemented, or risky in a new component/feature. It’s tailored to this monorepo (Yarn 4, strict TypeScript, unified testing, and the “No Claims Without Proof” policy).

---

### Core Principles

- **Specification-first**: AI must compare code to a source of truth (acceptance criteria, spec, user story, UI wireframe, or API contract). Without a spec, ask AI to derive a spec from artifacts, then validate against it.
- **Proof over assertions**: Always request concrete evidence (tests, line refs, diff annotations, commands to run). Treat AI claims as hypotheses until verified by tooling.
- **Defense in depth**: Combine static analysis, tests, property/metamorphic checks, contract tests, accessibility/performance checks, and e2e behavior verification.
- **Artifact-driven prompts**: Feed the AI the right artifacts: code, diffs, types/contracts, screenshots/wireframes, logs, test outputs.

---

### What to Feed the AI

Provide as many of these as are relevant:
- The implementation files and the diff vs `main` (or the base branch)
- The acceptance criteria (from `docs/spec/`, `docs/tasks/`, user stories) and any UI wireframes
- Related types and contracts (`packages/config`, `packages/types`, OpenAPI/DB schemas if relevant)
- Tests and their results (unit, integration, e2e) and coverage summary
- Lint/type-check outputs
- Runtime logs, screenshots, or recordings of the behavior

---

### High‑Leverage AI Prompts (Gap‑Finder Set)

Use these prompts inside Cursor on the specific files/diff. Replace the bracketed parts with your artifacts.

1) Spec ↔ Impl Conformance
- “Given this spec: [paste acceptance criteria or link]
  and this code/diff: [paste or reference files],
  list precise mismatches and missing behaviors. For each item: evidence (line refs), user impact, and a minimal fix. Then propose the smallest test that would catch it.”

2) Negative & Edge Case Exhaustion
- “Enumerate invalid, boundary, and adversarial inputs for [component/function]. Which are currently handled vs unhandled? Cite code paths. Propose assertions or guards and add test names.”

3) Property/Metamorphic Invariants
- “List invariants that must always hold for [state/data]. Define metamorphic relations (e.g., idempotency, commutativity, order-independence). Which are enforced or tested? Suggest property tests.”

4) Contract/Type Drift
- “Compare usage in [component] with types/contracts in [@config, @types, API client]. Flag drift (optional/required, nullability, enums, versioning). Provide exact edits to align code and tests.”

5) Accessibility & UX Gaps (WCAG 2.2 AA)
- “Audit this UI against WCAG 2.2 AA. Check roles, labels, focus order, keyboard operability, color contrast, semantics, and announcements. Output a prioritized fix list with line refs and test additions.”

6) Performance & Rendering Risks
- “Identify render hotspots, unstable dependencies, unnecessary re-renders, un-memoized heavy operations, and large bundle imports. Suggest targeted memoization, code-splitting, or virtualization with evidence.”

7) Threat Modeling Quick Pass
- “List realistic misuse/abuse cases for this surface. Check input validation, secret handling, authZ/RLS assumptions, and error message exposure. Propose minimal mitigations and tests.”

---

### Verification Workflow (Monorepo‑Aligned)

1) Run local proofs
- Type checking: `yarn type-check`
- Linting: `yarn lint`
- Unit/Integration tests: `yarn test`
- Web app tests: `yarn workspace web-app test`
- API tests (Vitest): `yarn workspace @my/api test`
- E2E (Playwright): `yarn test:all` or run relevant specs under `e2e/`

2) Share outputs with AI
- Paste key errors/warnings and coverage summary. Ask AI to triage by severity and propose smallest changes that make the errors disappear with minimal surface area.

3) Contract & Type checks
- Ask AI to check code usage against:
  - Types in `packages/config`, `packages/types`
  - API clients in `packages/api`
  - RLS/security assumptions in `supabase/`

4) Behavior verification (e2e)
- Prepare a minimal Playwright test for the new behavior. Ask AI to generate the test, then run and feed back failures for iterative fixes.

5) Accessibility verification
- Ask AI to generate React Testing Library checks for accessible names/roles and focus order for the component. Integrate into existing test suites.

6) Performance checks
- Ask AI to annotate potential re-render sources and propose memoization, splitting, or virtualization. Verify via React Profiler/devtools where applicable.

---

### Gap Checklists

Use these as short, objective checklists; ask AI to validate each and show proof.

- **Spec coverage**: Every acceptance criterion is linked to code lines and at least one test.
- **Negative paths**: Invalid/edge inputs are handled with clear user-safe errors; tests exist.
- **State invariants**: Documented and enforced (runtime or compile-time); property tests exist.
- **Types/contracts**: No drift vs `@config`, `@types`, and API clients.
- **A11y**: Roles/labels focus order; keyboard-only; contrast; screen reader announcements.
- **Security**: Inputs validated; no secrets in code; RLS/authZ assumptions explicit.
- **Performance**: No unnecessary re-renders; heavy work memoized; bundles not bloated.
- **Observability**: Structured logs around failure paths using `@my/logging`.

---

### Advanced Techniques (When Quality Really Matters)

- **Mutation testing**: Use a mutator (e.g., StrykerJS) conceptually to assess test effectiveness. Ask AI to propose mutations that your current tests would miss, then add tests.
- **Property-based testing**: Have AI list properties and generate fast-check style tests (adapt patterns to our runner).
- **Metamorphic testing**: Define transformations where outputs must relate predictably (e.g., ordering, idempotency) and test them.
- **Differential testing**: If a reference implementation exists, compare outputs across many inputs; AI can generate the input corpus.
- **Model-graded evaluations**: Ask one model to grade another’s output against acceptance criteria; require evidence and counterexamples.

---

### Tight Feedback Loops in Cursor

1) “Gap‑Finder” loop
- Paste spec + diff → Ask for missing items → Apply minimal edits → Re-run local proofs → Paste outputs → Repeat until zero findings.

2) “Spec Traceability” loop
- Ask AI to produce a one-page requirements → code → tests trace table. Keep it in the PR description. Block merge if any row lacks a test.

3) “Contract Drift” loop
- On any type/API change, ask AI to enumerate all touched call sites and propose precise edits; run type-check to confirm zero drift.

---

### CI Guardrails (align with repo standards)

- Enforce `yarn install --immutable` and Yarn 4 only.
- Quality gates: `yarn type-check`, `yarn lint`, `yarn test:all`, `yarn build` → all must pass.
- Fail CI on decreased coverage for changed lines; ask AI to author minimal tests.
- Run static analysis (Semgrep/linters) with a small, high-signal rule set for our stack; AI proposes fixes with code references.
- Enforce the “No Claims Without Proof” policy in PR templates: every claim needs artifacts (test links, screenshots, logs, or code refs).

---

### Mini Prompts Library (copy/paste)

- “Audit this component against the spec and list missing behaviors with line refs and minimal edits that would satisfy each acceptance criterion.”
- “Generate the smallest set of tests that would fail today but pass after fixes, covering negative cases and boundary inputs.”
- “List state invariants and metamorphic relations; mark which are enforced/tested; propose property tests.”
- “Check for accessibility issues: roles, names, focus order, keyboard nav, contrast, announcements—report evidence and test deltas.”
- “Compare code usage to `@config` types and `@my/api` clients; flag nullable/optional/enum drift with exact edits.”
- “Identify performance hot-spots and re-render risks; propose memoization/splitting strategies with before/after code snippets.”

---

### When to Stop (Definition of Done for Validation)

- All acceptance criteria mapped to code and tests
- Type-check = 0 errors; Lint = 0 errors
- Unit/integration tests pass; critical e2e paths pass
- No contract/type drift; a11y basic checks done
- PR description includes the spec trace table and proof artifacts

Adopt this as your standard “validation loop” whenever AI says “everything is implemented.” It will consistently surface gaps with evidence and a path to close them fast.


