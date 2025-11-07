# Native VideoControls Test — Baseline (Pre-Migration)

| Metric | Command | Result |
| --- | --- | --- |
| Runtime (single run) | `yarn workspace @my/ui test:native VideoControls.test.native.tsx --runInBand --logHeapUsage --coverage --collectCoverageFrom='["src/components/VideoAnalysis/VideoControls/VideoControls.tsx"]'` | 1.706 s |
| Heap usage | same as above | 183 MB |
| Coverage (VideoControls.tsx) | same as above | Stmts 61.9%, Branch 50.0%, Funcs 42.3%, Lines 62.8% |
| Flake check | `for i in 1..5; yarn workspace @my/ui test:native VideoControls.test.native.tsx --runInBand --silent` | 0/5 failures (run times: 0.749 s, 0.463 s, 0.459 s, 0.471 s, 0.465 s) |

Notes

- Persistent console noise from DOM prop warnings (`resizeMode`, nested `<button>`, unknown `testID` et al.).
- Reanimated and gesture mocks lived in global 700+ line setup; shared value changes not observable.
- Progress-bar visibility exercised only through opacity animation; no conditional rendering coverage.

