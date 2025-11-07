# Native VideoControls Test — Battle-Tested Suite (Post-Migration)

| Metric | Command | Result |
| --- | --- | --- |
| Runtime (single run) | `yarn workspace @my/ui test:native:core VideoControls.native.core.test.tsx --runInBand --logHeapUsage --coverage --collectCoverageFrom='["src/components/VideoAnalysis/VideoControls/VideoControls.tsx"]'` | 0.793 s |
| Heap usage | same as above | 116 MB |
| Coverage (VideoControls.tsx) | same as above | Stmts 66.66%, Branch 53.17%, Funcs 50.0%, Lines 67.68% |
| Flake check | `for i in 1..5; yarn workspace @my/ui test:native:core VideoControls.native.core.test.tsx --runInBand --silent` | 0/5 failures (run times: 1.844 s, 0.459 s, 0.488 s, 0.470 s, 0.459 s) |

Delta Summary

- Runtime: **-53%** vs baseline (1.706 s → 0.793 s).
- Heap: **-37%** vs baseline (183 MB → 116 MB).
- Coverage: **+5 pts** on statements (61.9% → 66.7%); branches +3.2 pts; funcs +7.7 pts; lines +4.9 pts.
- Console noise eliminated; tamagui/test-only mocks scoped to native suite.

Implementation Notes

- Added `jest.native.core.config.js` to isolate native-core tests with focused transforms.
- New `setup.native.core.ts` supplies deliberate mocks for Reanimated 3, gesture handler, Expo Blur, and React Native primitives without pulling the entire mega-mock.
- `VideoControls.native.core.test.tsx` now uses `@testing-library/react-native`, shared-value aware helpers via targeted stubs, and behavioral assertions (press events, fallback seek, visibility toggles).
- Hook visibility behavior verified via controlled `useProgressBarVisibility` stub to avoid global mock churn while still covering conditional rendering logic.

Next Steps

- Port remaining `.native.test.tsx` suites to the `test:native:core` runner and prune references to the legacy mega-mock.
- Delete unused helpers in `src/test-utils/setup.ts` once all consumers migrate.
- Feed metrics into CI dashboard to enforce the lean config and catch regressions in heap/runtime trends.

